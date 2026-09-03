import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/cn'

interface PageHeaderProps {
  title: string
  /** Where back goes when there is no history to pop. */
  backTo?: string
  eyebrow?: string
  action?: React.ReactNode
  className?: string
  /** Display type for editorial screens; plain weight for utilitarian ones. */
  display?: boolean
}

export function PageHeader({
  title,
  backTo,
  eyebrow,
  action,
  className,
  display = true,
}: PageHeaderProps) {
  const navigate = useNavigate()

  const goBack = () => {
    // history.state.idx tells us whether there is anything to pop — a deep link
    // opened straight into this route would otherwise leave the app.
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate(backTo ?? '/overview')
  }

  return (
    <header className={cn('mb-7 flex items-start gap-3', className)}>
      <button
        onClick={goBack}
        aria-label="Go back"
        className="-ml-2 mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-ink transition-colors duration-micro hover:bg-surface"
      >
        <ArrowLeft size={20} strokeWidth={1.75} />
      </button>

      <div className="min-w-0 flex-1 pt-1.5">
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1
          className={cn(
            'truncate',
            display ? 'display text-[26px] leading-tight' : 'text-xl font-semibold tracking-tight',
          )}
        >
          {title}
        </h1>
      </div>

      {action && <div className="shrink-0 pt-1">{action}</div>}
    </header>
  )
}
