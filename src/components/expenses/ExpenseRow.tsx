import { Link } from 'react-router-dom'
import type { Expense } from '@/types'
import { CategoryIcon } from './CategoryIcon'
import { formatMoney } from '@/lib/formatting'
import { dateStack } from '@/lib/dates'
import { cn } from '@/lib/cn'

interface ExpenseRowProps {
  expense: Expense
  /** "Paid by Alex · 4 people" or, on Overview, "Illy · Japan Trip". */
  subtitle: string
  /** Your share, signed relative to you. Omitted where it isn't meaningful. */
  yourShareMinor?: number
  showCategory?: boolean
  /** The stacked date on the left. For lists that are ordered by time. */
  showDate?: boolean
}

export function ExpenseRow({
  expense,
  subtitle,
  yourShareMinor,
  showCategory = true,
  showDate = false,
}: ExpenseRowProps) {
  const { month, day } = dateStack(expense.createdAt)

  return (
    <Link
      to={`/expenses/${expense.id}`}
      className="flex items-center gap-3 py-3.5 transition-colors duration-micro hover:bg-surface/60"
    >
      {/* Fixed width and tabular figures: the column only reads as a column if
          "1" and "31" occupy the same space. */}
      {showDate && (
        <span className="w-7 shrink-0 text-center leading-none">
          <span className="block text-[10px] uppercase tracking-[0.08em] text-muted">{month}</span>
          <span className="tnum mt-0.5 block text-[15px] font-medium">{day}</span>
        </span>
      )}

      {showCategory && (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border border-line">
          <CategoryIcon category={expense.category} />
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium">{expense.title}</span>
        <span className="mt-0.5 block truncate text-[13px] text-muted">{subtitle}</span>
      </span>

      <span className="shrink-0 text-right">
        <span className="tnum block text-[15px] font-medium">
          {formatMoney(expense.amountMinor, expense.currency)}
        </span>
        {yourShareMinor !== undefined && (
          <span
            className={cn(
              'tnum mt-0.5 block text-[13px]',
              yourShareMinor > 0 ? 'text-positive' : yourShareMinor < 0 ? 'text-negative' : 'text-muted',
            )}
          >
            {yourShareMinor === 0
              ? 'not involved'
              : `${yourShareMinor > 0 ? '+' : '−'} ${formatMoney(Math.abs(yourShareMinor), expense.currency)}`}
          </span>
        )}
      </span>
    </Link>
  )
}
