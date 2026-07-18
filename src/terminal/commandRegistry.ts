import { profile } from '../data/profile'
import { projects } from '../data/projects'
import type { TerminalTheme } from './platformTheme'

export interface CommandGuideItem {
  command: string
  description: string
}

export interface ShellSession {
  isRoot: boolean
  cwd: string
  startedAt: number
}

export type CommandEffect =
  | { type: 'clear' }
  | { type: 'help' }
  | { type: 'sound'; enabled: boolean }
  | { type: 'navigate'; destination: string }

export interface CommandResult {
  output: string[]
  isError?: boolean
  session?: ShellSession
  effect?: CommandEffect
}

interface CommandContext {
  session: ShellSession
  history: string[]
  theme: TerminalTheme
  soundEnabled: boolean
}

interface CommandRequest extends CommandContext {
  command: string
  name: string
  args: string[]
  rawArgs: string[]
  usesSudo: boolean
  hasRootPrivileges: boolean
}

interface CommandDefinition {
  name: string
  guide?: CommandGuideItem
  completions?: string[]
  rootCompletions?: string[]
  run: (request: CommandRequest) => CommandResult | Promise<CommandResult>
}

export const destinations = [
  'top',
  'about',
  'experience',
  'impact',
  'stats',
  'visitors',
  'projects',
  'writing',
  'music',
] as const

const portfolioDirectories = destinations.filter((destination) => destination !== 'top')
const fortunes = [
  'Ship small, observe carefully, improve continuously.',
  'The best debugging tool is still a good question.',
  'Reliable systems are built one boring decision at a time.',
  'There is no cloud. It is just someone else’s Linux box.',
]

function success(output: string[], extra: Omit<CommandResult, 'output'> = {}): CommandResult {
  return { output, ...extra }
}

function failure(output: string[]): CommandResult {
  return { output, isError: true }
}

function updatedSession(session: ShellSession, changes: Partial<ShellSession>): ShellSession {
  return { ...session, ...changes }
}

function homeDirectory(session: ShellSession): string {
  return session.isRoot ? '/root' : '~/portfolio'
}

function portfolioSectionFromPath(path: string): string | undefined {
  if (!path.startsWith('~/portfolio/')) return undefined
  const section = path.slice('~/portfolio/'.length)
  return portfolioDirectories.includes(section as (typeof portfolioDirectories)[number])
    ? section
    : undefined
}

function resolveDirectory(request: CommandRequest, target: string): string | undefined {
  const { cwd, isRoot } = request.session
  const normalized = target.replace(/\/$/, '')

  if (!normalized || normalized === '~') return homeDirectory(request.session)
  if (normalized === '.') return cwd
  if (normalized === '~/portfolio' || normalized === '/home/piyushdoorwar/portfolio') {
    return '~/portfolio'
  }
  if (normalized === '/root') return isRoot ? '/root' : undefined
  if (normalized === '/root/secrets') return isRoot ? '/root/secrets' : undefined

  if (normalized === '..') {
    if (cwd === '/root/secrets') return '/root'
    if (cwd.startsWith('~/portfolio/')) return '~/portfolio'
    return cwd
  }

  if (cwd === '/root' && normalized === 'secrets') return '/root/secrets'
  if (cwd === '~/portfolio' && (portfolioDirectories as readonly string[]).includes(normalized)) {
    return `~/portfolio/${normalized}`
  }

  return undefined
}

function listDirectory(request: CommandRequest, path = request.session.cwd): string[] | undefined {
  if (path === '~/portfolio') {
    const entries = [
      'role.txt',
      'bio.txt',
      ...portfolioDirectories.map((directory) => `${directory}/`),
    ]
    if (request.hasRootPrivileges) entries.push('secrets/')
    return entries
  }

  if (path === '~/portfolio/projects') {
    return projects.map((project) => `${project.id}/`)
  }

  if (portfolioSectionFromPath(path)) return ['README.md']
  if (path === '/root') return ['secrets/']
  if (path === '/root/secrets') {
    return ['coffee.txt', 'production.env', 'world-domination-plan.md']
  }

  return undefined
}

function treeFor(request: CommandRequest): string[] {
  const path = request.session.cwd

  if (path === '~/portfolio') {
    return [
      '.',
      '├── role.txt',
      '├── bio.txt',
      ...portfolioDirectories.map((directory, index) => {
        const isLast = index === portfolioDirectories.length - 1 && !request.hasRootPrivileges
        return `${isLast ? '└──' : '├──'} ${directory}/`
      }),
      ...(request.hasRootPrivileges ? ['└── secrets/'] : []),
    ]
  }

  if (path === '~/portfolio/projects') {
    return [
      '.',
      ...projects.map((project, index) =>
        `${index === projects.length - 1 ? '└──' : '├──'} ${project.id}/`,
      ),
    ]
  }

  if (path === '/root') {
    return [
      '.',
      '└── secrets/',
      '    ├── coffee.txt',
      '    ├── production.env',
      '    └── world-domination-plan.md',
    ]
  }

  if (path === '/root/secrets') {
    return [
      '.',
      '├── coffee.txt',
      '├── production.env',
      '└── world-domination-plan.md',
    ]
  }

  return ['.', '└── README.md']
}

function secretFileName(request: CommandRequest): string | undefined {
  const requested = request.args.join(' ')
  if (requested.startsWith('/root/')) return requested.slice('/root/'.length)
  if (requested.startsWith('secrets/')) return requested.slice('secrets/'.length)
  if (request.session.cwd === '/root/secrets') return requested
  return undefined
}

function formatUptime(startedAt: number): string {
  const totalSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `up ${minutes}m ${seconds}s, 1 user, load average: 0.08, 0.04, 0.01`
}

function stripWrappingQuotes(value: string): string {
  if (value.length < 2) return value
  const first = value[0]
  const last = value[value.length - 1]
  return first === last && (first === '"' || first === "'") ? value.slice(1, -1) : value
}

async function measureHttpPing(target: string): Promise<CommandResult> {
  const timings: number[] = []
  const output = [`PING ${target} via HTTP (${window.location.host}/favicon.svg)`]

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 4000)
    const startedAt = performance.now()

    try {
      const response = await fetch(
        `/favicon.svg?terminal-ping=${Date.now()}-${attempt}`,
        { cache: 'no-store', signal: controller.signal },
      )
      await response.arrayBuffer()
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const duration = Math.max(1, Math.round(performance.now() - startedAt))
      timings.push(duration)
      output.push(`reply ${attempt}: status=${response.status} time=${duration}ms`)
    } catch (error) {
      const status = error instanceof DOMException && error.name === 'AbortError'
        ? 'timed out'
        : 'failed'
      output.push(`request ${attempt}: ${status}`)
    } finally {
      window.clearTimeout(timeout)
    }
  }

  if (timings.length === 0) {
    return failure([...output, '3 requests, 0 successful'])
  }

  const average = Math.round(timings.reduce((total, value) => total + value, 0) / timings.length)
  output.push(`3 requests, ${timings.length} successful, avg ${average}ms`)
  return success(output)
}

const commandDefinitions: CommandDefinition[] = [
  {
    name: 'help',
    guide: { command: 'help', description: 'Open this command guide' },
    completions: ['help'],
    run: () => success(['Opening command guide…'], { effect: { type: 'help' } }),
  },
  {
    name: 'clear',
    guide: { command: 'clear', description: 'Clear the terminal output' },
    completions: ['clear'],
    run: () => success([], { effect: { type: 'clear' } }),
  },
  {
    name: 'sound',
    guide: { command: 'sound <on|off|status>', description: 'Manage terminal typing sounds' },
    completions: ['sound on', 'sound off', 'sound status'],
    run: ({ args, soundEnabled }) => {
      if (args.length !== 1) {
        return failure(['sound: try "sound on", "sound off", or "sound status"'])
      }

      if (args[0] === 'on') {
        return success(['Terminal sound enabled.'], { effect: { type: 'sound', enabled: true } })
      }
      if (args[0] === 'off') {
        return success(['Terminal sound muted.'], { effect: { type: 'sound', enabled: false } })
      }
      if (args[0] === 'status') {
        return success([`Terminal sound is currently ${soundEnabled ? 'on' : 'off'}.`])
      }

      return failure(['sound: try "sound on", "sound off", or "sound status"'])
    },
  },
  {
    name: 'whoami',
    guide: { command: 'whoami', description: 'Show the active shell user' },
    completions: ['whoami'],
    run: ({ args, hasRootPrivileges }) =>
      args.length === 0
        ? success([hasRootPrivileges ? 'root' : profile.name])
        : failure(['whoami: too many arguments']),
  },
  {
    name: 'pwd',
    guide: { command: 'pwd', description: 'Print the current virtual directory' },
    completions: ['pwd'],
    run: ({ args, session }) =>
      args.length === 0 ? success([session.cwd]) : failure(['pwd: too many arguments']),
  },
  {
    name: 'ls',
    guide: { command: 'ls [path]', description: 'List virtual files and portfolio sections' },
    completions: ['ls', 'ls projects'],
    rootCompletions: ['ls secrets', 'ls /root'],
    run: (request) => {
      if (request.args.length > 1) return failure(['ls: too many arguments'])

      let path = request.session.cwd
      if (request.args.length === 1) {
        const target = request.args[0]!
        if (['secrets', 'secrets/', '/root', '/root/'].includes(target)) {
          if (!request.hasRootPrivileges) {
            return failure([`ls: cannot open '${target}': Permission denied`])
          }
          path = '/root/secrets'
        } else {
          path = resolveDirectory(request, target) ?? ''
        }
      }

      const entries = listDirectory(request, path)
      return entries
        ? success([entries.join('  ')])
        : failure([`ls: cannot access '${request.rawArgs[0]}': No such directory`])
    },
  },
  {
    name: 'cd',
    guide: { command: 'cd <directory>', description: 'Move through the virtual portfolio filesystem' },
    completions: [
      'cd ',
      'cd ..',
      'cd projects',
      ...portfolioDirectories.map((directory) => `cd ${directory}`),
    ],
    rootCompletions: ['cd /root', 'cd secrets'],
    run: (request) => {
      if (request.args.length > 1) return failure([`${request.theme.shell}: cd: too many arguments`])
      const target = request.args[0] ?? '~'
      const nextDirectory = resolveDirectory(request, target)
      if (!nextDirectory) {
        return failure([`${request.theme.shell}: cd: ${request.rawArgs[0] ?? target}: No such directory`])
      }
      return success([], { session: updatedSession(request.session, { cwd: nextDirectory }) })
    },
  },
  {
    name: 'tree',
    guide: { command: 'tree', description: 'Show the current virtual directory as a tree' },
    completions: ['tree'],
    run: (request) =>
      request.args.length === 0
        ? success(treeFor(request))
        : failure(['tree: paths are not supported in this tiny filesystem']),
  },
  {
    name: 'cat',
    guide: { command: 'cat <file>', description: 'Read a virtual portfolio file' },
    completions: ['cat role.txt', 'cat bio.txt', 'cat README.md'],
    rootCompletions: [
      'cat secrets/coffee.txt',
      'cat secrets/production.env',
      'cat secrets/world-domination-plan.md',
    ],
    run: (request) => {
      const file = request.args.join(' ')
      if (file === 'role.txt') return success([profile.headline])
      if (file === 'bio.txt') return success([profile.tagline])
      if (file === 'README.md') {
        const section = portfolioSectionFromPath(request.session.cwd)
        return section
          ? success([`Portfolio section: ${section}`, `Run "goto ${section}" to open it.`])
          : failure(['cat: README.md: No such file'])
      }

      const secret = secretFileName(request)
      if (secret) {
        if (!request.hasRootPrivileges) return failure([`cat: ${file}: Permission denied`])
        if (secret === 'coffee.txt') return success(['status: brewing', 'fuel level: critical'])
        if (secret === 'production.env') return success(['ACCESS_DENIED=good_try'])
        if (secret === 'world-domination-plan.md') {
          return success(['1. Build reliable systems', '2. Ship useful things', '3. Repeat'])
        }
      }

      return failure([`cat: ${request.rawArgs.join(' ') || '(missing file)'}: No such file`])
    },
  },
  {
    name: 'echo',
    guide: { command: 'echo <text>', description: 'Print text back to the terminal' },
    completions: ['echo '],
    run: ({ rawArgs }) => success([stripWrappingQuotes(rawArgs.join(' '))]),
  },
  {
    name: 'date',
    guide: { command: 'date', description: 'Show the current local date and time' },
    completions: ['date'],
    run: ({ args }) =>
      args.length === 0 ? success([new Date().toString()]) : failure(['date: unsupported option']),
  },
  {
    name: 'uptime',
    guide: { command: 'uptime', description: 'Show how long this terminal session has been open' },
    completions: ['uptime'],
    run: ({ args, session }) =>
      args.length === 0 ? success([formatUptime(session.startedAt)]) : failure(['uptime: unsupported option']),
  },
  {
    name: 'history',
    guide: { command: 'history', description: 'Show commands entered in this session' },
    completions: ['history'],
    run: ({ args, history }) =>
      args.length === 0
        ? success(history.slice(-12).map((command, index) => {
            const number = history.length - Math.min(12, history.length) + index + 1
            return `${number}  ${command}`
          }))
        : failure(['history: unsupported option']),
  },
  {
    name: 'hostname',
    guide: { command: 'hostname', description: 'Print the virtual machine name' },
    completions: ['hostname'],
    run: ({ args }) =>
      args.length === 0 ? success(['portfolio']) : failure(['hostname: unsupported option']),
  },
  {
    name: 'uname',
    guide: { command: 'uname -a', description: 'Show the virtual system information' },
    completions: ['uname -a'],
    run: ({ args, theme }) =>
      args.length === 0 || args.join(' ') === '-a'
        ? success([theme.uname])
        : failure(['uname: unsupported option']),
  },
  {
    name: 'ping',
    guide: { command: 'ping portfolio', description: 'Measure real HTTP latency to this site' },
    completions: ['ping portfolio', 'ping localhost'],
    run: ({ args }) => {
      const target = args[0] ?? 'portfolio'
      if (args.length > 1 || !['portfolio', 'localhost'].includes(target)) {
        return failure(['ping: external targets are disabled; try "ping portfolio"'])
      }
      return measureHttpPing(target)
    },
  },
  {
    name: 'neofetch',
    guide: { command: 'neofetch', description: 'Show the portfolio machine profile' },
    completions: ['neofetch'],
    run: ({ args, session, theme }) =>
      args.length === 0
        ? success([
            `${theme.neofetchMark}  ${theme.systemName}`,
            `   User: ${session.isRoot ? 'root' : profile.handle}`,
            `   Role: ${profile.headline}`,
            `   Location: ${profile.location}`,
            `   Shell: ${theme.shell}`,
            `   Theme: ${theme.label}`,
          ])
        : failure(['neofetch: unsupported option']),
  },
  {
    name: 'git',
    guide: { command: 'git status', description: 'Inspect the playful portfolio repository' },
    completions: ['git status', 'git log --oneline'],
    run: ({ args }) => {
      const subcommand = args.join(' ')
      if (subcommand === 'status') {
        return success([
          'On branch main',
          'Your portfolio is up to date.',
          'nothing to commit, keep building',
        ])
      }
      if (subcommand === 'log --oneline') {
        return success([
          'f00ba12 ship useful things',
          'c0ffee5 refactor before it hurts',
          'b16b00b initial commit',
        ])
      }
      return failure(['git: try "git status" or "git log --oneline"'])
    },
  },
  {
    name: 'systemctl',
    guide: { command: 'systemctl status portfolio', description: 'Check the portfolio service' },
    completions: ['systemctl status portfolio'],
    run: ({ args }) =>
      args.join(' ') === 'status portfolio'
        ? success([
            '● portfolio.service - Piyush Doorwar portfolio',
            '   Loaded: loaded; enabled',
            '   Active: active (running)',
            '   Status: "shipping useful things"',
          ])
        : failure(['systemctl: try "systemctl status portfolio"']),
  },
  {
    name: 'goto',
    guide: { command: 'goto <section>', description: 'Jump to a portfolio section' },
    completions: destinations.map((destination) => `goto ${destination}`),
    run: ({ args }) => {
      const destination = args[0]
      if (args.length !== 1 || !destinations.includes(destination as (typeof destinations)[number])) {
        return failure([`Unknown section. Try: ${destinations.join(', ')}`])
      }
      return success([`Navigating to #${destination}…`], {
        effect: { type: 'navigate', destination },
      })
    },
  },
  {
    name: 'su',
    rootCompletions: ['exit'],
    run: ({ args, usesSudo, session }) => {
      if (!usesSudo) return failure(['su: authentication failure'])
      if (args.length !== 0) return failure(['sudo su: this playground only supports the root shell'])
      return success([
        session.isRoot
          ? 'already running as root.'
          : 'root access granted — try not to break production.',
      ], {
        session: updatedSession(session, { isRoot: true, cwd: '/root' }),
      })
    },
  },
  {
    name: 'exit',
    rootCompletions: ['exit'],
    run: ({ args, session }) => {
      if (args.length !== 0) return failure(['exit: too many arguments'])
      if (!session.isRoot) return success(['This portfolio terminal prefers to stay open.'])
      return success(['leaving root shell'], {
        session: updatedSession(session, { isRoot: false, cwd: '~/portfolio' }),
      })
    },
  },
  {
    name: 'fortune',
    run: () => success([fortunes[Math.floor(Math.random() * fortunes.length)]!]),
  },
  {
    name: 'cowsay',
    run: ({ rawArgs }) => {
      const message = stripWrappingQuotes(rawArgs.join(' ') || 'ship it').slice(0, 48)
      const border = '-'.repeat(message.length + 2)
      return success([
        ` ${'_'.repeat(message.length + 2)}`,
        `< ${message} >`,
        ` ${border}`,
        '        \\   ^__^',
        '         \\  (oo)\\_______',
        '            (__)\\       )\\/\\',
        '                ||----w |',
        '                ||     ||',
      ])
    },
  },
  {
    name: 'apt',
    rootCompletions: ['apt install experience'],
    run: ({ args, hasRootPrivileges }) => {
      if (!hasRootPrivileges) return failure(['E: Could not open lock file: Permission denied'])
      return args.join(' ') === 'install experience'
        ? success(['experience is already at the newest version.'])
        : failure(['apt: this tiny repository only contains "experience"'])
    },
  },
  {
    name: 'rm',
    rootCompletions: ['rm -rf /'],
    run: ({ args, hasRootPrivileges }) => {
      if (!hasRootPrivileges) return failure(['rm: permission denied'])
      return args.join(' ') === '-rf /'
        ? success(['permission denied: portfolio too valuable'])
        : failure(['rm: read-only virtual filesystem'])
    },
  },
  {
    name: 'reboot',
    rootCompletions: ['reboot'],
    run: ({ args, hasRootPrivileges, session }) => {
      if (args.length !== 0) return failure(['reboot: too many arguments'])
      if (!hasRootPrivileges) return failure(['reboot: permission denied'])
      return success([
        session.isRoot
          ? 'Nice try. Use “exit” to leave root mode.'
          : 'Nice try. This portfolio is staying online.',
      ])
    },
  },
]

const commandRegistry = new Map(
  commandDefinitions.map((definition) => [definition.name, definition]),
)

export const commandGuide: CommandGuideItem[] = [
  ...commandDefinitions.flatMap((definition) => definition.guide ? [definition.guide] : []),
  { command: 'sudo <command>', description: 'Run an available command with elevated privileges' },
]

const completionCandidates = commandDefinitions.flatMap(
  (definition) => definition.completions ?? [],
)
const sudoCompletionCandidates = completionCandidates.map((candidate) => `sudo ${candidate}`)

export function createInitialShellSession(): ShellSession {
  return {
    isRoot: false,
    cwd: '~/portfolio',
    startedAt: Date.now(),
  }
}

export function getCompletionCandidates(session: ShellSession): string[] {
  const rootCandidates = session.isRoot
    ? commandDefinitions.flatMap((definition) => definition.rootCompletions ?? [])
    : []
  return [...new Set([...completionCandidates, ...sudoCompletionCandidates, ...rootCandidates])]
}

export async function executeCommand(
  rawCommand: string,
  context: CommandContext,
): Promise<CommandResult> {
  const command = rawCommand.trim().replace(/\s+/g, ' ')
  const rawTokens = command.split(' ')
  const lowerTokens = rawTokens.map((token) => token.toLowerCase())
  const usesSudo = lowerTokens[0] === 'sudo'

  if (usesSudo && lowerTokens.length === 1) {
    return failure(['sudo: a command is required'])
  }

  const executableTokens = usesSudo ? lowerTokens.slice(1) : lowerTokens
  const rawExecutableTokens = usesSudo ? rawTokens.slice(1) : rawTokens
  const [name = '', ...args] = executableTokens
  const [, ...rawArgs] = rawExecutableTokens
  const definition = commandRegistry.get(name)

  if (!definition) {
    return failure([
      usesSudo
        ? `sudo: ${name}: command not found`
        : `${context.theme.shell}: ${name}: command not found`,
      'Type “help” to see the available commands.',
    ])
  }

  return definition.run({
    ...context,
    command,
    name,
    args,
    rawArgs,
    usesSudo,
    hasRootPrivileges: context.session.isRoot || usesSudo,
  })
}
