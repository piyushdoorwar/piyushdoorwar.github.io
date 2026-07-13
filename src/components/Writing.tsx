import { useState } from 'react'
import { motion } from 'framer-motion'
import { FaMedium, FaBook, FaHandsClapping, FaRegComment, FaArrowRight } from 'react-icons/fa6'
import { articles, books, medium, type Article } from '../data/writing'

const PAGE_SIZE = 4

function formatDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function ArticleCard({ a }: { a: Article }) {
  return (
    <a href={a.url} target="_blank" rel="noreferrer" className="card group flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <h4 className="font-semibold text-slate-100 transition group-hover:text-accent">
          {a.title}
        </h4>
        <FaArrowRight className="mt-1 shrink-0 text-slate-600 transition group-hover:text-accent" />
      </div>

      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-400">{a.subtitle}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {a.tags.slice(0, 3).map((t) => (
          <span key={t} className="tag">
            {t}
          </span>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-ink-600/50 pt-3 font-mono text-xs text-slate-500">
        <span>{formatDate(a.publishedAt)}</span>
        <span>{a.readingTimeMin} min read</span>
        {a.claps != null && (
          <span className="inline-flex items-center gap-1 text-accent/90">
            <FaHandsClapping /> {a.claps}
          </span>
        )}
        {a.comments != null && (
          <span className="inline-flex items-center gap-1 text-cyanx">
            <FaRegComment /> {a.comments}
          </span>
        )}
      </div>
    </a>
  )
}

export default function Writing() {
  const [page, setPage] = useState(0)
  const pageCount = Math.max(1, Math.ceil(articles.length / PAGE_SIZE))
  const pageItems = articles.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  return (
    <section id="writing" className="section">
      <p className="section-label">// writing</p>
      <h2 className="section-title">Articles &amp; books</h2>

      {/* Articles */}
      <div className="mb-14">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-mono text-sm text-slate-500">
            <FaMedium /> articles on Medium
            {medium.hasEngagement && (
              <span className="text-slate-600">· sorted by claps</span>
            )}
          </h3>
          <a
            href="https://medium.com/@piyushdoorwar"
            target="_blank"
            rel="noreferrer"
            className="font-mono text-xs text-slate-500 transition hover:text-accent"
          >
            view all →
          </a>
        </div>

        <motion.div
          key={page}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="grid gap-4 sm:grid-cols-2"
        >
          {pageItems.map((a) => (
            <ArticleCard key={a.id ?? a.url} a={a} />
          ))}
        </motion.div>

        {pageCount > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2 font-mono text-sm">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-md border border-ink-600 px-3 py-1.5 text-slate-300 transition hover:border-accent/50 hover:text-accent disabled:cursor-not-allowed disabled:opacity-30"
            >
              ← prev
            </button>
            {Array.from({ length: pageCount }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                aria-label={`Page ${i + 1}`}
                className={`h-8 w-8 rounded-md border transition ${
                  i === page
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-ink-600 text-slate-400 hover:border-accent/50'
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={page === pageCount - 1}
              className="rounded-md border border-ink-600 px-3 py-1.5 text-slate-300 transition hover:border-accent/50 hover:text-accent disabled:cursor-not-allowed disabled:opacity-30"
            >
              next →
            </button>
          </div>
        )}
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
          <div className="grid gap-4 sm:grid-cols-2">
            {books.map((b) => (
              <a
                key={b.title}
                href={b.href}
                target="_blank"
                rel="noreferrer"
                className="card block"
              >
                <p className="font-medium text-slate-100">{b.title}</p>
                {b.subtitle && <p className="mt-1 text-sm text-slate-400">{b.subtitle}</p>}
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
