import { Check } from 'lucide-react'
import type { Person } from '@/hooks/usePeople'
import { Avatar } from '@/components/ui/Avatar'
import { cn } from '@/lib/cn'

interface ParticipantPickerProps {
  people: Person[]
  selected: string[]
  onToggle: (personId: string) => void
  onSelectAll: () => void
  onSelectNone: () => void
}

/**
 * Multi-select over group members. Rows are real checkboxes so the whole list
 * is keyboard- and screen-reader-navigable; the tick is drawn rather than
 * native to keep the row height at a comfortable 52px.
 */
export function ParticipantPicker({
  people,
  selected,
  onToggle,
  onSelectAll,
  onSelectNone,
}: ParticipantPickerProps) {
  const allSelected = selected.length === people.length && people.length > 0

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="eyebrow">Participants</p>
        <button
          onClick={allSelected ? onSelectNone : onSelectAll}
          className="text-[13px] font-medium text-navy transition-opacity hover:opacity-70"
        >
          {allSelected ? 'Clear all' : 'Select all'}
        </button>
      </div>

      <div className="paper divide-y divide-line">
        {people.map((person) => {
          const checked = selected.includes(person.id)
          return (
            <label
              key={person.id}
              className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors duration-micro hover:bg-surface/60"
            >
              <input
                type="checkbox"
                className="peer sr-only"
                checked={checked}
                onChange={() => onToggle(person.id)}
              />
              <Avatar name={person.name} src={person.avatarUrl} size="sm" accent={person.isMe} />
              <span className="min-w-0 flex-1 truncate text-[15px]">
                {person.isMe ? 'You' : person.name}
              </span>
              <span
                className={cn(
                  'flex h-[22px] w-[22px] items-center justify-center rounded-xs border transition-all duration-micro',
                  'peer-focus-visible:ring-2 peer-focus-visible:ring-navy peer-focus-visible:ring-offset-2',
                  checked ? 'border-navy bg-navy text-white' : 'border-line bg-canvas',
                )}
              >
                {checked && <Check size={13} strokeWidth={3} />}
              </span>
            </label>
          )
        })}
      </div>
    </div>
  )
}
