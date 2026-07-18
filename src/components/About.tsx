import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { IconType } from 'react-icons'
import {
  FaArrowsSplitUpAndLeft,
  FaAws,
  FaCodeBranch,
  FaCubesStacked,
  FaArrowUpRightFromSquare,
  FaCertificate,
  FaDatabase,
  FaDiagramProject,
  FaEye,
  FaLayerGroup,
  FaPlug,
  FaRoute,
  FaSitemap,
  FaXmark,
} from 'react-icons/fa6'
import {
  SiApachejmeter,
  SiApachekafka,
  SiCouchbase,
  SiDatadog,
  SiDocker,
  SiDotnet,
  SiGit,
  SiGithubactions,
  SiGooglecloud,
  SiGraphql,
  SiJavascript,
  SiJira,
  SiMongodb,
  SiNewrelic,
  SiNodedotjs,
  SiPostgresql,
  SiPostman,
  SiPython,
  SiRedis,
  SiReact,
  SiTypescript,
} from 'react-icons/si'
import { VscAzure, VscAzureDevops } from 'react-icons/vsc'
import { profile } from '../data/profile'
import { getCertificationsForSkill } from '../data/certifications'

const stackIcons: Record<string, IconType> = {
  'C#': SiDotnet,
  Python: SiPython,
  TypeScript: SiTypescript,
  JavaScript: SiJavascript,
  '.NET 10': SiDotnet,
  'ASP.NET Core': SiDotnet,
  'Entity Framework Core': FaDatabase,
  'Node.js': SiNodedotjs,
  React: SiReact,
  'Minimal APIs': FaPlug,
  'Microsoft Azure': VscAzure,
  'Azure DevOps': VscAzureDevops,
  AWS: FaAws,
  'Google Cloud': SiGooglecloud,
  'Microsoft SQL Server': FaDatabase,
  PostgreSQL: SiPostgresql,
  Redis: SiRedis,
  MongoDB: SiMongodb,
  Couchbase: SiCouchbase,
  'Apache Kafka': SiApachekafka,
  Docker: SiDocker,
  Git: SiGit,
  'GitHub Actions': SiGithubactions,
  'CI/CD': FaCodeBranch,
  'System Design': FaSitemap,
  'REST APIs': FaPlug,
  GraphQL: SiGraphql,
  Microservices: FaDiagramProject,
  'Domain-Driven Design': FaCubesStacked,
  CQRS: FaArrowsSplitUpAndLeft,
  'Event-Driven Architecture': FaRoute,
  'Design Patterns': FaLayerGroup,
  Observability: FaEye,
  'New Relic': SiNewrelic,
  Datadog: SiDatadog,
  Postman: SiPostman,
  Jira: SiJira,
  'Apache JMeter': SiApachejmeter,
}

export default function About() {
  const reduceMotion = useReducedMotion()
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const selectedCertifications = selectedSkill
    ? getCertificationsForSkill(selectedSkill)
    : []

  function closeCertifications() {
    setSelectedSkill(null)
  }

  useEffect(() => {
    if (!selectedSkill) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeCertifications()
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) return

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      )
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      triggerRef.current?.focus()
    }
  }, [selectedSkill])

  return (
    <section id="about" className="section">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.5 }}
      >
        <p className="section-label">// about</p>
        <h2 className="section-title">Who I am</h2>

        <div className="grid gap-10 md:grid-cols-3">
          <div className="space-y-4 md:col-span-2">
            {profile.about.map((para, i) => (
              <p key={i} className="leading-relaxed text-slate-400">
                {para}
              </p>
            ))}
          </div>

          <div className="card self-start">
            <p className="font-mono text-xs text-accent">location</p>
            <p className="mt-1 text-slate-200">{profile.location}</p>
          </div>
        </div>

        <div className="mt-10">
          <p className="mb-3 font-mono text-sm text-slate-500">stack &amp; tools</p>
          <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
            {profile.skillGroups.map((group) => (
              <div key={group.title}>
                <h3 className="mb-2 font-mono text-xs font-medium text-accent/80">
                  {group.title}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {group.items.map((item) => {
                    const Icon = stackIcons[item]
                    const itemCertifications = getCertificationsForSkill(item)

                    if (itemCertifications.length > 0) {
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={(event) => {
                            triggerRef.current = event.currentTarget
                            setSelectedSkill(item)
                          }}
                          aria-label={`View ${itemCertifications.length} ${
                            itemCertifications.length === 1 ? 'certification' : 'certifications'
                          } for ${item}`}
                          className="certified-tag group inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-xs"
                        >
                          {Icon && <Icon aria-hidden="true" size={14} />}
                          <span>{item}</span>
                          <FaCertificate
                            aria-hidden="true"
                            className="ml-0.5 text-[11px] opacity-80 transition group-hover:opacity-100"
                          />
                        </button>
                      )
                    }

                    return (
                      <span key={item} className="tag inline-flex items-center gap-1.5">
                        {Icon && <Icon aria-hidden="true" className="text-accent/75" size={14} />}
                        {item}
                      </span>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {selectedSkill && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-950/85 p-4 backdrop-blur-sm sm:p-6"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.currentTarget === event.target) closeCertifications()
            }}
          >
            <motion.div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="certifications-title"
              initial={reduceMotion ? false : { opacity: 0, scale: 0.97, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 10 }}
              transition={{ duration: 0.16 }}
              className="w-full max-w-2xl overflow-hidden rounded-xl border border-accent/30 bg-ink-900 shadow-glow"
            >
              <div className="flex items-start border-b border-ink-600/70 bg-ink-800/70 px-5 py-4 sm:px-6">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-accent">verified skill</p>
                  <h2
                    id="certifications-title"
                    className="mt-1 truncate text-xl font-semibold text-slate-100"
                  >
                    {selectedSkill}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedCertifications.length}{' '}
                    {selectedCertifications.length === 1 ? 'certification' : 'certifications'}
                  </p>
                </div>
                <button
                  ref={closeButtonRef}
                  type="button"
                  aria-label="Close certifications"
                  onClick={closeCertifications}
                  className="ml-auto rounded-md p-2 text-slate-500 transition hover:bg-ink-600/60 hover:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
                >
                  <FaXmark aria-hidden="true" size={20} />
                </button>
              </div>

              <div className="max-h-[70vh] space-y-3 overflow-y-auto p-5 sm:p-6">
                {selectedCertifications.map((certification) => (
                  <article
                    key={`${certification.name}-${certification.credentialId}`}
                    className="rounded-lg border border-ink-600/80 bg-ink-800/55 p-4 sm:p-5"
                  >
                    <div className="flex gap-3">
                      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-accent/25 bg-accent/10 text-accent">
                        <FaCertificate aria-hidden="true" size={17} />
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-semibold leading-snug text-slate-100">
                          {certification.name}
                        </h3>
                        <p className="mt-1 font-mono text-xs text-accent/80">
                          {certification.provider}
                        </p>
                      </div>
                    </div>

                    <dl className="mt-4 grid gap-3 border-t border-ink-600/60 pt-4 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="font-mono text-xs text-slate-500">issued</dt>
                        <dd className="mt-1 text-slate-300">{certification.issued}</dd>
                      </div>
                      <div>
                        <dt className="font-mono text-xs text-slate-500">credential ID</dt>
                        <dd className="mt-1 break-all font-mono text-xs text-slate-300">
                          {certification.credentialId}
                        </dd>
                      </div>
                    </dl>

                    {certification.credentialUrl && (
                      <a
                        href={certification.credentialUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-4 inline-flex items-center gap-2 rounded-md border border-accent/30 bg-accent/10 px-3 py-2 font-mono text-xs font-medium text-accent transition hover:border-accent/60 hover:bg-accent/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
                      >
                        show credential
                        <FaArrowUpRightFromSquare aria-hidden="true" size={11} />
                      </a>
                    )}
                    {!certification.credentialUrl && (
                      <p className="mt-4 font-mono text-xs text-slate-600">
                        credential link unavailable
                      </p>
                    )}
                  </article>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
