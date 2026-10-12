import type { KeyboardEvent } from 'react'

const steps: Record<string, (index: number, count: number) => number> = {
  ArrowRight: (index, count) => (index + 1) % count,
  ArrowDown: (index, count) => (index + 1) % count,
  ArrowLeft: (index, count) => (index - 1 + count) % count,
  ArrowUp: (index, count) => (index - 1 + count) % count,
  Home: () => 0,
  End: (_index, count) => count - 1,
}

/**
 * Keyboard behaviour for an ARIA tablist with automatic activation: the arrow keys,
 * Home and End move between tabs and select the one they land on, and only the selected
 * tab sits in the Tab order. Spread `tabProps(id)` onto each tab button.
 */
export function useTablist<Id extends string>(
  ids: readonly Id[],
  active: Id,
  select: (id: Id) => void,
  domId: (id: Id) => string,
) {
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const step = steps[event.key]
    if (!step) return
    event.preventDefault()
    const next = ids[step(Math.max(0, ids.indexOf(active)), ids.length)]
    select(next)
    document.getElementById(domId(next))?.focus()
  }

  const tabProps = (id: Id) => ({
    id: domId(id),
    role: 'tab' as const,
    'aria-selected': id === active,
    tabIndex: id === active ? 0 : -1,
    onKeyDown,
  })

  return { tabProps }
}
