import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { FiInfo, FiTerminal, FiVolume2, FiVolumeX, FiX } from 'react-icons/fi'
import { FaAndroid, FaApple, FaLinux, FaWindows } from 'react-icons/fa'
import { profile } from '../data/profile'
import {
  commandGuide,
  createInitialShellSession,
  executeCommand,
  getCompletionCandidates,
} from '../terminal/commandRegistry'
import {
  detectTerminalTheme,
  isTerminalThemeId,
  terminalThemeIds,
  terminalThemes,
  type TerminalThemeId,
  type TerminalThemePreference,
} from '../terminal/platformTheme'
import {
  clearTerminalState,
  loadTerminalState,
  saveTerminalState,
  type PersistedTerminalEntry,
} from '../terminal/sessionPersistence'

interface TypeAction {
  type: 'type' | 'pause' | 'backspace'
  text?: string
  count?: number
  duration?: number
}

type TerminalEntry = PersistedTerminalEntry

type KeyTone = 'key' | 'space' | 'backspace' | 'enter'

const TERMINAL_THEME_STORAGE_KEY = 'portfolio-terminal-theme'
const terminalThemeIcons = {
  linux: FaLinux,
  macos: FaApple,
  windows: FaWindows,
  android: FaAndroid,
  ios: FaApple,
  generic: FiTerminal,
} satisfies Record<TerminalThemeId, typeof FiTerminal>

const lines: { cmd: string; out: string; actions?: TypeAction[] }[] = [
  { cmd: 'whoami', out: profile.name },
  { cmd: 'cat role.txt', out: profile.headline },
  {
    cmd: 'cat bio.txt',
    out: profile.tagline,
    actions: [
      { type: 'type', text: 'cat bip.tx' },
      { type: 'pause', duration: 500 },
      { type: 'backspace', count: 4 },
      { type: 'pause', duration: 180 },
      { type: 'type', text: 'o.txt' },
    ],
  },
]

const sleep = (duration: number) => new Promise((resolve) => window.setTimeout(resolve, duration))

function typingDelay(character: string, index: number): number {
  if (character === ' ') return 180
  const rhythm = [10, 38, -12, 24, 52, -4]
  return 105 + rhythm[index % rhythm.length]!
}

function getCommonPrefix(values: string[]): string {
  if (values.length === 0) return ''
  return values.reduce((prefix, value) => {
    let index = 0
    while (index < prefix.length && prefix[index] === value[index]) index += 1
    return prefix.slice(0, index)
  })
}

export default function Hero() {
  const reduce = useReducedMotion()
  const [restoredTerminal] = useState(loadTerminalState)
  const [completedLines, setCompletedLines] = useState(
    restoredTerminal || reduce ? lines.length : 0,
  )
  const [currentCommand, setCurrentCommand] = useState('')
  const [entries, setEntries] = useState<TerminalEntry[]>(() => restoredTerminal?.entries ?? [])
  const [showIntro, setShowIntro] = useState(() => restoredTerminal?.showIntro ?? true)
  const [commandHistory, setCommandHistory] = useState<string[]>(
    () => restoredTerminal?.commandHistory ?? [],
  )
  const [historyIndex, setHistoryIndex] = useState<number | null>(null)
  const [historyDraft, setHistoryDraft] = useState('')
  const [helpOpen, setHelpOpen] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [session, setSession] = useState(
    () => restoredTerminal?.session ?? createInitialShellSession(),
  )
  const [commandRunning, setCommandRunning] = useState(false)
  const [detectedThemeId] = useState(detectTerminalTheme)
  const [themePreference, setThemePreference] = useState<TerminalThemePreference>(() => {
    if (typeof window === 'undefined') return 'auto'
    try {
      const storedTheme = window.localStorage.getItem(TERMINAL_THEME_STORAGE_KEY)
      return isTerminalThemeId(storedTheme) ? storedTheme : 'auto'
    } catch {
      return 'auto'
    }
  })
  const inputRef = useRef<HTMLInputElement>(null)
  const terminalBodyRef = useRef<HTMLDivElement>(null)
  const infoButtonRef = useRef<HTMLButtonElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const helpTriggerRef = useRef<'input' | 'info'>('info')
  const audioContextRef = useRef<AudioContext | null>(null)
  const soundEnabledRef = useRef(false)
  const isIntroComplete = completedLines === lines.length
  const isRoot = session.isRoot
  const terminalThemeId = themePreference === 'auto' ? detectedThemeId : themePreference
  const terminalTheme = terminalThemes[terminalThemeId]
  const ThemeIcon = terminalThemeIcons[terminalThemeId]
  const terminalAccentStyle = {
    '--terminal-accent': terminalTheme.accent,
    '--terminal-accent-soft': `${terminalTheme.accent}b3`,
    '--terminal-accent-muted': `${terminalTheme.accent}a6`,
  } as CSSProperties

  function prepareAudio(): AudioContext | null {
    if (!soundEnabledRef.current) return null

    let context = audioContextRef.current
    if (!context || context.state === 'closed') {
      context = new AudioContext({ latencyHint: 'interactive' })
      audioContextRef.current = context
    }

    if (context.state === 'suspended') void context.resume()
    return context
  }

  function emitKeyTone(context: AudioContext, tone: KeyTone) {
    if (context.state !== 'running') return

    const duration = tone === 'enter' ? 0.045 : 0.022
    const frameCount = Math.floor(context.sampleRate * duration)
    const buffer = context.createBuffer(1, frameCount, context.sampleRate)
    const channel = buffer.getChannelData(0)

    for (let index = 0; index < frameCount; index += 1) {
      const decay = Math.pow(1 - index / frameCount, tone === 'enter' ? 3 : 5)
      channel[index] = (Math.random() * 2 - 1) * decay
    }

    const source = context.createBufferSource()
    const filter = context.createBiquadFilter()
    const gain = context.createGain()
    const frequencies: Record<KeyTone, number> = {
      key: 1650 + Math.random() * 350,
      space: 1050,
      backspace: 1350,
      enter: 750,
    }

    filter.type = 'bandpass'
    filter.frequency.value = frequencies[tone]
    filter.Q.value = 0.8
    gain.gain.value = tone === 'enter' ? 0.16 : 0.12

    source.buffer = buffer
    source.connect(filter)
    filter.connect(gain)
    gain.connect(context.destination)
    source.start()
  }

  function playKeyTone(tone: KeyTone, createContext = true) {
    if (!soundEnabledRef.current) return
    const existingContext = audioContextRef.current
    if (!createContext && (!existingContext || existingContext.state !== 'running')) return

    const context = createContext ? prepareAudio() : existingContext
    if (!context) return

    if (context.state === 'running') {
      emitKeyTone(context, tone)
    } else {
      void context.resume().then(() => emitKeyTone(context, tone))
    }
  }

  function toggleSound() {
    const nextEnabled = !soundEnabledRef.current
    soundEnabledRef.current = nextEnabled
    setSoundEnabled(nextEnabled)
    if (nextEnabled) playKeyTone('key')
  }

  function changeTerminalTheme(value: string) {
    if (value !== 'auto' && !isTerminalThemeId(value)) return

    const preference = value as TerminalThemePreference
    setThemePreference(preference)

    try {
      if (preference === 'auto') {
        window.localStorage.removeItem(TERMINAL_THEME_STORAGE_KEY)
      } else {
        window.localStorage.setItem(TERMINAL_THEME_STORAGE_KEY, preference)
      }
    } catch {
      // The visual preference still applies when storage is unavailable.
    }
  }

  function clearTerminal() {
    setShowIntro(false)
    setEntries([])
    setCommandHistory([])
    setHistoryIndex(null)
    setHistoryDraft('')
    setCurrentCommand('')
    clearTerminalState()
  }

  useEffect(() => {
    if (restoredTerminal || reduce) {
      setCompletedLines(lines.length)
      setCurrentCommand('')
      return
    }

    let cancelled = false

    async function typeText(text: string) {
      for (let index = 0; index < text.length; index += 1) {
        const character = text[index]!
        await sleep(typingDelay(character, index))
        if (cancelled) return
        playKeyTone(character === ' ' ? 'space' : 'key', false)
        setCurrentCommand((command) => command + character)
      }
    }

    async function backspace(count: number) {
      for (let index = 0; index < count; index += 1) {
        await sleep(78)
        if (cancelled) return
        playKeyTone('backspace', false)
        setCurrentCommand((command) => command.slice(0, -1))
      }
    }

    async function run() {
      setCompletedLines(0)
      setCurrentCommand('')
      await sleep(550)

      for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
        if (cancelled) return
        const line = lines[lineIndex]!
        const actions = line.actions ?? [{ type: 'type' as const, text: line.cmd }]

        for (const action of actions) {
          if (cancelled) return
          if (action.type === 'type') await typeText(action.text ?? '')
          if (action.type === 'pause') await sleep(action.duration ?? 0)
          if (action.type === 'backspace') await backspace(action.count ?? 0)
        }

        playKeyTone('enter', false)
        await sleep(160)
        if (cancelled) return
        setCompletedLines(lineIndex + 1)
        setCurrentCommand('')

        if (lineIndex < lines.length - 1) await sleep(520)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [reduce, restoredTerminal])

  useEffect(() => {
    if (!isIntroComplete || commandRunning) return

    if (!showIntro && entries.length === 0) {
      clearTerminalState()
      return
    }

    saveTerminalState({
      showIntro,
      entries,
      commandHistory,
      session,
    })
  }, [commandHistory, commandRunning, entries, isIntroComplete, session, showIntro])

  useEffect(() => () => {
    const context = audioContextRef.current
    if (context && context.state !== 'closed') void context.close()
  }, [])

  useEffect(() => {
    const terminalBody = terminalBodyRef.current
    if (terminalBody) terminalBody.scrollTop = terminalBody.scrollHeight
  }, [completedLines, currentCommand, entries])

  useEffect(() => {
    if (!helpOpen) return

    closeButtonRef.current?.focus()
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') closeHelp()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [helpOpen])

  async function runCommand(rawCommand: string) {
    const command = rawCommand.trim().replace(/\s+/g, ' ')
    if (!command) return

    const nextHistory = [...commandHistory, command]
    const prompt = isRoot ? '#' : terminalTheme.prompt
    setCommandHistory(nextHistory)
    setHistoryIndex(null)
    setHistoryDraft('')
    setCommandRunning(true)

    try {
      const result = await executeCommand(command, {
        session,
        history: nextHistory,
        theme: terminalTheme,
      })

      if (result.effect?.type === 'clear') {
        clearTerminal()
      } else {
        setEntries((currentEntries) => [
          ...currentEntries,
          { command, output: result.output, isError: result.isError, prompt },
        ])
      }

      if (result.session) setSession(result.session)

      if (result.effect?.type === 'help') {
        helpTriggerRef.current = 'input'
        setHelpOpen(true)
      }

      if (result.effect?.type === 'navigate') {
        const { destination } = result.effect
        const section = document.getElementById(destination)
        if (section) {
          window.history.pushState(null, '', `#${destination}`)
          window.setTimeout(
            () => section.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }),
            80,
          )
        }
      }
    } catch {
      setEntries((currentEntries) => [
        ...currentEntries,
        {
          command,
          output: [`${terminalTheme.shell}: the playground hit an unexpected error`],
          isError: true,
          prompt,
        },
      ])
    } finally {
      setCommandRunning(false)
    }
  }

  function handleSubmit() {
    if (commandRunning) return
    const command = currentCommand
    setCurrentCommand('')
    void runCommand(command)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!event.repeat && !event.ctrlKey && !event.metaKey && !event.altKey) {
      if (event.key === 'Enter') playKeyTone('enter')
      else if (event.key === 'Backspace' || event.key === 'Delete') playKeyTone('backspace')
      else if (event.key === ' ') playKeyTone('space')
      else if (event.key.length === 1 || ['Tab', 'ArrowUp', 'ArrowDown'].includes(event.key)) playKeyTone('key')
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      handleSubmit()
      return
    }

    if (event.key.toLowerCase() === 'l' && event.ctrlKey) {
      event.preventDefault()
      clearTerminal()
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (commandHistory.length === 0) return
      if (historyIndex === null) {
        setHistoryDraft(currentCommand)
        const nextIndex = commandHistory.length - 1
        setHistoryIndex(nextIndex)
        setCurrentCommand(commandHistory[nextIndex]!)
      } else {
        const nextIndex = Math.max(0, historyIndex - 1)
        setHistoryIndex(nextIndex)
        setCurrentCommand(commandHistory[nextIndex]!)
      }
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (historyIndex === null) return
      if (historyIndex >= commandHistory.length - 1) {
        setHistoryIndex(null)
        setCurrentCommand(historyDraft)
      } else {
        const nextIndex = historyIndex + 1
        setHistoryIndex(nextIndex)
        setCurrentCommand(commandHistory[nextIndex]!)
      }
      return
    }

    if (event.key === 'Tab') {
      event.preventDefault()
      const typed = currentCommand.toLowerCase()
      const candidates = getCompletionCandidates(session)
      const matches = candidates.filter((candidate) => candidate.startsWith(typed))
      if (matches.length === 1) setCurrentCommand(matches[0]!)
      if (matches.length > 1) setCurrentCommand(getCommonPrefix(matches))
    }
  }

  function closeHelp() {
    setHelpOpen(false)
    window.setTimeout(() => {
      const trigger = helpTriggerRef.current === 'input' ? inputRef.current : infoButtonRef.current
      trigger?.focus({ preventScroll: true })
    }, 0)
  }

  return (
    <section id="top" className="section flex min-h-screen flex-col justify-center pt-24">
      <motion.div
        initial={reduce ? false : { y: 12 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
        className="mx-auto w-full max-w-3xl"
      >
        <div
          className="portfolio-terminal overflow-hidden rounded-xl border border-ink-600/70 bg-ink-900/80 shadow-glow backdrop-blur"
          onClick={() => isIntroComplete && inputRef.current?.focus()}
          onPointerDown={prepareAudio}
          style={{
            ...terminalAccentStyle,
            boxShadow: `0 0 0 1px ${terminalTheme.accent}26, 0 0 24px -6px ${terminalTheme.accent}40`,
          }}
        >
          <div className="flex items-center gap-2 border-b border-ink-600/60 bg-ink-800/70 px-4 py-3">
            <ThemeIcon
              className="shrink-0"
              size={16}
              style={{ color: terminalTheme.iconColor }}
              aria-hidden="true"
            />
            <span className="truncate font-mono text-xs text-slate-500">
              {isRoot ? 'root' : profile.handle}@portfolio: ~ {terminalTheme.shell}
            </span>
            <select
              value={themePreference}
              aria-label="Terminal theme"
              title={`Terminal theme: ${terminalTheme.label}`}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => changeTerminalTheme(event.target.value)}
              className="terminal-accent-focus ml-auto w-24 shrink-0 rounded-md border border-ink-600 bg-ink-900 px-1.5 py-1 font-mono text-[11px] text-slate-400 outline-none transition hover:border-slate-500 focus-visible:ring-2 sm:w-32"
            >
              <option value="auto">Auto · {terminalThemes[detectedThemeId].label}</option>
              {terminalThemeIds.map((themeId) => (
                <option key={themeId} value={themeId}>
                  {terminalThemes[themeId].label}
                </option>
              ))}
            </select>
            <button
              type="button"
              aria-label={soundEnabled ? 'Mute terminal typing sounds' : 'Enable terminal typing sounds'}
              aria-pressed={soundEnabled}
              title={soundEnabled ? 'Mute terminal sounds' : 'Enable terminal sounds'}
              onClick={(event) => {
                event.stopPropagation()
                toggleSound()
              }}
              className={`terminal-accent-control terminal-accent-focus rounded-md p-1 transition hover:bg-ink-600/60 focus:outline-none focus-visible:ring-2 ${
                soundEnabled ? '' : 'text-slate-500'
              }`}
              style={soundEnabled ? { color: terminalTheme.accent } : undefined}
            >
              {soundEnabled ? <FiVolume2 size={17} /> : <FiVolumeX size={17} />}
            </button>
            <button
              ref={infoButtonRef}
              type="button"
              aria-label="Show terminal commands"
              aria-haspopup="dialog"
              aria-expanded={helpOpen}
              onClick={(event) => {
                event.stopPropagation()
                helpTriggerRef.current = 'info'
                setHelpOpen(true)
              }}
              className="terminal-accent-control terminal-accent-focus rounded-md p-1 text-slate-500 transition hover:bg-ink-600/60 focus:outline-none focus-visible:ring-2"
            >
              <FiInfo size={17} />
            </button>
            <div className="ml-1 flex shrink-0 items-center gap-2" aria-hidden="true">
              <span className="h-3 w-3 rounded-full bg-red-500/70" />
              <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
              <span className="h-3 w-3 rounded-full bg-green-500/70" />
            </div>
          </div>
          <div
            ref={terminalBodyRef}
            role="log"
            aria-label="Interactive portfolio terminal"
            className="h-72 overflow-y-auto p-5 font-mono text-sm sm:p-7 sm:text-base"
          >
            <div className="space-y-3">
              {showIntro && lines.slice(0, completedLines).map((line) => (
                <div key={line.cmd}>
                  <div className="text-slate-400">
                    <span style={{ color: terminalTheme.accent }}>{terminalTheme.prompt}</span>{' '}
                    {line.cmd}
                  </div>
                  <div className="pl-4 text-slate-100">{line.out}</div>
                </div>
              ))}

              {entries.map((entry, index) => (
                <div key={`${entry.command}-${index}`}>
                  <div className="text-slate-400">
                    <span
                      className={entry.prompt === '#' ? 'text-[#e95420]' : undefined}
                      style={entry.prompt === '#' ? undefined : { color: terminalTheme.accent }}
                    >
                      {entry.prompt}
                    </span>{' '}
                    {entry.command}
                  </div>
                  {entry.output.map((outputLine) => (
                    <div
                      key={outputLine}
                      className={`whitespace-pre-wrap pl-4 ${
                        entry.isError ? 'text-red-300' : 'text-slate-100'
                      }`}
                    >
                      {outputLine}
                    </div>
                  ))}
                </div>
              ))}

              <div className="flex min-w-0 items-center text-slate-400">
                <span
                  className={`mr-2 shrink-0 ${isRoot ? 'text-[#e95420]' : ''}`}
                  style={isRoot ? undefined : { color: terminalTheme.accent }}
                >
                  {isRoot ? '#' : terminalTheme.prompt}
                </span>
                {isIntroComplete ? (
                  <input
                    ref={inputRef}
                    value={currentCommand}
                    onChange={(event) => {
                      setCurrentCommand(event.target.value)
                      setHistoryIndex(null)
                    }}
                    onKeyDown={handleKeyDown}
                    aria-label="Terminal command"
                    aria-busy={commandRunning}
                    autoCapitalize="none"
                    autoComplete="off"
                    readOnly={commandRunning}
                    spellCheck={false}
                    placeholder={commandRunning ? 'running command…' : 'type “help” to begin'}
                    className="min-w-0 flex-1 border-0 bg-transparent p-0 font-mono text-slate-200 outline-none placeholder:text-slate-600"
                    style={{ caretColor: isRoot ? '#e95420' : terminalTheme.accent }}
                  />
                ) : (
                  <span>
                    {currentCommand}{' '}
                    <span
                      className="inline-block h-4 w-2 translate-y-0.5 animate-blink"
                      style={{ backgroundColor: isRoot ? '#e95420' : terminalTheme.accent }}
                    />
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a
            href="#projects"
            className="rounded-md bg-accent px-5 py-2.5 font-mono text-sm font-semibold text-ink-950 transition hover:bg-accent-soft"
          >
            view projects
          </a>
          <a
            href="#music"
            className="rounded-md border border-ink-600 px-5 py-2.5 font-mono text-sm text-slate-300 transition hover:border-accent/50 hover:text-accent"
          >
            listen to my music
          </a>
        </div>

        <div className="mt-6 flex items-center justify-center gap-4">
          {profile.socials
            .filter((social) => ['GitHub', 'LinkedIn', 'X', 'Medium', 'Email'].includes(social.label))
            .map((social) => (
              <a
                key={social.label}
                href={social.href}
                target={social.href.startsWith('http') ? '_blank' : undefined}
                rel="noreferrer"
                aria-label={social.label}
                className="text-slate-500 transition hover:text-accent"
              >
                <social.icon size={20} />
              </a>
            ))}
        </div>
      </motion.div>

      <AnimatePresence>
        {helpOpen && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-950/80 p-5 backdrop-blur-sm"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.currentTarget === event.target) closeHelp()
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="terminal-help-title"
              initial={reduce ? false : { opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ duration: 0.16 }}
              className="portfolio-terminal w-full max-w-lg overflow-hidden rounded-xl border border-ink-600 bg-ink-900"
              style={{
                ...terminalAccentStyle,
                boxShadow: `0 0 0 1px ${terminalTheme.accent}26, 0 0 24px -6px ${terminalTheme.accent}40`,
              }}
            >
              <div className="flex items-center border-b border-ink-600/70 bg-ink-800/80 px-5 py-4">
                <div>
                  <p className="terminal-accent-text font-mono text-xs">terminal manual</p>
                  <h2 id="terminal-help-title" className="mt-0.5 text-lg font-semibold text-slate-100">
                    Available commands
                  </h2>
                </div>
                <button
                  ref={closeButtonRef}
                  type="button"
                  aria-label="Close command guide"
                  onClick={closeHelp}
                  className="terminal-accent-focus ml-auto rounded-md p-1.5 text-slate-500 transition hover:bg-ink-600/60 hover:text-slate-100 focus:outline-none focus-visible:ring-2"
                >
                  <FiX size={20} />
                </button>
              </div>
              <div className="max-h-[70vh] overflow-y-auto p-5">
                <div className="space-y-1">
                  {commandGuide.map((item) => (
                    <div key={item.command} className="grid gap-1 rounded-lg px-3 py-2.5 sm:grid-cols-[9rem_1fr]">
                      <code className="font-mono text-sm" style={{ color: terminalTheme.accent }}>
                        {terminalTheme.prompt} {item.command}
                      </code>
                      <span className="text-sm text-slate-400">{item.description}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 border-t border-ink-600/70 pt-4 font-mono text-xs leading-6 text-slate-500">
                  <span className="text-slate-300">Tips:</span> use ↑/↓ for history, Tab to complete, Ctrl+L to clear,
                  and the speaker button to enable typing sounds.
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
