import { motion, useReducedMotion } from 'framer-motion'
import { FaArrowUpRightFromSquare, FaGlobe } from 'react-icons/fa6'
import { projects } from '../data/projects'

export default function Projects() {
  const reduceMotion = useReducedMotion()

  return (
    <section id="projects" className="section">
      <p className="section-label">// projects</p>
      <h2 className="section-title">Things I've built</h2>

      <div className="grid gap-5 sm:grid-cols-2">
        {projects.map((p, i) => (
          <motion.article
            key={p.id}
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={
              reduceMotion ? { duration: 0 } : { duration: 0.45, delay: (i % 2) * 0.08 }
            }
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

            <div className="mt-4 flex justify-end border-t border-ink-600/50 pt-4">
              <a
                href={p.website}
                target="_blank"
                rel="noreferrer"
                aria-label={`Visit ${p.name} website`}
                className="inline-flex items-center gap-2 font-mono text-xs text-slate-400 transition hover:text-accent"
              >
                <FaGlobe size={16} />
                visit website
                <FaArrowUpRightFromSquare size={11} />
              </a>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  )
}
