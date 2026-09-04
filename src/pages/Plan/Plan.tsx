import { Check } from 'lucide-react'
import {
  CURRENT_PLAN_ID,
  FREE_PLAN,
  ONE_TIME_PLANS,
  PLAN_CURRENCY,
  SUBSCRIPTION_PLANS,
  TRIP_PLAN,
  type BillingPeriod,
  type Plan as PlanTier,
} from '@/data/plans'
import { PageHeader } from '@/components/navigation/PageHeader'
import { Badge, SectionHeader } from '@/components/ui/Primitives'
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
        <p className="-mt-1 mb-4 max-w-prose text-[13px] leading-relaxed text-muted">
          These carry only features that cost nothing to run, which is what makes a permanent price
          honest — no bill quietly accrues behind them.
        </p>
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

function PlanCard({ plan, current = false }: { plan: PlanTier; current?: boolean }) {
  const free = plan.priceMinor === 0

  return (
    <article className={cn('paper px-5 py-5 sm:px-6', current && 'border-navy/30 bg-navy/[0.02]')}>
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="display text-[19px] leading-tight">{plan.name}</h3>
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
      </div>
    </article>
  )
}
