import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  commandGuide,
  createInitialShellSession,
  destinations,
  executeCommand,
  getCompletionCandidates,
  type ShellSession,
} from './commandRegistry'
import { terminalThemes } from './platformTheme'
import { profile } from '../data/profile'
import { projects } from '../data/projects'

function context(overrides: Partial<Parameters<typeof executeCommand>[1]> = {}) {
  return {
    session: createInitialShellSession(),
    history: [] as string[],
    theme: terminalThemes.linux,
    soundEnabled: false,
    ...overrides,
  }
}

/** A session already elevated via `sudo su`, as opposed to a one-off `sudo`. */
function rootSession(overrides: Partial<ShellSession> = {}): ShellSession {
  return { ...createInitialShellSession(), isRoot: true, cwd: '/root', ...overrides }
}

const run = (command: string, overrides = {}) => executeCommand(command, context(overrides))

afterEach(() => {
  vi.useRealTimers()
})

describe('dispatch and parsing', () => {
  it('reports unknown commands using the active shell name', async () => {
    const result = await run('definitely-not-a-command')
    expect(result.isError).toBe(true)
    expect(result.output[0]).toBe('bash: definitely-not-a-command: command not found')
    expect(result.output[1]).toContain('help')
  })

  it('names the shell from the active theme', async () => {
    const result = await run('nope', { theme: terminalThemes.apple })
    expect(result.output[0]).toBe('zsh: nope: command not found')
  })

  it('matches command names case-insensitively', async () => {
    const result = await run('WhoAmI')
    expect(result.output).toEqual([profile.name])
  })

  it('collapses repeated whitespace between tokens', async () => {
    const result = await run('  goto     projects  ')
    expect(result.effect).toEqual({ type: 'navigate', destination: 'projects' })
  })

  it('rejects sudo with nothing to run', async () => {
    const result = await run('sudo')
    expect(result.isError).toBe(true)
    expect(result.output).toEqual(['sudo: a command is required'])
  })

  it('attributes an unknown sudo command to sudo rather than the shell', async () => {
    const result = await run('sudo frobnicate')
    expect(result.output[0]).toBe('sudo: frobnicate: command not found')
  })
})

describe('privilege model', () => {
  it('reports the owner by name unprivileged, and root under sudo', async () => {
    expect((await run('whoami')).output).toEqual([profile.name])
    expect((await run('sudo whoami')).output).toEqual(['root'])
  })

  it('treats an elevated session as root without sudo', async () => {
    expect((await run('whoami', { session: rootSession() })).output).toEqual(['root'])
  })

  it('does not let a one-off sudo persist into the next command', async () => {
    const elevated = await run('sudo whoami')
    // Nothing is handed back to be stored, so the next command starts unprivileged.
    expect(elevated.session).toBeUndefined()
    expect((await run('whoami')).output).toEqual([profile.name])
  })

  it('rejects extra arguments', async () => {
    expect((await run('whoami extra')).isError).toBe(true)
    expect((await run('pwd extra')).isError).toBe(true)
  })
})

describe('su and exit', () => {
  it('refuses to elevate without sudo', async () => {
    const result = await run('su')
    expect(result.isError).toBe(true)
    expect(result.output).toEqual(['su: authentication failure'])
    expect(result.session).toBeUndefined()
  })

  it('elevates the session and moves to /root', async () => {
    const result = await run('sudo su')
    expect(result.session).toMatchObject({ isRoot: true, cwd: '/root' })
    expect(result.output[0]).toContain('root access granted')
  })

  it('is idempotent when already root', async () => {
    const result = await run('sudo su', { session: rootSession() })
    expect(result.output).toEqual(['already running as root.'])
    expect(result.session).toMatchObject({ isRoot: true })
  })

  it('drops back to the portfolio directory on exit', async () => {
    const result = await run('exit', { session: rootSession({ cwd: '/root/secrets' }) })
    expect(result.session).toMatchObject({ isRoot: false, cwd: '~/portfolio' })
  })

  it('stays open when a non-root session exits', async () => {
    const result = await run('exit')
    expect(result.isError).toBeUndefined()
    expect(result.session).toBeUndefined()
    expect(result.output[0]).toContain('prefers to stay open')
  })

  it('never mutates the session it was handed', async () => {
    const session = createInitialShellSession()
    const snapshot = { ...session }
    await run('sudo su', { session })
    expect(session).toEqual(snapshot)
  })
})

describe('ls', () => {
  it('lists the portfolio files and section directories', async () => {
    const listing = (await run('ls')).output[0]!
    expect(listing).toContain('role.txt')
    expect(listing).toContain('bio.txt')
    expect(listing).toContain('projects/')
    expect(listing).not.toContain('secrets/')
  })

  it('reveals secrets/ only once privileged', async () => {
    expect((await run('sudo ls')).output[0]).toContain('secrets/')
  })

  it('denies the secrets directory without privileges', async () => {
    const result = await run('ls secrets')
    expect(result.isError).toBe(true)
    expect(result.output[0]).toContain('Permission denied')
  })

  it('lists the secret files under sudo', async () => {
    const listing = (await run('sudo ls secrets')).output[0]!
    expect(listing).toContain('production.env')
    expect(listing).toContain('world-domination-plan.md')
  })

  it('lists every project as a directory', async () => {
    const listing = (await run('ls projects')).output[0]!
    for (const project of projects) expect(listing).toContain(`${project.id}/`)
  })

  it('reports a missing directory using the text the user typed', async () => {
    const result = await run('ls Nonsense')
    expect(result.isError).toBe(true)
    expect(result.output[0]).toBe("ls: cannot access 'Nonsense': No such directory")
  })

  it('rejects more than one path', async () => {
    expect((await run('ls a b')).output).toEqual(['ls: too many arguments'])
  })
})

describe('cd', () => {
  it('defaults to the home directory', async () => {
    const result = await run('cd', { session: { ...createInitialShellSession(), cwd: '~/portfolio/music' } })
    expect(result.session?.cwd).toBe('~/portfolio')
  })

  it('enters a portfolio section', async () => {
    expect((await run('cd projects')).session?.cwd).toBe('~/portfolio/projects')
  })

  it('walks back up to the portfolio root', async () => {
    const session = { ...createInitialShellSession(), cwd: '~/portfolio/writing' }
    expect((await run('cd ..', { session })).session?.cwd).toBe('~/portfolio')
  })

  it('accepts the absolute portfolio path', async () => {
    expect((await run('cd /home/piyushdoorwar/portfolio')).session?.cwd).toBe('~/portfolio')
  })

  it('refuses /root for an unprivileged session', async () => {
    const result = await run('cd /root')
    expect(result.isError).toBe(true)
    expect(result.output[0]).toBe('bash: cd: /root: No such directory')
  })

  it('still refuses /root under a one-off sudo, since only the session is checked', async () => {
    // Documents a deliberate asymmetry: reading secrets works via `sudo cat`,
    // but moving into /root requires an actually-elevated session (`sudo su`).
    expect((await run('sudo cd /root')).isError).toBe(true)
    expect((await run('cd /root', { session: rootSession() })).session?.cwd).toBe('/root')
  })

  it('reaches secrets from an elevated /root session', async () => {
    const result = await run('cd secrets', { session: rootSession() })
    expect(result.session?.cwd).toBe('/root/secrets')
  })
})

describe('cat', () => {
  it('reads the portfolio text files from profile data', async () => {
    expect((await run('cat role.txt')).output).toEqual([profile.headline])
    expect((await run('cat bio.txt')).output).toEqual([profile.tagline])
  })

  it('describes the section a README belongs to', async () => {
    const session = { ...createInitialShellSession(), cwd: '~/portfolio/music' }
    const result = await run('cat README.md', { session })
    expect(result.output[0]).toBe('Portfolio section: music')
    expect(result.output[1]).toContain('goto music')
  })

  it('reads a README regardless of how it was capitalised', async () => {
    const session = { ...createInitialShellSession(), cwd: '~/portfolio/writing' }
    for (const typed of ['README.md', 'readme.md', 'ReAdMe.Md']) {
      const result = await run(`cat ${typed}`, { session })
      expect(result.output[0], typed).toBe('Portfolio section: writing')
    }
  })

  it('has no README at the portfolio root', async () => {
    expect((await run('cat README.md')).isError).toBe(true)
  })

  it('denies secrets without privileges', async () => {
    const result = await run('cat secrets/production.env')
    expect(result.isError).toBe(true)
    expect(result.output[0]).toContain('Permission denied')
  })

  it('reads secrets under sudo', async () => {
    expect((await run('sudo cat secrets/production.env')).output).toEqual(['ACCESS_DENIED=good_try'])
  })

  it('resolves a bare filename inside the secrets directory', async () => {
    const session = rootSession({ cwd: '/root/secrets' })
    expect((await run('cat coffee.txt', { session })).output).toEqual([
      'status: brewing',
      'fuel level: critical',
    ])
  })

  it('reports a missing file, and names the gap when none was given', async () => {
    expect((await run('cat nope.txt')).output).toEqual(['cat: nope.txt: No such file'])
    expect((await run('cat')).output).toEqual(['cat: (missing file): No such file'])
  })
})

describe('tree', () => {
  it('closes the listing with the last branch marker', async () => {
    const output = await run('tree').then((r) => r.output)
    expect(output[0]).toBe('.')
    expect(output.filter((line) => line.startsWith('└──'))).toHaveLength(1)
    expect(output[output.length - 1]!.startsWith('└──')).toBe(true)
  })

  it('appends secrets as the final branch when privileged', async () => {
    const output = (await run('sudo tree')).output
    expect(output[output.length - 1]).toBe('└── secrets/')
  })

  it('does not take a path', async () => {
    expect((await run('tree /root')).isError).toBe(true)
  })
})

describe('history', () => {
  it('numbers entries by their real position, keeping the last 12', async () => {
    const history = Array.from({ length: 15 }, (_, index) => `command-${index + 1}`)
    const output = (await run('history', { history })).output

    expect(output).toHaveLength(12)
    expect(output[0]).toBe('4  command-4')
    expect(output[output.length - 1]).toBe('15  command-15')
  })

  it('numbers a short history from one', async () => {
    const output = (await run('history', { history: ['ls', 'pwd'] })).output
    expect(output).toEqual(['1  ls', '2  pwd'])
  })

  it('is empty for a fresh session', async () => {
    expect((await run('history')).output).toEqual([])
  })
})

describe('echo', () => {
  it('echoes text back', async () => {
    expect((await run('echo hello there')).output).toEqual(['hello there'])
  })

  it('preserves the original casing rather than the lowercased command', async () => {
    expect((await run('echo Hello World')).output).toEqual(['Hello World'])
  })

  it('strips a single matched pair of wrapping quotes', async () => {
    expect((await run('echo "quoted"')).output).toEqual(['quoted'])
    expect((await run("echo 'quoted'")).output).toEqual(['quoted'])
    expect((await run('echo "mismatched\'')).output).toEqual(['"mismatched\''])
  })

  it('prints an empty line when given nothing', async () => {
    expect((await run('echo')).output).toEqual([''])
  })
})

describe('sound', () => {
  it('emits an effect the caller applies', async () => {
    expect((await run('sound on')).effect).toEqual({ type: 'sound', enabled: true })
    expect((await run('sound off')).effect).toEqual({ type: 'sound', enabled: false })
  })

  it('reports current state without changing it', async () => {
    const result = await run('sound status', { soundEnabled: true })
    expect(result.output).toEqual(['Terminal sound is currently on.'])
    expect(result.effect).toBeUndefined()
  })

  it('guides the user when the argument is wrong or missing', async () => {
    for (const command of ['sound', 'sound loud', 'sound on off']) {
      const result = await run(command)
      expect(result.isError, command).toBe(true)
      expect(result.output[0]).toContain('sound on')
    }
  })
})

describe('navigation', () => {
  it('emits a navigate effect for every advertised destination', async () => {
    for (const destination of destinations) {
      const result = await run(`goto ${destination}`)
      expect(result.effect, destination).toEqual({ type: 'navigate', destination })
    }
  })

  it('lists the valid destinations when given a bad one', async () => {
    const result = await run('goto nowhere')
    expect(result.isError).toBe(true)
    for (const destination of destinations) expect(result.output[0]).toContain(destination)
  })

  it('requires exactly one destination', async () => {
    expect((await run('goto')).isError).toBe(true)
    expect((await run('goto about music')).isError).toBe(true)
  })
})

describe('ui effects', () => {
  it('asks the caller to open the guide', async () => {
    expect((await run('help')).effect).toEqual({ type: 'help' })
  })

  it('clears with no output to render', async () => {
    const result = await run('clear')
    expect(result.effect).toEqual({ type: 'clear' })
    expect(result.output).toEqual([])
  })
})

describe('root-gated commands', () => {
  const gated: [string, string][] = [
    ['apt install experience', 'Permission denied'],
    ['rm -rf /', 'permission denied'],
    ['reboot', 'permission denied'],
  ]

  it.each(gated)('refuses "%s" unprivileged', async (command, message) => {
    const result = await run(command)
    expect(result.isError).toBe(true)
    expect(result.output[0]).toContain(message)
  })

  it('keeps the joke rather than pretending to destroy anything', async () => {
    expect((await run('sudo rm -rf /')).output).toEqual(['permission denied: portfolio too valuable'])
    expect((await run('sudo apt install experience')).output[0]).toContain('newest version')
    expect((await run('sudo reboot')).output[0]).toContain('Nice try')
  })

  it('points an elevated session at exit rather than reboot', async () => {
    const result = await run('reboot', { session: rootSession() })
    expect(result.output[0]).toContain('exit')
  })
})

describe('system information', () => {
  it('reports uname per theme, with or without -a', async () => {
    expect((await run('uname')).output).toEqual([terminalThemes.linux.uname])
    expect((await run('uname -a', { theme: terminalThemes.windows })).output).toEqual([
      terminalThemes.windows.uname,
    ])
    expect((await run('uname -z')).isError).toBe(true)
  })

  it('builds neofetch from the active theme and profile', async () => {
    const output = (await run('neofetch', { theme: terminalThemes.apple })).output
    expect(output[0]).toContain(terminalThemes.apple.systemName)
    expect(output.join('\n')).toContain(profile.handle)
    expect(output.join('\n')).toContain(terminalThemes.apple.shell)
  })

  it('shows root as the neofetch user when elevated', async () => {
    const output = (await run('neofetch', { session: rootSession() })).output
    expect(output.join('\n')).toContain('root')
  })

  it('reports a fixed hostname', async () => {
    expect((await run('hostname')).output).toEqual(['portfolio'])
  })

  it('formats uptime from the session start', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-14T12:00:00Z'))
    const session = { ...createInitialShellSession(), startedAt: Date.now() - 90_000 }

    const result = await run('uptime', { session })
    expect(result.output[0]).toContain('up 1m 30s')
  })

  it('never reports negative uptime if the clock moves backwards', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-14T12:00:00Z'))
    const session = { ...createInitialShellSession(), startedAt: Date.now() + 60_000 }

    expect((await run('uptime', { session })).output[0]).toContain('up 0m 0s')
  })
})

describe('git and systemctl', () => {
  it('answers the two supported git subcommands', async () => {
    expect((await run('git status')).output[0]).toBe('On branch main')
    expect((await run('git log --oneline')).output).toHaveLength(3)
  })

  it('guides towards the supported git subcommands', async () => {
    expect((await run('git push')).isError).toBe(true)
    expect((await run('git')).output[0]).toContain('git status')
  })

  it('reports the portfolio service as running', async () => {
    const output = (await run('systemctl status portfolio')).output
    expect(output[0]).toContain('portfolio.service')
    expect(output.join('\n')).toContain('active (running)')
    expect((await run('systemctl restart portfolio')).isError).toBe(true)
  })
})

describe('ping', () => {
  it('refuses external targets without touching the network', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const result = await run('ping example.com')

    expect(result.isError).toBe(true)
    expect(result.output[0]).toContain('external targets are disabled')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('rejects more than one target', async () => {
    expect((await run('ping portfolio localhost')).isError).toBe(true)
  })
})

describe('completions', () => {
  it('offers a sudo variant of every base completion', async () => {
    const candidates = getCompletionCandidates(createInitialShellSession())
    expect(candidates).toContain('help')
    expect(candidates).toContain('sudo help')
  })

  it('withholds root-only completions until the session is elevated', () => {
    expect(getCompletionCandidates(createInitialShellSession())).not.toContain('rm -rf /')
    expect(getCompletionCandidates(rootSession())).toContain('rm -rf /')
  })

  it('returns no duplicates', () => {
    const candidates = getCompletionCandidates(rootSession())
    expect(candidates).toHaveLength(new Set(candidates).size)
  })

  it('offers a completion for every destination', () => {
    const candidates = getCompletionCandidates(createInitialShellSession())
    for (const destination of destinations) expect(candidates).toContain(`goto ${destination}`)
  })
})

describe('command guide', () => {
  it('documents sudo, which has no command definition of its own', () => {
    expect(commandGuide.map((item) => item.command)).toContain('sudo <command>')
  })

  it('gives every entry a command and a description', () => {
    for (const item of commandGuide) {
      expect(item.command.length).toBeGreaterThan(0)
      expect(item.description.length).toBeGreaterThan(0)
    }
  })

  it('only advertises commands that actually run', async () => {
    for (const item of commandGuide) {
      // The guide shows usage like "cat <file>"; the first token is the command.
      const name = item.command.split(' ')[0]!
      if (name === 'sudo') continue
      const result = await run(name)
      expect(result.output.join('\n'), name).not.toContain('command not found')
    }
  })
})

describe('initial session', () => {
  it('starts unprivileged in the portfolio directory', () => {
    const session = createInitialShellSession()
    expect(session.isRoot).toBe(false)
    expect(session.cwd).toBe('~/portfolio')
    expect(Number.isFinite(session.startedAt)).toBe(true)
  })
})
