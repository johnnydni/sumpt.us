import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Pencil, Trash2 } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { usePeople } from '@/hooks/usePeople'
import { PageHeader } from '@/components/navigation/PageHeader'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/Sheet'
import { SectionHeader } from '@/components/ui/Primitives'
import { CategoryIcon } from '@/components/expenses/CategoryIcon'
import { useToast } from '@/components/ui/toastContext'
import { formatMoney } from '@/lib/formatting'
import { formatTimestamp } from '@/lib/dates'
import { CATEGORY_MAP } from '@/data/mockData'
import { cn } from '@/lib/cn'

const SPLIT_LABEL: Record<string, string> = {
  equal: 'Split equally',
  amount: 'Split by amount',
  percentage: 'Split by percentage',
  shares: 'Split by shares',
}

export default function ExpenseDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()

  const expense = useAppStore((s) => s.expenses.find((e) => e.id === id))
  const groups = useAppStore((s) => s.groups)
  const deleteExpense = useAppStore((s) => s.deleteExpense)
  const people = usePeople()
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!expense) return <Navigate to="/overview" replace />

  const group = groups.find((g) => g.id === expense.groupId)
  const category = CATEGORY_MAP[expense.category]
  const payer = people.get(expense.paidBy)

  return (
    <div>
      <PageHeader
        title={expense.title}
        backTo={group ? `/groups/${group.id}` : '/overview'}
        eyebrow={category?.label}
      />

      <section className="paper px-5 py-7 sm:px-8">
        <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-sm border border-line">
          <CategoryIcon category={expense.category} size={18} />
        </span>

        <p className="display tnum text-[clamp(2.5rem,11vw,3.5rem)] leading-[0.95]">
          {formatMoney(expense.amountMinor, expense.currency)}
        </p>

        <div className="mt-5 flex items-center gap-2.5">
          <Avatar name={payer.name} src={payer.avatarUrl} size="sm" accent={payer.isMe} />
          <p className="text-sm text-muted">
            Paid by <span className="text-ink">{payer.isMe ? 'you' : payer.name}</span>
          </p>
        </div>
      </section>

      <section className="mt-9">
        <SectionHeader
          title="Participants"
          action={
            <span className="text-[13px] text-muted">{SPLIT_LABEL[expense.splitMethod]}</span>
          }
        />
        <div className="divide-y divide-line border-t border-line">
          {expense.participants.map((participant) => {
            const person = people.get(participant.personId)
            return (
              <div key={participant.personId} className="flex items-center gap-3 py-3.5">
                <Avatar name={person.name} src={person.avatarUrl} size="sm" accent={person.isMe} />
                <span className="min-w-0 flex-1 truncate text-[15px]">
                  {person.isMe ? 'You' : person.name}
                </span>
                <span
                  className={cn(
                    'tnum text-[15px] font-medium',
                    participant.personId === expense.paidBy && 'text-navy',
                  )}
                >
                  {formatMoney(participant.shareMinor, expense.currency)}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      <section className="mt-9">
        <SectionHeader title="Details" />
        <dl className="divide-y divide-line border-t border-line text-[15px]">
          <Detail term="Group">
            {group ? (
              <Link to={`/groups/${group.id}`} className="text-navy hover:opacity-70">
                {group.name}
              </Link>
            ) : (
              '—'
            )}
          </Detail>
          <Detail term="Added">{formatTimestamp(expense.createdAt)}</Detail>
          {expense.updatedAt && <Detail term="Edited">{formatTimestamp(expense.updatedAt)}</Detail>}
          {expense.note && <Detail term="Note">{expense.note}</Detail>}
        </dl>
      </section>

      <div className="mt-9 flex gap-2">
        <Button variant="outline" full asChild>
          <Link to={`/expenses/${expense.id}/edit`}>
            <Pencil size={15} strokeWidth={1.75} />
            Edit
          </Link>
        </Button>
        <Button variant="danger" full onClick={() => setConfirmDelete(true)}>
          <Trash2 size={15} strokeWidth={1.75} />
          Delete
        </Button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete “${expense.title}”?`}
        body="Everyone's balances will be recalculated without it. This can't be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          deleteExpense(expense.id)
          toast.notice('Expense deleted')
          navigate(group ? `/groups/${group.id}` : '/overview', { replace: true })
        }}
      />
    </div>
  )
}

function Detail({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3.5">
      <dt className="text-muted">{term}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  )
}
