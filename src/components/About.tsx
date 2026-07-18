import { useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { IconType } from 'react-icons'
import {
  FaArrowsSplitUpAndLeft,
  FaAws,
  FaBrain,
  FaCodeBranch,
  FaCubesStacked,
  FaDatabase,
  FaDiagramProject,
  FaEye,
  FaLayerGroup,
  FaPlug,
  FaRoute,
  FaSitemap,
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
import CertificationModal from './CertificationModal'

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
