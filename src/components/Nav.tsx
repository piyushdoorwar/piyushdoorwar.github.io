import { useEffect, useState } from 'react'
import { FaGithub } from 'react-icons/fa6'
import { FiMenu, FiX } from 'react-icons/fi'
import { profile } from '../data/profile'

const sections = [
  { id: 'about', label: 'About' },
  { id: 'experience', label: 'Experience' },
  { id: 'projects', label: 'Projects' },
  { id: 'writing', label: 'Writing' },
  { id: 'music', label: 'Music' },
]

const github = profile.socials.find((social) => social.label === 'GitHub')

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [progress, setProgress] = useState(0)
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

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

  // The mobile sheet closes on Escape and whenever the layout grows past it.
  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    const desktop = window.matchMedia('(min-width: 768px)')
    const onChange = () => desktop.matches && setMenuOpen(false)
    document.addEventListener('keydown', onKeyDown)
    desktop.addEventListener('change', onChange)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      desktop.removeEventListener('change', onChange)
    }
  }, [menuOpen])

  return (
    <header
      className={`topbar sticky top-0 z-50 border-b transition-colors duration-300 ${
        scrolled || menuOpen ? 'border-line' : 'border-transparent'
      }`}
    >
      <a
        href="#main"
        className="btn btn-primary btn-sm absolute left-3 top-[-48px] z-100 focus:top-3"
      >
        Skip to content
      </a>

      <nav aria-label="Main" className="wrap flex h-16 items-center gap-6">
        <a
          href="#top"
          className="pressable inline-flex items-center gap-2.5 font-mono text-[15px] font-semibold text-heading"
          onClick={() => setMenuOpen(false)}
        >
          <img src="/favicon.svg" alt="" width={28} height={28} className="h-7 w-7" />
          <span>
            <span className="text-accent">~/</span>
            {profile.handle}
          </span>
        </a>

        <ul className="ml-auto hidden items-center gap-1 md:flex">
          {sections.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                aria-current={activeSection === s.id ? 'true' : undefined}
                className="nav-link"
              >
                {s.label}
              </a>
            </li>
          ))}
          {github && (
            <li className="ml-2">
              <a
                href={github.href}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary btn-sm"
              >
                <FaGithub aria-hidden="true" size={16} />
                GitHub
              </a>
            </li>
          )}
        </ul>

        <button
          type="button"
          className="icon-btn ml-auto md:hidden"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <FiX size={20} /> : <FiMenu size={20} />}
        </button>
      </nav>

      {menuOpen && (
        <div
          id="mobile-nav"
          className="absolute inset-x-0 top-16 border-b border-line bg-surface shadow-e2 md:hidden"
        >
          <ul className="wrap flex flex-col gap-0.5 pb-4 pt-2.5">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  aria-current={activeSection === s.id ? 'true' : undefined}
                  className="nav-link w-full py-[11px]"
                  onClick={() => setMenuOpen(false)}
                >
                  {s.label}
                </a>
              </li>
            ))}
            {github && (
              <li className="mt-1.5">
                <a
                  href={github.href}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary w-full"
                >
                  <FaGithub aria-hidden="true" size={16} />
                  GitHub
                </a>
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Reading position, rendered as a build-style progress rail. */}
      <div
        aria-hidden="true"
        className={`absolute inset-x-0 -bottom-px h-px origin-left bg-accent transition-opacity ${
          scrolled ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ transform: `scaleX(${progress})` }}
      />
    </header>
  )
}
