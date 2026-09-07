import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import type { Debt, Group } from '@/types'
import { useAppStore } from '@/store/appStore'
import { allocateAcrossGroups, useFriendLedger } from '@/hooks/useLedger'
import { usePeople } from '@/hooks/usePeople'
import { PageHeader } from '@/components/navigation/PageHeader'
import { Avatar } from '@/components/ui/Avatar'
import { AnimatedMoney } from '@/components/balance/AnimatedMoney'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/Sheet'
import { EmptyState, SectionHeader } from '@/components/ui/Primitives'
import { ExpenseRow } from '@/components/expenses/ExpenseRow'
import { SettleSheet } from '@/components/settlements/SettleSheet'
import { useToast } from '@/components/ui/toastContext'
import { formatTimestamp } from '@/lib/dates'
import { pluralize } from '@/lib/formatting'
import { cn } from '@/lib/cn'

/** The complete financial relationship with one person, in one column. */
export default function FriendDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const friend = useAppStore((s) => s.friends.find((f) => f.id === id))
  const groups = useAppStore((s) => s.groups)
  const preferences = useAppStore((s) => s.preferences)
  const removeFriend = useAppStore((s) => s.removeFriend)
  const addSettlement = useAppStore((s) => s.addSettlement)
  const people = usePeople()
  const ledger = useFriendLedger(id)

  const sharedGroups = useMemo(
    () =>
      ledger.sharedGroupIds
        .map((groupId) => groups.find((group) => group.id === groupId))
        .filter((group): group is Group => group !== undefined && !group.pairWith),
    [ledger.sharedGroupIds, groups],
  )

  const [settling, setSettling] = useState<Debt | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)

  if (!friend) return <Navigate to="/friends" replace />

  const currency = preferences.currency
  const settled = ledger.netMinor === 0

  const openSettle = () => {
    if (!people.me || settled) return
    setSettling(
      ledger.netMinor < 0
        ? { fromPersonId: people.me, toPersonId: friend.id, amountMinor: -ledger.netMinor }
        : { fromPersonId: friend.id, toPersonId: people.me, amountMinor: ledger.netMinor },
    )
  }

  return (
    <div>
      <PageHeader
        title={friend.name}
        backTo="/friends"
        eyebrow={friend.handle ? `@${friend.handle}` : undefined}
        action={
          <button
            onClick={() => setConfirmRemove(true)}
            aria-label="Remove friend"
            className="flex h-11 w-11 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-negative"
          >
            <Trash2 size={18} strokeWidth={1.75} />
          </button>
        }
      />

      <section className="paper px-5 py-7 sm:px-8">
        <div className="flex items-center gap-4">
          <Avatar name={friend.name} src={friend.avatarUrl} size="lg" />
          <div className="min-w-0">
            <p className="eyebrow">{settled ? 'Balance' : ledger.netMinor > 0 ? 'Owes you' : 'You owe'}</p>
            <AnimatedMoney
              minor={Math.abs(ledger.netMinor)}
              currency={currency}
              className={cn(
                'display mt-1 block text-[clamp(2rem,9vw,2.75rem)] leading-none',
                settled ? 'text-ink' : ledger.netMinor > 0 ? 'text-positive' : 'text-negative',
              )}
            />
          </div>
        </div>

        {/* "0 groups" is not information — splitting one to one is the normal
            case now, and a zero there only reads as something missing. */}
        <p className="mt-5 text-sm text-muted">
          {pluralize(ledger.sharedExpenses.length, 'shared expense')}
          {sharedGroups.length > 0 && ` · ${pluralize(sharedGroups.length, 'group')}`}
        </p>

        {!settled && (
          <Button className="mt-6" onClick={openSettle}>
            {ledger.netMinor < 0 ? 'Mark as paid' : 'Record payment'}
          </Button>
        )}
        {settled && (
          <p className="mt-6 flex items-center gap-2 text-sm text-neutralAccent">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-neutralAccent" />
            You&rsquo;re all square.
          </p>
        )}
      </section>

      {/* The pair ledger is not a group you are both in — it is this page. */}
      {sharedGroups.length > 0 && (
        <section className="mt-9">
          <SectionHeader title="Shared groups" />
          <div className="flex flex-wrap gap-2">
            {sharedGroups.map((group) => {
              return (
                <Link
                  key={group.id}
                  to={`/groups/${group.id}`}
                  className="rounded-md border border-line px-3 py-2 text-[13px] font-medium transition-colors hover:bg-surface"
                >
                  {group.name}
                </Link>
              )
            })}
          </div>
        </section>
      )}

      <section className="mt-9">
        <SectionHeader title="Shared expenses" />
        {ledger.sharedExpenses.length === 0 ? (
          <EmptyState
            title="Nothing shared yet."
            body={`Add an expense with ${friend.name.split(' ')[0]} and it will show up here.`}
          />
        ) : (
          <div className="divide-y divide-line border-t border-line">
            {ledger.sharedExpenses.slice(0, 20).map((expense) => (
              <ExpenseRow
                key={expense.id}
                expense={expense}
                subtitle={`Paid by ${people.short(expense.paidBy)} · ${formatTimestamp(expense.createdAt)}`}
              />
            ))}
          </div>
        )}
      </section>

      <SettleSheet
        debt={settling}
        currency={currency}
        onClose={() => setSettling(null)}
        onConfirm={(amountMinor) => {
          if (!settling) return
          for (const part of allocateAcrossGroups(amountMinor, ledger.debts)) {
            addSettlement({
              fromPersonId: settling.fromPersonId,
              toPersonId: settling.toPersonId,
              amountMinor: part.amountMinor,
              currency,
              groupId: part.groupId,
            })
          }
          setSettling(null)
          toast.confirm('Settled')
        }}
      />

      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title={`Remove ${friend.name.split(' ')[0]}?`}
        body="Past expenses keep their history — only the friend entry and future group membership are removed."
        confirmLabel="Remove"
        destructive
        onConfirm={() => {
          removeFriend(friend.id)
          toast.notice('Friend removed')
          navigate('/friends', { replace: true })
        }}
      />
    </div>
  )
}
