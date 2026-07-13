import { motion } from 'framer-motion'
import { profile } from '../data/profile'

export default function About() {
  return (
    <section id="about" className="section">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.5 }}
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

          <div className="space-y-4">
            <div className="card">
              <p className="font-mono text-xs text-accent">location</p>
              <p className="mt-1 text-slate-200">{profile.location}</p>
            </div>
            <div className="card">
              <p className="font-mono text-xs text-accent">currently</p>
              <p className="mt-1 text-slate-200">{profile.company}</p>
            </div>
          </div>
        </div>

        <div className="mt-10">
          <p className="mb-3 font-mono text-sm text-slate-500">stack &amp; tools</p>
          <div className="flex flex-wrap gap-2">
            {profile.stack.map((item) => (
              <span key={item} className="tag">
                {item}
              </span>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  )
}
