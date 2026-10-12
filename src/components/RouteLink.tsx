import type { AnchorHTMLAttributes, MouseEvent } from 'react'
import { currentRoute, navigate, preloadRoute, routeFor } from '../router'

type RouteLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }

/**
 * An ordinary link within this site that switches pages in place. Links within the
 * current page (`/#about` while on `/`) and modified clicks (new tab, new window) keep
 * the browser's default behaviour, and the target page's code starts loading as soon as
 * the pointer or focus arrives.
 */
export default function RouteLink({ href, onClick, ...props }: RouteLinkProps) {
  const target = () => routeFor(new URL(href, window.location.href).pathname)
  const warm = () => preloadRoute(target())

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
    <a href={href} onClick={handleClick} onPointerEnter={warm} onFocus={warm} {...props} />
  )
}
