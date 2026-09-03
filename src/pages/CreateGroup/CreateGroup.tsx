import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Plus, UserPlus } from 'lucide-react'
import type { GroupIconId } from '@/types'
import { useAppStore } from '@/store/appStore'
import { usePeople } from '@/hooks/usePeople'
import { PageHeader } from '@/components/navigation/PageHeader'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { Avatar } from '@/components/ui/Avatar'
import { GroupIcon } from '@/components/expenses/CategoryIcon'
import { Sheet } from '@/components/ui/Sheet'
import { CoverPicker } from '@/components/groups/CoverPicker'
import { useToast } from '@/components/ui/toastContext'
import { cn } from '@/lib/cn'

const ICON_OPTIONS: Array<{ id: GroupIconId; label: string }> = [
  { id: 'travel', label: 'Travel' },
  { id: 'food', label: 'Food' },
  { id: 'home', label: 'Home' },
  { id: 'sports', label: 'Sports' },
  { id: 'event', label: 'Event' },
  { id: 'custom', label: 'Custom' },
]

const EMOJI_CHOICES = ['🎿', '🎬', '🏝️', '🎸', '🚲', '☕️', '🐕', '🎂']

export default function CreateGroup() {
  const navigate = useNavigate()
  const toast = useToast()
  const createGroup = useAppStore((s) => s.createGroup)
  const addFriend = useAppStore((s) => s.addFriend)
  const friends = useAppStore((s) => s.friends)
  const people = usePeople()

  const [name, setName] = useState('')
  const [icon, setIcon] = useState<GroupIconId>('travel')
  const [coverUrl, setCoverUrl] = useState<string>()
  const [emoji, setEmoji] = useState(EMOJI_CHOICES[0])
  const [memberIds, setMemberIds] = useState<string[]>([])
  const [error, setError] = useState<string>()
  const [addOpen, setAddOpen] = useState(false)
  const [newFriendName, setNewFriendName] = useState('')

  const toggleMember = (id: string) =>
    setMemberIds((current) =>
      current.includes(id) ? current.filter((m) => m !== id) : [...current, id],
    )

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim()) {
      setError('Give the group a name.')
      return
    }
    const group = createGroup({
      name,
      icon,
      emoji: icon === 'custom' ? emoji : undefined,
      coverUrl,
      memberIds,
    })
    toast.confirm('Group created')
    navigate(`/groups/${group.id}`, { replace: true })
  }

  const createFriend = () => {
    if (!newFriendName.trim()) return
    const friend = addFriend({ name: newFriendName })
    setMemberIds((current) => [...current, friend.id])
    setNewFriendName('')
    setAddOpen(false)
  }

  return (
    <form onSubmit={submit}>
      <PageHeader title="New group" backTo="/groups" />

      <div className="space-y-8">
        <Field label="Group name" error={error}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                if (error) setError(undefined)
              }}
              placeholder="Japan Trip"
              autoFocus
            />
          )}
        </Field>

        <CoverPicker value={coverUrl} onChange={setCoverUrl} />

        <fieldset>
          <legend className="eyebrow mb-2">{coverUrl ? 'Icon (used in lists)' : 'Icon'}</legend>
          <div className="grid grid-cols-6 gap-2">
            {ICON_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setIcon(option.id)}
                aria-pressed={icon === option.id}
                aria-label={option.label}
                title={option.label}
                className={cn(
                  'flex h-12 items-center justify-center rounded-md border transition-colors duration-micro',
                  icon === option.id
                    ? 'border-navy bg-navy text-white'
                    : 'border-line text-muted hover:bg-surface hover:text-ink',
                )}
              >
                <GroupIcon
                  icon={option.id}
                  emoji={option.id === 'custom' ? emoji : undefined}
                  size={19}
                />
              </button>
            ))}
          </div>

          {icon === 'custom' && (
            <div className="mt-3 flex flex-wrap gap-2">
              {EMOJI_CHOICES.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => setEmoji(choice)}
                  aria-pressed={emoji === choice}
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-sm border text-lg transition-colors',
                    emoji === choice ? 'border-navy bg-navy/[0.06]' : 'border-line hover:bg-surface',
                  )}
                >
                  {choice}
                </button>
              ))}
            </div>
          )}
        </fieldset>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <p className="eyebrow">Add people</p>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-navy hover:opacity-70"
            >
              <UserPlus size={14} strokeWidth={2} />
              Add friend
            </button>
          </div>

          {friends.length === 0 ? (
            <div className="paper px-5 py-8 text-center">
              <p className="text-sm text-muted">
                No friends yet — add someone to split with.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setAddOpen(true)}
              >
                <Plus size={15} strokeWidth={2} />
                Add friend
              </Button>
            </div>
          ) : (
            <div className="paper divide-y divide-line">
              {friends.map((friend) => {
                const selected = memberIds.includes(friend.id)
                return (
                  <button
                    key={friend.id}
                    type="button"
                    onClick={() => toggleMember(friend.id)}
                    aria-pressed={selected}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-micro hover:bg-surface/60"
                  >
                    <Avatar name={friend.name} src={friend.avatarUrl} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-[15px]">{friend.name}</span>
                    <span
                      className={cn(
                        'flex h-[22px] w-[22px] items-center justify-center rounded-xs border transition-all duration-micro',
                        selected ? 'border-navy bg-navy text-white' : 'border-line',
                      )}
                    >
                      {selected && <Check size={13} strokeWidth={3} />}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          <p className="mt-2 text-[13px] text-muted">
            You&rsquo;re in the group automatically
            {memberIds.length > 0 &&
              ` — ${memberIds.length + 1} ${memberIds.length === 0 ? 'person' : 'people'} total`}
            .
          </p>
        </section>

        <div className="flex items-center gap-3 pt-2">
          {memberIds.length > 0 && (
            <span className="flex -space-x-2">
              {[people.me, ...memberIds].filter(Boolean).slice(0, 5).map((id) => {
                const person = people.get(id as string)
                return (
                  <Avatar
                    key={id}
                    name={person.name}
                    src={person.avatarUrl}
                    size="sm"
                    accent={person.isMe}
                    className="ring-2 ring-canvas"
                  />
                )
              })}
            </span>
          )}
          <Button type="submit" size="lg" className="ml-auto min-w-[160px]">
            Create group
          </Button>
        </div>
      </div>

      <Sheet
        open={addOpen}
        onOpenChange={setAddOpen}
        title="Add friend"
        description="They'll be added to your circle and this group."
        footer={
          <Button full size="lg" onClick={createFriend} disabled={!newFriendName.trim()}>
            Add
          </Button>
        }
      >
        <Field label="Name">
          {({ id }) => (
            <Input
              id={id}
              value={newFriendName}
              onChange={(event) => setNewFriendName(event.target.value)}
              placeholder="Alex Müller"
              autoFocus
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  createFriend()
                }
              }}
            />
          )}
        </Field>
      </Sheet>
    </form>
  )
}
