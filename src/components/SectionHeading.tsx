import { motion, useReducedMotion } from 'framer-motion'

interface SectionHeadingProps {
  /** Rendered after the `//` comment marker, e.g. "about". */
  label: string
  title?: string
}

export default function SectionHeading({ label, title }: SectionHeadingProps) {
  const reduceMotion = useReducedMotion()

  // Without a title, the inner row already carries the label's own bottom margin.
  return (
    <div className={title ? 'mb-10' : ''}>
      <div className="mb-2 flex items-center gap-3">
        <p className="section-label mb-0 shrink-0">
          <span className="text-accent/50">// </span>
          {label}
        </p>
        {/*
          Rule bleeds toward the viewport edge so sections read as terminal dividers,
          and it is the heading's one deliberate gesture. The label used to fade in
          character by character, which spent 400ms drawing attention to a six-letter
          word — decoration the heading was not asking for.
        */}
        <motion.span
          aria-hidden="true"
          className="h-px flex-1 origin-left bg-gradient-to-r from-accent/35 to-transparent"
          initial={reduceMotion ? false : { scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      {title && <h2 className="section-title mb-0">{title}</h2>}
    </div>
  )
}
