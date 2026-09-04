import type { CurrencyCode } from '@/types'

/**
 * The sumpt.us plans, as one source of truth.
 *
 * Prices follow the same rule as every other amount in this app: integer minor
 * units, formatted only at the edge. They are quoted in euros regardless of the
 * currency a group uses — you pay for the app in EUR, you split dinner in RON.
 */
export const PLAN_CURRENCY: CurrencyCode = 'EUR'

export type BillingPeriod = 'once' | 'month' | 'week'

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
}

/**
 * Free is the whole product, not a trial. Splitting expenses is the reason the
 * app exists; charging for it would be charging for the core.
 */
export const FREE_PLAN: Plan = {
  id: 'free',
  name: 'Free',
  priceMinor: 0,
  period: 'once',
  positioning: 'Everything you need to split expenses. No limits, no expiry.',
  features: [
    'Unlimited groups, expenses and friends',
    'Every split method — equal, exact, percentage, shares',
    'Smart Settlement: the fewest payments that clear the group',
    'Statistics and full activity history',
    'Export all your data whenever you want',
  ],
}

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
      'Scan receipts on your device and split them by line item',
      'Payment QR code and your payment links in one place',
      'Reminders on your schedule, in your own words',
      'Every future feature that costs nothing to run',
    ],
  },
  {
    id: 'lifetime-wg',
    name: 'Lifetime + Household',
    priceMinor: 1000,
    period: 'once',
    positioning: 'The same, with the shared shopping list.',
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
    id: 'household',
    name: 'Household',
    priceMinor: 200,
    period: 'month',
    positioning: 'Just the shared list, nothing else.',
    inherits: 'Free',
    features: ['Shared shopping lists', 'Turn a finished list into a shared expense in one tap'],
  },
  {
    id: 'pro-household',
    name: 'Pro + Household',
    priceMinor: 600,
    period: 'month',
    positioning: 'Both, for less than the two apart.',
    inherits: 'Pro',
    features: ['Shared shopping lists', 'Turn a finished list into a shared expense in one tap'],
    badge: 'Saves €1 a month',
  },
]

/**
 * Bought inside a group rather than here: it unlocks that one trip, and lands
 * in the group as a shared expense so the whole table chips in.
 */
export const TRIP_PLAN: Plan = {
  id: 'trip',
  name: 'Trip Pass',
  priceMinor: 100,
  period: 'week',
  positioning: 'Pro for one trip, split by everyone on it.',
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
