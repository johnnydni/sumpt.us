import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { usePeople } from '@/hooks/usePeople'
import { calculateGroupBalances, spentTickets } from '@/lib/calculations'
import { FREE_GROUP_TICKETS } from '@/data/plans'
import { GroupCard } from '@/components/groups/GroupCard'
import { EmptyState } from '@/components/ui/Primitives'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/navigation/PageHeader'

export default function Groups() {
  const groups = useAppStore((s) => s.groups)
  const expenses = useAppStore((s) => s.expenses)
  const settlements = useAppStore((s) => s.settlements)
  const people = usePeople()
  const [query, setQuery] = useState('')

  const summaries = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return groups
      .filter((group) => !needle || group.name.toLowerCase().includes(needle))
      .map((group) => {
        const groupExpenses = expenses.filter((e) => e.groupId === group.id)
        const groupSettlements = settlements.filter((s) => s.groupId === group.id)
        const memberIds = group.members.map((m) => m.personId)
        const balances = calculateGroupBalances(groupExpenses, groupSettlements, memberIds)
        return {
          group,
          members: memberIds.map((id) => people.get(id)),
          expenseCount: groupExpenses.length,
          totalMinor: groupExpenses.reduce((sum, e) => sum + e.amountMinor, 0),
          yourNetMinor: balances.find((b) => b.personId === people.me)?.netMinor ?? 0,
          // A ticket is held until *everyone* is square, not just you.
          open: balances.some((balance) => balance.netMinor !== 0),
        }
      })
      .sort((a, b) => b.totalMinor - a.totalMinor)
  }, [groups, expenses, settlements, people, query])

  /*
   * Tickets spent, not groups kept. A settled group gives its ticket back, so
   * counting rows would show a limit the plan does not actually impose.
   * Counted on the unsearched list — a search term must not change what you
   * are allowed to have.
   */
  const ticketsInUse = useMemo(
    () => spentTickets(groups, expenses, settlements),
    [groups, expenses, settlements],
  )

  return (
    <div>
      <PageHeader
        title="Groups"
        titleSuffix={`${ticketsInUse}/${FREE_GROUP_TICKETS}`}
        backTo="/overview"
        action={
          <Button asChild size="sm">
            <Link to="/groups/new">
              <Plus size={15} strokeWidth={2} />
              New
            </Link>
          </Button>
        }
      />

      {/* Search earns its space only once the list stops fitting on one screen. */}
      {groups.length > 4 && (
        <div className="relative mb-5">
          <Search
            size={16}
            strokeWidth={1.75}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search groups"
            aria-label="Search groups"
            className="h-11 w-full rounded-md border border-line bg-canvas pl-10 pr-3 text-base placeholder:text-muted/70 focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/15"
          />
        </div>
      )}

      {groups.length === 0 ? (
        <EmptyState
          title="Nothing shared yet."
          body="Create your first group and start splitting expenses."
          action={
            <Button asChild>
              <Link to="/groups/new">
                <Plus size={16} strokeWidth={2} />
                Create group
              </Link>
            </Button>
          }
        />
      ) : summaries.length === 0 ? (
        <EmptyState title="No matches." body={`Nothing here is called “${query}”.`} />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {summaries.map((summary) => (
            <GroupCard
              key={summary.group.id}
              group={summary.group}
              members={summary.members}
              expenseCount={summary.expenseCount}
              totalMinor={summary.totalMinor}
              yourNetMinor={summary.yourNetMinor}
              currency={summary.group.currency}
            />
          ))}
        </div>
      )}
    </div>
  )
}
