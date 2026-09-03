import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/cn'

/** Section heading + optional trailing action. Used on every list screen. */
export function SectionHeader({
  title,
  action,
  className,
}: {
  title: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-3 flex items-baseline justify-between gap-4', className)}>
      <h2 className="eyebrow">{title}</h2>
      {action}
    </div>
  )
}

/**
 * Empty states are typographic, not illustrated — one statement, one nudge,
 * one action. No oversized graphics.
 */
export function EmptyState({
  title,
  body,
  action,
  className,
}: {
  title: string
  body: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('paper px-6 py-12 text-center', className)}>
      <p className="display text-xl">{title}</p>
      <p className="mx-auto mt-2 max-w-[30ch] text-sm leading-relaxed text-muted">{body}</p>
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  )
}

const badgeTones = {
  navy: 'bg-navy/[0.07] text-navy',
  positive: 'bg-positive/[0.09] text-positive',
  negative: 'bg-negative/[0.08] text-negative',
  neutral: 'bg-neutralAccent/[0.12] text-neutralAccent',
  attention: 'bg-attention/[0.10] text-attention',
  plain: 'bg-surface text-muted',
}

export function Badge({
  children,
  tone = 'plain',
  className,
}: {
  children: React.ReactNode
  tone?: keyof typeof badgeTones
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-xs px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-[0.08em]',
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

const dotTones = {
  positive: 'bg-positive',
  negative: 'bg-negative',
  neutral: 'bg-neutralAccent',
  attention: 'bg-attention',
  navy: 'bg-navy',
}

export function StatusDot({ tone, className }: { tone: keyof typeof dotTones; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block h-1.5 w-1.5 shrink-0 rounded-full', dotTones[tone], className)}
    />
  )
}

interface RowProps {
  to?: string
  onClick?: () => void
  children: React.ReactNode
  className?: string
  chevron?: boolean
}

/** A tappable list row that stays a link when it should be one. */
export function Row({ to, onClick, children, className, chevron = false }: RowProps) {
  const content = (
    <>
      <div className="flex min-w-0 flex-1 items-center gap-3">{children}</div>
      {chevron && <ChevronRight size={16} strokeWidth={1.75} className="shrink-0 text-muted/60" />}
    </>
  )

  const classes = cn(
    'flex w-full items-center gap-3 py-3.5 text-left transition-colors duration-micro',
    (to || onClick) && 'hover:bg-surface/70 active:bg-surface',
    className,
  )

  if (to) {
    return (
      <Link to={to} className={classes}>
        {content}
      </Link>
    )
  }
  if (onClick) {
    return (
      <button onClick={onClick} className={classes}>
        {content}
      </button>
    )
  }
  return <div className={classes}>{content}</div>
}

/** Hairline-separated list container. */
export function List({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('divide-y divide-line', className)}>{children}</div>
}
