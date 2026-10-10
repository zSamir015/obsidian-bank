import { useEffect, useState, type RefObject } from 'react'

/**
 * True while the element is on screen and the tab is in the foreground. The 3D card renders
 * only then; otherwise its frame loop stops.
 */
export function useRenderGate(ref: RefObject<HTMLElement | null>): boolean {
  const [onScreen, setOnScreen] = useState(false)
  const [tabVisible, setTabVisible] = useState(() => !document.hidden)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new IntersectionObserver(([entry]) => setOnScreen(Boolean(entry?.isIntersecting)))
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])

  useEffect(() => {
    const update = () => setTabVisible(!document.hidden)
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])

  return onScreen && tabVisible
}
