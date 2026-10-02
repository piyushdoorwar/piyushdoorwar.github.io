import { motion, useReducedMotion } from 'framer-motion'
import { FaBoxOpen, FaDownload, FaPuzzlePiece, FaStar } from 'react-icons/fa6'
import { stats } from '../data/stats'
import { projects } from '../data/projects'
import Counter from './Counter'
import { springSettle } from '../motion'
import SectionHeading from './SectionHeading'
import VisitorMap from './VisitorMap'

export default function StatsOverview() {
  const reduceMotion = useReducedMotion()
  const items = [
    { label: 'GitHub stars', value: stats.totals.stars, icon: FaStar },
    { label: 'Extension installs', value: stats.totals.installs, icon: FaPuzzlePiece },
    { label: 'Downloads', value: stats.totals.downloads, icon: FaDownload },
    { label: 'Projects shipped', value: projects.length, icon: FaBoxOpen },
  ]

  return (
    <section id="stats" className="section">
      <motion.div
        id="impact"
        className="scroll-mt-20"
        initial={reduceMotion ? false : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={reduceMotion ? { duration: 0 } : springSettle}
      >
        <SectionHeading
          label="impact"
          title="Things people are using"
          actions={
            <span className="badge badge-neutral">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
              {stats.generatedAt
                ? `Updated ${new Date(stats.generatedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}`
                : 'Awaiting refresh'}
            </span>
          }
        />

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {items.map((item) => (
            <div key={item.label} className="card flex flex-col gap-4 p-5 sm:p-6">
              <span className="icon-tile">
                <item.icon aria-hidden="true" size={17} />
              </span>
              <div>
                <div className="font-mono text-3xl font-bold tabular-nums tracking-tight text-heading sm:text-4xl">
                  <Counter value={item.value} />
                </div>
                <div className="mt-1 text-13 text-muted sm:text-sm">{item.label}</div>
              </div>
            </div>
          ))}
        </div>

        <VisitorMap />
      </motion.div>
    </section>
  )
}
