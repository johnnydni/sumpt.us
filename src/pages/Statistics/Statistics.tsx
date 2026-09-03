import { useMemo } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useGroup, useGroupLedger } from '@/hooks/useLedger'
import { usePeople } from '@/hooks/usePeople'
import { CATEGORIES } from '@/data/mockData'
import { dayKey, formatShortDate } from '@/lib/dates'
import { formatMoney } from '@/lib/formatting'
import { PageHeader } from '@/components/navigation/PageHeader'
import { CategoryChart, CategoryLegend, TrendChart } from '@/components/charts/SpendCharts'
import { EmptyState, SectionHeader } from '@/components/ui/Primitives'
import { Avatar } from '@/components/ui/Avatar'
import type { CategorySlice, TrendPoint } from '@/components/charts/SpendCharts'

export default function Statistics() {
  const { id } = useParams<{ id: string }>()
  const group = useGroup(id)
  const ledger = useGroupLedger(id)
  const people = usePeople()

  /** Cumulative total per day — the shape of how the trip actually went. */
  const trend = useMemo<TrendPoint[]>(() => {
    const byDay = new Map<string, number>()
    for (const expense of ledger.expenses) {
      const key = dayKey(expense.createdAt)
      byDay.set(key, (byDay.get(key) ?? 0) + expense.amountMinor)
    }
    let running = 0
    return [...byDay.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, value]) => {
        running += value
        return { key, label: formatShortDate(key), valueMinor: running }
      })
  }, [ledger.expenses])

  const categories = useMemo<CategorySlice[]>(() => {
    const totals = new Map<string, number>()
    for (const expense of ledger.expenses) {
      totals.set(expense.category, (totals.get(expense.category) ?? 0) + expense.amountMinor)
    }
    return CATEGORIES.filter((category) => totals.has(category.id))
      .map((category) => ({
        id: category.id,
        label: category.label,
        valueMinor: totals.get(category.id) ?? 0,
        color: category.color,
      }))
      .sort((a, b) => b.valueMinor - a.valueMinor)
  }, [ledger.expenses])

  /** Who fronted the most money — not the same question as who owes what. */
  const byPayer = useMemo(() => {
    const totals = new Map<string, number>()
    for (const expense of ledger.expenses) {
      totals.set(expense.paidBy, (totals.get(expense.paidBy) ?? 0) + expense.amountMinor)
    }
    return [...totals.entries()]
      .map(([personId, valueMinor]) => ({ person: people.get(personId), valueMinor }))
      .sort((a, b) => b.valueMinor - a.valueMinor)
  }, [ledger.expenses, people])

  if (!group) return <Navigate to="/groups" replace />

  const currency = group.currency
  const average =
    ledger.expenses.length > 0 ? Math.round(ledger.totalMinor / ledger.expenses.length) : 0
  const perPerson =
    ledger.memberIds.length > 0 ? Math.round(ledger.totalMinor / ledger.memberIds.length) : 0

  if (ledger.expenses.length === 0) {
    return (
      <div>
        <PageHeader title={group.name} backTo={`/groups/${group.id}`} eyebrow="Statistics" />
        <EmptyState
          title="Nothing to chart yet."
          body="Add a couple of expenses and the numbers will show up here."
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title={group.name} backTo={`/groups/${group.id}`} eyebrow="Statistics" />

      <section className="paper px-5 py-7 sm:px-8">
        <p className="eyebrow">Total spent</p>
        <p className="display tnum mt-3 text-[clamp(2.5rem,11vw,3.75rem)] leading-[0.95]">
          {formatMoney(ledger.totalMinor, currency)}
        </p>

        <div className="mt-7 grid grid-cols-3 gap-px overflow-hidden rounded-sm border border-line bg-line">
          <Stat label="Expenses" value={String(ledger.expenses.length)} />
          <Stat label="Average" value={formatMoney(average, currency)} />
          <Stat label="Per person" value={formatMoney(perPerson, currency)} />
        </div>
      </section>

      <section className="mt-10">
        <SectionHeader title="Spending over time" />
        <TrendChart data={trend} currency={currency} />
      </section>

      <section className="mt-10">
        <SectionHeader title="Categories" />
        <CategoryChart data={categories} currency={currency} />
        <CategoryLegend data={categories} currency={currency} totalMinor={ledger.totalMinor} />
      </section>

      <section className="mt-10">
        <SectionHeader title="Who paid" />
        <div className="divide-y divide-line border-t border-line">
          {byPayer.map(({ person, valueMinor }) => (
            <div key={person.id} className="flex items-center gap-3 py-3.5">
              <Avatar name={person.name} src={person.avatarUrl} size="sm" accent={person.isMe} />
              <span className="min-w-0 flex-1 truncate text-[15px]">
                {person.isMe ? 'You' : person.name}
              </span>
              <span className="tnum text-[13px] text-muted">
                {Math.round((valueMinor / ledger.totalMinor) * 100)}%
              </span>
              <span className="tnum w-24 text-right text-[15px] font-medium">
                {formatMoney(valueMinor, currency)}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-canvas px-3 py-3.5 sm:px-4">
      <p className="text-[13px] text-muted">{label}</p>
      <p className="tnum mt-1 text-[15px] font-medium sm:text-[17px]">{value}</p>
    </div>
  )
}
