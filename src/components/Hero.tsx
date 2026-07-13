import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { profile } from '../data/profile'

const lines = [
  { prompt: '$', cmd: 'whoami', out: profile.name },
  { prompt: '$', cmd: 'cat role.txt', out: profile.headline },
  { prompt: '$', cmd: 'cat bio.txt', out: profile.tagline },
]

export default function Hero() {
  const reduce = useReducedMotion()
  const [visible, setVisible] = useState(reduce ? lines.length : 0)

  useEffect(() => {
    if (reduce) return
    if (visible >= lines.length) return
    const t = setTimeout(() => setVisible((v) => v + 1), 700)
    return () => clearTimeout(t)
  }, [visible, reduce])

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
            {lines.slice(0, visible).map((line, i) => (
              <div key={i}>
                <div className="text-slate-400">
                  <span className="text-accent">{line.prompt}</span> {line.cmd}
                </div>
                <div className="pl-4 text-slate-100">{line.out}</div>
              </div>
            ))}
            <div className="text-slate-400">
              <span className="text-accent">$</span>{' '}
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
