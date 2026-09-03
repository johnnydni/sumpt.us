import type { CurrencyCode } from '@/types'
import { Avatar } from '@/components/ui/Avatar'
import { formatSignedMoney } from '@/lib/formatting'
import { cn } from '@/lib/cn'

interface BalanceRowProps {
  name: string
  netMinor: number
  currency: CurrencyCode
  isMe?: boolean
  avatarUrl?: string
  onClick?: () => void
}

/** One person's net position in a group, colour-coded by direction. */
export function BalanceRow({
  name,
  netMinor,
  currency,
  isMe = false,
  avatarUrl,
  onClick,
}: BalanceRowProps) {
  const settled = netMinor === 0
  const tone = settled ? 'neutral' : netMinor > 0 ? 'positive' : 'negative'

  const Wrapper = onClick ? 'button' : 'div'

  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 py-3.5 text-left',
        onClick && 'transition-colors duration-micro hover:bg-surface/70',
      )}
    >
      <Avatar name={name} src={avatarUrl} size="sm" accent={isMe} />
      <span className="min-w-0 flex-1 truncate text-[15px]">{isMe ? 'You' : name}</span>
      <span
        className={cn(
          'tnum text-[15px] font-medium',
          tone === 'positive' && 'text-positive',
          tone === 'negative' && 'text-negative',
          tone === 'neutral' && 'text-muted',
        )}
      >
        {settled ? 'settled' : formatSignedMoney(netMinor, currency)}
      </span>
    </Wrapper>
  )
}
