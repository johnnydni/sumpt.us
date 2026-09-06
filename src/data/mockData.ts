import type {
  Category,
  CategoryId,
  Expense,
  Friend,
  Group,
  PersistedState,
  Settlement,
  SplitMethod,
  User,
} from '@/types'
import { calculateExpenseShares } from '@/lib/calculations'
import { DEFAULT_PREFERENCES, SCHEMA_VERSION } from '@/store/persistence/types'

export const CATEGORIES: Category[] = [
  { id: 'food', label: 'Food', icon: 'UtensilsCrossed', color: '#C86632' },
  { id: 'accommodation', label: 'Accommodation', icon: 'BedDouble', color: '#172A46' },
  { id: 'transport', label: 'Transport', icon: 'TrainFront', color: '#3F7D58' },
  { id: 'activities', label: 'Activities', icon: 'Ticket', color: '#A48732' },
  { id: 'groceries', label: 'Groceries', icon: 'ShoppingBasket', color: '#8A6BA1' },
  { id: 'other', label: 'Other', icon: 'Receipt', color: '#777777' },
]

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<
  CategoryId,
  Category
>

export const ME = 'u_illy'

const FRIEND_IDS = {
  alex: 'f_alex',
  max: 'f_max',
  sarah: 'f_sarah',
  nina: 'f_nina',
  tom: 'f_tom',
}

/** Days-ago helper so the seeded feed always looks freshly used. */
function daysAgo(days: number, hour = 19, minute = 30): string {
  const date = new Date()
  date.setDate(date.getDate() - days)
  date.setHours(hour, minute, 0, 0)
  return date.toISOString()
}

interface SeedExpense {
  id: string
  groupId: string
  title: string
  /** Major units, written the way a human would — converted to cents below. */
  amount: number
  paidBy: string
  participants: string[]
  category: CategoryId
  at: string
  method?: SplitMethod
  weights?: number[]
}

function buildExpense(seed: SeedExpense): Expense {
  const amountMinor = Math.round(seed.amount * 100)
  const method = seed.method ?? 'equal'
  const inputs = seed.participants.map((personId, index) => ({
    personId,
    weight: seed.weights?.[index],
  }))
  return {
    id: seed.id,
    groupId: seed.groupId,
    title: seed.title,
    amountMinor,
    currency: 'EUR',
    paidBy: seed.paidBy,
    participants: calculateExpenseShares(amountMinor, method, inputs),
    splitMethod: method,
    category: seed.category,
    createdAt: seed.at,
  }
}

const { alex, max, sarah, nina, tom } = FRIEND_IDS

const JAPAN = 'g_japan'
const PADEL = 'g_padel'
const BERLIN = 'g_berlin'

const seededExpenses: SeedExpense[] = [
  // ── Japan Trip ────────────────────────────────────────────────────────────
  {
    id: 'e_jp_01',
    groupId: JAPAN,
    title: 'JR Rail passes',
    amount: 268,
    paidBy: alex,
    participants: [ME, alex, max, sarah],
    category: 'transport',
    at: daysAgo(19, 9, 5),
  },
  {
    id: 'e_jp_02',
    groupId: JAPAN,
    title: 'Hotel Shinjuku',
    amount: 182.4,
    paidBy: ME,
    participants: [ME, alex, max, sarah],
    category: 'accommodation',
    at: daysAgo(18, 15, 40),
  },
  {
    id: 'e_jp_03',
    groupId: JAPAN,
    title: 'Konbini run',
    amount: 34.8,
    paidBy: max,
    participants: [ME, alex, max, sarah],
    category: 'groceries',
    at: daysAgo(18, 22, 15),
  },
  {
    id: 'e_jp_04',
    groupId: JAPAN,
    title: 'teamLab tickets',
    amount: 96,
    paidBy: sarah,
    participants: [ME, alex, max, sarah],
    category: 'activities',
    at: daysAgo(16, 11, 0),
  },
  {
    id: 'e_jp_05',
    groupId: JAPAN,
    title: 'Ramen Ichiran',
    amount: 46.2,
    paidBy: max,
    participants: [ME, max, sarah],
    category: 'food',
    at: daysAgo(15, 13, 25),
  },
  {
    id: 'e_jp_06',
    groupId: JAPAN,
    title: 'Onsen day trip',
    amount: 72,
    paidBy: sarah,
    participants: [alex, max, sarah],
    category: 'activities',
    at: daysAgo(12, 10, 30),
  },
  {
    id: 'e_jp_07',
    groupId: JAPAN,
    title: 'Karaoke Shibuya',
    amount: 58,
    paidBy: ME,
    participants: [ME, alex, max, sarah],
    category: 'activities',
    at: daysAgo(9, 23, 10),
  },
  {
    id: 'e_jp_08',
    groupId: JAPAN,
    title: 'Breakfast at Tsukiji',
    amount: 52.5,
    paidBy: alex,
    participants: [ME, alex, max, sarah],
    category: 'food',
    method: 'shares',
    weights: [1, 1, 2, 1],
    at: daysAgo(7, 8, 20),
  },
  {
    id: 'e_jp_09',
    groupId: JAPAN,
    title: 'Taxi to Shibuya',
    amount: 21,
    paidBy: alex,
    participants: [ME, alex, max],
    category: 'transport',
    at: daysAgo(4, 21, 5),
  },
  {
    id: 'e_jp_10',
    groupId: JAPAN,
    title: 'Dinner in Shibuya',
    amount: 84,
    paidBy: ME,
    participants: [ME, alex, max, sarah],
    category: 'food',
    at: daysAgo(0, 19, 42),
  },

  // ── Padel Crew ────────────────────────────────────────────────────────────
  {
    id: 'e_pd_01',
    groupId: PADEL,
    title: 'Court booking — March',
    amount: 96,
    paidBy: ME,
    participants: [ME, alex, max, nina, tom, sarah],
    category: 'activities',
    at: daysAgo(21, 18, 0),
  },
  {
    id: 'e_pd_02',
    groupId: PADEL,
    title: 'New balls (6 tubes)',
    amount: 42.6,
    paidBy: nina,
    participants: [ME, alex, max, nina, tom, sarah],
    category: 'other',
    at: daysAgo(17, 19, 15),
  },
  {
    id: 'e_pd_03',
    groupId: PADEL,
    title: 'Post-match beers',
    amount: 38.4,
    paidBy: tom,
    participants: [ME, max, nina, tom],
    category: 'food',
    at: daysAgo(14, 21, 45),
  },
  {
    id: 'e_pd_04',
    groupId: PADEL,
    title: 'Court booking — April',
    amount: 96,
    paidBy: nina,
    participants: [ME, alex, max, nina, tom, sarah],
    category: 'activities',
    at: daysAgo(8, 18, 0),
  },
  {
    id: 'e_pd_05',
    groupId: PADEL,
    title: 'Tournament entry',
    amount: 120,
    paidBy: ME,
    participants: [ME, nina, tom, max],
    category: 'activities',
    at: daysAgo(3, 12, 30),
  },
  {
    id: 'e_pd_06',
    groupId: PADEL,
    title: 'Grip tape order',
    amount: 24.5,
    paidBy: max,
    participants: [ME, max, nina],
    category: 'other',
    at: daysAgo(1, 16, 20),
  },

  // ── Weekend Berlin ────────────────────────────────────────────────────────
  {
    id: 'e_bl_01',
    groupId: BERLIN,
    title: 'Apartment, two nights',
    amount: 182.4,
    paidBy: nina,
    participants: [ME, nina, tom],
    category: 'accommodation',
    at: daysAgo(11, 16, 0),
  },
  {
    id: 'e_bl_02',
    groupId: BERLIN,
    title: 'Groceries Kreuzberg',
    amount: 41.2,
    paidBy: ME,
    participants: [ME, nina, tom],
    category: 'groceries',
    at: daysAgo(11, 18, 45),
  },
  {
    id: 'e_bl_03',
    groupId: BERLIN,
    title: 'Berghain night',
    amount: 60,
    paidBy: tom,
    participants: [ME, nina, tom],
    category: 'activities',
    at: daysAgo(10, 23, 55),
  },
  {
    id: 'e_bl_04',
    groupId: BERLIN,
    title: 'Brunch in Neukölln',
    amount: 57.9,
    paidBy: ME,
    participants: [ME, nina, tom],
    category: 'food',
    method: 'amount',
    weights: [2190, 1850, 1750],
    at: daysAgo(10, 12, 10),
  },
]

export function createDemoState(): PersistedState {
  const user: User = {
    id: ME,
    name: 'Illy',
    handle: 'illy',
    currency: 'EUR',
    createdAt: daysAgo(60, 10, 0),
  }

  const friends: Friend[] = [
    { id: alex, name: 'Alex Müller', handle: 'alexm', createdAt: daysAgo(58) },
    { id: max, name: 'Max Schmidt', handle: 'maxs', createdAt: daysAgo(55) },
    { id: sarah, name: 'Sarah Weber', handle: 'sweber', createdAt: daysAgo(52) },
    { id: nina, name: 'Nina Kowalski', handle: 'ninak', createdAt: daysAgo(40) },
    { id: tom, name: 'Tom Bergmann', handle: 'tomb', createdAt: daysAgo(33) },
  ]

  const groups: Group[] = [
    {
      id: JAPAN,
      name: 'Japan Trip',
      icon: 'travel',
      currency: 'EUR',
      createdAt: daysAgo(21),
      members: [ME, alex, max, sarah].map((personId) => ({ personId, joinedAt: daysAgo(21) })),
    },
    {
      id: PADEL,
      name: 'Padel Crew',
      icon: 'sports',
      currency: 'EUR',
      createdAt: daysAgo(45),
      members: [ME, alex, max, nina, tom, sarah].map((personId) => ({
        personId,
        joinedAt: daysAgo(45),
      })),
    },
    {
      id: BERLIN,
      name: 'Weekend Berlin',
      icon: 'event',
      currency: 'EUR',
      createdAt: daysAgo(13),
      members: [ME, nina, tom].map((personId) => ({ personId, joinedAt: daysAgo(13) })),
    },
  ]

  const settlements: Settlement[] = [
    {
      id: 's_01',
      groupId: JAPAN,
      fromPersonId: alex,
      toPersonId: ME,
      amountMinor: 1820,
      currency: 'EUR',
      createdAt: daysAgo(2, 17, 5),
    },
    {
      id: 's_02',
      groupId: PADEL,
      fromPersonId: ME,
      toPersonId: nina,
      amountMinor: 1240,
      currency: 'EUR',
      createdAt: daysAgo(6, 9, 40),
    },
  ]

  return {
    version: SCHEMA_VERSION,
    user,
    onboarded: true,
    friends,
    groups,
    expenses: seededExpenses.map(buildExpense),
    settlements,
    preferences: { ...DEFAULT_PREFERENCES },
  }
}

/** A brand-new account: no demo content, every empty state on show. */
export function createEmptyState(): PersistedState {
  return {
    version: SCHEMA_VERSION,
    user: null,
    onboarded: false,
    friends: [],
    groups: [],
    expenses: [],
    settlements: [],
    preferences: { ...DEFAULT_PREFERENCES },
  }
}
