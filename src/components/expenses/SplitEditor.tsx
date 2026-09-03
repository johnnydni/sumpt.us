import { useMemo } from 'react'
import { Check, Minus, Plus } from 'lucide-react'
import type { CurrencyCode, SplitMethod } from '@/types'
import type { Person } from '@/hooks/usePeople'
import { calculateExpenseShares, validateSplit } from '@/lib/calculations'
import { formatMoney } from '@/lib/formatting'
import { getCurrency, minorToInput, parseAmountToMinor } from '@/lib/currency'
import { Segmented } from '@/components/ui/Segmented'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/cn'

export interface SplitState {
  method: SplitMethod
  /** personId → raw weight in the unit the method implies. */
  weights: Record<string, number>
}

interface SplitEditorProps {
  totalMinor: number
  currency: CurrencyCode
  participants: Person[]
  state: SplitState
  onChange: (state: SplitState) => void
}

const METHOD_OPTIONS: Array<{ value: SplitMethod; label: string }> = [
  { value: 'equal', label: 'Equal' },
  { value: 'amount', label: 'Amount' },
  { value: 'percentage', label: 'Percent' },
  { value: 'shares', label: 'Shares' },
]

/**
 * The advanced split surface. Whatever the method, the resolved shares are
 * computed by the same `calculateExpenseShares` the store uses on save, so the
 * preview here is exactly what gets written — no second implementation to drift.
 */
export function SplitEditor({
  totalMinor,
  currency,
  participants,
  state,
  onChange,
}: SplitEditorProps) {
  const inputs = useMemo(
    () => participants.map((p) => ({ personId: p.id, weight: state.weights[p.id] ?? 0 })),
    [participants, state.weights],
  )

  const validation = useMemo(
    () => validateSplit(totalMinor, state.method, inputs),
    [totalMinor, state.method, inputs],
  )

  const shares = useMemo(
    () => calculateExpenseShares(totalMinor, state.method, inputs),
    [totalMinor, state.method, inputs],
  )

  const shareById = useMemo(
    () => Object.fromEntries(shares.map((s) => [s.personId, s.shareMinor])),
    [shares],
  )

  const allocatedMinor = shares.reduce((sum, s) => sum + s.shareMinor, 0)

  /**
   * Switching method seeds sensible starting weights from the current split so
   * the user never lands on a blank grid: equal amounts, even percentages,
   * one share each.
   */
  const changeMethod = (method: SplitMethod) => {
    if (method === state.method) return
    const even = calculateExpenseShares(
      totalMinor,
      'equal',
      participants.map((p) => ({ personId: p.id })),
    )
    const weights: Record<string, number> = {}

    for (const [index, person] of participants.entries()) {
      if (method === 'amount') weights[person.id] = even[index]?.shareMinor ?? 0
      else if (method === 'percentage') weights[person.id] = 0
      else if (method === 'shares') weights[person.id] = 1
    }

    if (method === 'percentage' && participants.length > 0) {
      // Basis points, distributed with the same largest-remainder rule so the
      // seeded percentages always total exactly 100%.
      const base = Math.floor(10_000 / participants.length)
      let remainder = 10_000 - base * participants.length
      for (const person of participants) {
        weights[person.id] = base + (remainder-- > 0 ? 1 : 0)
      }
    }

    onChange({ method, weights })
  }

  const setWeight = (personId: string, weight: number) => {
    onChange({ ...state, weights: { ...state.weights, [personId]: Math.max(0, weight) } })
  }

  return (
    <div className="space-y-5">
      <Segmented
        aria-label="Split method"
        value={state.method}
        onChange={changeMethod}
        options={METHOD_OPTIONS}
      />

      <div className="paper divide-y divide-line">
        {participants.map((person) => (
          <div key={person.id} className="flex items-center gap-3 px-4 py-3">
            <Avatar name={person.name} src={person.avatarUrl} size="sm" accent={person.isMe} />
            <span className="min-w-0 flex-1 truncate text-[15px]">
              {person.isMe ? 'You' : person.name}
            </span>

            {state.method === 'equal' && (
              <span className="tnum text-[15px] font-medium">
                {formatMoney(shareById[person.id] ?? 0, currency)}
              </span>
            )}

            {state.method === 'amount' && (
              <WeightInput
                prefix={getCurrency(currency).symbol}
                value={minorToInput(state.weights[person.id] ?? 0, currency)}
                onCommit={(raw) => setWeight(person.id, parseAmountToMinor(raw, currency) ?? 0)}
              />
            )}

            {state.method === 'percentage' && (
              <WeightInput
                suffix="%"
                value={((state.weights[person.id] ?? 0) / 100).toString()}
                onCommit={(raw) => {
                  const parsed = Number(raw.replace(',', '.'))
                  setWeight(person.id, Number.isFinite(parsed) ? Math.round(parsed * 100) : 0)
                }}
              />
            )}

            {state.method === 'shares' && (
              <ShareStepper
                value={state.weights[person.id] ?? 0}
                onChange={(next) => setWeight(person.id, next)}
                amountLabel={formatMoney(shareById[person.id] ?? 0, currency)}
              />
            )}
          </div>
        ))}
      </div>

      <SplitTotal
        valid={validation.valid}
        message={validation.message}
        method={state.method}
        allocatedMinor={allocatedMinor}
        totalMinor={totalMinor}
        currency={currency}
        percentageBps={inputs.reduce((sum, i) => sum + (i.weight ?? 0), 0)}
      />
    </div>
  )
}

function WeightInput({
  value,
  onCommit,
  prefix,
  suffix,
}: {
  value: string
  onCommit: (raw: string) => void
  prefix?: string
  suffix?: string
}) {
  return (
    <span className="inline-flex h-10 items-center gap-1 rounded-sm border border-line px-2 focus-within:border-navy">
      {prefix && <span className="text-[13px] text-muted">{prefix}</span>}
      <input
        inputMode="decimal"
        defaultValue={value}
        // Committing on blur rather than per-keystroke: re-parsing while the
        // user is mid-number would rewrite "1" to "1.00" under the caret.
        key={value}
        onBlur={(event) => onCommit(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') (event.target as HTMLInputElement).blur()
        }}
        className="tnum w-16 bg-transparent text-right text-[15px] outline-none"
      />
      {suffix && <span className="text-[13px] text-muted">{suffix}</span>}
    </span>
  )
}

function ShareStepper({
  value,
  onChange,
  amountLabel,
}: {
  value: number
  onChange: (value: number) => void
  amountLabel: string
}) {
  return (
    <span className="flex items-center gap-3">
      <span className="tnum hidden text-[13px] text-muted sm:inline">{amountLabel}</span>
      <span className="inline-flex items-center rounded-sm border border-line">
        <button
          aria-label="Decrease shares"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="flex h-10 w-10 items-center justify-center text-muted transition-colors hover:bg-surface hover:text-ink"
        >
          <Minus size={15} strokeWidth={2} />
        </button>
        <span className="tnum w-7 text-center text-[15px] font-medium">{value}</span>
        <button
          aria-label="Increase shares"
          onClick={() => onChange(value + 1)}
          className="flex h-10 w-10 items-center justify-center text-muted transition-colors hover:bg-surface hover:text-ink"
        >
          <Plus size={15} strokeWidth={2} />
        </button>
      </span>
    </span>
  )
}

function SplitTotal({
  valid,
  message,
  method,
  allocatedMinor,
  totalMinor,
  currency,
  percentageBps,
}: {
  valid: boolean
  message?: string
  method: SplitMethod
  allocatedMinor: number
  totalMinor: number
  currency: CurrencyCode
  percentageBps: number
}) {
  const right =
    method === 'percentage'
      ? `${(percentageBps / 100).toFixed(percentageBps % 100 === 0 ? 0 : 2)}%`
      : formatMoney(method === 'amount' ? allocatedMinor : totalMinor, currency)

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-md border px-4 py-3 transition-colors duration-component',
        valid ? 'border-line bg-surface' : 'border-negative/30 bg-negative/[0.04]',
      )}
    >
      <span className="text-sm font-medium">Total</span>
      <span className="flex items-center gap-2">
        <span className={cn('tnum text-[15px] font-medium', !valid && 'text-negative')}>
          {right}
        </span>
        {valid ? (
          <Check size={16} strokeWidth={2.5} className="text-positive" />
        ) : (
          <span className="text-[13px] text-negative">{message}</span>
        )}
      </span>
    </div>
  )
}
