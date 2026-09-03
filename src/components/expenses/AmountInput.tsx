import { useEffect, useRef } from 'react'
import type { CurrencyCode } from '@/types'
import { getCurrency } from '@/lib/currency'
import { cn } from '@/lib/cn'

interface AmountInputProps {
  /** Raw text, kept as a string so a half-typed "12," survives a re-render. */
  value: string
  onChange: (value: string) => void
  currency: CurrencyCode
  autoFocus?: boolean
  invalid?: boolean
  id?: string
  describedBy?: string
}

/**
 * The screen's centre of gravity: display type, currency symbol set in the
 * baseline, numeric keypad on mobile.
 *
 * It stays an uncontrolled-ish text field rather than a formatted one because
 * reformatting mid-typing moves the caret and fights the user. Parsing into
 * minor units happens once, on submit.
 */
export function AmountInput({
  value,
  onChange,
  currency,
  autoFocus,
  invalid,
  id,
  describedBy,
}: AmountInputProps) {
  const ref = useRef<HTMLInputElement>(null)
  const symbol = getCurrency(currency).symbol

  useEffect(() => {
    if (autoFocus) {
      // A frame's delay lets the entry animation settle before the keyboard
      // shoves the layout upward.
      const timer = setTimeout(() => ref.current?.focus(), 220)
      return () => clearTimeout(timer)
    }
  }, [autoFocus])

  const filled = value.trim().length > 0

  return (
    <div
      className={cn(
        'flex items-baseline justify-center gap-1 border-b pb-4 transition-colors duration-component',
        invalid ? 'border-negative' : filled ? 'border-ink' : 'border-line',
      )}
    >
      <span
        className={cn(
          'display text-[clamp(2rem,9vw,2.75rem)] leading-none transition-colors duration-micro',
          filled ? 'text-ink' : 'text-muted/50',
        )}
      >
        {symbol}
      </span>
      <input
        ref={ref}
        id={id}
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        aria-label="Amount"
        inputMode="decimal"
        // `text` rather than `number`: number inputs reject "12," mid-entry on
        // German keyboards and silently blank the field.
        type="text"
        autoComplete="off"
        enterKeyHint="done"
        placeholder="0.00"
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/[^\d.,]/g, ''))}
        className={cn(
          'display tnum w-full min-w-0 max-w-[7ch] bg-transparent text-center text-[clamp(3rem,16vw,4.5rem)]',
          'leading-none tracking-[-0.03em] outline-none placeholder:text-muted/30',
        )}
        style={{ width: `${Math.max(3, value.length || 4)}ch` }}
      />
    </div>
  )
}
