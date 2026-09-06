/**
 * sumpt.us domain model.
 *
 * Money rule: every monetary value in this app is an integer in the currency's
 * minor unit (EUR cents, JPY yen). Nothing here ever holds a float or a
 * formatted string. Formatting happens at the very edge, in lib/formatting.
 */

export type CurrencyCode = 'EUR' | 'USD' | 'GBP' | 'CHF' | 'JPY'

export interface Currency {
  code: CurrencyCode
  symbol: string
  /** Number of decimal places. EUR = 2, JPY = 0. */
  decimals: number
  name: string
}

export type CategoryId =
  | 'food'
  | 'accommodation'
  | 'transport'
  | 'activities'
  | 'groceries'
  | 'other'

export interface Category {
  id: CategoryId
  label: string
  /** Lucide icon name, resolved in components/expenses/CategoryIcon. */
  icon: string
  /** Chart series colour, drawn from the sumpt.us accent palette. */
  color: string
}

export type GroupIconId = 'travel' | 'food' | 'home' | 'sports' | 'event' | 'custom'

export interface User {
  id: string
  name: string
  handle: string
  /** Data URL or remote URL. Undefined renders initials instead. */
  avatarUrl?: string
  currency: CurrencyCode
  createdAt: string
}

export interface Friend {
  id: string
  name: string
  handle: string
  avatarUrl?: string
  email?: string
  createdAt: string
}

/** A person inside a group — either the current user or a friend. */
export interface GroupMember {
  /** Matches User.id or Friend.id. */
  personId: string
  joinedAt: string
}

export interface Group {
  id: string
  name: string
  icon: GroupIconId
  /** Optional emoji, only used when icon === 'custom'. */
  emoji?: string
  /**
   * Header photo, as a compressed JPEG data URL. Written only through
   * lib/images, which caps the size — the whole store shares one localStorage
   * budget, so an unprocessed upload would evict everything else.
   */
  coverUrl?: string
  currency: CurrencyCode
  members: GroupMember[]
  createdAt: string
  archivedAt?: string
}

export type SplitMethod = 'equal' | 'amount' | 'percentage' | 'shares'

export interface ExpenseParticipant {
  personId: string
  /**
   * The participant's resolved share, in minor units. Always authoritative:
   * weights below are inputs, this is the settled result after rounding.
   */
  shareMinor: number
  /**
   * Raw input for non-equal splits — minor units for 'amount', basis points
   * for 'percentage' (3500 = 35%), whole shares for 'shares'. Undefined for
   * an equal split.
   */
  weight?: number
}

export interface Expense {
  id: string
  groupId: string
  title: string
  amountMinor: number
  currency: CurrencyCode
  /** personId of the payer. */
  paidBy: string
  participants: ExpenseParticipant[]
  splitMethod: SplitMethod
  category: CategoryId
  note?: string
  createdAt: string
  updatedAt?: string
}

export interface Settlement {
  id: string
  /** Undefined for a direct friend-to-friend settlement outside any group. */
  groupId?: string
  fromPersonId: string
  toPersonId: string
  amountMinor: number
  currency: CurrencyCode
  createdAt: string
  note?: string
}

/** A single directed obligation: `from` owes `to`. */
export interface Debt {
  fromPersonId: string
  toPersonId: string
  amountMinor: number
}

/**
 * A debt that knows which group it came from.
 *
 * Balances are always resolved inside a group: a Japan Trip debt cannot be
 * netted against a Padel Crew one, because the two ledgers have different
 * members. Carrying the group id means every payment the app suggests can be
 * booked back to the ledger it came from, so a group screen and the overview
 * never disagree about whether someone is square.
 */
export interface GroupDebt extends Debt {
  groupId: string
}

/** Net position of one person. Positive = is owed, negative = owes. */
export interface PersonBalance {
  personId: string
  netMinor: number
}

export type ActivityKind = 'expense_added' | 'expense_updated' | 'settlement'

export interface ActivityItem {
  id: string
  kind: ActivityKind
  at: string
  groupId?: string
  expenseId?: string
  settlementId?: string
  /** Who performed the action. */
  actorId: string
}

export interface Preferences {
  currency: CurrencyCode
  language: 'en' | 'de'
  notifications: boolean
  reduceMotion: boolean
  /** Whether the brand clip runs on cold start. Off after "Skip intro". */
  playIntro: boolean
  /**
   * Not a choice — a record. The skip control only appears once the clip has
   * had one clean run, so the first launch is the brand moment and nothing
   * else.
   */
  introSeen: boolean
}

/** Everything the persistence layer owns. Kept flat so it maps to tables later. */
export interface PersistedState {
  version: number
  user: User | null
  onboarded: boolean
  friends: Friend[]
  groups: Group[]
  expenses: Expense[]
  settlements: Settlement[]
  preferences: Preferences
}
