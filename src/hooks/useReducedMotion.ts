import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/appStore'

/**
 * True when the OS asks for reduced motion, or when the user turned motion off
 * in Preferences. Components branch on this to drop layout animations entirely
 * rather than just shortening them.
 */
export function useReducedMotion(): boolean {
  const preference = useAppStore((s) => s.preferences.reduceMotion)
  const [system, setSystem] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (event: MediaQueryListEvent) => setSystem(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return system || preference
}
