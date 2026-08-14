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
  const [progress, setProgress] = useState(0)
  const [activeSection, setActiveSection] = useState<string | null>(null)

  useEffect(() => {
    let frame: number | null = null

    const measure = () => {
      frame = null
      const scrollTop = window.scrollY
      const scrollable = document.documentElement.scrollHeight - window.innerHeight
      setScrolled(scrollTop > 24)
      setProgress(scrollable > 0 ? Math.min(1, Math.max(0, scrollTop / scrollable)) : 0)
    }

    const onScroll = () => {
      if (frame === null) frame = window.requestAnimationFrame(measure)
    }

    measure()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  // Sections mount lazily, so the observer is (re)attached to whichever targets exist.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActiveSection(visible.target.id)
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.25, 0.5, 1] },
    )

    const pending = new Set(sections.map((section) => section.id))
    const attach = () => {
      for (const id of pending) {
        const element = document.getElementById(id)
        if (element) {
          observer.observe(element)
          pending.delete(id)
        }
      }
      if (pending.size === 0) window.clearInterval(retry)
    }

    const retry = window.setInterval(attach, 400)
    attach()

    return () => {
      window.clearInterval(retry)
      observer.disconnect()
    }
  }, [])

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {/*
        The material is always present and fades in, rather than being toggled on.
        `transition-colors` never covered `backdrop-filter`, so the blur used to snap
        on at the scroll threshold. Nothing here affects layout, so arriving costs no
        reflow — and the bottom edge is a mask rather than a border, so content passes
        under the bar instead of meeting a seam.
      */}
      <div
        aria-hidden="true"
        className="nav-material scroll-edge-mask"
        style={{ opacity: scrolled ? 1 : 0 }}
      />

      <nav className="relative mx-auto grid max-w-5xl grid-cols-1 items-center px-5 py-4 sm:grid-cols-[1fr_auto_1fr] sm:px-8">
        <a href="#top" className="font-mono text-sm text-slate-200">
          <span className="text-accent">~/</span>
          {profile.handle}
        </a>
        <ul className="hidden items-center gap-6 font-mono text-sm text-slate-400 sm:flex">
          {sections.map((s) => {
            const isActive = activeSection === s.id
            return (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  aria-current={isActive ? 'true' : undefined}
                  className={`pressable relative inline-block py-1 transition-colors hover:text-accent ${
                    isActive ? 'text-accent' : ''
                  }`}
                >
                  <span className={isActive ? 'text-accent' : 'text-accent/60'}>#</span>
                  {s.label}
                  <span
                    aria-hidden="true"
                    className={`absolute inset-x-0 -bottom-0.5 h-px origin-left bg-accent transition-transform duration-200 ${
                      isActive ? 'scale-x-100' : 'scale-x-0'
                    }`}
                  />
                </a>
              </li>
            )
          })}
        </ul>
        <span className="hidden sm:block" aria-hidden="true" />
      </nav>

      {/* Reading position, rendered as a build-style progress rail. */}
      <div
        aria-hidden="true"
        className={`absolute inset-x-0 bottom-0 h-px origin-left bg-gradient-to-r from-accent/70 via-accent to-cyanx transition-opacity ${
          scrolled ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ transform: `scaleX(${progress})` }}
      />
    </header>
  )
}
