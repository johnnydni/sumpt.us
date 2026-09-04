import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { AppShell } from '@/components/navigation/AppShell'
import { ToastProvider } from '@/components/ui/Toast'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import Welcome from '@/pages/Welcome/Welcome'
import Onboarding from '@/pages/Onboarding/Onboarding'
import Overview from '@/pages/Overview/Overview'

/**
 * Overview is the landing screen, so it ships in the main bundle. Everything
 * else — and Recharts in particular — is split out and fetched on first visit.
 */
const Groups = lazy(() => import('@/pages/Groups/Groups'))
const CreateGroup = lazy(() => import('@/pages/CreateGroup/CreateGroup'))
const GroupDetail = lazy(() => import('@/pages/GroupDetail/GroupDetail'))
const AddExpense = lazy(() => import('@/pages/AddExpense/AddExpense'))
const ExpenseDetail = lazy(() => import('@/pages/ExpenseDetail/ExpenseDetail'))
const Settlement = lazy(() => import('@/pages/Settlement/Settlement'))
const SmartSettlement = lazy(() => import('@/pages/SmartSettlement/SmartSettlement'))
const Activity = lazy(() => import('@/pages/Activity/Activity'))
const Statistics = lazy(() => import('@/pages/Statistics/Statistics'))
const Friends = lazy(() => import('@/pages/Friends/Friends'))
const FriendDetail = lazy(() => import('@/pages/Friends/FriendDetail'))
const Profile = lazy(() => import('@/pages/Profile/Profile'))
const Plan = lazy(() => import('@/pages/Plan/Plan'))

export default function App() {
  const hydrate = useAppStore((s) => s.hydrate)
  const hydrated = useAppStore((s) => s.hydrated)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  // Blank rather than a spinner: localStorage reads finish inside a frame, and
  // a flashed loader would be the only slow-feeling thing in the app.
  if (!hydrated) return <div className="min-h-[100dvh] bg-canvas" />

  return (
    <ToastProvider>
      <ScrollToTop />
      <ErrorBoundary>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Entry />} />
            <Route path="/onboarding" element={<Onboarding />} />

            <Route element={<RequireOnboarding />}>
              <Route element={<AppShell />}>
                <Route path="/overview" element={<Overview />} />
                <Route path="/groups" element={<Groups />} />
                <Route path="/groups/new" element={<CreateGroup />} />
                <Route path="/groups/:id" element={<GroupDetail />} />
                <Route path="/groups/:id/stats" element={<Statistics />} />
                <Route path="/expenses/new" element={<AddExpense />} />
                <Route path="/expenses/:id" element={<ExpenseDetail />} />
                <Route path="/expenses/:id/edit" element={<AddExpense />} />
                <Route path="/settle" element={<Settlement />} />
                <Route path="/settle/smart" element={<SmartSettlement />} />
                <Route path="/activity" element={<Activity />} />
                <Route path="/friends" element={<Friends />} />
                <Route path="/friends/:id" element={<FriendDetail />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/plan" element={<Plan />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </ToastProvider>
  )
}

/** Returning users skip the pitch and land straight on their balance. */
function Entry() {
  const onboarded = useAppStore((s) => s.onboarded)
  return onboarded ? <Navigate to="/overview" replace /> : <Welcome />
}

function RequireOnboarding() {
  const onboarded = useAppStore((s) => s.onboarded)
  if (!onboarded) return <Navigate to="/" replace />
  return <Outlet />
}

function RouteFallback() {
  return <div className="shell pt-16" aria-busy="true" />
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname])
  return null
}
