import { FiArrowRight } from 'react-icons/fi'
import { MCP_PAGE_PATH } from '../agent/endpoints'
import { profile } from '../data/profile'
import RouteLink from './RouteLink'

interface FooterProps {
  /** The MCP page itself has no use for a link back to the MCP page. */
  hideMcpLink?: boolean
}

export default function Footer({ hideMcpLink = false }: FooterProps) {
  return (
    <footer className="border-t border-line bg-surface-2">
      <div className="wrap py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <RouteLink
              href="/#top"
              className="inline-flex items-center gap-2.5 font-mono text-[15px] font-semibold text-heading"
            >
              <img src="/favicon.svg" alt="" width={24} height={24} className="h-6 w-6" />
              <span>
                <span className="text-accent">~/</span>
                {profile.handle}
              </span>
            </RouteLink>
            <p className="mt-2 max-w-sm text-sm text-muted">{profile.tagline}</p>
            {!hideMcpLink && (
              <RouteLink
                href={MCP_PAGE_PATH}
                className="group mt-3 inline-flex items-center gap-1.5 font-mono text-13 text-accent hover:text-accent-soft"
              >
                Ask your AI about me: connect via MCP
                <FiArrowRight
                  aria-hidden="true"
                  size={14}
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </RouteLink>
            )}
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
