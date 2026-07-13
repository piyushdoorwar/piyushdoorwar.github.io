import { useState } from 'react'
import { motion } from 'framer-motion'
import { FaAward } from 'react-icons/fa6'
import { experiences, type Experience as Exp, type Position } from '../data/experience'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function parseYM(ym: string): [number, number] {
  const [y, m] = ym.split('-').map(Number)
  return [y, m]
}

function formatMonthYear(ym: string): string {
  const [y, m] = parseYM(ym)
  return `${MONTHS[m - 1] ?? ''} ${y}`.trim()
}

/** Human duration between a start and an end (null end = now). */
function duration(start: string, end: string | null): string {
  const [ys, ms] = parseYM(start)
  const now = new Date()
  const [ye, me] = end ? parseYM(end) : [now.getFullYear(), now.getMonth() + 1]
  let months = (ye - ys) * 12 + (me - ms) + 1
  if (months < 1) months = 1
  const years = Math.floor(months / 12)
  const rem = months % 12
  const parts: string[] = []
  if (years) parts.push(`${years} yr${years > 1 ? 's' : ''}`)
  if (rem) parts.push(`${rem} mo${rem > 1 ? 's' : ''}`)
  return parts.join(' ')
}

/** Overall span across all positions at a company. */
function overallTenure(exp: Exp): { range: string; length: string } {
  const latest = exp.positions[0]
  const earliest = exp.positions[exp.positions.length - 1]
  const start = formatMonthYear(earliest.start)
  const end = latest.end ? formatMonthYear(latest.end) : 'Present'
  return { range: `${start} — ${end}`, length: duration(earliest.start, latest.end) }
}

function initials(company: string): string {
  return company
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('')
}

function Logo({ exp }: { exp: Exp }) {
  if (exp.logo) {
    return (
      <div className="flex h-11 items-center rounded-md bg-white px-3 shadow-sm">
        <img
          src={exp.logo}
          alt={`${exp.company} logo`}
          className="h-6 w-auto max-w-[112px] object-contain"
          loading="lazy"
        />
      </div>
    )
  }

  return (
    <div
      className="flex h-11 w-11 items-center justify-center rounded-md font-mono text-sm font-bold"
      style={{ color: exp.accent, background: `${exp.accent}1a`, border: `1px solid ${exp.accent}55` }}
    >
      {initials(exp.company)}
    </div>
  )
}

function PositionRow({ pos, accent }: { pos: Position; accent: string }) {
  const range = `${formatMonthYear(pos.start)} — ${pos.end ? formatMonthYear(pos.end) : 'Present'}`
  return (
    <div>
      <p className="text-sm font-semibold text-slate-100">{pos.role}</p>
      <p className="mt-1 font-mono text-[11px] leading-relaxed" style={{ color: `${accent}cc` }}>
        {range} · {duration(pos.start, pos.end)}
      </p>
    </div>
  )
}

function ExperienceCard({ exp }: { exp: Exp }) {
  const [isFlipped, setIsFlipped] = useState(false)
  const { range, length } = overallTenure(exp)
  const title = exp.positions[0].role
  const meta = [exp.employmentType, exp.workMode, exp.location].filter(Boolean).join(' · ')
  const mobileHeight = exp.highlights.length > 1
    ? 'h-[50rem] min-[380px]:h-[46rem]'
    : 'h-[42rem]'
  const highlightTextSize = exp.highlights.length > 1 ? 'text-xs' : 'text-sm'

  const faceBackground = `
    radial-gradient(120% 150% at 100% 0%, ${exp.accent}26, transparent 55%),
    radial-gradient(120% 150% at 0% 100%, ${exp.accent}14, transparent 52%),
    linear-gradient(135deg, #0f1218, #0a0c10)`

  return (
    <div className={`group relative w-full [perspective:1400px] sm:h-[32rem] md:h-[27rem] lg:h-96 ${mobileHeight}`}>
      <button
        type="button"
        className="absolute inset-0 z-20 cursor-pointer rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-4 focus-visible:ring-offset-ink-950"
        style={{ '--tw-ring-color': exp.accent } as React.CSSProperties}
        aria-label={`${isFlipped ? 'Show summary for' : 'Show details for'} ${title} at ${exp.company}`}
        aria-pressed={isFlipped}
        onClick={() => setIsFlipped((flipped) => !flipped)}
      />

      <div
        className="relative h-full w-full transition-transform duration-700 [transform-style:preserve-3d] motion-reduce:transition-none"
        style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
      >
        <article
          className="absolute inset-0 overflow-hidden rounded-2xl border border-ink-600/70 p-6 shadow-glow [backface-visibility:hidden] sm:p-8"
          style={{ background: faceBackground }}
          aria-hidden={isFlipped}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.15]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
            }}
          />

          <div className="relative flex items-start justify-between gap-6">
            <p className="font-mono text-xs text-slate-500">↻ click to view details</p>
            <Logo exp={exp} />
          </div>

          <div className="relative mt-14 max-w-2xl sm:mt-16">
            <h3 className="font-mono text-2xl font-semibold uppercase leading-snug tracking-[0.18em] text-slate-100 sm:text-3xl">
              {title}
            </h3>
            {exp.positions.length > 1 && (
              <p className="mt-3 font-mono text-xs text-slate-500">
                + {exp.positions.length - 1} earlier role{exp.positions.length > 2 ? 's' : ''}
              </p>
            )}
          </div>

          <div className="absolute inset-x-6 bottom-6 grid gap-5 font-mono sm:inset-x-8 sm:bottom-8 sm:grid-cols-2 sm:items-end">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Company</p>
              <p className="mt-1 text-base text-slate-200">{exp.company}</p>
            </div>
            <div className="sm:text-right">
              <p className="text-[10px] uppercase tracking-widest text-slate-500">Tenure</p>
              <p className="mt-1 text-sm text-slate-200">{range}</p>
              <p className="mt-1 text-[11px]" style={{ color: `${exp.accent}cc` }}>{length}</p>
            </div>
          </div>
        </article>

        <article
          className="absolute inset-0 overflow-hidden rounded-2xl border p-6 shadow-glow [backface-visibility:hidden] [transform:rotateY(180deg)] sm:p-8"
          style={{ background: faceBackground, borderColor: `${exp.accent}80` }}
          aria-hidden={!isFlipped}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.1]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
            }}
          />

          <div className="relative flex h-full flex-col">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.18em]" style={{ color: exp.accent }}>
                  {exp.company}
                </p>
                {meta && <p className="mt-2 font-mono text-xs text-slate-500">{meta}</p>}
              </div>
              <p className="shrink-0 font-mono text-xs text-slate-500">↻ click to return</p>
            </div>

            <div className="grid flex-1 gap-6 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)] md:gap-8">
              <div className="space-y-4 md:border-r md:border-ink-600/60 md:pr-8">
                <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                  Role progression
                </p>
                {exp.positions.map((position, index) => (
                  <PositionRow key={index} pos={position} accent={exp.accent} />
                ))}
              </div>

              <div className="flex flex-col">
                <p className="mb-4 font-mono text-[10px] uppercase tracking-widest text-slate-500">
                  What I worked on
                </p>
                <ul className="space-y-3">
                  {exp.highlights.map((highlight, index) => (
                    <li key={index} className={`flex gap-2 font-mono leading-relaxed text-slate-400 ${highlightTextSize}`}>
                      <span className="select-none" style={{ color: exp.accent }}>▹</span>
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>

                {exp.award && (
                  <div className="mt-auto flex items-center gap-2 pt-5 font-mono text-xs" style={{ color: exp.accent }}>
                    <FaAward className="shrink-0" />
                    <span>{exp.award}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  )
}

export default function Experience() {
  return (
    <section id="experience" className="section">
      <p className="section-label">// experience</p>
      <h2 className="section-title">Where I've worked</h2>

      <p className="mb-3 text-right font-mono text-xs text-slate-500" aria-hidden="true">
        scroll / swipe to explore →
      </p>
      <div
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto overscroll-x-contain pb-5"
        style={{ paddingInline: 'max(0px, calc((100% - 48rem) / 2))' }}
        role="region"
        aria-label="Work experience carousel"
        tabIndex={0}
      >
        {experiences.map((exp, index) => (
          <motion.div
            key={exp.id}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-70px' }}
            transition={{ duration: 0.5 }}
            className="w-full shrink-0 snap-center lg:w-[48rem]"
            role="group"
            aria-label={`${index + 1} of ${experiences.length}: ${exp.company}`}
          >
            <ExperienceCard exp={exp} />
          </motion.div>
        ))}
      </div>
    </section>
  )
}
