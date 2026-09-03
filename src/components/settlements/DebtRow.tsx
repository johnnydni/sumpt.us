import { ArrowRight } from 'lucide-react'
import type { CurrencyCode, Debt } from '@/types'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { formatMoney } from '@/lib/formatting'
import type { Person } from '@/hooks/usePeople'
import { cn } from '@/lib/cn'

interface DebtRowProps {
  debt: Debt
  from: Person
  to: Person
  currency: CurrencyCode
  /** Direction relative to the current user; drives the accent colour. */
  direction: 'you-owe' | 'owed-to-you' | 'other'
  onSettle?: () => void
  actionLabel?: string
}

export function DebtRow({
  debt,
  from,
  to,
  currency,
  direction,
  onSettle,
  actionLabel = 'Mark as paid',
}: DebtRowProps) {
  const tone =
    direction === 'you-owe' ? 'negative' : direction === 'owed-to-you' ? 'positive' : 'navy'

  return (
    // Two rows at 360–430px, one from `sm` up. Squeezing names, amount and a
    // button onto a single narrow line truncated every name to "Max …".
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="flex shrink-0 items-center gap-1.5">
          <Avatar name={from.name} src={from.avatarUrl} size="sm" accent={from.isMe} />
          <ArrowRight size={13} strokeWidth={1.75} className="text-muted/60" />
          <Avatar name={to.name} src={to.avatarUrl} size="sm" accent={to.isMe} />
        </span>

        <span className="min-w-0 flex-1 truncate text-[15px]">
          {from.isMe ? 'You' : from.name.split(' ')[0]}
          <span className="text-muted"> → </span>
          {to.isMe ? 'you' : to.name.split(' ')[0]}
        </span>

        <span
          className={cn(
            'tnum shrink-0 text-[15px] font-medium',
            tone === 'negative' && 'text-negative',
            tone === 'positive' && 'text-positive',
            tone === 'navy' && 'text-navy',
          )}
        >
          {formatMoney(debt.amountMinor, currency)}
        </span>
      </div>

      {onSettle && (
        <Button variant="outline" size="sm" onClick={onSettle} className="shrink-0 max-sm:w-full">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
