import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LayoutGrid, Plus, User } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * Exactly three targets: Overview, add, Profile. The `+` is deliberately the
 * only filled element in the bar — adding an expense is the job, everything
 * else is looking things up.
 */
export function BottomNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const overviewActive =
    pathname === '/overview' ||
    pathname.startsWith('/groups') ||
    pathname.startsWith('/activity') ||
    pathname.startsWith('/expenses') ||
    pathname.startsWith('/settle')
  const profileActive = pathname.startsWith('/profile') || pathname.startsWith('/friends')

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas/90 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-[420px] items-center justify-between px-10 pb-safe pt-2 sm:max-w-shell sm:justify-center sm:gap-16">
        <NavItem to="/overview" label="Overview" active={overviewActive}>
          <LayoutGrid size={21} strokeWidth={overviewActive ? 2 : 1.6} />
        </NavItem>

        <button
          onClick={() => navigate('/expenses/new')}
          aria-label="Add expense"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-ink text-white shadow-lift transition-transform duration-micro ease-out active:scale-95"
        >
          <Plus size={24} strokeWidth={2} />
        </button>

        <NavItem to="/profile" label="Profile" active={profileActive}>
          <User size={21} strokeWidth={profileActive ? 2 : 1.6} />
        </NavItem>
      </div>
    </nav>
  )
}

function NavItem({
  to,
  label,
  active,
  children,
}: {
  to: string
  label: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-14 w-16 flex-col items-center justify-center gap-1 rounded-md transition-colors duration-micro',
        active ? 'text-ink' : 'text-muted',
      )}
    >
      {children}
      <span className="text-[10px] font-medium tracking-wide">{label}</span>
    </Link>
  )
}
