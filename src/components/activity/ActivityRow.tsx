import { Link } from 'react-router-dom'
import type { ActivityItem } from '@/types'
import { useAppStore } from '@/store/appStore'
import { usePeople } from '@/hooks/usePeople'
import { CategoryIcon } from '@/components/expenses/CategoryIcon'
import { formatMoney } from '@/lib/formatting'
import { formatTimestamp } from '@/lib/dates'
import { HandCoins } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * One line in the feed. Reads as a sentence — "Alex settled with you" — because
 * a table of ids and amounts is exactly the thing this product replaces.
 */
export function ActivityRow({ item, showTime = true }: { item: ActivityItem; showTime?: boolean }) {
  const expenses = useAppStore((s) => s.expenses)
  const settlements = useAppStore((s) => s.settlements)
  const groups = useAppStore((s) => s.groups)
  const people = usePeople()

  const groupName = groups.find((g) => g.id === item.groupId)?.name

  if (item.kind === 'settlement') {
    const settlement = settlements.find((s) => s.id === item.settlementId)
    if (!settlement) return null

    const incoming = settlement.toPersonId === people.me
    const involvesMe = incoming || settlement.fromPersonId === people.me
    const headline = incoming
      ? `${people.short(settlement.fromPersonId)} settled with you`
      : involvesMe
        ? `You settled with ${people.short(settlement.toPersonId)}`
        : `${people.short(settlement.fromPersonId)} paid ${people.short(settlement.toPersonId)}`

    return (
      <div className="flex items-center gap-3.5 py-3.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-line text-neutralAccent">
          <HandCoins size={16} strokeWidth={1.6} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium">{headline}</span>
          <span className="mt-0.5 block truncate text-[13px] text-muted">
            {[groupName, showTime ? formatTimestamp(item.at) : null].filter(Boolean).join(' · ')}
          </span>
        </span>
        <span
          className={cn(
            'tnum shrink-0 text-[15px] font-medium',
            involvesMe ? (incoming ? 'text-positive' : 'text-negative') : 'text-muted',
          )}
        >
          {involvesMe && (incoming ? '+ ' : '− ')}
          {formatMoney(settlement.amountMinor, settlement.currency)}
        </span>
      </div>
    )
  }

  const expense = expenses.find((e) => e.id === item.expenseId)
  if (!expense) return null

  const verb = item.kind === 'expense_updated' ? 'updated' : 'added'

  return (
    <Link
      to={`/expenses/${expense.id}`}
      className="flex items-center gap-3.5 py-3.5 transition-colors duration-micro hover:bg-surface/60"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-line">
        <CategoryIcon category={expense.category} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium">
          {people.short(expense.paidBy)} {verb} {expense.title}
        </span>
        <span className="mt-0.5 block truncate text-[13px] text-muted">
          {[groupName, showTime ? formatTimestamp(item.at) : null].filter(Boolean).join(' · ')}
        </span>
      </span>
      <span className="tnum shrink-0 text-[15px] font-medium">
        {formatMoney(expense.amountMinor, expense.currency)}
      </span>
    </Link>
  )
}
