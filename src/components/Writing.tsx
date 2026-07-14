import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { FaAmazon, FaMedium, FaBook, FaHandsClapping, FaRegComment, FaArrowRight } from 'react-icons/fa6'
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
    <a href={a.url} target="_blank" rel="noreferrer" className="card group flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-start justify-between gap-3 overflow-hidden">
        <h4 className="line-clamp-2 font-semibold leading-6 text-slate-100 transition group-hover:text-accent">
          {a.title}
        </h4>
        <FaArrowRight className="mt-1 shrink-0 text-slate-600 transition group-hover:text-accent" />
      </div>

      <p className="mt-2 h-11 shrink-0 overflow-hidden text-sm leading-[1.375rem] text-slate-400">
        <span className="line-clamp-2">{a.subtitle}</span>
      </p>

      <div className="mt-3 flex h-[5.25rem] shrink-0 content-start flex-wrap gap-1.5 overflow-hidden sm:h-[3.75rem]">
        {a.tags.slice(0, 3).map((t) => (
          <span key={t} className="tag">
            {t}
          </span>
        ))}
      </div>

      <div className="mt-auto flex min-h-8 shrink-0 items-start gap-3 border-t border-ink-600/50 pt-2.5 font-mono text-xs text-slate-500">
        <div className="flex min-w-0 flex-wrap gap-x-4 gap-y-1">
          <span>{formatDate(a.publishedAt)}</span>
          <span>{a.readingTimeMin} min read</span>
        </div>
        <div className="ml-auto flex min-w-[5.5rem] shrink-0 items-center justify-end gap-3">
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
      </div>
    </a>
  )
}

export default function Writing() {
  const reduceMotion = useReducedMotion()
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
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.35 }}
          className="grid min-h-[83rem] auto-rows-[20rem] gap-4 sm:min-h-[37rem] sm:grid-cols-2 sm:auto-rows-[18rem]"
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
            <span className="px-2 text-xs text-slate-500" aria-live="polite">
              page {page + 1} of {pageCount}
            </span>
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
          <div className="grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {books.map((b) => (
              <a
                key={b.title}
                href={b.href}
                target="_blank"
                rel="noreferrer"
                className="card group flex h-full flex-col overflow-hidden p-0"
              >
                {b.cover && (
                  <div className="flex h-72 items-center justify-center overflow-hidden border-b border-ink-600/60 bg-ink-950/60 p-4">
                    <img
                      src={b.cover}
                      alt={`${b.title} cover`}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-auto max-w-full object-contain shadow-2xl transition duration-500 group-hover:scale-[1.025]"
                    />
                  </div>
                )}
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-mono text-xs text-accent/80">amazon / book</span>
                    <FaAmazon
                      aria-hidden="true"
                      className="shrink-0 text-xl text-slate-500 transition group-hover:text-accent"
                    />
                  </div>
                  <p className="mt-3 line-clamp-3 min-h-[4.5rem] font-semibold leading-6 text-slate-100 transition group-hover:text-accent">
                    {b.title}
                  </p>
                  {b.subtitle && (
                    <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-400">
                      {b.subtitle}
                    </p>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
