import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { FiArrowRight, FiHelpCircle, FiTerminal, FiX } from 'react-icons/fi'
import { FaMusic } from 'react-icons/fa6'
import { FaAndroid, FaApple, FaLinux, FaWindows } from 'react-icons/fa'
import { profile } from '../data/profile'
import { springSettle } from '../motion'
import {
  commandGuide,
  createInitialShellSession,
  executeCommand,
  getCompletionCandidates,
} from '../terminal/commandRegistry'
import {
  detectTerminalTheme,
  terminalThemes,
  type TerminalThemeId,
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

const terminalThemeIcons = {
  linux: FaLinux,
  apple: FaApple,
  windows: FaWindows,
  android: FaAndroid,
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
  const inputRef = useRef<HTMLInputElement>(null)
  const terminalBodyRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const soundEnabledRef = useRef(false)
  const isIntroComplete = completedLines === lines.length
  const isRoot = session.isRoot
  const terminalTheme = terminalThemes[detectedThemeId]
  const ThemeIcon = terminalThemeIcons[detectedThemeId]
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

  function setTerminalSound(enabled: boolean) {
    soundEnabledRef.current = enabled
    setSoundEnabled(enabled)
    if (enabled) playKeyTone('key')
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
        soundEnabled,
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
        setHelpOpen(true)
      }

      if (result.effect?.type === 'sound') {
        setTerminalSound(result.effect.enabled)
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
      inputRef.current?.focus({ preventScroll: true })
    }, 0)
  }

  return (
    <section
      id="top"
      className="wrap flex min-h-[calc(100svh-4rem)] scroll-mt-20 flex-col justify-center py-12 sm:py-16"
    >
      <h1 className="sr-only">
        {profile.name} — {profile.headline}
      </h1>
      <motion.div
        initial={reduce ? false : { y: 12 }}
        animate={{ y: 0 }}
        transition={reduce ? { duration: 0 } : springSettle}
        className="relative mx-auto w-full max-w-3xl"
      >
        <div className="mb-6 flex justify-center">
          <p className="pill">
            <span className="pill-badge inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
              {profile.location}
            </span>
            {profile.headline}
          </p>
        </div>

        {/* Ambient bloom so the terminal reads as floating in the grid, not pasted onto it. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-x-16 -top-10 h-64 opacity-50 blur-3xl"
          style={{
            background: `radial-gradient(50% 60% at 50% 50%, ${terminalTheme.accent}24, transparent 70%)`,
          }}
        />

        <div
          className="portfolio-terminal panel relative bg-surface-2"
          onClick={() => isIntroComplete && inputRef.current?.focus()}
          onPointerDown={prepareAudio}
          style={{
            ...terminalAccentStyle,
            borderColor: `${terminalTheme.accent}52`,
            boxShadow: `0 0 0 1px ${terminalTheme.accent}14, 0 2px 4px rgba(0,0,0,0.35), 0 28px 56px -24px rgba(0,0,0,0.85), 0 0 32px -12px ${terminalTheme.accent}40`,
          }}
        >
          <div className="panel-head bg-surface">
            <div className="flex shrink-0 items-center gap-1.5" aria-hidden="true">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]/80" />
            </div>
            <div className="mx-auto flex h-7 min-w-0 max-w-sm flex-1 items-center justify-center gap-2 rounded border border-line bg-surface-2 px-3">
              <ThemeIcon
                className="shrink-0"
                size={13}
                style={{ color: terminalTheme.iconColor }}
                aria-hidden="true"
              />
              <span className="truncate font-mono text-xs text-muted">
                {isRoot ? 'root' : profile.handle}@portfolio: ~ {terminalTheme.shell}
              </span>
            </div>
            <button
              type="button"
              className="icon-btn icon-btn-sm terminal-accent-control border-transparent bg-transparent shadow-none"
              aria-label="Show terminal commands"
              title="Commands"
              onClick={(event) => {
                event.stopPropagation()
                setHelpOpen(true)
              }}
            >
              <FiHelpCircle size={16} aria-hidden="true" />
            </button>
          </div>
          <div
            ref={terminalBodyRef}
            role="log"
            aria-label="Interactive portfolio terminal"
            className="h-72 overflow-y-auto p-5 font-mono text-sm leading-relaxed sm:h-80 sm:p-7 sm:text-[15px]"
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
                    className="min-w-0 flex-1 border-0 bg-transparent p-0 font-mono text-slate-200 outline-none placeholder:text-hint"
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
          <a href="#projects" className="btn btn-primary flex-1 sm:flex-none">
            View projects
            <FiArrowRight aria-hidden="true" size={17} />
          </a>
          <a href="#music" className="btn btn-secondary flex-1 sm:flex-none">
            <FaMusic aria-hidden="true" size={15} className="text-accent" />
            Listen to my music
          </a>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2">
          {profile.socials
            .filter((social) => ['GitHub', 'LinkedIn', 'X', 'Medium', 'Email'].includes(social.label))
            .map((social) => (
              <a
                key={social.label}
                href={social.href}
                target={social.href.startsWith('http') ? '_blank' : undefined}
                rel="noreferrer"
                aria-label={social.label}
                title={social.label}
                className="icon-btn"
              >
                <social.icon size={17} />
              </a>
            ))}
        </div>
      </motion.div>

      <AnimatePresence>
        {helpOpen && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-950/80 p-4 backdrop-blur-md"
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
              transition={reduce ? { duration: 0 } : springSettle}
              className="portfolio-terminal panel w-full max-w-[44rem]"
              style={terminalAccentStyle}
            >
              <div className="flex items-center gap-4 border-b border-line bg-surface-2 px-5 py-4">
                <span className="icon-tile">
                  <FiTerminal size={19} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h2 id="terminal-help-title" className="text-lg font-semibold">
                    Available commands
                  </h2>
                  <p className="text-13 text-muted">Type any of these into the terminal.</p>
                </div>
                <button
                  ref={closeButtonRef}
                  type="button"
                  aria-label="Close command guide"
                  onClick={closeHelp}
                  className="icon-btn ml-auto"
                >
                  <FiX size={18} />
                </button>
              </div>
              <div className="max-h-[70vh] overflow-y-auto">
                <dl className="divide-y divide-line-soft">
                  {commandGuide.map((item) => (
                    <div
                      key={item.command}
                      className="grid gap-y-1 px-5 py-3 transition-colors hover:bg-white/[0.02] sm:grid-cols-[15rem_1fr] sm:gap-x-6"
                    >
                      <dt>
                        <code
                          className="whitespace-nowrap font-mono text-13"
                          style={{ color: terminalTheme.accent }}
                        >
                          {terminalTheme.prompt} {item.command}
                        </code>
                      </dt>
                      <dd className="text-sm text-muted">{item.description}</dd>
                    </div>
                  ))}
                </dl>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line bg-surface-2 px-5 py-3.5 text-13 text-muted">
                  <span className="font-semibold text-heading">Tips</span>
                  <span><kbd className="kbd">↑</kbd> <kbd className="kbd">↓</kbd> history</span>
                  <span><kbd className="kbd">Tab</kbd> complete</span>
                  <span><kbd className="kbd">Ctrl</kbd> <kbd className="kbd">L</kbd> clear</span>
                  <span>
                    <code className="terminal-accent-text font-mono">sound on</code> typing sounds
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
