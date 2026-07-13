import { useEffect, useState } from 'react'
import { profile } from '../data/profile'

const sections = [
  { id: 'about', label: 'about' },
  { id: 'experience', label: 'experience' },
  { id: 'projects', label: 'projects' },
  { id: 'writing', label: 'writing' },
  { id: 'music', label: 'music' },
]

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors ${
        scrolled ? 'border-b border-ink-600/60 bg-ink-950/80 backdrop-blur-md' : 'bg-transparent'
      }`}
    >
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
        <a href="#top" className="font-mono text-sm text-slate-200">
          <span className="text-accent">~/</span>
          {profile.handle}
        </a>
        <ul className="hidden items-center gap-6 font-mono text-sm text-slate-400 sm:flex">
          {sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="transition hover:text-accent">
                <span className="text-accent/60">#</span>
                {s.label}
              </a>
            </li>
          ))}
        </ul>
        <a
          href={profile.socials.find((s) => s.label === 'GitHub')?.href}
          target="_blank"
          rel="noreferrer"
          className="rounded-md border border-accent/40 px-3 py-1.5 font-mono text-xs text-accent transition hover:bg-accent/10"
        >
          GitHub
        </a>
      </nav>
    </header>
  )
}
