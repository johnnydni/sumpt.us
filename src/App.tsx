import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { Navigate, Outlet, Route, Routes, useLocation, useNavigationType } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { AppShell } from '@/components/navigation/AppShell'
import { Splash } from '@/components/brand/Splash'
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
const SignIn = lazy(() => import('@/pages/SignIn/SignIn'))

export default function App() {
  const hydrate = useAppStore((s) => s.hydrate)
  const hydrated = useAppStore((s) => s.hydrated)
  /*
   * Once per session, not once per page load.
   *
   * A standalone app on iOS gets reloaded out from under the user — the system
   * reclaims it in the background, a gesture drops it out of the page cache —
   * and replaying five seconds of brand animation on the way back is what
   * makes that feel like the app restarting rather than resuming. sessionStorage
   * is exactly the right lifetime: a genuine cold start gets the splash, a
   * reload inside the same session does not.
   */
  const [splashPlayed, setSplashPlayed] = useState(playedThisSession)
  const endSplash = useCallback(() => {
    rememberSplash()
    setSplashPlayed(true)
  }, [])

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  // The splash covers the boot rather than replacing it: routes mount behind
  // it, so the first screen is already painted when it lifts. It also outstays
  // its own timer if hydration is somehow slower — never the other way round.
  const showSplash = !hydrated || !splashPlayed

  return (
    <ToastProvider>
      <AnimatePresence>{showSplash && <Splash key="splash" onDone={endSplash} />}</AnimatePresence>

      {hydrated && (
        <>
          <ScrollToTop />
          <ErrorBoundary>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Entry />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/sign-in" element={<SignIn />} />

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
        </>
      )}
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

const SPLASH_KEY = 'sumptus.splash.session'

/** Storage can throw outright in a private window, so nothing here may. */
function playedThisSession(): boolean {
  try {
    return sessionStorage.getItem(SPLASH_KEY) === '1'
  } catch {
    return false
  }
}

function rememberSplash() {
  try {
    sessionStorage.setItem(SPLASH_KEY, '1')
  } catch {
    /* A splash that replays is a smaller problem than one that throws. */
  }
}

function RouteFallback() {
  return <div className="shell pt-16" aria-busy="true" />
}

/**
 * A new screen starts at the top. A screen you came back to does not.
 *
 * The browser already restores the scroll position of a history entry it pops,
 * and it does it before this effect runs — so firing on a POP is a visible
 * jump to the top of a list you had scrolled halfway down, immediately after
 * the back gesture put you back exactly where you were.
 */
function ScrollToTop() {
  const { pathname } = useLocation()
  const navigationType = useNavigationType()

  useEffect(() => {
    if (navigationType === 'POP') return
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [pathname, navigationType])

  return null
}
