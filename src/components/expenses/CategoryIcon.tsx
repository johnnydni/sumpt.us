import {
  BedDouble,
  Receipt,
  ShoppingBasket,
  Ticket,
  TrainFront,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react'
import type { CategoryId, GroupIconId } from '@/types'
import { Palmtree, Home, Dumbbell, PartyPopper, Sparkles } from 'lucide-react'
import { cn } from '@/lib/cn'

const CATEGORY_ICONS: Record<CategoryId, LucideIcon> = {
  food: UtensilsCrossed,
  accommodation: BedDouble,
  transport: TrainFront,
  activities: Ticket,
  groceries: ShoppingBasket,
  other: Receipt,
}

const GROUP_ICONS: Record<GroupIconId, LucideIcon> = {
  travel: Palmtree,
  food: UtensilsCrossed,
  home: Home,
  sports: Dumbbell,
  event: PartyPopper,
  custom: Sparkles,
}

/** Monochrome by default — category colour is reserved for charts. */
export function CategoryIcon({
  category,
  size = 16,
  className,
}: {
  category: CategoryId
  size?: number
  className?: string
}) {
  const Icon = CATEGORY_ICONS[category] ?? Receipt
  return <Icon size={size} strokeWidth={1.6} className={cn('text-muted', className)} />
}

export function GroupIcon({
  icon,
  emoji,
  size = 18,
  className,
}: {
  icon: GroupIconId
  emoji?: string
  size?: number
  className?: string
}) {
  if (icon === 'custom' && emoji) {
    return (
      <span className={cn('leading-none', className)} style={{ fontSize: size }}>
        {emoji}
      </span>
    )
  }
  const Icon = GROUP_ICONS[icon] ?? Sparkles
  return <Icon size={size} strokeWidth={1.6} className={className} />
}

export { GROUP_ICONS }
