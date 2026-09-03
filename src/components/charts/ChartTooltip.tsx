import type { CurrencyCode } from '@/types'
import { formatMoney } from '@/lib/formatting'

interface TooltipPayloadEntry {
  name?: string
  value?: number | string
  color?: string
  payload?: Record<string, unknown>
}

interface ChartTooltipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string | number
  currency: CurrencyCode
  /** Values arrive in minor units so they never round-trip through a float. */
  formatLabel?: (label: string | number | undefined) => string
}

/**
 * Recharts' default tooltip is a grey box with a border radius that fights the
 * rest of the app. This one is the same paper card as everything else.
 */
export function ChartTooltip({
  active,
  payload,
  label,
  currency,
  formatLabel,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-sm border border-line bg-canvas px-3 py-2 shadow-lift">
      <p className="text-2xs font-semibold uppercase tracking-[0.1em] text-muted">
        {formatLabel ? formatLabel(label) : label}
      </p>
      {payload.map((entry, index) => (
        <p key={index} className="mt-1 flex items-center gap-2 text-[13px] font-medium">
          {entry.color && (
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: entry.color }}
            />
          )}
          {entry.name && <span className="text-muted">{entry.name}</span>}
          <span className="tnum">{formatMoney(Number(entry.value ?? 0), currency)}</span>
        </p>
      ))}
    </div>
  )
}
