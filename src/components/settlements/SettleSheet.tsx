import { useEffect, useState } from 'react'
import type { CurrencyCode, Debt } from '@/types'
import { Sheet } from '@/components/ui/Sheet'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { Avatar } from '@/components/ui/Avatar'
import { ArrowRight } from 'lucide-react'
import { formatMoney } from '@/lib/formatting'
import { minorToInput, parseAmountToMinor } from '@/lib/currency'
import { usePeople } from '@/hooks/usePeople'

interface SettleSheetProps {
  debt: Debt | null
  currency: CurrencyCode
  onClose: () => void
  onConfirm: (amountMinor: number) => void
}

/**
 * Confirming a payment, not making one. The amount is editable because part
 * payments are the normal case — someone hands over a round €30 against a
 * €32.10 debt and the remainder stays open.
 */
export function SettleSheet({ debt, currency, onClose, onConfirm }: SettleSheetProps) {
  const people = usePeople()
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string>()

  useEffect(() => {
    if (debt) {
      setAmount(minorToInput(debt.amountMinor, currency))
      setError(undefined)
    }
  }, [debt, currency])

  if (!debt) return null

  const from = people.get(debt.fromPersonId)
  const to = people.get(debt.toPersonId)

  const confirm = () => {
    const minor = parseAmountToMinor(amount, currency)
    if (minor === null || minor <= 0) {
      setError('Enter an amount above zero.')
      return
    }
    if (minor > debt.amountMinor) {
      setError(`That's more than the ${formatMoney(debt.amountMinor, currency)} outstanding.`)
      return
    }
    onConfirm(minor)
  }

  return (
    <Sheet
      open={Boolean(debt)}
      onOpenChange={(open) => !open && onClose()}
      title="Record a payment"
      footer={
        <Button full size="lg" onClick={confirm}>
          Mark as paid
        </Button>
      }
    >
      <div className="space-y-6 pb-2">
        <div className="flex items-center justify-center gap-4 rounded-md bg-surface px-4 py-6">
          <div className="text-center">
            <Avatar name={from.name} src={from.avatarUrl} size="lg" accent={from.isMe} />
            <p className="mt-2 text-[13px] font-medium">{from.isMe ? 'You' : from.name.split(' ')[0]}</p>
          </div>
          <ArrowRight size={18} strokeWidth={1.5} className="text-muted" />
          <div className="text-center">
            <Avatar name={to.name} src={to.avatarUrl} size="lg" accent={to.isMe} />
            <p className="mt-2 text-[13px] font-medium">{to.isMe ? 'You' : to.name.split(' ')[0]}</p>
          </div>
        </div>

        <Field
          label="Amount"
          error={error}
          hint={`${formatMoney(debt.amountMinor, currency)} outstanding`}
        >
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              inputMode="decimal"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value)
                if (error) setError(undefined)
              }}
              className="tnum text-lg"
            />
          )}
        </Field>
      </div>
    </Sheet>
  )
}
