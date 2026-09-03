import { cn } from '@/lib/cn'
import { initials } from '@/lib/formatting'

const sizes = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-10 w-10 text-xs',
  lg: 'h-14 w-14 text-sm',
  xl: 'h-20 w-20 text-lg',
}

interface AvatarProps {
  name: string
  src?: string
  size?: keyof typeof sizes
  /** The current user gets the navy treatment so "you" is findable at a glance. */
  accent?: boolean
  className?: string
}

export function Avatar({ name, src, size = 'md', accent = false, className }: AvatarProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold uppercase tracking-wide',
        accent ? 'bg-navy text-white' : 'bg-surface text-muted',
        sizes[size],
        className,
      )}
      aria-hidden="true"
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  )
}

interface AvatarStackProps {
  people: Array<{ id: string; name: string; avatarUrl?: string }>
  max?: number
  size?: keyof typeof sizes
}

export function AvatarStack({ people, max = 4, size = 'sm' }: AvatarStackProps) {
  const shown = people.slice(0, max)
  const rest = people.length - shown.length

  return (
    <span className="flex items-center">
      {shown.map((person) => (
        <Avatar
          key={person.id}
          name={person.name}
          src={person.avatarUrl}
          size={size}
          className="-ml-2 ring-2 ring-canvas first:ml-0"
        />
      ))}
      {rest > 0 && (
        <span
          className={cn(
            '-ml-2 inline-flex items-center justify-center rounded-full bg-surface font-semibold text-muted ring-2 ring-canvas',
            sizes[size],
          )}
        >
          +{rest}
        </span>
      )}
    </span>
  )
}
