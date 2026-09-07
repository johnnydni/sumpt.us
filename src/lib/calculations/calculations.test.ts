import { describe, expect, it } from 'vitest'
import {
  allocate,
  calculateDebts,
  calculateExpenseShares,
  calculateGroupBalances,
  calculatePairwiseObligations,
  calculateUserBalance,
  holdsTicket,
  settleBalances,
  spentTickets,
  simplifyDebts,
  validateSplit,
} from './index'
import { parseAmountToMinor } from '@/lib/currency'
import { createDemoState } from '@/data/mockData'
import { allocateAcrossGroups } from '@/hooks/useLedger'
import type { Debt, Expense, Group, PersonBalance, Settlement } from '@/types'

/**
 * These cover the only part of sumptus that can be wrong in a way the user
 * can't see: the money. Everything asserts on integers in minor units.
 */

describe('allocate', () => {
  it('never loses or invents a cent', () => {
    for (const total of [1, 7, 100, 8400, 10_001, 999_999]) {
      for (const size of [1, 2, 3, 4, 5, 7, 11]) {
        const parts = allocate(total, new Array(size).fill(1))
        expect(parts).toHaveLength(size)
        expect(parts.reduce((a, b) => a + b, 0)).toBe(total)
      }
    }
  })

  it('spreads an indivisible remainder one cent at a time', () => {
    // 100 across 3 is 33.33…; someone has to carry the extra cent, but only one.
    expect(allocate(100, [1, 1, 1])).toEqual([34, 33, 33])
    expect(allocate(10, [1, 1, 1, 1])).toEqual([3, 3, 2, 2])
  })

  it('is deterministic for identical input', () => {
    const first = allocate(8401, [3, 1, 1, 1])
    const second = allocate(8401, [3, 1, 1, 1])
    expect(first).toEqual(second)
  })

  it('respects weights', () => {
    expect(allocate(8400, [1, 1, 2, 0])).toEqual([2100, 2100, 4200, 0])
  })

  it('falls back to an even split when all weights are zero', () => {
    expect(allocate(900, [0, 0, 0])).toEqual([300, 300, 300])
  })

  it('handles negative totals without dropping units', () => {
    const parts = allocate(-100, [1, 1, 1])
    expect(parts.reduce((a, b) => a + b, 0)).toBe(-100)
  })
})

describe('calculateExpenseShares', () => {
  const people = ['a', 'b', 'c', 'd'].map((personId) => ({ personId }))

  it('splits equally down to the cent', () => {
    const shares = calculateExpenseShares(8400, 'equal', people)
    expect(shares.map((s) => s.shareMinor)).toEqual([2100, 2100, 2100, 2100])
  })

  it('reconciles an equal split that does not divide evenly', () => {
    const shares = calculateExpenseShares(10_000, 'equal', people.slice(0, 3))
    expect(shares.reduce((sum, s) => sum + s.shareMinor, 0)).toBe(10_000)
  })

  it('uses explicit amounts verbatim', () => {
    const shares = calculateExpenseShares(8400, 'amount', [
      { personId: 'a', weight: 3000 },
      { personId: 'b', weight: 2000 },
      { personId: 'c', weight: 3400 },
      { personId: 'd', weight: 0 },
    ])
    expect(shares.map((s) => s.shareMinor)).toEqual([3000, 2000, 3400, 0])
  })

  it('reads percentages as basis points and still totals exactly', () => {
    const shares = calculateExpenseShares(8400, 'percentage', [
      { personId: 'a', weight: 3500 },
      { personId: 'b', weight: 2500 },
      { personId: 'c', weight: 4000 },
      { personId: 'd', weight: 0 },
    ])
    expect(shares.map((s) => s.shareMinor)).toEqual([2940, 2100, 3360, 0])
    expect(shares.reduce((sum, s) => sum + s.shareMinor, 0)).toBe(8400)
  })

  it('splits by shares', () => {
    const shares = calculateExpenseShares(8400, 'shares', [
      { personId: 'a', weight: 1 },
      { personId: 'b', weight: 1 },
      { personId: 'c', weight: 2 },
      { personId: 'd', weight: 0 },
    ])
    expect(shares.map((s) => s.shareMinor)).toEqual([2100, 2100, 4200, 0])
  })
})

describe('validateSplit', () => {
  it('rejects an amount split that misses the total', () => {
    const result = validateSplit(8400, 'amount', [
      { personId: 'a', weight: 3000 },
      { personId: 'b', weight: 3000 },
    ])
    expect(result.valid).toBe(false)
    expect(result.deltaMinor).toBe(-2400)
  })

  it('rejects percentages that do not reach 100', () => {
    expect(
      validateSplit(8400, 'percentage', [
        { personId: 'a', weight: 5000 },
        { personId: 'b', weight: 4000 },
      ]).valid,
    ).toBe(false)
  })

  it('rejects an empty participant list', () => {
    expect(validateSplit(8400, 'equal', []).valid).toBe(false)
  })

  it('accepts a balanced amount split', () => {
    expect(
      validateSplit(8400, 'amount', [
        { personId: 'a', weight: 4200 },
        { personId: 'b', weight: 4200 },
      ]).valid,
    ).toBe(true)
  })
})

describe('parseAmountToMinor', () => {
  it('reads both decimal conventions', () => {
    expect(parseAmountToMinor('84.50', 'EUR')).toBe(8450)
    expect(parseAmountToMinor('84,50', 'EUR')).toBe(8450)
    expect(parseAmountToMinor('1.234,56', 'EUR')).toBe(123_456)
    expect(parseAmountToMinor('1,234.56', 'EUR')).toBe(123_456)
    expect(parseAmountToMinor('€84', 'EUR')).toBe(8400)
  })

  it('honours currency precision', () => {
    expect(parseAmountToMinor('1200', 'JPY')).toBe(1200)
  })

  it('survives the classic float traps', () => {
    expect(parseAmountToMinor('0.29', 'EUR')).toBe(29)
    expect(parseAmountToMinor('1.15', 'EUR')).toBe(115)
    expect(parseAmountToMinor('19.99', 'EUR')).toBe(1999)
  })

  it('returns null rather than zero for unusable input', () => {
    expect(parseAmountToMinor('', 'EUR')).toBeNull()
    expect(parseAmountToMinor('abc', 'EUR')).toBeNull()
  })
})

function expense(
  id: string,
  paidBy: string,
  amountMinor: number,
  participants: string[],
): Expense {
  return {
    id,
    groupId: 'g',
    title: id,
    amountMinor,
    currency: 'EUR',
    paidBy,
    participants: calculateExpenseShares(
      amountMinor,
      'equal',
      participants.map((personId) => ({ personId })),
    ),
    splitMethod: 'equal',
    category: 'other',
    createdAt: '2026-01-01T12:00:00.000Z',
  }
}

describe('balances', () => {
  it('nets a payer against their own share', () => {
    // Illy pays 84 for four people: out 84, owes 21, so up 63.
    const balances = calculateGroupBalances(
      [expense('e1', 'illy', 8400, ['illy', 'alex', 'max', 'sarah'])],
      [],
      ['illy', 'alex', 'max', 'sarah'],
    )
    expect(balances.find((b) => b.personId === 'illy')?.netMinor).toBe(6300)
    expect(balances.find((b) => b.personId === 'alex')?.netMinor).toBe(-2100)
  })

  it('always sums to zero — the invariant the debt graph depends on', () => {
    const demo = createDemoState()
    for (const group of demo.groups) {
      const balances = calculateGroupBalances(
        demo.expenses.filter((e) => e.groupId === group.id),
        demo.settlements.filter((s) => s.groupId === group.id),
        group.members.map((m) => m.personId),
      )
      expect(balances.reduce((sum, b) => sum + b.netMinor, 0)).toBe(0)
    }
  })

  it('moves a balance toward zero when a settlement is recorded', () => {
    const expenses = [expense('e1', 'illy', 8400, ['illy', 'alex', 'max', 'sarah'])]
    const before = calculateUserBalance('alex', expenses, [])
    const settlement: Settlement = {
      id: 's1',
      groupId: 'g',
      fromPersonId: 'alex',
      toPersonId: 'illy',
      amountMinor: 2100,
      currency: 'EUR',
      createdAt: '2026-01-02T12:00:00.000Z',
    }
    const after = calculateUserBalance('alex', expenses, [settlement])
    expect(before).toBe(-2100)
    expect(after).toBe(0)
  })
})

describe('calculatePairwiseObligations', () => {
  it('nets opposing obligations between the same pair into one direction', () => {
    const debts = calculatePairwiseObligations(
      [
        expense('e1', 'illy', 2000, ['illy', 'alex']), // alex owes illy 1000
        expense('e2', 'alex', 600, ['illy', 'alex']), // illy owes alex 300
      ],
      [],
    )
    expect(debts).toHaveLength(1)
    expect(debts[0]).toEqual({ fromPersonId: 'alex', toPersonId: 'illy', amountMinor: 700 })
  })

  it('keeps a cycle visible — that is the number Smart Settlement improves on', () => {
    const obligations = calculatePairwiseObligations(
      [
        expense('e1', 'b', 2000, ['a', 'b']),
        expense('e2', 'c', 2000, ['b', 'c']),
        expense('e3', 'a', 2000, ['c', 'a']),
      ],
      [],
    )
    expect(obligations).toHaveLength(3)
    // Everyone is actually square, so nothing needs paying.
    expect(calculateDebts(
      [
        expense('e1', 'b', 2000, ['a', 'b']),
        expense('e2', 'c', 2000, ['b', 'c']),
        expense('e3', 'a', 2000, ['c', 'a']),
      ],
      [],
    )).toHaveLength(0)
  })
})

describe('calculateDebts', () => {
  it('routes a chain to the person who is actually owed', () => {
    // A owes B, B owes C the same amount: the only payment needed is A → C.
    const debts = calculateDebts(
      [expense('e1', 'b', 2000, ['a', 'b']), expense('e2', 'c', 2000, ['b', 'c'])],
      [],
    )
    expect(debts).toEqual([{ fromPersonId: 'a', toPersonId: 'c', amountMinor: 1000 }])
  })

  it('drops a debt once it is settled', () => {
    const debts = calculateDebts(
      [expense('e1', 'illy', 2000, ['illy', 'alex'])],
      [
        {
          id: 's1',
          fromPersonId: 'alex',
          toPersonId: 'illy',
          amountMinor: 1000,
          currency: 'EUR',
          createdAt: '2026-01-02T12:00:00.000Z',
        },
      ],
    )
    expect(debts).toHaveLength(0)
  })

  it('is already minimal, so it has nothing left to simplify', () => {
    const demo = createDemoState()
    const debts = calculateDebts(demo.expenses, demo.settlements)
    expect(simplifyDebts(debts)).toHaveLength(debts.length)
  })
})

/** Sum each person's signed position across a set of transfers. */
function positions(debts: Debt[]): Map<string, number> {
  const net = new Map<string, number>()
  for (const debt of debts) {
    net.set(debt.fromPersonId, (net.get(debt.fromPersonId) ?? 0) - debt.amountMinor)
    net.set(debt.toPersonId, (net.get(debt.toPersonId) ?? 0) + debt.amountMinor)
  }
  return net
}

describe('simplifyDebts', () => {
  it('collapses a chain into a single transfer', () => {
    // A → B → C is really just A → C.
    const simplified = simplifyDebts([
      { fromPersonId: 'a', toPersonId: 'b', amountMinor: 1000 },
      { fromPersonId: 'b', toPersonId: 'c', amountMinor: 1000 },
    ])
    expect(simplified).toEqual([{ fromPersonId: 'a', toPersonId: 'c', amountMinor: 1000 }])
  })

  it('cancels a cycle completely', () => {
    const simplified = simplifyDebts([
      { fromPersonId: 'a', toPersonId: 'b', amountMinor: 1000 },
      { fromPersonId: 'b', toPersonId: 'c', amountMinor: 1000 },
      { fromPersonId: 'c', toPersonId: 'a', amountMinor: 1000 },
    ])
    expect(simplified).toHaveLength(0)
  })

  it('leaves every person on exactly the position they held', () => {
    const demo = createDemoState()
    const original = calculateDebts(demo.expenses, demo.settlements)
    const simplified = simplifyDebts(original)

    const before = positions(original)
    const after = positions(simplified)

    for (const [personId, amount] of before) {
      expect(after.get(personId) ?? 0).toBe(amount)
    }
    expect(simplified.length).toBeLessThanOrEqual(original.length)
  })

  it('needs at most n−1 transfers for n people', () => {
    const demo = createDemoState()
    const debts = calculateDebts(demo.expenses, demo.settlements)
    const people = new Set(debts.flatMap((d) => [d.fromPersonId, d.toPersonId]))
    expect(simplifyDebts(debts).length).toBeLessThanOrEqual(Math.max(0, people.size - 1))
  })

  it('produces no transfer when everyone is square', () => {
    expect(simplifyDebts([])).toHaveLength(0)
  })
})

describe('settleBalances', () => {
  it('matches the largest debtor against the largest creditor', () => {
    const balances: PersonBalance[] = [
      { personId: 'a', netMinor: 5000 },
      { personId: 'b', netMinor: -3000 },
      { personId: 'c', netMinor: -2000 },
    ]
    expect(settleBalances(balances)).toEqual([
      { fromPersonId: 'b', toPersonId: 'a', amountMinor: 3000 },
      { fromPersonId: 'c', toPersonId: 'a', amountMinor: 2000 },
    ])
  })

  it('recording every listed payment leaves the demo data square', () => {
    // This is the promise Smart Settlement makes on screen, asserted end to end.
    const demo = createDemoState()
    const transfers = calculateDebts(demo.expenses, demo.settlements)
    expect(transfers.length).toBeGreaterThan(0)

    const settlements: Settlement[] = transfers.map((transfer, index) => ({
      id: `s_new_${index}`,
      fromPersonId: transfer.fromPersonId,
      toPersonId: transfer.toPersonId,
      amountMinor: transfer.amountMinor,
      currency: 'EUR',
      createdAt: '2026-02-01T12:00:00.000Z',
    }))

    const all = [...demo.settlements, ...settlements]
    expect(calculateDebts(demo.expenses, all)).toHaveLength(0)

    const involved = new Set(demo.expenses.flatMap((e) => e.participants.map((p) => p.personId)))
    for (const balance of calculateGroupBalances(demo.expenses, all, [...involved])) {
      expect(balance.netMinor).toBe(0)
    }
  })

  it('needs fewer payments than the expense history created obligations', () => {
    const demo = createDemoState()
    const direct = calculatePairwiseObligations(demo.expenses, demo.settlements)
    const payments = calculateDebts(demo.expenses, demo.settlements)
    expect(payments.length).toBeLessThan(direct.length)
  })
})

describe('group-scoped settlement (the model the app actually runs)', () => {
  /** What the settle screens list: every group resolved on its own. */
  function paymentsByGroup(state: ReturnType<typeof createDemoState>) {
    return state.groups.flatMap((group) =>
      calculateDebts(
        state.expenses.filter((e) => e.groupId === group.id),
        state.settlements.filter((s) => s.groupId === group.id),
      ).map((debt) => ({ ...debt, groupId: group.id })),
    )
  }

  it('brings every group to zero once its payments are recorded', () => {
    const demo = createDemoState()
    const payments = paymentsByGroup(demo)
    expect(payments.length).toBeGreaterThan(0)

    const settlements: Settlement[] = payments.map((payment, index) => ({
      id: `s_group_${index}`,
      groupId: payment.groupId,
      fromPersonId: payment.fromPersonId,
      toPersonId: payment.toPersonId,
      amountMinor: payment.amountMinor,
      currency: 'EUR',
      createdAt: '2026-02-01T12:00:00.000Z',
    }))

    const all = [...demo.settlements, ...settlements]
    for (const group of demo.groups) {
      const groupExpenses = demo.expenses.filter((e) => e.groupId === group.id)
      const groupSettlements = all.filter((s) => s.groupId === group.id)
      expect(calculateDebts(groupExpenses, groupSettlements)).toHaveLength(0)
      for (const balance of calculateGroupBalances(
        groupExpenses,
        groupSettlements,
        group.members.map((m) => m.personId),
      )) {
        expect(balance.netMinor).toBe(0)
      }
    }
  })

  it('still beats the raw obligation count', () => {
    const demo = createDemoState()
    const direct = demo.groups.flatMap((group) =>
      calculatePairwiseObligations(
        demo.expenses.filter((e) => e.groupId === group.id),
        demo.settlements.filter((s) => s.groupId === group.id),
      ),
    )
    expect(paymentsByGroup(demo).length).toBeLessThan(direct.length)
  })
})

describe('allocateAcrossGroups', () => {
  const debts = [
    { fromPersonId: 'a', toPersonId: 'b', amountMinor: 3000, groupId: 'g1' },
    { fromPersonId: 'a', toPersonId: 'b', amountMinor: 1000, groupId: 'g2' },
  ]

  it('clears the biggest ledger first and never over-allocates', () => {
    expect(allocateAcrossGroups(4000, debts)).toEqual([
      { groupId: 'g1', amountMinor: 3000 },
      { groupId: 'g2', amountMinor: 1000 },
    ])
  })

  it('splits a part payment without touching the second group', () => {
    expect(allocateAcrossGroups(1200, debts)).toEqual([{ groupId: 'g1', amountMinor: 1200 }])
  })

  it('allocates exactly what it was given', () => {
    for (const amount of [1, 999, 2999, 3001, 4000]) {
      const parts = allocateAcrossGroups(amount, debts)
      expect(parts.reduce((sum, p) => sum + p.amountMinor, 0)).toBe(amount)
    }
  })
})

describe('holdsTicket', () => {
  const members = ['a', 'b']
  const spend = (paidBy: string, amountMinor: number): Expense => ({
    id: `e-${paidBy}-${amountMinor}`,
    groupId: 'g',
    title: 'Dinner',
    amountMinor,
    currency: 'EUR',
    paidBy,
    splitMethod: 'equal',
    participants: members.map((personId) => ({
      personId,
      shareMinor: amountMinor / members.length,
    })),
    category: 'food',
    createdAt: '2026-08-01T12:00:00.000Z',
    updatedAt: '2026-08-01T12:00:00.000Z',
  })

  it('holds the ticket of a group nobody has spent in yet', () => {
    // The bug this pins down: an untouched group has nothing but zero
    // balances, which is not the same as having been settled. Creating a
    // group spends a ticket — that is the whole rule.
    expect(holdsTicket([], [], members)).toBe(true)
  })

  it('holds it while anyone is still owed', () => {
    expect(holdsTicket([spend('a', 1000)], [], members)).toBe(true)
  })

  it('gives it back once the group comes out even', () => {
    const settlement: Settlement = {
      id: 's1',
      fromPersonId: 'b',
      toPersonId: 'a',
      amountMinor: 500,
      currency: 'EUR',
      groupId: 'g',
      createdAt: '2026-08-02T12:00:00.000Z',
    }
    expect(holdsTicket([spend('a', 1000)], [settlement], members)).toBe(false)
  })

  it('holds it again as soon as a settled group is spent in again', () => {
    const settlement: Settlement = {
      id: 's1',
      fromPersonId: 'b',
      toPersonId: 'a',
      amountMinor: 500,
      currency: 'EUR',
      groupId: 'g',
      createdAt: '2026-08-02T12:00:00.000Z',
    }
    expect(holdsTicket([spend('a', 1000), spend('b', 400)], [settlement], members)).toBe(true)
  })
})

describe('spentTickets', () => {
  const group = (
    id: string,
    extra: { archivedAt?: string; createdBy?: string } = {},
  ): Group => ({
    id,
    name: id,
    icon: 'travel',
    currency: 'EUR',
    members: [
      { personId: 'a', joinedAt: '2026-01-01T00:00:00.000Z' },
      { personId: 'b', joinedAt: '2026-01-01T00:00:00.000Z' },
    ],
    createdAt: '2026-01-01T00:00:00.000Z',
    ...extra,
  })

  it('counts a fresh group and an open one alike', () => {
    expect(spentTickets([group('g1'), group('g2')], [], [], 'a')).toBe(2)
  })

  it('lets a closed group give its ticket back', () => {
    // The escape hatch the plan promises: someone stops paying, the group is
    // closed by hand, and the ticket is free again without deleting anything.
    expect(
      spentTickets([group('g1'), group('g2', { archivedAt: '2026-08-09T10:00:00.000Z' })], [], [], 'a'),
    ).toBe(1)
  })

  it('does not charge a ticket for a group someone else started', () => {
    // The whole of model B. Without this, buying Pro and inviting three
    // friends turns all three away because of their own plans, and the person
    // who paid has the worst experience in the product.
    const mine = group('g1', { createdBy: 'a' })
    const theirs = group('g2', { createdBy: 'b' })
    expect(spentTickets([mine, theirs], [], [], 'a')).toBe(1)
    expect(spentTickets([mine, theirs], [], [], 'b')).toBe(1)
  })

  it('treats a group with no author as your own', () => {
    // Made before anything could be shared, so it cannot be anyone else's.
    expect(spentTickets([group('g1')], [], [], 'a')).toBe(1)
  })

  it('counts nothing when there are no groups', () => {
    expect(spentTickets([], [], [], 'a')).toBe(0)
  })
})
