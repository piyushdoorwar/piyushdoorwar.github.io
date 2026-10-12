import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const router = vi.hoisted(() => ({
  navigate: vi.fn(async () => {}),
  preloadRoute: vi.fn(async () => {}),
  current: 'home' as 'home' | 'mcp',
}))

vi.mock('../router', async (importActual) => ({
  ...(await importActual<typeof import('../router')>()),
  navigate: router.navigate,
  preloadRoute: router.preloadRoute,
  currentRoute: () => router.current,
}))

const { default: RouteLink } = await import('./RouteLink')

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  router.current = 'home'
})

const link = () => screen.getByRole('link')

describe('RouteLink', () => {
  it('switches to another page in place on a plain click', () => {
    render(<RouteLink href="/mcp/">MCP</RouteLink>)
    const click = fireEvent.click(link())
    expect(click).toBe(false) // default prevented: no document load
    expect(router.navigate).toHaveBeenCalledWith('/mcp/')
  })

  it('leaves modified clicks and new-tab links to the browser', () => {
    render(<RouteLink href="/mcp/">MCP</RouteLink>)
    for (const modifier of ['metaKey', 'ctrlKey', 'shiftKey', 'altKey']) {
      expect(fireEvent.click(link(), { [modifier]: true }), modifier).toBe(true)
    }
    cleanup()
    render(
      <RouteLink href="/mcp/" target="_blank">
        MCP
      </RouteLink>,
    )
    expect(fireEvent.click(link())).toBe(true)
    expect(router.navigate).not.toHaveBeenCalled()
  })

  it('lets anchors within the current page scroll natively', () => {
    render(<RouteLink href="/#about">About</RouteLink>)
    expect(fireEvent.click(link())).toBe(true)
    expect(router.navigate).not.toHaveBeenCalled()
  })

  it('runs the caller’s handlers alongside its own', () => {
    const onClick = vi.fn()
    const onFocus = vi.fn()
    render(
      <RouteLink href="/mcp/" onClick={onClick} onFocus={onFocus}>
        MCP
      </RouteLink>,
    )
    fireEvent.focus(link())
    expect(onFocus).toHaveBeenCalled()
    expect(router.preloadRoute).toHaveBeenCalledWith('mcp')

    fireEvent.click(link())
    expect(onClick).toHaveBeenCalled()
    expect(router.navigate).toHaveBeenCalled()
  })
})
