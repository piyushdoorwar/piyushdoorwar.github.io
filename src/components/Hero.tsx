import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { profile } from '../data/profile'

interface TypeAction {
  type: 'type' | 'pause' | 'backspace'
  text?: string
  count?: number
  duration?: number
}

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

export default function Hero() {
  const reduce = useReducedMotion()
  const [completedLines, setCompletedLines] = useState(reduce ? lines.length : 0)
  const [currentCommand, setCurrentCommand] = useState('')

  useEffect(() => {
    if (reduce) {
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
        setCurrentCommand((command) => command + character)
      }
    }

    async function backspace(count: number) {
      for (let index = 0; index < count; index += 1) {
        await sleep(78)
        if (cancelled) return
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

        // A shell responds almost immediately once Enter is pressed.
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
  }, [reduce])

  return (
    <section id="top" className="section flex min-h-screen flex-col justify-center pt-24">
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mx-auto w-full max-w-3xl"
      >
        {/* Terminal window */}
        <div className="overflow-hidden rounded-xl border border-ink-600/70 bg-ink-900/80 shadow-glow backdrop-blur">
          <div className="flex items-center gap-2 border-b border-ink-600/60 bg-ink-800/70 px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-red-500/70" />
            <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
            <span className="h-3 w-3 rounded-full bg-green-500/70" />
            <span className="ml-3 font-mono text-xs text-slate-500">
              {profile.handle}@portfolio — zsh
            </span>
          </div>
          <div className="space-y-3 p-5 font-mono text-sm sm:p-7 sm:text-base">
            {lines.slice(0, completedLines).map((line, i) => (
              <div key={i}>
                <div className="text-slate-400">
                  <span className="text-accent">$</span> {line.cmd}
                </div>
                <div className="pl-4 text-slate-100">{line.out}</div>
              </div>
            ))}
            <div className="text-slate-400">
              <span className="text-accent">$</span> {completedLines < lines.length && currentCommand}
              {' '}
              <span className="inline-block h-4 w-2 translate-y-0.5 bg-accent animate-blink" />
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
            .filter((s) => ['GitHub', 'LinkedIn', 'X', 'Medium', 'Email'].includes(s.label))
            .map((s) => (
              <a
                key={s.label}
                href={s.href}
                target={s.href.startsWith('http') ? '_blank' : undefined}
                rel="noreferrer"
                aria-label={s.label}
                className="text-slate-500 transition hover:text-accent"
              >
                <s.icon size={20} />
              </a>
            ))}
        </div>
      </motion.div>
    </section>
  )
}
