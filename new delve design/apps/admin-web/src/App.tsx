import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AdminAuthProvider, useAdminAuth } from './auth/AdminAuthContext'
import { AuthShell } from './components/admin/AuthShell'
import { LoadingSkeleton } from './components/admin/LoadingSkeleton'
import { StatusCard } from './components/admin/StatusCard'
import { AdminLayout } from './layout/AdminLayout'
import LoginPage from './routes/LoginPage'

const BusinessesPage = lazy(() => import('./routes/BusinessesPage'))
const BusinessDetailPage = lazy(() => import('./routes/BusinessDetailPage'))
const ListingsPage = lazy(() => import('./routes/ListingsPage'))
const ListingDetailPage = lazy(() => import('./routes/ListingDetailPage'))
const TravelersPage = lazy(() => import('./routes/TravelersPage'))
const TravelerDetailPage = lazy(() => import('./routes/TravelerDetailPage'))
const DashboardPage = lazy(() => import('./routes/DashboardPage'))
const DealsPage = lazy(() => import('./routes/DealsPage'))
const BookingsPage = lazy(() => import('./routes/BookingsPage'))
const BookingDetailPage = lazy(() => import('./routes/BookingDetailPage'))
const PaymentsOverviewPage = lazy(() => import('./routes/payments/PaymentsOverviewPage'))
const SettlementsPage = lazy(() => import('./routes/payments/SettlementsPage'))
const RefundsPage = lazy(() => import('./routes/payments/RefundsPage'))
const DisputesPage = lazy(() => import('./routes/payments/DisputesPage'))
const ReconciliationPage = lazy(() => import('./routes/payments/ReconciliationPage'))
const FinancialReportsPage = lazy(() => import('./routes/payments/FinancialReportsPage'))
const ModerationPage = lazy(() => import('./routes/ModerationPage'))
const ModerationReportsPage = lazy(() => import('./routes/ModerationReportsPage'))
const ModerationCasePage = lazy(() => import('./routes/ModerationCasePage'))
const ModerationPostsPage = lazy(() => import('./routes/ModerationPostsPage'))
const ModerationCommunitiesPage = lazy(() => import('./routes/ModerationCommunitiesPage'))
const ModerationEventsPage = lazy(() => import('./routes/ModerationEventsPage'))
const ModerationJourneysPage = lazy(() => import('./routes/ModerationJourneysPage'))

function RouteFallback() {
  return (
    <div className="p-2">
      <LoadingSkeleton />
    </div>
  )
}

function HomeRedirect() {
  const { boot } = useAdminAuth()
  if (boot === 'authenticated') return <Navigate to="/dashboard" replace />
  return <Navigate to="/login" replace />
}

function RequireAdmin() {
  const { boot } = useAdminAuth()
  const location = useLocation()

  if (boot === 'loading' || boot === 'error' || boot === 'forbidden') {
    return <LoginPage />
  }
  if (boot !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}

export default function App() {
  return (
    <BrowserRouter>
      <AdminAuthProvider>
        <Suspense fallback={
          <AuthShell>
            <StatusCard title="Loading Delve Admin" detail="Preparing the operations console…" />
          </AuthShell>
        }>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<HomeRedirect />} />
            <Route element={<RequireAdmin />}>
              <Route element={<AdminLayout />}>
                <Route path="/dashboard" element={<Suspense fallback={<RouteFallback />}><DashboardPage /></Suspense>} />
                <Route path="/travelers" element={<Suspense fallback={<RouteFallback />}><TravelersPage /></Suspense>} />
                <Route path="/travelers/:userId" element={<Suspense fallback={<RouteFallback />}><TravelerDetailPage /></Suspense>} />
                <Route path="/businesses" element={<Suspense fallback={<RouteFallback />}><BusinessesPage /></Suspense>} />
                <Route path="/businesses/:businessId" element={<Suspense fallback={<RouteFallback />}><BusinessDetailPage /></Suspense>} />
                <Route path="/listings" element={<Suspense fallback={<RouteFallback />}><ListingsPage /></Suspense>} />
                <Route path="/listings/:listingId" element={<Suspense fallback={<RouteFallback />}><ListingDetailPage /></Suspense>} />
                <Route path="/deals" element={<Suspense fallback={<RouteFallback />}><DealsPage /></Suspense>} />
                <Route path="/bookings" element={<Suspense fallback={<RouteFallback />}><BookingsPage /></Suspense>} />
                <Route path="/bookings/:bookingId" element={<Suspense fallback={<RouteFallback />}><BookingDetailPage /></Suspense>} />
                <Route path="/payments" element={<Suspense fallback={<RouteFallback />}><PaymentsOverviewPage /></Suspense>} />
                <Route path="/payments/settlements" element={<Suspense fallback={<RouteFallback />}><SettlementsPage /></Suspense>} />
                <Route path="/payments/refunds" element={<Suspense fallback={<RouteFallback />}><RefundsPage /></Suspense>} />
                <Route path="/payments/disputes" element={<Suspense fallback={<RouteFallback />}><DisputesPage /></Suspense>} />
                <Route path="/payments/reconciliation" element={<Suspense fallback={<RouteFallback />}><ReconciliationPage /></Suspense>} />
                <Route path="/payments/reports" element={<Suspense fallback={<RouteFallback />}><FinancialReportsPage /></Suspense>} />
                <Route path="/moderation" element={<Suspense fallback={<RouteFallback />}><ModerationPage /></Suspense>} />
                <Route path="/moderation/reports/:targetType/:targetId" element={<Suspense fallback={<RouteFallback />}><ModerationCasePage /></Suspense>} />
                <Route path="/moderation/reports" element={<Suspense fallback={<RouteFallback />}><ModerationReportsPage /></Suspense>} />
                <Route path="/moderation/posts" element={<Suspense fallback={<RouteFallback />}><ModerationPostsPage /></Suspense>} />
                <Route path="/moderation/communities" element={<Suspense fallback={<RouteFallback />}><ModerationCommunitiesPage /></Suspense>} />
                <Route path="/moderation/events" element={<Suspense fallback={<RouteFallback />}><ModerationEventsPage /></Suspense>} />
                <Route path="/moderation/journeys" element={<Suspense fallback={<RouteFallback />}><ModerationJourneysPage /></Suspense>} />
              </Route>
            </Route>
            <Route path="*" element={<HomeRedirect />} />
          </Routes>
        </Suspense>
      </AdminAuthProvider>
    </BrowserRouter>
  )
}
