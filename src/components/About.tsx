import { useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { IconType } from 'react-icons'
import {
  FaArrowsSplitUpAndLeft,
  FaAward,
  FaAws,
  FaBrain,
  FaCodeBranch,
  FaCubesStacked,
  FaDatabase,
  FaDiagramProject,
  FaEnvelope,
  FaEye,
  FaLayerGroup,
  FaLocationDot,
  FaPlug,
  FaRoute,
  FaSitemap,
  FaUserTie,
} from 'react-icons/fa6'
import {
  SiApachejmeter,
  SiApachekafka,
  SiClaude,
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
import { getCertificationsForSkill } from '../data/certifications'
import { profile } from '../data/profile'
import { springSettle } from '../motion'
import CertificationModal from './CertificationModal'
import SectionHeading from './SectionHeading'

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
  Claude: SiClaude,
  'AI Fundamentals': FaBrain,
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

const facts = [
  { label: 'Location', value: profile.location, icon: FaLocationDot },
  { label: 'Role', value: profile.headline, icon: FaUserTie },
  { label: 'Email', value: profile.email, icon: FaEnvelope, href: `mailto:${profile.email}` },
]

export default function About() {
  const reduceMotion = useReducedMotion()
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const selectedCertifications = selectedSkill
    ? getCertificationsForSkill(selectedSkill)
    : []

  return (
    <section id="about" className="section">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={reduceMotion ? { duration: 0 } : springSettle}
      >
        <SectionHeading label="about" title="Who I am" />

        <div className="grid grid-cols-[minmax(0,1fr)] gap-8 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] md:gap-12">
          <div className="space-y-4">
            {profile.about.map((para, i) => (
              <p key={i} className="max-w-[60ch] text-[17px] leading-relaxed text-body">
                {para}
              </p>
            ))}
          </div>

          <dl className="card min-w-0 self-start divide-y divide-line-soft p-0">
            {facts.map((fact) => (
              <div key={fact.label} className="flex items-center gap-3 px-5 py-3.5">
                <fact.icon aria-hidden="true" className="shrink-0 text-accent" size={14} />
                <dt className="w-20 shrink-0 text-13 text-muted">{fact.label}</dt>
                <dd className="min-w-0 truncate text-sm font-medium text-heading">
                  {fact.href ? (
                    <a href={fact.href} className="transition-colors hover:text-accent">
                      {fact.value}
                    </a>
                  ) : (
                    fact.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-14">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h3 className="subhead">Stack &amp; tools</h3>
            <p className="inline-flex items-center gap-2 text-13 text-muted">
              <span className="tag-button pointer-events-none px-1.5 py-0.5" aria-hidden="true">
                <FaAward size={12} />
              </span>
              Certified — select to view credentials
            </p>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
            {profile.skillGroups.map((group) => (
              <div key={group.title} className="card p-0">
                <div className="flex items-center justify-between border-b border-line-soft px-5 py-3.5">
                  <h4 className="text-sm font-semibold">{group.title}</h4>
                  <span className="badge badge-neutral">{group.items.length}</span>
                </div>
                <div className="flex flex-wrap gap-2 p-5">
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
                          className="pressable tag-button"
                        >
                          {Icon && <Icon aria-hidden="true" size={14} />}
                          <span>{item}</span>
                          <FaAward aria-hidden="true" size={11} className="opacity-70" />
                        </button>
                      )
                    }

                    return (
                      <span key={item} className="tag">
                        {Icon && <Icon aria-hidden="true" className="text-accent/80" size={14} />}
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
          <CertificationModal
            skill={selectedSkill}
            certifications={selectedCertifications}
            reduceMotion={reduceMotion}
            onClose={() => setSelectedSkill(null)}
            returnFocusRef={triggerRef}
          />
        )}
      </AnimatePresence>
    </section>
  )
}
