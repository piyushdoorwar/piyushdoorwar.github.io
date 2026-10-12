import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import homeHtml from '../index.html?raw'
import mcpHtml from '../mcp/index.html?raw'

type Router = typeof import('./router')

/** The router keeps module state, so each test boots a fresh copy at a given URL. */
async function bootAt(path: string): Promise<Router> {
  window.history.replaceState(null, '', path)
  vi.resetModules()
  const router = await import('./router')
  router.startRouter()
  return router
}

function head(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return {
    title: doc.title,
    description: doc.querySelector('meta[name="description"]')?.getAttribute('content'),
    canonical: doc.querySelector('link[rel="canonical"]')?.getAttribute('href'),
  }
}

/** Resolves a promise the test controls, to hold a page's code "loading". */
function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => (resolve = done))
  return { promise, resolve }
}

const popTo = (path: string, state: unknown = null) => {
  window.history.replaceState(state, '', path)
  window.dispatchEvent(new PopStateEvent('popstate', { state }))
}

beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  document.head.innerHTML =
    '<title></title><meta name="description" content=""><link rel="canonical" href="">'
})

afterEach(() => {
  window.history.replaceState(null, '', '/')
})

describe('page metadata', () => {
  it('matches what each HTML entry ships, so direct visits and in-app switches agree', async () => {
    const { routeMeta, routePaths } = await bootAt('/')
    for (const [route, html] of [
      ['home', homeHtml],
      ['mcp', mcpHtml],
    ] as const) {
      const shipped = head(html)
      expect(shipped.title, route).toBe(routeMeta[route].title)
      expect(shipped.description, route).toBe(routeMeta[route].description)
      expect(shipped.canonical, route).toBe(`https://piyushdoorwar.com${routePaths[route]}`)
    }
  })
})

describe('routeFor', () => {
  it('maps /mcp with or without the slash, and everything else to home', async () => {
    const { routeFor } = await bootAt('/')
    expect(routeFor('/mcp/')).toBe('mcp')
    expect(routeFor('/mcp')).toBe('mcp')
    expect(routeFor('/')).toBe('home')
    expect(routeFor('/mcp/extra')).toBe('home')
  })
})

describe('navigate', () => {
  it('swaps pages in place, updates the head and remembers the scroll to return to', async () => {
    const router = await bootAt('/')
    Object.defineProperty(window, 'scrollY', { value: 640, configurable: true })
    await router.navigate('/mcp/')

    expect(router.currentRoute()).toBe('mcp')
    expect(window.location.pathname).toBe('/mcp/')
    expect(document.title).toBe(router.routeMeta.mcp.title)
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      `${window.location.origin}/mcp/`,
    )

    window.history.back()
    await vi.waitFor(() => expect(router.currentRoute()).toBe('home'))
    expect(window.scrollTo).toHaveBeenLastCalledWith({ top: 640, behavior: 'instant' })
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true })
  })

  it('lets only the latest of two overlapping navigations commit', async () => {
    const router = await bootAt('/')
    const slow = deferred()
    router.registerPreload('mcp', () => slow.promise)

    const toMcp = router.navigate('/mcp/')
    // A second click lands while the MCP page's code is still loading.
    await router.navigate('/#about')
    slow.resolve()
    await toMcp

    expect(router.currentRoute()).toBe('home')
    expect(window.location.pathname).toBe('/')
  })
})

describe('popstate', () => {
  it('ignores hash-only changes within the current page', async () => {
    const router = await bootAt('/')
    popTo('/#projects')
    await Promise.resolve()
    expect(router.currentRoute()).toBe('home')
  })

  it('trusts the URL after loading when Back is pressed again mid-load', async () => {
    const router = await bootAt('/')
    const slow = deferred()
    router.registerPreload('mcp', () => slow.promise)

    popTo('/mcp/')
    popTo('/') // pressed again before the MCP page's code arrived
    slow.resolve()
    await new Promise((done) => setTimeout(done, 0))

    expect(router.currentRoute()).toBe('home')
  })
})
