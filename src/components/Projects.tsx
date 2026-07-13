import { motion } from 'framer-motion'
import {
  FaArrowUpRightFromSquare,
  FaChrome,
  FaDownload,
  FaGithub,
  FaGlobe,
  FaStar,
  FaUserGroup,
} from 'react-icons/fa6'
import { VscVscode } from 'react-icons/vsc'
import { projects } from '../data/projects'
import { stats, formatStat } from '../data/stats'

function ProjectLinkIcon({ label }: { label: string }) {
  if (label === 'GitHub') return <FaGithub size={19} />
  if (label === 'Marketplace') return <VscVscode size={21} />
  if (label === 'Chrome Web Store') return <FaChrome size={19} />
  if (label === 'Website') return <FaGlobe size={18} />
  return <FaArrowUpRightFromSquare size={16} />
}

function ProjectStats({ id }: { id: string }) {
  const s = stats.projects[id]
  if (!s) return null
  const installs = s.installs
  const downloads = s.downloads ?? s.npmDownloads
  const stars = s.stars
  const rating = s.rating

  const chips: { icon: JSX.Element; value: number | null | undefined; label: string }[] = [
    { icon: <FaStar />, value: stars, label: 'stars' },
    { icon: <FaDownload />, value: installs ?? downloads, label: installs != null ? 'installs' : 'downloads' },
    { icon: <FaUserGroup />, value: s.users, label: 'users' },
  ].filter((c) => c.value !== null && c.value !== undefined)

  if (chips.length === 0 && rating == null) return null

  return (
    <div className="flex flex-wrap gap-3 font-mono text-xs text-slate-400">
      {chips.map((c, i) => (
        <span key={i} className="inline-flex items-center gap-1.5 text-accent/90">
          {c.icon}
          <span className="text-slate-300">{formatStat(c.value)}</span>
          <span className="text-slate-600">{c.label}</span>
        </span>
      ))}
      {rating != null && (
        <span className="inline-flex items-center gap-1.5 text-accent/90">
          <FaStar />
          <span className="text-slate-300">{rating.toFixed(1)}</span>
          <span className="text-slate-600">
            {s.ratingCount != null ? `${formatStat(s.ratingCount)} ratings` : 'rating'}
          </span>
        </span>
      )}
    </div>
  )
}

export default function Projects() {
  return (
    <section id="projects" className="section">
      <p className="section-label">// projects</p>
      <h2 className="section-title">Things I've built</h2>

      <div className="grid gap-5 sm:grid-cols-2">
        {projects.map((p, i) => (
          <motion.article
            key={p.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.45, delay: (i % 2) * 0.08 }}
            className={`card flex flex-col ${p.featured ? 'sm:col-span-2' : ''}`}
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-100">{p.name}</h3>
              <span className="tag whitespace-nowrap">{p.kind}</span>
            </div>
            <p className="text-sm font-medium text-accent/90">{p.tagline}</p>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">{p.description}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {p.tags.map((t) => (
                <span key={t} className="tag">
                  {t}
                </span>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between gap-4 border-t border-ink-600/50 pt-4">
              <ProjectStats id={p.id} />
              <div className="ml-auto flex items-center gap-3">
                {p.links.map((l) => (
                  <a
                    key={l.label}
                    href={l.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${p.name} on ${l.label}`}
                    title={l.label === 'Marketplace' ? 'VS Code Marketplace' : l.label}
                    className="inline-flex items-center justify-center text-slate-400 transition hover:text-accent"
                  >
                    <ProjectLinkIcon label={l.label} />
                  </a>
                ))}
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  )
}
