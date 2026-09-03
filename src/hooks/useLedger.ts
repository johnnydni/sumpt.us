import { useMemo } from 'react'
import { useAppStore } from '@/store/appStore'
import {
  calculateDebts,
  calculateGroupBalances,
  calculatePairwiseObligations,
} from '@/lib/calculations'
import type {
  ActivityItem,
  Debt,
  Expense,
  Group,
  GroupDebt,
  PersonBalance,
  Settlement,
} from '@/types'

/**
 * Every read-side derivation lives here so no component ever does arithmetic on
 * money. Each hook memoises on the raw store slices it depends on.
 */

export function useGroup(groupId: string | undefined): Group | undefined {
  const groups = useAppStore((s) => s.groups)
  return useMemo(() => groups.find((g) => g.id === groupId), [groups, groupId])
}

export interface GroupLedger {
  expenses: Expense[]
  settlements: Settlement[]
  balances: PersonBalance[]
  debts: Debt[]
  totalMinor: number
  memberIds: string[]
}

export function useGroupLedger(groupId: string | undefined): GroupLedger {
  const group = useGroup(groupId)
  const allExpenses = useAppStore((s) => s.expenses)
  const allSettlements = useAppStore((s) => s.settlements)

  return useMemo(() => {
    const memberIds = group?.members.map((m) => m.personId) ?? []
    const expenses = allExpenses
      .filter((e) => e.groupId === groupId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    const settlements = allSettlements
      .filter((s) => s.groupId === groupId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    return {
      expenses,
      settlements,
      balances: calculateGroupBalances(expenses, settlements, memberIds),
      debts: calculateDebts(expenses, settlements),
      totalMinor: expenses.reduce((sum, e) => sum + e.amountMinor, 0),
      memberIds,
    }
  }, [group, allExpenses, allSettlements, groupId])
}

/**
 * The app's complete list of outstanding payments, resolved one group at a time
 * and then concatenated.
 *
 * Netting across group boundaries would be wrong: two ledgers have different
 * members, and a payment booked against the wrong group leaves that group out
 * of balance forever. Settling every debt this returns brings every group — and
 * therefore the overview — to zero.
 */
function debtsByGroup(
  groups: Group[],
  expenses: Expense[],
  settlements: Settlement[],
): GroupDebt[] {
  return groups.flatMap((group) => {
    const groupExpenses = expenses.filter((e) => e.groupId === group.id)
    const groupSettlements = settlements.filter((s) => s.groupId === group.id)
    return calculateDebts(groupExpenses, groupSettlements).map((debt) => ({
      ...debt,
      groupId: group.id,
    }))
  })
}

/** One counterpart, with every group-scoped debt behind the headline figure. */
export interface CounterpartBalance {
  personId: string
  /** Positive = they owe you, negative = you owe them. */
  netMinor: number
  debts: GroupDebt[]
}

export interface OverallLedger {
  /** Net position across every group. Positive = owed to you. */
  netMinor: number
  owedToYouMinor: number
  youOweMinor: number
  /** Per-person rollup for the settle screens. */
  counterparts: CounterpartBalance[]
  /** Every outstanding payment in the app, group by group. */
  allDebts: GroupDebt[]
}

export function useOverallLedger(): OverallLedger {
  const me = useAppStore((s) => s.user?.id)
  const groups = useAppStore((s) => s.groups)
  const expenses = useAppStore((s) => s.expenses)
  const settlements = useAppStore((s) => s.settlements)

  return useMemo(() => {
    const allDebts = debtsByGroup(groups, expenses, settlements)

    const byPerson = new Map<string, CounterpartBalance>()
    for (const debt of allDebts) {
      if (debt.fromPersonId !== me && debt.toPersonId !== me) continue
      const them = debt.fromPersonId === me ? debt.toPersonId : debt.fromPersonId
      const signed = debt.toPersonId === me ? debt.amountMinor : -debt.amountMinor

      const entry = byPerson.get(them) ?? { personId: them, netMinor: 0, debts: [] }
      entry.netMinor += signed
      entry.debts.push(debt)
      byPerson.set(them, entry)
    }

    let owedToYou = 0
    let youOwe = 0
    for (const entry of byPerson.values()) {
      if (entry.netMinor > 0) owedToYou += entry.netMinor
      else youOwe += -entry.netMinor
    }

    return {
      netMinor: owedToYou - youOwe,
      owedToYouMinor: owedToYou,
      youOweMinor: youOwe,
      counterparts: [...byPerson.values()]
        .filter((entry) => entry.netMinor !== 0)
        .sort((a, b) => b.netMinor - a.netMinor),
      allDebts,
    }
  }, [me, groups, expenses, settlements])
}

/**
 * The Smart Settlement comparison.
 *
 * `direct` counts the obligations the expense history created between specific
 * pairs of people; `simplified` is what the app actually asks anyone to pay.
 * Both are computed from the same ledger, group by group, so the claim on
 * screen is checkable rather than decorative.
 */
export function useNetworkSimplification() {
  const groups = useAppStore((s) => s.groups)
  const expenses = useAppStore((s) => s.expenses)
  const settlements = useAppStore((s) => s.settlements)

  return useMemo(() => {
    const direct = groups.flatMap((group) =>
      calculatePairwiseObligations(
        expenses.filter((e) => e.groupId === group.id),
        settlements.filter((s) => s.groupId === group.id),
      ),
    )
    const simplified = debtsByGroup(groups, expenses, settlements)
    return { direct, simplified, saved: Math.max(0, direct.length - simplified.length) }
  }, [groups, expenses, settlements])
}

/** The complete financial relationship between the user and one friend. */
export function useFriendLedger(friendId: string | undefined) {
  const me = useAppStore((s) => s.user?.id)
  const expenses = useAppStore((s) => s.expenses)
  const { counterparts } = useOverallLedger()

  return useMemo(() => {
    if (!me || !friendId) {
      return { netMinor: 0, debts: [] as GroupDebt[], sharedExpenses: [], sharedGroupIds: [] }
    }

    const involves = (ids: string[]) => ids.includes(me) && ids.includes(friendId)

    const sharedExpenses = expenses
      .filter((e) => involves([e.paidBy, ...e.participants.map((p) => p.personId)]))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    const entry = counterparts.find((c) => c.personId === friendId)

    return {
      // Deliberately the same figure Settle Up shows, not one recomputed from
      // this pair's expenses in isolation.
      netMinor: entry?.netMinor ?? 0,
      debts: entry?.debts ?? [],
      sharedExpenses,
      sharedGroupIds: [...new Set(sharedExpenses.map((e) => e.groupId))],
    }
  }, [me, friendId, expenses, counterparts])
}

/**
 * Split a payment across the group ledgers it discharges, largest first.
 *
 * A single "Alex pays you €40" can be clearing €30 from the Japan Trip and €10
 * from Padel Crew. Booking it to one group would leave the other permanently
 * out of balance, so the amount is apportioned and recorded as one settlement
 * per group.
 */
export function allocateAcrossGroups(
  amountMinor: number,
  debts: GroupDebt[],
): Array<{ groupId: string; amountMinor: number }> {
  const ordered = [...debts].sort(
    (a, b) => b.amountMinor - a.amountMinor || a.groupId.localeCompare(b.groupId),
  )
  const allocations: Array<{ groupId: string; amountMinor: number }> = []
  let remaining = amountMinor

  for (const debt of ordered) {
    if (remaining <= 0) break
    const take = Math.min(remaining, debt.amountMinor)
    if (take > 0) {
      allocations.push({ groupId: debt.groupId, amountMinor: take })
      remaining -= take
    }
  }

  return allocations
}

export function useActivity(limit?: number): ActivityItem[] {
  const expenses = useAppStore((s) => s.expenses)
  const settlements = useAppStore((s) => s.settlements)

  return useMemo(() => {
    const items: ActivityItem[] = [
      ...expenses.map((e) => ({
        id: `a_${e.id}`,
        kind: (e.updatedAt ? 'expense_updated' : 'expense_added') as ActivityItem['kind'],
        at: e.updatedAt ?? e.createdAt,
        groupId: e.groupId,
        expenseId: e.id,
        actorId: e.paidBy,
      })),
      ...settlements.map((s) => ({
        id: `a_${s.id}`,
        kind: 'settlement' as const,
        at: s.createdAt,
        groupId: s.groupId,
        settlementId: s.id,
        actorId: s.fromPersonId,
      })),
    ].sort((a, b) => b.at.localeCompare(a.at))

    return limit ? items.slice(0, limit) : items
  }, [expenses, settlements, limit])
}
