import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Clock, LayoutGrid, Plus, User, Users } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * Four destinations and the button. The `+` is deliberately the only filled element
 * in the bar — adding an expense is the job, everything else is looking things
 * up.
 *
 * Friends earns a place of its own because splitting with one person is a
 * different question from splitting with a group, asked as often, and it was
 * previously two taps deep inside Profile. Activity comes up with it to keep
 * the count even — with three destinations the button either sits off centre
 * or lands on top of the middle one, and it is the anchor of the bar.
 */
export function BottomNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const overviewActive =
    pathname === '/overview' ||
    pathname.startsWith('/groups') ||
    pathname.startsWith('/expenses') ||
    pathname.startsWith('/settle')
  const activityActive = pathname.startsWith('/activity')
  const friendsActive = pathname.startsWith('/friends')
  const profileActive = pathname.startsWith('/profile')

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas/90 backdrop-blur-md"
    >
      {/* The button is anchored to the centre and the destinations laid out
          around it, with a spacer holding its place in the row so nothing is
          ever drawn underneath it. */}
      <div className="relative mx-auto flex max-w-[420px] items-center justify-between px-5 pb-safe pt-2 sm:max-w-shell sm:justify-center sm:gap-8">
        <NavItem to="/overview" label="Overview" active={overviewActive}>
          <LayoutGrid size={21} strokeWidth={overviewActive ? 2 : 1.6} />
        </NavItem>
        <NavItem to="/friends" label="Friends" active={friendsActive}>
          <Users size={21} strokeWidth={friendsActive ? 2 : 1.6} />
        </NavItem>

        <button
          onClick={() => navigate('/expenses/new')}
          aria-label="Add expense"
          className="absolute left-1/2 top-2 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-ink text-white shadow-lift transition-transform duration-micro ease-out active:scale-95"
        >
          <Plus size={24} strokeWidth={2} />
        </button>
        <span aria-hidden="true" className="w-14 shrink-0" />
        <NavItem to="/activity" label="Activity" active={activityActive}>
          <Clock size={21} strokeWidth={activityActive ? 2 : 1.6} />
        </NavItem>

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
        'flex h-14 w-14 shrink-0 flex-col items-center justify-center gap-1 rounded-md transition-colors duration-micro',
        active ? 'text-ink' : 'text-muted',
      )}
    >
      {children}
      <span className="text-[10px] font-medium tracking-wide">{label}</span>
    </Link>
  )
}
