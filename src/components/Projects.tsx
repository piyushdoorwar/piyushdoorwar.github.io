import { motion, useReducedMotion } from 'framer-motion'
import type { IconType } from 'react-icons'
import { FaArrowUpRightFromSquare, FaChrome, FaCube, FaDesktop, FaToolbox } from 'react-icons/fa6'
import { SiGnome } from 'react-icons/si'
import { VscVscode } from 'react-icons/vsc'
import { projects, type ProjectKind } from '../data/projects'
import { springSettle } from '../motion'
import SectionHeading from './SectionHeading'

const kindIcons: Record<ProjectKind, IconType> = {
  'Desktop App': FaDesktop,
  'VS Code Extension': VscVscode,
  'Chrome Extension': FaChrome,
  'GNOME Extension': SiGnome,
  Toolkit: FaToolbox,
  Library: FaCube,
}

export default function Projects() {
  const reduceMotion = useReducedMotion()

  return (
    <section id="projects" className="section">
      <SectionHeading label="projects" title="Things I've built" />

      <div className="grid gap-4 sm:grid-cols-2">
        {projects.map((p, i) => {
          const KindIcon = kindIcons[p.kind]
          return (
            <motion.article
              key={p.id}
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={
                reduceMotion ? { duration: 0 } : { ...springSettle, delay: (i % 2) * 0.06 }
              }
              className={`card card-interactive flex flex-col ${p.featured ? 'sm:col-span-2' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="icon-tile">
                  <KindIcon aria-hidden="true" size={18} />
                </span>
                <span className="badge badge-neutral">{p.kind}</span>
              </div>

              <h3 className="mt-4 text-[17px] font-semibold tracking-title">{p.name}</h3>
              <p className="mt-1 text-sm font-medium text-accent">{p.tagline}</p>
              <p className="mt-2 flex-1 text-[15px] leading-relaxed text-muted">{p.description}</p>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-4">
                <div className="flex flex-wrap gap-1.5">
                  {p.tags.map((t) => (
                    <span key={t} className="tag px-2 py-0.5 text-xs">
                      {t}
                    </span>
                  ))}
                </div>
                <a
                  href={p.website}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Visit ${p.name} website`}
                  className="btn btn-secondary btn-sm ml-auto"
                >
                  Website
                  <FaArrowUpRightFromSquare aria-hidden="true" size={11} />
                </a>
              </div>
            </motion.article>
          )
        })}
      </div>
    </section>
  )
}
