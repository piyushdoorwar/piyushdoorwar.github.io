import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { FaAmazon, FaMedium, FaBook, FaHandsClapping, FaRegComment, FaArrowRight } from 'react-icons/fa6'
import { articles, books, medium, type Article, type Book } from '../data/writing'
import SectionHeading from './SectionHeading'

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
    <a
      href={a.url}
      target="_blank"
      rel="noreferrer"
      className="card card-interactive group flex h-full flex-col"
    >
      <div className="flex h-12 shrink-0 items-start justify-between gap-3 overflow-hidden">
        <h4 className="line-clamp-2 font-semibold leading-6 text-slate-100 transition group-hover:text-accent">
          {a.title}
        </h4>
        <FaArrowRight className="mt-1 shrink-0 text-hint transition group-hover:text-accent" />
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

      <div className="mt-auto flex min-h-8 shrink-0 items-start gap-3 border-t border-ink-600/50 pt-2.5 font-mono text-xs text-slate-400">
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

function BookCard({ book: b }: { book: Book }) {
  const label = b.collection
    ? `series / ${b.collection.replace(/^The /, '').replace(/ Series$/, '')}`
    : 'amazon / book'

  return (
    <a
      href={b.href}
      target="_blank"
      rel="noreferrer"
      className="card card-interactive group flex h-full flex-col overflow-hidden p-0"
    >
      {b.cover && (
        <div className="flex h-72 items-center justify-center overflow-hidden border-b border-ink-600/60 bg-ink-950/60 p-4">
          <img
            src={b.cover}
            alt={`${b.title} cover`}
            width={1000}
            height={1600}
            loading="lazy"
            decoding="async"
            className="h-full w-auto max-w-full object-contain shadow-2xl transition duration-500 group-hover:scale-[1.025]"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <span className="truncate font-mono text-xs text-accent/80">{label}</span>
          <FaAmazon
            aria-hidden="true"
            className="shrink-0 text-xl text-slate-400 transition group-hover:text-accent"
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
  )
}

function BookShelf({ reduceMotion }: { reduceMotion: boolean | null }) {
  const shelfRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef({ pointerId: -1, startX: 0, scrollLeft: 0, moved: false })
  const [isDragging, setIsDragging] = useState(false)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(books.length > 1)

  function updateScrollState() {
    const shelf = shelfRef.current
    if (!shelf) return
    const maxScrollLeft = shelf.scrollWidth - shelf.clientWidth
    setCanScrollLeft(shelf.scrollLeft > 2)
    setCanScrollRight(shelf.scrollLeft < maxScrollLeft - 2)
  }

  useEffect(() => {
    const shelf = shelfRef.current
    if (!shelf) return

    updateScrollState()
    const observer = new ResizeObserver(updateScrollState)
    observer.observe(shelf)
    return () => observer.disconnect()
  }, [])

  function scrollOneBook(direction: -1 | 1) {
    const shelf = shelfRef.current
    const firstBook = shelf?.querySelector<HTMLElement>('[data-book-slide]')
    if (!shelf || !firstBook) return

    const gap = Number.parseFloat(window.getComputedStyle(shelf).columnGap) || 16
    shelf.scrollBy({
      left: direction * (firstBook.offsetWidth + gap),
      behavior: reduceMotion ? 'auto' : 'smooth',
    })
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    const shelf = shelfRef.current
    if (event.pointerType !== 'mouse' || event.button !== 0 || !shelf) return

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: shelf.scrollLeft,
      moved: false,
    }
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const shelf = shelfRef.current
    const drag = dragRef.current
    if (!shelf || event.pointerId !== drag.pointerId) return

    const distance = event.clientX - drag.startX
    if (Math.abs(distance) > 5 && !drag.moved) {
      drag.moved = true
      shelf.setPointerCapture(event.pointerId)
      setIsDragging(true)
    }
    if (!drag.moved) return

    event.preventDefault()
    shelf.scrollLeft = drag.scrollLeft - distance
  }

  function finishDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const shelf = shelfRef.current
    if (event.pointerId !== dragRef.current.pointerId) return

    if (shelf?.hasPointerCapture(event.pointerId)) shelf.releasePointerCapture(event.pointerId)
    dragRef.current.pointerId = -1
    setIsDragging(false)

    window.setTimeout(() => {
      dragRef.current.moved = false
    }, 0)
  }

  function handleClickCapture(event: ReactMouseEvent<HTMLDivElement>) {
    if (!dragRef.current.moved) return
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h3 className="flex items-center gap-2 font-mono text-sm text-slate-400">
          <FaBook /> books
        </h3>
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="mr-1 hidden text-hint sm:inline">drag / swipe</span>
          <button
            type="button"
            onClick={() => scrollOneBook(-1)}
            disabled={!canScrollLeft}
            aria-label="Previous book"
            className="rounded-md border border-ink-600 px-3 py-1.5 text-slate-300 transition hover:border-accent/50 hover:text-accent disabled:cursor-not-allowed disabled:opacity-30"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => scrollOneBook(1)}
            disabled={!canScrollRight}
            aria-label="Next book"
            className="rounded-md border border-ink-600 px-3 py-1.5 text-slate-300 transition hover:border-accent/50 hover:text-accent disabled:cursor-not-allowed disabled:opacity-30"
          >
            →
          </button>
        </div>
      </div>

      <div className="relative">
        <div
          ref={shelfRef}
          className={`book-carousel flex gap-4 overflow-x-auto overscroll-x-contain pb-4 select-none ${
            isDragging ? 'cursor-grabbing snap-none' : 'cursor-grab snap-x snap-mandatory'
          }`}
          role="region"
          aria-label="Books carousel"
          tabIndex={0}
          onScroll={updateScrollState}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
          onClickCapture={handleClickCapture}
        >
          {books.map((book, index) => (
            <div
              key={book.href}
              data-book-slide
              className="w-[82vw] max-w-[20rem] shrink-0 snap-start sm:w-80"
              role="group"
              aria-label={`${index + 1} of ${books.length}: ${book.title}`}
            >
              <BookCard book={book} />
            </div>
          ))}
        </div>

        {canScrollLeft && (
          <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-ink-950 to-transparent" />
        )}
        {canScrollRight && (
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-ink-950 to-transparent" />
        )}
      </div>
    </>
  )
}

export default function Writing() {
  const reduceMotion = useReducedMotion()
  const [page, setPage] = useState(0)
  const pageCount = Math.max(1, Math.ceil(articles.length / PAGE_SIZE))
  const pageItems = articles.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  return (
    <section id="writing" className="section">
      <SectionHeading label="writing" title="Articles & books" />

      {/* Articles */}
      <div className="mb-14">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-mono text-sm text-slate-400">
            <FaMedium /> articles on Medium
            {medium.hasEngagement && (
              <span className="text-hint">· sorted by claps</span>
            )}
          </h3>
          <a
            href="https://medium.com/@piyushdoorwar"
            target="_blank"
            rel="noreferrer"
            className="font-mono text-xs text-slate-400 transition hover:text-accent"
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
            <span className="px-2 text-xs text-slate-400" aria-live="polite">
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
        {books.length === 0 ? (
          <>
            <h3 className="mb-4 flex items-center gap-2 font-mono text-sm text-slate-400">
              <FaBook /> books
            </h3>
            <div className="card text-sm text-slate-400">
              Books coming soon — links will appear here.
            </div>
          </>
        ) : (
          <BookShelf reduceMotion={reduceMotion} />
        )}
      </div>
    </section>
  )
}
