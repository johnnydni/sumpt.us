import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { CurrencyCode } from '@/types'
import { ChartTooltip } from './ChartTooltip'
import { formatMoney } from '@/lib/formatting'

export interface TrendPoint {
  /** ISO day key, used for ordering. */
  key: string
  label: string
  valueMinor: number
}

export interface CategorySlice {
  id: string
  label: string
  valueMinor: number
  color: string
}

/**
 * Cumulative spend over the life of the group. Area rather than line because
 * the shape — how fast the total climbed — is the story; exact daily values
 * live in the tooltip.
 *
 * Deliberately minimal: no grid, no Y axis, no legend. One navy series.
 */
export function TrendChart({
  data,
  currency,
}: {
  data: TrendPoint[]
  currency: CurrencyCode
}) {
  return (
    <div className="h-[180px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id="sumptus-trend" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#172A46" stopOpacity={0.14} />
              <stop offset="100%" stopColor="#172A46" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#777777', fontSize: 11 }}
            minTickGap={28}
            dy={6}
          />
          <YAxis hide domain={[0, 'dataMax']} />
          <Tooltip
            cursor={{ stroke: '#E8E8E5', strokeWidth: 1 }}
            content={<ChartTooltip currency={currency} />}
          />
          <Area
            type="monotone"
            dataKey="valueMinor"
            name="Total"
            stroke="#172A46"
            strokeWidth={1.75}
            fill="url(#sumptus-trend)"
            dot={false}
            activeDot={{ r: 3.5, fill: '#172A46', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/**
 * Categories as horizontal bars, not a pie. Comparing lengths against a shared
 * baseline is the one thing people actually do with this data, and it labels
 * cleanly at 360px.
 */
export function CategoryChart({
  data,
  currency,
}: {
  data: CategorySlice[]
  currency: CurrencyCode
}) {
  const height = Math.max(120, data.length * 44)

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
          <XAxis type="number" hide domain={[0, 'dataMax']} />
          <YAxis
            type="category"
            dataKey="label"
            tickLine={false}
            axisLine={false}
            width={112}
            tick={{ fill: '#111111', fontSize: 12 }}
          />
          <Tooltip
            cursor={{ fill: '#F6F6F4' }}
            content={<ChartTooltip currency={currency} />}
          />
          <Bar dataKey="valueMinor" name="Spent" radius={[0, 3, 3, 0]} barSize={14}>
            {data.map((slice) => (
              <Cell key={slice.id} fill={slice.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Compact legend used under the category chart. */
export function CategoryLegend({
  data,
  currency,
  totalMinor,
}: {
  data: CategorySlice[]
  currency: CurrencyCode
  totalMinor: number
}) {
  return (
    <ul className="mt-4 divide-y divide-line border-t border-line">
      {data.map((slice) => (
        <li key={slice.id} className="flex items-center gap-3 py-2.5">
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: slice.color }}
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1 truncate text-sm">{slice.label}</span>
          <span className="tnum text-[13px] text-muted">
            {totalMinor > 0 ? Math.round((slice.valueMinor / totalMinor) * 100) : 0}%
          </span>
          <span className="tnum w-20 text-right text-sm font-medium">
            {formatMoney(slice.valueMinor, currency)}
          </span>
        </li>
      ))}
    </ul>
  )
}
