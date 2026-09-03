import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import type { CurrencyCode } from '@/types'
import { formatMoney } from '@/lib/formatting'
import { AnimatedMoney } from './AnimatedMoney'
import { StatusDot } from '@/components/ui/Primitives'
import { cn } from '@/lib/cn'

interface BalanceCardProps {
  netMinor: number
  owedToYouMinor: number
  youOweMinor: number
  currency: CurrencyCode
}

/**
 * The one number the app exists to answer. Everything else on Overview is
 * supporting evidence, so this is the only place a figure gets display type.
 */
export function BalanceCard({
  netMinor,
  owedToYouMinor,
  youOweMinor,
  currency,
}: BalanceCardProps) {
  const settled = netMinor === 0
  const positive = netMinor > 0

  const caption = settled ? "You're all square." : positive ? 'You are owed' : 'You owe'

  return (
    <section className="paper px-5 py-7 sm:px-8 sm:py-9">
      <p className="eyebrow">Your balance</p>

      <AnimatedMoney
        minor={netMinor}
        currency={currency}
        signed={!settled}
        className={cn(
          'display mt-3 block text-[clamp(2.75rem,12vw,4.25rem)] leading-[0.95]',
          settled ? 'text-ink' : positive ? 'text-positive' : 'text-negative',
        )}
      />

      <p
        className={cn(
          'mt-3 flex items-center gap-2 text-sm',
          settled ? 'text-neutralAccent' : 'text-muted',
        )}
      >
        {!settled && <StatusDot tone={positive ? 'positive' : 'negative'} />}
        {settled && <StatusDot tone="neutral" />}
        {caption}
      </p>

      {/* Two zeroes side by side say nothing a settled balance hasn't. */}
      {!settled && (
        <div className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-line bg-line">
          <SplitStat
            label="Owed to you"
            value={formatMoney(owedToYouMinor, currency)}
            tone="positive"
          />
          <SplitStat label="You owe" value={formatMoney(youOweMinor, currency)} tone="negative" />
        </div>
      )}

      {!settled && (
        <Link
          to="/settle"
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-navy transition-opacity hover:opacity-70"
        >
          Settle up
          <ArrowUpRight size={15} strokeWidth={2} />
        </Link>
      )}
    </section>
  )
}

function SplitStat({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'positive' | 'negative'
}) {
  return (
    <div className="bg-canvas px-4 py-3.5">
      <p className="flex items-center gap-1.5 text-[13px] text-muted">
        <StatusDot tone={tone} />
        {label}
      </p>
      <p
        className={cn(
          'tnum mt-1 text-[17px] font-medium',
          tone === 'positive' ? 'text-positive' : 'text-negative',
        )}
      >
        {tone === 'positive' ? '+' : '−'} {value}
      </p>
    </div>
  )
}
