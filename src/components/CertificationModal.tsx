import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { PanInfo } from 'framer-motion'
import type { IconType } from 'react-icons'
import {
  FaArrowLeft,
  FaArrowRight,
  FaArrowUpRightFromSquare,
  FaGoogle,
  FaLinkedin,
  FaMicrosoft,
  FaXmark,
} from 'react-icons/fa6'
import {
  SiAnthropic,
  SiHackerrank,
  SiNewrelic,
  SiPluralsight,
  SiUdemy,
} from 'react-icons/si'
import type { Certification } from '../data/certifications'

interface CertificationModalProps {
  skill: string
  certifications: Certification[]
  reduceMotion: boolean | null
  onClose: () => void
  returnFocusRef: { current: HTMLButtonElement | null }
}

interface CredentialPreviewProps {
  certification: Certification
}

const providerIcons: Record<string, IconType> = {
  Anthropic: SiAnthropic,
  Google: FaGoogle,
  HackerRank: SiHackerrank,
  LinkedIn: FaLinkedin,
  Microsoft: FaMicrosoft,
  'New Relic': SiNewrelic,
  Pluralsight: SiPluralsight,
  Udemy: SiUdemy,
}

function ProviderLogo({ provider }: { provider: string }) {
  const Icon = providerIcons[provider]

  return (
    <span
      aria-hidden="true"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-900/20 bg-emerald-900/[0.06] font-mono text-sm font-bold uppercase"
    >
      {Icon ? <Icon size={17} /> : provider.slice(0, 1)}
    </span>
  )
}

function CredentialPreview({ certification }: CredentialPreviewProps) {
  const preview = (
    <div className="group relative aspect-[16/10] overflow-hidden rounded-xl border border-emerald-900/20 bg-[#edf4ef] p-5 text-emerald-950 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.8)] sm:p-8">
      <div
        aria-hidden="true"
        className="absolute -right-20 -top-24 h-64 w-64 rounded-full border-[32px] border-emerald-900/[0.04]"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-16 -left-12 h-40 w-40 rotate-12 border-[18px] border-emerald-900/[0.035]"
      />

      {certification.previewImage ? (
        <img
          src={certification.previewImage}
          alt={`${certification.name} certificate`}
          draggable="false"
          className="absolute inset-0 h-full w-full object-contain"
        />
      ) : (
        <div className="relative flex h-full flex-col">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 pr-12">
              <ProviderLogo provider={certification.provider} />
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] sm:text-xs">
                credential record
              </span>
            </div>
          </div>

          <div className="my-auto py-4 sm:py-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-900/55 sm:text-xs">
              {certification.provider} certifies
            </p>
            <h3 className="mt-2 max-w-2xl text-xl font-bold leading-tight sm:text-3xl lg:text-4xl">
              {certification.name}
            </h3>
          </div>

          <div className="grid grid-cols-[0.8fr_1.2fr] gap-4 border-t border-emerald-900/15 pt-3 font-mono text-[9px] sm:pt-4 sm:text-xs">
            <div>
              <p className="uppercase tracking-wider text-emerald-950/45">issued</p>
              <p className="mt-1 font-semibold">{certification.issued}</p>
            </div>
            <div className="min-w-0">
              <p className="uppercase tracking-wider text-emerald-950/45">credential ID</p>
              <p className="mt-1 truncate font-semibold">{certification.credentialId}</p>
            </div>
          </div>
        </div>
      )}

      {certification.credentialUrl && (
        <span className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-emerald-900/15 bg-white/80 text-emerald-950 shadow-sm transition group-hover:-translate-y-0.5 group-focus-visible:-translate-y-0.5 sm:right-4 sm:top-4">
          <FaArrowUpRightFromSquare aria-hidden="true" size={13} />
        </span>
      )}
    </div>
  )

  if (!certification.credentialUrl) return preview

  return (
    <a
      href={certification.credentialUrl}
      target="_blank"
      rel="noreferrer"
      aria-label={`Open ${certification.name} credential in a new tab`}
      draggable="false"
      onDragStart={(event) => event.preventDefault()}
      className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/80 focus-visible:ring-offset-4 focus-visible:ring-offset-ink-900"
    >
      {preview}
    </a>
  )
}

export default function CertificationModal({
  skill,
  certifications,
  reduceMotion,
  onClose,
  returnFocusRef,
}: CertificationModalProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const activeCertification = certifications[activeIndex]
  const hasMultiple = certifications.length > 1

  function moveBy(amount: number) {
    if (!hasMultiple) return

    setDirection(amount > 0 ? 1 : -1)
    setActiveIndex((current) => (current + amount + certifications.length) % certifications.length)
  }

  function moveTo(index: number) {
    if (index === activeIndex) return
    setDirection(index > activeIndex ? 1 : -1)
    setActiveIndex(index)
  }

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    const swipeIntent = Math.abs(info.offset.x) > 60 || Math.abs(info.velocity.x) > 500
    if (!swipeIntent) return
    moveBy(info.offset.x < 0 ? 1 : -1)
  }

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        moveBy(-1)
        return
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        moveBy(1)
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) return

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      )
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      returnFocusRef.current?.focus()
    }
  }, [certifications.length, hasMultiple, onClose, returnFocusRef])

  if (!activeCertification) return null

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-950/85 p-3 backdrop-blur-sm sm:p-6"
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose()
      }}
    >
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="certifications-title"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.975, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.975, y: 10 }}
        transition={reduceMotion ? { duration: 0 } : { duration: 0.18 }}
        className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-accent/30 bg-ink-900 shadow-glow"
      >
        <header className="flex flex-none items-start border-b border-ink-600/70 bg-ink-800/70 px-5 py-4 sm:px-7 sm:py-5">
          <div className="min-w-0">
            <p className="font-mono text-xs text-accent">verified skill</p>
            <div className="mt-1 flex items-baseline gap-3">
              <h2 id="certifications-title" className="truncate text-xl font-semibold text-slate-100 sm:text-2xl">
                {skill}
              </h2>
              <span className="shrink-0 font-mono text-xs text-slate-500">
                {activeIndex + 1} / {certifications.length}
              </span>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close certifications"
            onClick={onClose}
            className="ml-auto rounded-md p-2 text-slate-500 transition hover:bg-ink-600/60 hover:text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
          >
            <FaXmark aria-hidden="true" size={20} />
          </button>
        </header>

        <div
          role="group"
          aria-roledescription="carousel"
          aria-label={`${skill} certifications`}
          className="relative min-h-0 overflow-hidden"
        >
          <p className="sr-only" aria-live="polite">
            Showing certification {activeIndex + 1} of {certifications.length}:{' '}
            {activeCertification.name}
          </p>

          <AnimatePresence initial={false} mode="wait">
            <motion.article
              key={`${activeCertification.name}-${activeCertification.credentialId}`}
              aria-label={`${activeIndex + 1} of ${certifications.length}: ${activeCertification.name}`}
              drag={hasMultiple ? 'x' : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.08}
              dragMomentum={false}
              onDragEnd={handleDragEnd}
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, x: direction * 44 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? { opacity: 1 } : { opacity: 0, x: direction * -44 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.18, ease: 'easeOut' }}
              className={`max-h-[70vh] overflow-y-auto p-4 sm:p-6 lg:p-7 ${
                hasMultiple ? 'cursor-grab active:cursor-grabbing' : ''
              }`}
            >
              <div className="mx-auto w-full max-w-3xl">
                <CredentialPreview certification={activeCertification} />
                <p className="mt-2 text-center font-mono text-[10px] text-slate-600 sm:text-xs">
                  {activeCertification.credentialUrl
                    ? 'select the frame to open the verified credential'
                    : 'credential link unavailable'}
                </p>
              </div>
            </motion.article>
          </AnimatePresence>
        </div>

        {hasMultiple && (
          <footer className="flex flex-none items-center justify-between gap-4 border-t border-ink-600/70 bg-ink-800/50 px-5 py-3 sm:px-7">
            <button
              type="button"
              onClick={() => moveBy(-1)}
              aria-label="Previous certification"
              className="flex h-10 w-10 items-center justify-center rounded-md border border-ink-600 text-slate-400 transition hover:border-accent/50 hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
            >
              <FaArrowLeft aria-hidden="true" size={14} />
            </button>

            <div className="flex items-center gap-2" aria-label="Choose certification">
              {certifications.map((certification, index) => (
                <button
                  key={`${certification.name}-${certification.credentialId}`}
                  type="button"
                  onClick={() => moveTo(index)}
                  aria-label={`Show certification ${index + 1}: ${certification.name}`}
                  aria-current={index === activeIndex ? 'true' : undefined}
                  className={`h-2.5 rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-800 ${
                    index === activeIndex ? 'w-7 bg-accent' : 'w-2.5 bg-ink-600 hover:bg-slate-500'
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => moveBy(1)}
              aria-label="Next certification"
              className="flex h-10 w-10 items-center justify-center rounded-md border border-ink-600 text-slate-400 transition hover:border-accent/50 hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/70"
            >
              <FaArrowRight aria-hidden="true" size={14} />
            </button>
          </footer>
        )}
      </motion.div>
    </motion.div>
  )
}
