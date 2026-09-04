import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import {
  CURRENT_PLAN_ID,
  EXTENSION_PLANS,
  FREE_PLAN,
  ONE_TIME_PLANS,
  PAY_ONCE_REASONING,
  PAY_ONCE_SUMMARY,
  PLAN_CURRENCY,
  SUBSCRIPTION_PLANS,
  TRIP_PLAN,
  type BillingPeriod,
  type Plan as PlanTier,
} from '@/data/plans'
import { PageHeader } from '@/components/navigation/PageHeader'
import { Badge, SectionHeader } from '@/components/ui/Primitives'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { formatMoney } from '@/lib/formatting'
import { cn } from '@/lib/cn'

const periodLabel: Record<BillingPeriod, string> = {
  once: 'one-time',
  month: 'per month',
  week: 'per week',
}

/**
 * What each plan costs and what it carries.
 *
 * Deliberately not a comparison matrix: on a phone a four-column table with
 * greyed-out rows is unreadable, and it reads like a SaaS console. Each card
 * names the tier it builds on instead, so the ladder is legible without
 * repeating every line four times.
 */
export default function Plan() {
  return (
    <div>
      <PageHeader title="Plan" backTo="/profile" />

      <PlanCard plan={FREE_PLAN} current={CURRENT_PLAN_ID === FREE_PLAN.id} />

      <p className="mt-4 rounded-md border border-line bg-surface/60 px-4 py-3.5 text-[13px] leading-relaxed text-muted">
        Everything below is the plan as designed, not as built. Nothing is purchasable yet — there
        are no accounts and no billing in this version, so no plan can be bought or applied.
      </p>

      <section className="mt-10">
        <SectionHeader title="Pay once" />
        <Disclosure summary={PAY_ONCE_SUMMARY} paragraphs={PAY_ONCE_REASONING} />
        <div className="space-y-3">
          {ONE_TIME_PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      </section>

      <section className="mt-10">
        <SectionHeader title="Monthly" />
        <div className="space-y-3">
          {SUBSCRIPTION_PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      </section>

      <section className="mt-10">
        <SectionHeader title="Extensions" />
        <p className="-mt-1 mb-4 max-w-prose text-[13px] leading-relaxed text-muted">
          Passes that sit alongside whichever plan you are on, for situations the tiers do not
          cover. More will follow.
        </p>
        <div className="space-y-3">
          {EXTENSION_PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      </section>

      <section className="mt-10">
        <SectionHeader title="Per trip" />
        <div className="space-y-3">
          <PlanCard plan={TRIP_PLAN} />
        </div>
        <p className="mt-3 max-w-prose text-[13px] leading-relaxed text-muted">
          A Trip Pass is bought inside the group it covers, not here.
        </p>
      </section>
    </div>
  )
}

/**
 * A summary line that stays put, with the reasoning folded away behind it.
 *
 * The argument for a permanent price is worth making, but it is not worth
 * making everyone scroll past it on the way to the prices.
 */
function Disclosure({ summary, paragraphs }: { summary: string; paragraphs: string[] }) {
  const [open, setOpen] = useState(false)
  const reduced = useReducedMotion()

  return (
    <div className="-mt-1 mb-4 max-w-prose">
      <p className="text-[13px] leading-relaxed text-muted">{summary}</p>
      <button
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="mt-1.5 inline-flex items-center gap-1 rounded-sm text-[13px] text-navy transition-colors duration-micro hover:text-ink"
      >
        {open ? 'Show less' : 'Why we price it this way'}
        <ChevronDown
          size={14}
          strokeWidth={1.9}
          aria-hidden="true"
          className={cn(
            'shrink-0',
            !reduced && 'transition-transform duration-micro',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <div className="mt-3 space-y-2.5 border-l border-line pl-4">
          {paragraphs.map((paragraph) => (
            <p key={paragraph} className="text-[13px] leading-relaxed text-muted">
              {paragraph}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

function PlanCard({ plan, current = false }: { plan: PlanTier; current?: boolean }) {
  const free = plan.priceMinor === 0

  return (
    <article className={cn('paper px-5 py-5 sm:px-6', current && 'border-navy/30 bg-navy/[0.02]')}>
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="display text-[38px] leading-[1.05]">{plan.name}</h3>
        {/* The free tier's name is already its price — repeating it reads like a bug. */}
        {free ? (
          current && <Badge tone="navy">Your plan</Badge>
        ) : (
          <p className="flex items-baseline gap-1.5">
            {current && <Badge tone="navy">Your plan</Badge>}
            <span className="tnum display text-[19px] leading-tight">
              {formatMoney(plan.priceMinor, PLAN_CURRENCY)}
            </span>
            <span className="text-[13px] text-muted">{periodLabel[plan.period]}</span>
          </p>
        )}
      </header>

      <p className="mt-1.5 text-sm leading-relaxed text-muted">{plan.positioning}</p>

      {plan.badge && (
        <div className="mt-3">
          <Badge tone="plain">{plan.badge}</Badge>
        </div>
      )}

      <div className="mt-4 border-t border-line pt-4">
        {plan.inherits && (
          <p className="mb-2.5 text-[13px] text-muted">
            Everything in <span className="text-ink">{plan.inherits}</span>, plus
          </p>
        )}
        <ul className="space-y-2">
          {plan.features.map((feature) => (
            <li key={feature} className="flex gap-2.5">
              <Check
                size={15}
                strokeWidth={2}
                aria-hidden="true"
                className={cn('mt-0.5 shrink-0', current ? 'text-navy' : 'text-muted')}
              />
              <span className="text-sm leading-relaxed">{feature}</span>
            </li>
          ))}
        </ul>
        {/* A pointer elsewhere, so it sits outside the list rather than posing
            as one more thing you get. */}
        {plan.footnote && (
          <p className="mt-3 text-[13px] leading-relaxed text-muted">{plan.footnote}</p>
        )}
      </div>
    </article>
  )
}
