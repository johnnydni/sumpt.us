import { motion } from 'motion/react'
import { useId } from 'react'
import { cn } from '@/lib/cn'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface SegmentedProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: Array<{ value: T; label: string }>
  'aria-label': string
  className?: string
}

/**
 * Radio-group semantics with a sliding indicator. Arrow keys move between
 * options because each segment is a real radio input under the hood.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  ...rest
}: SegmentedProps<T>) {
  const layoutId = useId()
  const reduced = useReducedMotion()

  return (
    <div
      role="radiogroup"
      aria-label={rest['aria-label']}
      className={cn(
        'relative grid gap-1 rounded-md border border-line bg-surface p-1',
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative z-10 h-9 rounded-sm text-[13px] font-medium transition-colors duration-micro',
              selected ? 'text-ink' : 'text-muted hover:text-ink',
            )}
          >
            {selected && (
              <motion.span
                layoutId={reduced ? undefined : layoutId}
                transition={{ type: 'spring', stiffness: 460, damping: 38 }}
                className="absolute inset-0 -z-10 rounded-sm bg-canvas shadow-paper"
              />
            )}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
