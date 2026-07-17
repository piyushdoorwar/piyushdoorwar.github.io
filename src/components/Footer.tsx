import { profile } from '../data/profile'

export default function Footer() {
  return (
    <footer className="border-t border-ink-600/50 bg-ink-950/60">
      <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
          <div>
            <p className="font-mono text-sm text-slate-300">
              <span className="text-accent">~/</span>
              {profile.handle}
            </p>
            <p className="mt-1 text-sm text-slate-500">{profile.tagline}</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5">
            {profile.socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target={s.href.startsWith('http') ? '_blank' : undefined}
                rel="noreferrer"
                aria-label={s.label}
                title={s.label}
                className="text-slate-500 transition hover:text-accent"
              >
                <s.icon size={20} />
              </a>
            ))}
          </div>
        </div>

        <p className="mt-8 border-t border-ink-600/50 pt-6 text-center font-mono text-xs text-slate-500">
          This site uses Microsoft Clarity and Cloudflare Web Analytics to understand usage and
          improve the experience.
        </p>
      </div>
    </footer>
  )
}
