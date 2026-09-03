import { Link } from 'react-router-dom'
import type { Expense } from '@/types'
import { CategoryIcon } from './CategoryIcon'
import { formatMoney } from '@/lib/formatting'
import { cn } from '@/lib/cn'

interface ExpenseRowProps {
  expense: Expense
  /** "Paid by Alex · 4 people" or, on Overview, "Illy · Japan Trip". */
  subtitle: string
  /** Your share, signed relative to you. Omitted where it isn't meaningful. */
  yourShareMinor?: number
  showCategory?: boolean
}

export function ExpenseRow({
  expense,
  subtitle,
  yourShareMinor,
  showCategory = true,
}: ExpenseRowProps) {
  return (
    <Link
      to={`/expenses/${expense.id}`}
      className="flex items-center gap-3.5 py-3.5 transition-colors duration-micro hover:bg-surface/60"
    >
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
