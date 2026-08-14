import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import Writing from './Writing'

/**
 * jsdom ships neither observer. `ResizeObserver` is constructed outright by the book
 * shelf, and framer reads `IntersectionObserver` for its in-view reveals, so both are
 * stubbed as no-ops — this suite is about the page turn, not about visibility.
 */
beforeAll(() => {
  class NoopObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
  Object.assign(globalThis, {
    ResizeObserver: NoopObserver,
    IntersectionObserver: class extends NoopObserver {
      root = null
      rootMargin = ''
      thresholds = []
    },
  })
})

afterEach(cleanup)

/** Real time, so the exit spring runs to completion and AnimatePresence can tidy up. */
const settle = (ms: number) =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms))
  })

function setup() {
  const view = render(<Writing />)
  const pages = () => view.container.querySelectorAll<HTMLElement>('.grid')
  const button = (label: string) =>
    [...view.container.querySelectorAll('button')].find((element) =>
      element.textContent?.includes(label),
    )!
  const status = () => view.container.querySelector('[aria-live="polite"]')?.textContent?.trim()
  return { ...view, pages, button, status }
}

describe('turning a page of articles', () => {
  it('leaves exactly one page behind once the turn has finished', async () => {
    const { pages, button, status } = setup()
    expect(pages()).toHaveLength(1)
    expect(status()).toMatch(/^page 1 of/)

    act(() => button('next').click())
    // Mid-turn both pages are mounted; the outgoing one is out of flow.
    expect(pages()).toHaveLength(2)

    await settle(1200)
    // The outgoing page must actually be removed, or every turn would leak a stale
    // grid absolutely positioned over the live one.
    expect(pages()).toHaveLength(1)
    expect(status()).toMatch(/^page 2 of/)
  })

  it('settles the arriving page at full opacity and no offset', async () => {
    const { pages, button } = setup()
    act(() => button('next').click())
    await settle(1200)

    const [settled] = pages()
    expect(settled.style.opacity === '' || settled.style.opacity === '1').toBe(true)
    expect(settled.style.transform ?? '').not.toMatch(/translateX\(-?[1-9]/)
  })

  it('turns back as well as forward', async () => {
    const { button, status } = setup()

    act(() => button('next').click())
    await settle(1200)
    expect(status()).toMatch(/^page 2 of/)

    act(() => button('prev').click())
    await settle(1200)
    expect(status()).toMatch(/^page 1 of/)
  })

  it('gives the outgoing page somewhere to go', () => {
    const { pages } = setup()
    // popLayout takes the outgoing page out of flow, which needs a positioned
    // ancestor to be placed against. The offsets themselves need real layout, so
    // they are checked in a browser rather than here.
    expect(pages()[0]!.parentElement!.className).toContain('relative')
  })
})
