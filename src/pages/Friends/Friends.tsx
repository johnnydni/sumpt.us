import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useOverallLedger } from '@/hooks/useLedger'
import { PageHeader } from '@/components/navigation/PageHeader'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/Primitives'
import { Sheet } from '@/components/ui/Sheet'
import { Field, Input } from '@/components/ui/Field'
import { useToast } from '@/components/ui/toastContext'
import { formatMoney } from '@/lib/formatting'
import { cn } from '@/lib/cn'

export default function Friends() {
  const friends = useAppStore((s) => s.friends)
  const addFriend = useAppStore((s) => s.addFriend)
  const preferences = useAppStore((s) => s.preferences)
  const { counterparts } = useOverallLedger()
  const toast = useToast()

  const [addOpen, setAddOpen] = useState(false)
  const [name, setName] = useState('')

  const rows = useMemo(
    () =>
      friends.map((friend) => ({
        friend,
        netMinor: counterparts.find((c) => c.personId === friend.id)?.netMinor ?? 0,
      })),
    [friends, counterparts],
  )

  const create = () => {
    if (!name.trim()) return
    addFriend({ name })
    toast.confirm(`${name.trim().split(' ')[0]} added`)
    setName('')
    setAddOpen(false)
  }

  return (
    <div>
      <PageHeader
        title="Friends"
        backTo="/overview"
        action={
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus size={15} strokeWidth={2} />
            Add
          </Button>
        }
      />

      {friends.length === 0 ? (
        <EmptyState
          title="Your circle is empty."
          body="Add someone you regularly share expenses with."
          action={
            <Button onClick={() => setAddOpen(true)}>
              <Plus size={16} strokeWidth={2} />
              Add friend
            </Button>
          }
        />
      ) : (
        <div className="divide-y divide-line border-t border-line">
          {rows.map(({ friend, netMinor }) => (
            <Link
              key={friend.id}
              to={`/friends/${friend.id}`}
              className="flex items-center gap-3.5 py-4 transition-colors duration-micro hover:bg-surface/60"
            >
              <Avatar name={friend.name} src={friend.avatarUrl} size="md" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium">{friend.name}</span>
                <span
                  className={cn(
                    'mt-0.5 block truncate text-[13px]',
                    netMinor === 0
                      ? 'text-muted'
                      : netMinor > 0
                        ? 'text-positive'
                        : 'text-negative',
                  )}
                >
                  {netMinor === 0
                    ? 'All settled'
                    : netMinor > 0
                      ? `${friend.name.split(' ')[0]} owes you ${formatMoney(netMinor, preferences.currency)}`
                      : `You owe ${formatMoney(-netMinor, preferences.currency)}`}
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}

      <Sheet
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add friend"
        description="Just a name — sumptus works entirely on this device for now."
        footer={
          <Button full size="lg" onClick={create} disabled={!name.trim()}>
            Add friend
          </Button>
        }
      >
        <Field label="Name">
          {({ id }) => (
            <Input
              id={id}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Alex Müller"
              autoFocus
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  create()
                }
              }}
            />
          )}
        </Field>
      </Sheet>
    </div>
  )
}
