import { useEffect, useRef, useState } from 'react'
import type { CurrencyCode } from '@/types'
import { formatMoney, formatSignedMoney } from '@/lib/formatting'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { cn } from '@/lib/cn'

interface AnimatedMoneyProps {
  minor: number
  currency: CurrencyCode
  signed?: boolean
  className?: string
  /** Milliseconds. Balance changes want a beat; totals can be instant. */
  duration?: number
}

/**
 * Counts from the previous value to the new one so a settlement visibly walks
 * a balance toward zero. Reduced motion snaps straight to the final figure —
 * the number is the information, the animation is decoration.
 */
export function AnimatedMoney({
  minor,
  currency,
  signed = false,
  className,
  duration = 520,
}: AnimatedMoneyProps) {
  const reduced = useReducedMotion()
  const [display, setDisplay] = useState(minor)
  const previous = useRef(minor)
  const frame = useRef<number>()

  useEffect(() => {
    if (reduced || previous.current === minor) {
      previous.current = minor
      setDisplay(minor)
      return
    }

    const from = previous.current
    const to = minor
    const start = performance.now()
    previous.current = minor

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      // easeOutExpo: fast commitment, soft landing on the final cent.
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
      setDisplay(Math.round(from + (to - from) * eased))
      if (t < 1) frame.current = requestAnimationFrame(tick)
    }

    frame.current = requestAnimationFrame(tick)
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current)
    }
  }, [minor, reduced, duration])

  return (
    <span className={cn('tnum', className)}>
      {signed ? formatSignedMoney(display, currency) : formatMoney(display, currency)}
    </span>
  )
}
