import { forwardRef, useId } from 'react'
import { cn } from '@/lib/cn'

interface FieldProps {
  label?: string
  hint?: string
  error?: string
  children: (props: { id: string; describedBy?: string; invalid: boolean }) => React.ReactNode
  className?: string
}

/**
 * Wires label, hint and error to the control with the right aria attributes so
 * inline validation is announced instead of just coloured.
 */
export function Field({ label, hint, error, children, className }: FieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ')

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label htmlFor={id} className="eyebrow block">
          {label}
        </label>
      )}
      {children({ id, describedBy: describedBy || undefined, invalid: Boolean(error) })}
      {hint && !error && (
        <p id={hintId} className="text-[13px] leading-snug text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-[13px] leading-snug text-negative">
          {error}
        </p>
      )}
    </div>
  )
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-12 w-full rounded-md border border-line bg-canvas px-3.5 text-[15px] text-ink',
        'placeholder:text-muted/70 transition-colors duration-micro',
        'focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15',
        'aria-[invalid=true]:border-negative aria-[invalid=true]:ring-negative/15',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'min-h-[88px] w-full resize-none rounded-md border border-line bg-canvas px-3.5 py-3 text-[15px]',
      'placeholder:text-muted/70 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15',
      className,
    )}
    {...props}
  />
))
Textarea.displayName = 'Textarea'
