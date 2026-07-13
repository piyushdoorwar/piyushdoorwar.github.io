import { motion } from 'framer-motion'
import { FaMedium, FaBook } from 'react-icons/fa6'
import { articles, books } from '../data/writing'

export default function Writing() {
  return (
    <section id="writing" className="section">
      <p className="section-label">// writing</p>
      <h2 className="section-title">Articles &amp; books</h2>

      <div className="grid gap-10 md:grid-cols-2">
        {/* Articles */}
        <div>
          <h3 className="mb-4 flex items-center gap-2 font-mono text-sm text-slate-500">
            <FaMedium /> articles
          </h3>
          <ul className="space-y-3">
            {articles.map((a) => (
              <motion.li
                key={a.title}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4 }}
              >
                <a href={a.href} target="_blank" rel="noreferrer" className="card block">
                  <p className="font-medium text-slate-100">{a.title}</p>
                  <p className="mt-1 font-mono text-xs text-slate-500">
                    {a.outlet} · {a.date}
                  </p>
                </a>
              </motion.li>
            ))}
          </ul>
        </div>

        {/* Books */}
        <div>
          <h3 className="mb-4 flex items-center gap-2 font-mono text-sm text-slate-500">
            <FaBook /> books
          </h3>
          {books.length === 0 ? (
            <div className="card text-sm text-slate-500">
              Books coming soon — links will appear here.
            </div>
          ) : (
            <ul className="space-y-3">
              {books.map((b) => (
                <li key={b.title}>
                  <a href={b.href} target="_blank" rel="noreferrer" className="card block">
                    <p className="font-medium text-slate-100">{b.title}</p>
                    {b.subtitle && (
                      <p className="mt-1 text-sm text-slate-400">{b.subtitle}</p>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
