import { forwardRef } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

const button = cva(
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-medium ' +
    'transition-[background-color,color,border-color,transform,opacity] duration-micro ease-out ' +
    'active:scale-[0.985] disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        primary: 'bg-ink text-white hover:bg-black',
        navy: 'bg-navy text-white hover:bg-[#0F1E33]',
        outline: 'border border-line bg-canvas text-ink hover:bg-surface',
        ghost: 'text-ink hover:bg-surface',
        quiet: 'text-muted hover:text-ink',
        danger: 'border border-negative/25 bg-negative/[0.04] text-negative hover:bg-negative/10',
      },
      size: {
        // 44px minimum touch target on everything reachable by thumb.
        sm: 'h-9 rounded-sm px-3 text-[13px]',
        md: 'h-11 rounded-md px-4 text-sm',
        lg: 'h-[52px] rounded-md px-6 text-[15px]',
        icon: 'h-11 w-11 rounded-md',
      },
      full: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'primary', size: 'md', full: false },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  asChild?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, full, asChild = false, type = 'button', ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        type={asChild ? undefined : type}
        className={cn(button({ variant, size, full }), className)}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'
