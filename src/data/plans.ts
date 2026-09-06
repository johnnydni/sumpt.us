import type { CurrencyCode } from '@/types'

/**
 * The sumptus plans, as one source of truth.
 *
 * Prices follow the same rule as every other amount in this app: integer minor
 * units, formatted only at the edge. They are quoted in euros regardless of the
 * currency a group uses — you pay for the app in EUR, you split dinner in RON.
 */
export const PLAN_CURRENCY: CurrencyCode = 'EUR'

export type BillingPeriod = 'once' | 'month' | 'week'

/**
 * One rung of a price ladder.
 *
 * Store purchases cannot be priced at runtime — every amount has to exist as a
 * registered product before anyone can buy it. So a rule like "a euro per extra
 * week" has to become a short list of fixed prices, or it becomes two dozen
 * products to keep in step across two stores.
 */
export interface PriceTier {
  /** The longest trip this rung covers, in days. */
  upToDays: number
  label: string
  priceMinor: number
}

export interface Plan {
  id: string
  name: string
  priceMinor: number
  period: BillingPeriod
  /** One line on who this is for. */
  positioning: string
  /** The plan this one builds on, rendered as "Everything in X, plus". */
  inherits?: string
  /** Only what this plan adds — never a matrix of greyed-out rows. */
  features: string[]
  /** A factual note, not a sales badge. */
  badge?: string
  /** A closing line under the list — a pointer, not a feature. */
  footnote?: string
  /** Priced by length rather than by a single figure. See PriceTier. */
  tiers?: PriceTier[]
}

/**
 * Free is metered by open groups rather than by usage.
 *
 * A ticket is spent when a group is created and comes back when that group is
 * settled, so the limit never punishes logging expenses — only leaving them
 * unresolved, which is the one habit the app exists to fix.
 *
 * The escape hatch matters as much as the rule. Someone always forgets to pay
 * their eleven euros, and without a way out that one person could hold a ticket
 * hostage forever. After a week the group can be closed by hand and the ticket
 * comes back, settled or not.
 *
 * What Free does not carry is Smart Settlement. Splitting stays complete here —
 * every method, every balance — and what you pay for is the shortcut through
 * settling, not the arithmetic itself. It is also the right thing to sell: it
 * costs nothing to run, so it belongs in a plan you buy once rather than one
 * that bills every month.
 */
/**
 * How many groups a Free account can have open at once.
 *
 * The number the ticket rule is written around, kept beside the copy that
 * quotes it so the two cannot drift apart.
 */
export const FREE_GROUP_TICKETS = 2

export const FREE_PLAN: Plan = {
  id: 'free',
  name: 'Free',
  priceMinor: 0,
  period: 'once',
  positioning: 'Two groups running at a time, and the full splitting engine behind them.',
  features: [
    'Two group tickets — a new group spends one',
    'Settle a group and its ticket comes back',
    'Still open after a week? Close it by hand and take the ticket back anyway',
    'Unlimited expenses, friends and history',
    'Every split method — equal, exact, percentage, shares',
    'Every balance, and settling up by hand whenever you want',
    'Statistics and full data export',
    'Trips run for a set length, up to six months',
  ],
  footnote:
    'Smart Settlement — the fewest payments that clear a group — comes with Lifetime.',
}

/**
 * The case for a permanent price, in the product's own voice.
 *
 * The first line stands on its own above the fold; the rest is the reasoning,
 * which most people will never open and nobody should have to scroll past.
 */
export const PAY_ONCE_SUMMARY =
  'These plans carry features that allow you to use sumptus forever in its core: managing and settling shared expenses.'

export const PAY_ONCE_REASONING = [
  'The reason why we designed these plans in this way, is simple.',
  'We want to allow users that need just that, be able to purchase sumptus once and use it as they please.',
  "Of course you'll still receive the newest social and security features as well.",
  'This makes the permanent plan honest in our opinion.',
  'If you want to support us in the continuous development of cool, new and useful features, consider the Pro plan.',
]

/**
 * One-time plans carry only features that cost nothing to run, which is what
 * makes a permanent price honest: no third-party bill accrues behind them.
 */
export const ONE_TIME_PLANS: Plan[] = [
  {
    id: 'lifetime',
    name: 'Lifetime',
    priceMinor: 900,
    period: 'once',
    positioning: 'Pay once. Keep it for good.',
    inherits: 'Free',
    features: [
      'Smart Settlement: the fewest payments that clear the group',
      'Scan receipts on your device and split them by line item',
      'Payment QR code and your payment links in one place',
      'Reminders on your schedule, in your own words',
      'Future social and security updates',
    ],
    footnote: 'For the newest features, consider the Pro plan.',
  },
  {
    id: 'lifetime-wg',
    name: 'Lifetime + Household Pass',
    priceMinor: 1000,
    period: 'once',
    positioning: 'The same, with the Household Pass included.',
    inherits: 'Lifetime',
    features: ['Shared shopping lists', 'Turn a finished list into a shared expense in one tap'],
  },
]

export const SUBSCRIPTION_PLANS: Plan[] = [
  {
    id: 'pro',
    name: 'Pro',
    priceMinor: 500,
    period: 'month',
    positioning: 'For people who log expenses week in, week out.',
    inherits: 'Lifetime',
    features: [
      'Voice entry for when your hands are full',
      "Currency converter, fixed to your trip's start date",
      'New features as they land',
    ],
  },
  {
    id: 'pro-household',
    name: 'Pro + Household Pass',
    priceMinor: 600,
    period: 'month',
    positioning: 'Pro with the Household Pass included.',
    inherits: 'Pro',
    features: ['Shared shopping lists', 'Turn a finished list into a shared expense in one tap'],
    badge: 'Saves €1 a month',
  },
]

/**
 * Add-ons for a way of living together rather than a tier of the app.
 *
 * A shared flat is not a trip that ends, so it never fits the group ladder: the
 * ledger simply rolls on. Keeping it a pass alongside the plans leaves room for
 * the next situation that needs its own tools without growing a fourth tier.
 */
export const EXTENSION_PLANS: Plan[] = [
  {
    id: 'household',
    name: 'Household Pass',
    priceMinor: 200,
    period: 'month',
    positioning: 'For a shared flat, where the ledger never really ends.',
    inherits: 'Free',
    features: ['Shared shopping lists', 'Turn a finished list into a shared expense in one tap'],
  },
]

/**
 * Bought inside a group rather than here: it unlocks that one trip, and lands
 * in the group as a shared expense so the whole table chips in.
 */
/**
 * Priced by the length of the trip: a euro a day, three for anything up to
 * three weeks, then a euro for each further week — rounded onto five rungs so
 * it can exist as five store products rather than twenty-four.
 *
 * The last rung is six months because that is where trips are capped, so no
 * trip can fall past the end of the ladder.
 */
export const TRIP_TIERS: PriceTier[] = [
  { upToDays: 1, label: 'A day', priceMinor: 100 },
  { upToDays: 21, label: 'Up to 3 weeks', priceMinor: 300 },
  { upToDays: 42, label: 'Up to 6 weeks', priceMinor: 600 },
  { upToDays: 84, label: 'Up to 12 weeks', priceMinor: 1200 },
  { upToDays: 182, label: 'Up to 6 months', priceMinor: 2600 },
]

/**
 * The rung a trip of this length falls on.
 *
 * Rounds up, never down: a trip is never sold a pass that runs out before it
 * does. Anything past the last rung gets the last rung, which cannot happen
 * while trips are capped at six months but should not become a crash if that
 * cap ever moves.
 */
export function tripTierFor(days: number): PriceTier {
  return TRIP_TIERS.find((tier) => days <= tier.upToDays) ?? TRIP_TIERS[TRIP_TIERS.length - 1]
}

export const TRIP_PLAN: Plan = {
  id: 'trip',
  name: 'Trip Pass',
  priceMinor: TRIP_TIERS[0].priceMinor,
  period: 'once',
  tiers: TRIP_TIERS,
  positioning: 'Pro for one trip, priced by how long it runs.',
  features: [
    'Every Pro feature, for one group, for as long as the trip runs',
    'Booked into the group as a shared expense — nobody pays for it alone',
    'Ends with the trip and settles back to Free. Nothing is locked away',
  ],
}

/**
 * There is no billing yet, and no account to attach a purchase to, so the
 * current plan is a fact rather than stored state. When payments land this
 * reads from the entitlement the backend returns — never from local storage,
 * which a user could simply edit.
 */
export const CURRENT_PLAN_ID = 'free'
