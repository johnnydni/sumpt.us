import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import type { Debt } from '@/types'
import { useAppStore } from '@/store/appStore'
import { usePeople } from '@/hooks/usePeople'
import { allocateAcrossGroups, useOverallLedger, type CounterpartBalance } from '@/hooks/useLedger'
import { PageHeader } from '@/components/navigation/PageHeader'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { EmptyState, SectionHeader } from '@/components/ui/Primitives'
import { SettleSheet } from '@/components/settlements/SettleSheet'
import { useToast } from '@/components/ui/toastContext'
import { formatMoney, pluralize } from '@/lib/formatting'
import { cn } from '@/lib/cn'

/**
 * Person by person: one line each, one payment each. The amounts are already
 * netted across every group the two of you share, so this list is the shortest
 * honest answer to "what do I actually have to do".
 */
export default function Settlement() {
  const toast = useToast()
  const people = usePeople()
  const preferences = useAppStore((s) => s.preferences)
  const addSettlement = useAppStore((s) => s.addSettlement)
  const { counterparts, allDebts } = useOverallLedger()

  const [settling, setSettling] = useState<{ debt: Debt; entry: CounterpartBalance } | null>(null)

  const youOwe = counterparts.filter((c) => c.netMinor < 0)
  const owedToYou = counterparts.filter((c) => c.netMinor > 0)
  const currency = preferences.currency

  const open = (entry: CounterpartBalance) => {
    if (!people.me) return
    const owing = entry.netMinor < 0
    setSettling({
      entry,
      debt: {
        fromPersonId: owing ? people.me : entry.personId,
        toPersonId: owing ? entry.personId : people.me,
        amountMinor: Math.abs(entry.netMinor),
      },
    })
  }

  const recordSettlement = (amountMinor: number) => {
    if (!settling) return
    const { debt, entry } = settling
    // Split the payment back across the group ledgers it clears, so no group is
    // left holding a balance the overview says is already gone.
    for (const part of allocateAcrossGroups(amountMinor, entry.debts)) {
      addSettlement({
        fromPersonId: debt.fromPersonId,
        toPersonId: debt.toPersonId,
        amountMinor: part.amountMinor,
        currency,
        groupId: part.groupId,
      })
    }
    setSettling(null)
    toast.confirm('Settled')
  }

  return (
    <div>
      <PageHeader title="Settle up" backTo="/overview" />

      {counterparts.length === 0 ? (
        <EmptyState
          title="You're all square."
          body="No open balances with anyone. Nothing to settle."
        />
      ) : (
        <div className="space-y-10">
          {allDebts.length > counterparts.length && (
            <Link
              to="/settle/smart"
              className="paper flex items-center gap-3 px-4 py-4 transition-colors hover:border-navy/30 hover:bg-navy/[0.02]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-navy/[0.07] text-navy">
                <Sparkles size={16} strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium">See the whole picture</span>
                <span className="mt-0.5 block text-[13px] text-muted">
                  Every payment in your groups, settled in one go.
                </span>
              </span>
            </Link>
          )}

          {youOwe.length > 0 && (
            <section>
              <SectionHeader title="You owe" />
              <div className="divide-y divide-line border-t border-line">
                {youOwe.map((entry) => (
                  <PersonDebtRow
                    key={entry.personId}
                    name={people.get(entry.personId).name}
                    avatarUrl={people.get(entry.personId).avatarUrl}
                    amount={formatMoney(-entry.netMinor, currency)}
                    detail={pluralize(entry.debts.length, 'group')}
                    tone="negative"
                    action={
                      <Button variant="outline" size="sm" onClick={() => open(entry)}>
                        Mark as paid
                      </Button>
                    }
                  />
                ))}
              </div>
            </section>
          )}

          {owedToYou.length > 0 && (
            <section>
              <SectionHeader title="You are owed" />
              <div className="divide-y divide-line border-t border-line">
                {owedToYou.map((entry) => (
                  <PersonDebtRow
                    key={entry.personId}
                    name={people.get(entry.personId).name}
                    avatarUrl={people.get(entry.personId).avatarUrl}
                    amount={`+ ${formatMoney(entry.netMinor, currency)}`}
                    detail={pluralize(entry.debts.length, 'group')}
                    tone="positive"
                    action={
                      <Button variant="ghost" size="sm" onClick={() => open(entry)}>
                        Record
                      </Button>
                    }
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <SettleSheet
        debt={settling?.debt ?? null}
        currency={currency}
        onClose={() => setSettling(null)}
        onConfirm={recordSettlement}
      />
    </div>
  )
}

function PersonDebtRow({
  name,
  avatarUrl,
  amount,
  detail,
  tone,
  action,
}: {
  name: string
  avatarUrl?: string
  amount: string
  detail: string
  tone: 'positive' | 'negative'
  action: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-3 py-4">
      <Avatar name={name} src={avatarUrl} size="md" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium">{name}</span>
        <span className="mt-0.5 flex items-baseline gap-2">
          <span
            className={cn(
              'tnum text-[17px]',
              tone === 'positive' ? 'text-positive' : 'text-negative',
            )}
          >
            {amount}
          </span>
          <span className="text-[13px] text-muted">across {detail}</span>
        </span>
      </span>
      {action}
    </div>
  )
}
