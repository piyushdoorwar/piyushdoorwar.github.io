import type { ReactNode } from 'react'

interface SectionHeadingProps {
  /** Rendered after the `//` comment marker, e.g. "about". */
  label: string
  title?: ReactNode
  description?: ReactNode
  /** Right-aligned controls that belong to the whole section (links, filters). */
  actions?: ReactNode
  /** Heading level for the title; nested headings such as the visitor map use h3. */
  as?: 'h2' | 'h3'
}

export default function SectionHeading({
  label,
  title,
  description,
  actions,
  as: Title = 'h2',
}: SectionHeadingProps) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-5 sm:mb-12">
      <div className="min-w-0 max-w-3xl">
        <p className="eyebrow">
          <span className="text-accent/50" aria-hidden="true">
            //
          </span>
          {label}
        </p>
        {title && <Title className="section-title mt-3">{title}</Title>}
        {description && <p className="section-lede">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
