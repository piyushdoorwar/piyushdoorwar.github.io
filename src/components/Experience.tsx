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
    .map((w) => w[0]!.toUpperCase())
    .join('')
}

function Logo({ exp }: { exp: Exp }) {
  if (exp.logo) {
    // Logos ship in every brand colour (some dark, some light), so back them
    // with a white tile — the LinkedIn treatment — for guaranteed contrast.
    return (
      <div className="flex h-9 items-center rounded-md bg-white px-2 shadow-sm">
        <img
          src={exp.logo}
          alt={`${exp.company} logo`}
          className="h-5 w-auto max-w-[96px] object-contain"
          loading="lazy"
        />
      </div>
    )
  }
  return (
    <div
      className="flex h-9 w-9 items-center justify-center rounded-md font-mono text-sm font-bold"
      style={{ color: exp.accent, background: `${exp.accent}1a`, border: `1px solid ${exp.accent}55` }}
    >
      {initials(exp.company)}
    </div>
  )
}

function IdCard({ exp }: { exp: Exp }) {
  const { range } = overallTenure(exp)
  const title = exp.positions[0].role
  return (
    <div
      className="relative aspect-[1.6/1] overflow-hidden rounded-2xl border border-ink-600/70 p-5 shadow-glow"
      style={{
        background: `
          radial-gradient(120% 120% at 100% 0%, ${exp.accent}26, transparent 55%),
          radial-gradient(120% 120% at 0% 100%, ${exp.accent}14, transparent 50%),
          linear-gradient(135deg, #0f1218, #0a0c10)`,
      }}
    >
      {/* faint circuit grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />

      {/* top row: chip + logo */}
      <div className="relative flex items-start justify-between">
        <div
          className="h-8 w-11 rounded-md border border-white/10"
          style={{ background: `linear-gradient(135deg, ${exp.accent}55, ${exp.accent}22)` }}
        />
        <Logo exp={exp} />
      </div>

      {/* center: role */}
      <div className="relative mt-6 flex flex-col">
        <h3 className="font-mono text-lg font-semibold uppercase tracking-[0.22em] text-slate-100 sm:text-xl">
          {title}
        </h3>
        {exp.positions.length > 1 && (
          <span className="mt-1 font-mono text-[11px] text-slate-500">
            + {exp.positions.length - 1} earlier role{exp.positions.length > 2 ? 's' : ''}
          </span>
        )}
      </div>

      {/* bottom: company + tenure */}
      <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-4 font-mono">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-slate-500">Company</p>
          <p className="text-sm text-slate-200">{exp.company}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-widest text-slate-500">Tenure</p>
          <p className="text-sm text-slate-200">{range}</p>
        </div>
      </div>
    </div>
  )
}

function PositionRow({ pos, accent }: { pos: Position; accent: string }) {
  const range = `${formatMonthYear(pos.start)} — ${pos.end ? formatMonthYear(pos.end) : 'Present'}`
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
      <span className="text-sm font-semibold text-slate-100">{pos.role}</span>
      <span className="font-mono text-xs" style={{ color: `${accent}cc` }}>
        {range} · {duration(pos.start, pos.end)}
      </span>
    </div>
  )
}

function Details({ exp }: { exp: Exp }) {
  const meta = [exp.employmentType, exp.workMode, exp.location].filter(Boolean).join(' · ')
  return (
    <div className="card">
      {meta && <p className="mb-4 font-mono text-xs text-slate-500">{meta}</p>}

      {/* Role progression (only when there is more than one) */}
      {exp.positions.length > 1 && (
        <div className="mb-4 space-y-2 border-b border-ink-600/50 pb-4">
          {exp.positions.map((p, i) => (
            <PositionRow key={i} pos={p} accent={exp.accent} />
          ))}
        </div>
      )}

      <ul className="space-y-3">
        {exp.highlights.map((h, j) => (
          <li key={j} className="flex gap-2 font-mono text-sm leading-relaxed text-slate-400">
            <span className="select-none" style={{ color: exp.accent }}>
              ▹
            </span>
            <span>{h}</span>
          </li>
        ))}
      </ul>

      {exp.award && (
        <div
          className="mt-4 inline-flex items-center gap-2 rounded-md px-3 py-1.5 font-mono text-xs"
          style={{ color: exp.accent, background: `${exp.accent}14`, border: `1px solid ${exp.accent}40` }}
        >
          <FaAward /> {exp.award}
        </div>
      )}
    </div>
  )
}

export default function Experience() {
  return (
    <section id="experience" className="section">
      <p className="section-label">// experience</p>
      <h2 className="section-title">Where I've worked</h2>

      <div className="space-y-8">
        {experiences.map((exp, i) => (
          <motion.div
            key={exp.id}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-70px' }}
            transition={{ duration: 0.5 }}
            className={`grid items-center gap-6 md:grid-cols-2 ${
              i % 2 === 1 ? 'md:[&>*:first-child]:order-2' : ''
            }`}
          >
            <IdCard exp={exp} />
            <Details exp={exp} />
          </motion.div>
        ))}
      </div>
    </section>
  )
}
