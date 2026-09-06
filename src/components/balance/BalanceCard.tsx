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

      {/* Settled is good news, so it reads in the same green every cleared
          balance uses — not the amber that elsewhere means "look at this". */}
      <p
        className={cn(
          'mt-3 flex items-center gap-2 text-sm',
          settled ? 'text-positive' : 'text-muted',
        )}
      >
        <StatusDot tone={settled || positive ? 'positive' : 'negative'} />
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

      {/* The one thing to do about a balance, so it looks like a button and
          sits where a thumb ends up rather than trailing the text on the left. */}
      {!settled && (
        <div className="mt-5 flex justify-end">
          <Link
            to="/settle"
            className="inline-flex items-center gap-1.5 rounded-full bg-navy px-4 py-2 text-sm font-medium text-canvas transition-opacity hover:opacity-90 active:opacity-80"
          >
            Settle up
            <ArrowUpRight size={15} strokeWidth={2} />
          </Link>
        </div>
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
