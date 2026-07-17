import { motion, useReducedMotion } from 'framer-motion'
import { stats } from '../data/stats'
import { projects } from '../data/projects'
import Counter from './Counter'

export default function StatsOverview() {
  const reduceMotion = useReducedMotion()
  const items = [
    { label: 'GitHub stars', value: stats.totals.stars },
    { label: 'Extension installs', value: stats.totals.installs },
    { label: 'Downloads', value: stats.totals.downloads },
    { label: 'Projects shipped', value: projects.length },
  ]

  return (
    <section id="stats" className="section">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.5 }}
      >
        <p className="section-label">// impact</p>
        <h2 className="section-title">Things people are using</h2>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {items.map((item) => (
            <div key={item.label} className="card text-center">
              <div className="font-mono text-3xl font-bold text-accent sm:text-4xl">
                <Counter value={item.value} />
              </div>
              <div className="mt-2 text-xs text-slate-500 sm:text-sm">{item.label}</div>
            </div>
          ))}
        </div>

        <p className="mt-4 text-center font-mono text-xs text-slate-600">
          {stats.generatedAt
            ? `checked daily · last changed ${new Date(stats.generatedAt).toLocaleDateString()}`
            : 'checked daily · updates when totals change'}
        </p>
      </motion.div>
    </section>
  )
}
