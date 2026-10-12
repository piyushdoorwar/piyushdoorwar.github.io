import type { AnchorHTMLAttributes, FocusEvent, MouseEvent, PointerEvent } from 'react'
import { currentRoute, navigate, preloadRoute, routeFor } from '../router'

type RouteLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }

/**
 * An ordinary link within this site that switches pages in place. Links within the
 * current page (`/#about` while on `/`) and modified clicks (new tab, new window) keep
 * the browser's default behaviour, and the target page's code starts loading as soon as
 * the pointer or focus arrives. Handlers passed in run as well, never instead.
 */
export default function RouteLink({
  href,
  onClick,
  onFocus,
  onPointerEnter,
  ...props
}: RouteLinkProps) {
  const target = () => routeFor(new URL(href, window.location.href).pathname)
  const warm = () => void preloadRoute(target())

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      props.target ||
      target() === currentRoute()
    ) {
      return
    }
    event.preventDefault()
    void navigate(href)
  }

  return (
    <a
      {...props}
      href={href}
      onClick={handleClick}
      onFocus={(event: FocusEvent<HTMLAnchorElement>) => {
        onFocus?.(event)
        warm()
      }}
      onPointerEnter={(event: PointerEvent<HTMLAnchorElement>) => {
        onPointerEnter?.(event)
        warm()
      }}
    />
  )
}
