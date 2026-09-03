import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { BarChart3, MoreHorizontal, Plus, Trash2, UserPlus } from 'lucide-react'
import type { Debt } from '@/types'
import { useAppStore } from '@/store/appStore'
import { usePeople } from '@/hooks/usePeople'
import { useGroup, useGroupLedger } from '@/hooks/useLedger'
import { PageHeader } from '@/components/navigation/PageHeader'
import { BalanceRow } from '@/components/balance/BalanceRow'
import { ExpenseRow } from '@/components/expenses/ExpenseRow'
import { AnimatedMoney } from '@/components/balance/AnimatedMoney'
import { DebtRow } from '@/components/settlements/DebtRow'
import { SettleSheet } from '@/components/settlements/SettleSheet'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog, Sheet } from '@/components/ui/Sheet'
import { EmptyState, List, SectionHeader } from '@/components/ui/Primitives'
import { useToast } from '@/components/ui/toastContext'
import { pluralize } from '@/lib/formatting'
import { useReducedMotion } from '@/hooks/useReducedMotion'

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const reduced = useReducedMotion()

  const group = useGroup(id)
  const ledger = useGroupLedger(id)
  const people = usePeople()
  const friends = useAppStore((s) => s.friends)
  const deleteGroup = useAppStore((s) => s.deleteGroup)
  const updateGroup = useAppStore((s) => s.updateGroup)
  const addSettlement = useAppStore((s) => s.addSettlement)

  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [addPeopleOpen, setAddPeopleOpen] = useState(false)
  const [settling, setSettling] = useState<Debt | null>(null)

  const settled = ledger.balances.every((b) => b.netMinor === 0)

  const nonMembers = useMemo(
    () => friends.filter((f) => !ledger.memberIds.includes(f.id)),
    [friends, ledger.memberIds],
  )

  if (!group) return <Navigate to="/groups" replace />

  const currency = group.currency

  const recordSettlement = (amountMinor: number) => {
    if (!settling) return
    addSettlement({
      fromPersonId: settling.fromPersonId,
      toPersonId: settling.toPersonId,
      amountMinor,
      currency,
      groupId: group.id,
    })
    setSettling(null)
    toast.confirm('Settled')
  }

  return (
    <div>
      <PageHeader
        title={group.name}
        backTo="/groups"
        action={
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Group options"
            className="flex h-11 w-11 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-ink"
          >
            <MoreHorizontal size={20} strokeWidth={1.75} />
          </button>
        }
      />

      <section className="paper px-5 py-7 sm:px-8">
        <p className="eyebrow">Total expenses</p>
        <AnimatedMoney
          minor={ledger.totalMinor}
          currency={currency}
          className="display mt-3 block text-[clamp(2.5rem,11vw,3.75rem)] leading-[0.95]"
        />
        <p className="mt-3 text-sm text-muted">
          {pluralize(ledger.memberIds.length, 'person', 'people')} ·{' '}
          {pluralize(ledger.expenses.length, 'expense')}
        </p>

        <div className="mt-7 flex flex-wrap gap-2">
          <Button asChild>
            <Link to={`/expenses/new?group=${group.id}`}>
              <Plus size={16} strokeWidth={2} />
              Add expense
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to={`/groups/${group.id}/stats`}>
              <BarChart3 size={16} strokeWidth={1.75} />
              Statistics
            </Link>
          </Button>
        </div>
      </section>

      <section className="mt-10">
        <SectionHeader title="Balances" />
        <div className="border-t border-line">
          {ledger.balances.map((balance) => {
            const person = people.get(balance.personId)
            return (
              <div key={balance.personId} className="hairline">
                <BalanceRow
                  name={person.name}
                  avatarUrl={person.avatarUrl}
                  isMe={person.isMe}
                  netMinor={balance.netMinor}
                  currency={currency}
                />
              </div>
            )
          })}
        </div>

        {settled ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-neutralAccent">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-neutralAccent" />
            Everyone&rsquo;s square in {group.name}.
          </p>
        ) : (
          <div className="mt-6">
            <SectionHeader
              title="Open payments"
              action={
                ledger.debts.length > 1 && (
                  <Link to="/settle/smart" className="text-[13px] font-medium text-navy hover:opacity-70">
                    Simplify
                  </Link>
                )
              }
            />
            <div className="divide-y divide-line border-t border-line">
              {ledger.debts.map((debt) => (
                <DebtRow
                  key={`${debt.fromPersonId}-${debt.toPersonId}`}
                  debt={debt}
                  from={people.get(debt.fromPersonId)}
                  to={people.get(debt.toPersonId)}
                  currency={currency}
                  direction={
                    debt.fromPersonId === people.me
                      ? 'you-owe'
                      : debt.toPersonId === people.me
                        ? 'owed-to-you'
                        : 'other'
                  }
                  onSettle={() => setSettling(debt)}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="mt-10">
        <SectionHeader title="Expenses" />
        {ledger.expenses.length === 0 ? (
          <EmptyState
            title="No expenses yet."
            body="Add the first one."
            action={
              <Button asChild>
                <Link to={`/expenses/new?group=${group.id}`}>
                  <Plus size={16} strokeWidth={2} />
                  Add expense
                </Link>
              </Button>
            }
          />
        ) : (
          <List className="border-t border-line">
            <AnimatePresence initial={false}>
              {ledger.expenses.map((expense) => (
                <motion.div
                  key={expense.id}
                  layout={reduced ? false : 'position'}
                  initial={reduced ? false : { opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, x: -12 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                >
                  <ExpenseRow
                    expense={expense}
                    subtitle={`Paid by ${people.short(expense.paidBy)} · ${pluralize(
                      expense.participants.length,
                      'person',
                      'people',
                    )}`}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </List>
        )}
      </section>

      <SettleSheet
        debt={settling}
        currency={currency}
        onClose={() => setSettling(null)}
        onConfirm={recordSettlement}
      />

      <Sheet open={menuOpen} onOpenChange={setMenuOpen} title={group.name}>
        <div className="divide-y divide-line pb-4">
          <button
            onClick={() => {
              setMenuOpen(false)
              setAddPeopleOpen(true)
            }}
            className="flex w-full items-center gap-3 py-4 text-left text-[15px] transition-colors hover:bg-surface/60"
          >
            <UserPlus size={17} strokeWidth={1.75} className="text-muted" />
            Add people
          </button>
          <Link
            to={`/groups/${group.id}/stats`}
            onClick={() => setMenuOpen(false)}
            className="flex w-full items-center gap-3 py-4 text-left text-[15px] transition-colors hover:bg-surface/60"
          >
            <BarChart3 size={17} strokeWidth={1.75} className="text-muted" />
            Statistics
          </Link>
          <button
            onClick={() => {
              setMenuOpen(false)
              setConfirmDelete(true)
            }}
            className="flex w-full items-center gap-3 py-4 text-left text-[15px] text-negative transition-colors hover:bg-negative/[0.04]"
          >
            <Trash2 size={17} strokeWidth={1.75} />
            Delete group
          </button>
        </div>
      </Sheet>

      <Sheet
        open={addPeopleOpen}
        onOpenChange={setAddPeopleOpen}
        title="Add people"
        description={
          nonMembers.length > 0
            ? 'Pick from your friends.'
            : 'Everyone in your circle is already here.'
        }
      >
        <div className="divide-y divide-line pb-4">
          {nonMembers.map((friend) => (
            <button
              key={friend.id}
              onClick={() => {
                updateGroup(group.id, {
                  members: [
                    ...group.members,
                    { personId: friend.id, joinedAt: new Date().toISOString() },
                  ],
                })
                toast.confirm(`${friend.name.split(' ')[0]} added`)
                setAddPeopleOpen(false)
              }}
              className="flex w-full items-center gap-3 py-3.5 text-left transition-colors hover:bg-surface/60"
            >
              <span className="min-w-0 flex-1 truncate text-[15px]">{friend.name}</span>
              <Plus size={16} strokeWidth={2} className="text-navy" />
            </button>
          ))}
          {nonMembers.length === 0 && (
            <p className="py-6 text-center text-sm text-muted">
              Add more friends from the Friends screen first.
            </p>
          )}
        </div>
      </Sheet>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${group.name}?`}
        body="Its expenses and settlements go with it. This can't be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          deleteGroup(group.id)
          toast.notice('Group deleted')
          navigate('/groups', { replace: true })
        }}
      />
    </div>
  )
}
