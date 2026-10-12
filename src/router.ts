import { useSyncExternalStore } from 'react'
import { flushSync } from 'react-dom'

/**
 * A two-route client router. `/` and `/mcp/` each ship their own HTML (so GitHub Pages
 * serves either on a direct visit with the right metadata), but both boot the same app:
 * moving between them swaps the page in place instead of reloading the document.
 */
export type Route = 'home' | 'mcp'

export const routePaths: Record<Route, string> = { home: '/', mcp: '/mcp/' }

interface RouteMeta {
  title: string
  description: string
}

const routeMeta: Record<Route, RouteMeta> = {
  home: {
    title: 'Piyush Doorwar — Engineer & Builder',
    description:
      'Piyush Doorwar — backend engineer with 8+ years building systems that hold up. Creator of Lumyn, Gitable and more. Projects, writing, music and books.',
  },
  mcp: {
    title: 'This site speaks MCP | Piyush Doorwar',
    description:
      "Connect Piyush Doorwar's portfolio to Claude, ChatGPT, Cursor or VS Code as an MCP server and ask about his work, projects, writing and music.",
  },
}

export function routeFor(pathname: string): Route {
  return /^\/mcp\/?$/.test(pathname) ? 'mcp' : 'home'
}

/** Route chunks register a loader so navigation can fetch them before swapping pages. */
const preloaders: Partial<Record<Route, () => Promise<unknown>>> = {}

export function registerPreload(route: Route, load: () => Promise<unknown>) {
  preloaders[route] = load
}

export function preloadRoute(route: Route) {
  return preloaders[route]?.().catch(() => undefined)
}

const listeners = new Set<() => void>()
let current: Route = routeFor(window.location.pathname)

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function currentRoute() {
  return current
}

export function useRoute() {
  return useSyncExternalStore(subscribe, () => current)
}

function applyMeta(route: Route) {
  const meta = routeMeta[route]
  const url = `${window.location.origin}${routePaths[route]}`
  document.title = meta.title
  document.querySelector('meta[name="description"]')?.setAttribute('content', meta.description)
  document.querySelector('link[rel="canonical"]')?.setAttribute('href', url)
}

function scrollTo(top: number) {
  // `html` scrolls smoothly for in-page anchors; a page swap should land instantly.
  window.scrollTo({ top, behavior: 'instant' })
}

/** Where a page swap lands: a section by id, or a saved scroll position. */
type Landing = { hash: string } | { top: number }

/** Swap pages inside a view transition when the browser has one and motion is welcome. */
function commit(route: Route, landing: Landing) {
  const update = () => {
    flushSync(() => {
      current = route
      listeners.forEach((listener) => listener())
    })
    applyMeta(route)
    // Sections render a placeholder with their id while their chunk loads, so the
    // target exists straight after the swap; scroll-margin keeps it clear of the top bar.
    const target = 'hash' in landing ? document.getElementById(landing.hash) : null
    if (target) target.scrollIntoView({ behavior: 'instant' })
    else scrollTo('top' in landing ? landing.top : 0)
  }
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!document.startViewTransition || reduceMotion) update()
  else document.startViewTransition(update)
}

export async function navigate(path: string) {
  const url = new URL(path, window.location.href)
  const route = routeFor(url.pathname)
  const hash = url.hash.slice(1)
  if (route === current) {
    const target = hash ? document.getElementById(hash) : null
    if (target) target.scrollIntoView({ behavior: 'smooth' })
    else scrollTo(0)
    return
  }
  await preloadRoute(route)
  // Remember where this entry was scrolled so Back returns to the same spot.
  window.history.replaceState({ ...window.history.state, scrollY: window.scrollY }, '')
  window.history.pushState({ scrollY: 0 }, '', url.pathname + url.hash)
  commit(route, hash ? { hash } : { top: 0 })
}

export function startRouter() {
  // Scroll restoration stays 'auto' so in-page hash history keeps working; page swaps
  // set their own position after rendering, which overrides the browser's guess.
  window.addEventListener('popstate', async (event) => {
    const route = routeFor(window.location.pathname)
    // Hash changes within a page also pop; only a page change needs handling.
    if (route === current) return
    await preloadRoute(route)
    commit(route, { top: (event.state as { scrollY?: number } | null)?.scrollY ?? 0 })
  })
}
