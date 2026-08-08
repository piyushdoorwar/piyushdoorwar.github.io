import { motion, useReducedMotion } from 'framer-motion'

interface SectionHeadingProps {
  /** Rendered after the `//` comment marker, e.g. "about". */
  label: string
  title?: string
  /** Set when an ancestor already animates this block into view. */
  animate?: boolean
}

export default function SectionHeading({ label, title, animate = true }: SectionHeadingProps) {
  const reduceMotion = useReducedMotion()
  const shouldStagger = animate && !reduceMotion
  const characters = [...label]

  // Without a title, the inner row already carries the label's own bottom margin.
  return (
    <div className={title ? 'mb-10' : ''}>
      <div className="mb-2 flex items-center gap-3">
        <p className="section-label mb-0 shrink-0">
          <span className="text-accent/50">// </span>
          {shouldStagger ? (
            <motion.span
              initial="hidden"
              whileInView="shown"
              viewport={{ once: true, margin: '-80px' }}
              transition={{ staggerChildren: 0.035, delayChildren: 0.1 }}
            >
              {characters.map((character, index) => (
                <motion.span
                  key={`${character}-${index}`}
                  variants={{ hidden: { opacity: 0 }, shown: { opacity: 1 } }}
                  transition={{ duration: 0.12 }}
                >
                  {character}
                </motion.span>
              ))}
            </motion.span>
          ) : (
            label
          )}
        </p>
        {/* Rule bleeds toward the viewport edge so sections read as terminal dividers. */}
        <motion.span
          aria-hidden="true"
          className="h-px flex-1 origin-left bg-gradient-to-r from-accent/35 to-transparent"
          initial={shouldStagger ? { scaleX: 0 } : false}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: 'easeOut', delay: 0.15 }}
        />
      </div>
      {title && <h2 className="section-title mb-0">{title}</h2>}
    </div>
  )
}
