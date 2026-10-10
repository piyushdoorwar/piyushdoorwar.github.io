import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  FaAmazon,
  FaArrowLeft,
  FaArrowRight,
  FaArrowUpRightFromSquare,
  FaBook,
  FaHandsClapping,
  FaMedium,
  FaRegComment,
} from 'react-icons/fa6'
import { articles, books, medium, type Article, type Book } from '../data/writing'
import { useDragScroll } from '../hooks/useDragScroll'
import { nearestPoint, springSettle } from '../motion'
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
        <h4 className="line-clamp-2 text-[17px] font-semibold leading-6 tracking-title transition-colors group-hover:text-accent">
          {a.title}
        </h4>
        <FaArrowUpRightFromSquare
          aria-hidden="true"
          size={12}
          className="mt-1.5 shrink-0 text-hint transition-colors group-hover:text-accent"
        />
      </div>

      <p className="mt-2 h-11 shrink-0 overflow-hidden text-sm leading-5.5 text-muted">
        <span className="line-clamp-2">{a.subtitle}</span>
      </p>

      <div className="mt-3 flex h-21 shrink-0 content-start flex-wrap gap-1.5 overflow-hidden sm:h-15">
        {a.tags.slice(0, 3).map((t) => (
          <span key={t} className="tag px-2 py-0.5 text-xs">
            {t}
          </span>
        ))}
      </div>

      <div className="mt-auto flex min-h-8 shrink-0 items-start gap-3 border-t border-line-soft pt-3 text-xs text-muted">
        <div className="flex min-w-0 flex-wrap gap-x-4 gap-y-1">
          <span>{formatDate(a.publishedAt)}</span>
          <span>{a.readingTimeMin} min read</span>
        </div>
        <div className="ml-auto flex min-w-22 shrink-0 items-center justify-end gap-3">
          {a.claps != null && (
            <span className="inline-flex items-center gap-1 font-medium text-accent">
              <FaHandsClapping aria-hidden="true" /> {a.claps}
            </span>
          )}
          {a.comments != null && (
            <span className="inline-flex items-center gap-1 font-medium text-body">
              <FaRegComment aria-hidden="true" /> {a.comments}
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
        <div className="flex h-72 items-center justify-center overflow-hidden border-b border-line bg-surface-2 p-4">
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
          <span className="truncate font-mono text-xs text-accent">{label}</span>
          <FaAmazon
            aria-hidden="true"
            className="shrink-0 text-lg text-muted transition-colors group-hover:text-accent"
          />
        </div>
        <p className="mt-3 line-clamp-3 min-h-18 font-semibold leading-6 tracking-title text-heading transition-colors group-hover:text-accent">
          {b.title}
        </p>
        {b.subtitle && (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">
            {b.subtitle}
          </p>
        )}
      </div>
    </a>
  )
}

function BookShelf({ reduceMotion }: { reduceMotion: boolean | null }) {
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(books.length > 1)

  /** Slides are `snap-start`, so each rests with its own left edge at the shelf's. */
  const getSnapPoints = useCallback((shelf: HTMLDivElement) => {
    const shelfRect = shelf.getBoundingClientRect()
    return [...shelf.querySelectorAll<HTMLElement>('[data-book-slide]')].map(
      (slide) => shelf.scrollLeft + (slide.getBoundingClientRect().left - shelfRect.left),
    )
  }, [])

  const {
    ref: shelfRef,
    isDragging,
    stopAnimation,
    animateTo,
    dragHandlers,
  } = useDragScroll(getSnapPoints, Boolean(reduceMotion))

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

  /** Steps one slide along, springing to the same snap points a flick would land on. */
  function scrollOneBook(direction: -1 | 1) {
    const shelf = shelfRef.current
    if (!shelf) return

    const points = getSnapPoints(shelf)
    const current = nearestPoint(points, shelf.scrollLeft)
    const index = points.indexOf(current)
    const next = points[Math.min(points.length - 1, Math.max(0, index + direction))]

    if (next !== undefined) animateTo(next)
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h3 className="subhead">
          <FaBook aria-hidden="true" /> Books
          <span className="badge badge-neutral ml-1">{books.length}</span>
        </h3>
        <div className="flex items-center gap-2">
          <span className="mr-1 hidden text-13 text-muted sm:inline">Drag or swipe</span>
          <button
            type="button"
            onClick={() => scrollOneBook(-1)}
            disabled={!canScrollLeft}
            aria-label="Previous book"
            className="icon-btn icon-btn-sm"
          >
            <FaArrowLeft aria-hidden="true" size={13} />
          </button>
          <button
            type="button"
            onClick={() => scrollOneBook(1)}
            disabled={!canScrollRight}
            aria-label="Next book"
            className="icon-btn icon-btn-sm"
          >
            <FaArrowRight aria-hidden="true" size={13} />
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
          onWheel={stopAnimation}
          onTouchStart={stopAnimation}
          {...dragHandlers}
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
          <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-linear-to-r from-ink-950 to-transparent" />
        )}
        {canScrollRight && (
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-linear-to-l from-ink-950 to-transparent" />
        )}
      </div>
    </>
  )
}

export default function Writing() {
  const reduceMotion = useReducedMotion()
  const [page, setPage] = useState(0)
  // Which way the pages are being turned, so a page can leave the side it is headed
  // for and arrive from the side it came from.
  const [direction, setDirection] = useState(1)
  const pageCount = Math.max(1, Math.ceil(articles.length / PAGE_SIZE))
  const pageItems = articles.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  function goToPage(next: number) {
    const target = Math.max(0, Math.min(pageCount - 1, next))
    if (target === page) return
    setDirection(target > page ? 1 : -1)
    setPage(target)
  }

  return (
    <section id="writing" className="section">
      <SectionHeading label="writing" title="Articles & books" />

      {/* Articles */}
      <div className="mb-14">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="subhead">
            <FaMedium aria-hidden="true" /> Articles on Medium
            {medium.hasEngagement && (
              <span className="badge badge-neutral ml-1">Sorted by claps</span>
            )}
          </h3>
          <a
            href="https://medium.com/@piyushdoorwar"
            target="_blank"
            rel="noreferrer"
            className="btn btn-secondary btn-sm"
          >
            View all
            <FaArrowUpRightFromSquare aria-hidden="true" size={11} />
          </a>
        </div>

        {/*
          `popLayout` takes the outgoing page out of flow so the incoming one occupies
          its place immediately: the two cross rather than queue, which keeps a page
          turn to one spring instead of two back to back. The grid's own `min-h` holds
          the height while both are present.
        */}
        <div className="relative">
          <AnimatePresence initial={false} mode="popLayout" custom={direction}>
            <motion.div
              key={page}
              custom={direction}
              initial={reduceMotion ? false : { opacity: 0, x: direction * 44 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: direction * -44 }}
              transition={reduceMotion ? { duration: 0 } : springSettle}
              className="grid min-h-332 auto-rows-80 gap-4 sm:min-h-140 sm:grid-cols-2 sm:auto-rows-68"
            >
              {pageItems.map((a) => (
                <ArticleCard key={a.id ?? a.url} a={a} />
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {pageCount > 1 && (
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => goToPage(page - 1)}
              disabled={page === 0}
              className="btn btn-secondary btn-sm"
            >
              <FaArrowLeft aria-hidden="true" size={12} />
              Previous
            </button>
            <span className="min-w-26 text-center text-13 tabular-nums text-muted" aria-live="polite">
              Page {page + 1} of {pageCount}
            </span>
            <button
              type="button"
              onClick={() => goToPage(page + 1)}
              disabled={page === pageCount - 1}
              className="btn btn-secondary btn-sm"
            >
              Next
              <FaArrowRight aria-hidden="true" size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Books */}
      <div>
        {books.length === 0 ? (
          <>
            <h3 className="subhead mb-4">
              <FaBook aria-hidden="true" /> Books
            </h3>
            <div className="card text-sm text-muted">
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
