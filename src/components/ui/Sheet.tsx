import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

interface SheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  /** Hidden visually but read out — required whenever the title is decorative. */
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

/**
 * Bottom sheet on mobile, centred panel from `sm` up. Radix handles focus trap,
 * scroll lock and Escape; the animation is CSS so `prefers-reduced-motion`
 * flattens it without any JS branch.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: SheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/20 backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
        <Dialog.Content
          className={cn(
            'fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col rounded-t-lg border-t border-line bg-canvas shadow-sheet',
            'data-[state=open]:animate-sheet-in data-[state=closed]:animate-sheet-out',
            'sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[440px] sm:-translate-x-1/2 sm:-translate-y-1/2',
            'sm:rounded-md sm:border sm:data-[state=open]:animate-fade-up',
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4 px-5 pb-3 pt-5">
            <div className="min-w-0">
              <Dialog.Title className="text-[17px] font-semibold tracking-tight">
                {title}
              </Dialog.Title>
              {description ? (
                <Dialog.Description className="mt-1 text-[13px] text-muted">
                  {description}
                </Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close
              aria-label="Close"
              className="-mr-2 -mt-2 flex h-11 w-11 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface hover:text-ink"
            >
              <X size={18} strokeWidth={1.75} />
            </Dialog.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-2">{children}</div>

          {footer && (
            <div className="border-t border-line bg-canvas px-5 pb-safe pt-4 sm:pb-5">{footer}</div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  body: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  onConfirm: () => void
}

/** Replaces window.confirm — the brief rules out native dialogs. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/20 backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2.5rem)] max-w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-md border border-line bg-canvas p-5 shadow-lift data-[state=open]:animate-fade-up">
          <Dialog.Title className="text-[17px] font-semibold tracking-tight">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-relaxed text-muted">
            {body}
          </Dialog.Description>
          <div className="mt-5 flex gap-2">
            <Dialog.Close asChild>
              <button className="h-11 flex-1 rounded-md border border-line text-sm font-medium transition-colors hover:bg-surface">
                {cancelLabel}
              </button>
            </Dialog.Close>
            <button
              onClick={() => {
                onConfirm()
                onOpenChange(false)
              }}
              className={cn(
                'h-11 flex-1 rounded-md text-sm font-medium text-white transition-colors',
                destructive ? 'bg-negative hover:bg-[#A33F3D]' : 'bg-ink hover:bg-black',
              )}
            >
              {confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
