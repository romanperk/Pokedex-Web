import { useEffect, useRef } from 'react'

/**
 * Calls `onLoadMore` when the returned sentinel nears the viewport.
 * `itemCount` re-arms the observer: a sentinel that stays visible after a short page
 * does not fire a second intersection on its own.
 */
export function useLoadMoreOnScroll(onLoadMore: () => void, enabled: boolean, itemCount: number) {
  const sentinel = useRef<HTMLDivElement>(null)
  const callback = useRef(onLoadMore)
  useEffect(() => {
    callback.current = onLoadMore
  })
  useEffect(() => {
    const element = sentinel.current
    if (!enabled || !element) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) callback.current()
      },
      { rootMargin: '600px 0px' },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [enabled, itemCount])
  return sentinel
}
