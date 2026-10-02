import { profile } from '../data/profile'

export default function Footer() {
  return (
    <footer className="border-t border-line bg-surface-2">
      <div className="wrap py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <a
              href="#top"
              className="inline-flex items-center gap-2.5 font-mono text-[15px] font-semibold text-heading"
            >
              <img src="/favicon.svg" alt="" width={24} height={24} className="h-6 w-6" />
              <span>
                <span className="text-accent">~/</span>
                {profile.handle}
              </span>
            </a>
            <p className="mt-2 max-w-sm text-sm text-muted">{profile.tagline}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {profile.socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target={s.href.startsWith('http') ? '_blank' : undefined}
                rel="noreferrer"
                aria-label={s.label}
                title={s.label}
                className="icon-btn"
              >
                <s.icon size={17} />
              </a>
            ))}
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-line-soft pt-6 text-13 text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {profile.name}
          </p>
          <p>
            This site uses Microsoft Clarity and Cloudflare Web Analytics to understand usage and
            improve the experience.
          </p>
        </div>
      </div>
    </footer>
  )
}
