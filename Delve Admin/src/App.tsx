import { Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { DelveAdminAccessGate, DelveAdminLayout, DelveAdminLoading } from './components'
import { ActivityPage } from './pages/ActivityPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { BusinessesPage } from './pages/BusinessesPage'
import { BookingsPage } from './pages/BookingsPage'
import { ContentModerationPage } from './pages/ContentModerationPage'
import { DashboardPage } from './pages/DashboardPage'
import { EmailVerificationPage } from './pages/EmailVerificationPage'
import { ListingsPage } from './pages/ListingsPage'
import { LoginPage } from './pages/LoginPage'
import { HomePinsPage } from './pages/HomePinsPage'
import { HomeStoriesPage } from './pages/HomeStoriesPage'
import { PaymentsPage } from './pages/PaymentsPage'
import { DisputesPage } from './pages/DisputesPage'
import { ReviewsModerationPage } from './pages/ReviewsModerationPage'
import { PromotionsAnalyticsPage } from './pages/PromotionsAnalyticsPage'
import { PromotionsPage } from './pages/PromotionsPage'
import { ReportsPage } from './pages/ReportsPage'
import { SettingsPage } from './pages/SettingsPage'
import { UsersPage } from './pages/UsersPage'
import { VerificationsPage } from './pages/VerificationsPage'

const qc = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

function StaffRoute({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useAuth()
  if (loading) return <DelveAdminLoading count={3} />
  if (!profile) return <Navigate to="/login" replace />
  if (!profile.is_staff) return <DelveAdminAccessGate />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route
        path="/admin"
        element={
          <StaffRoute>
            <DelveAdminLayout />
          </StaffRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="verifications" element={<VerificationsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="businesses" element={<BusinessesPage />} />
        <Route path="listings" element={<ListingsPage />} />
        <Route path="promotions" element={<PromotionsPage />} />
        <Route path="promotions/analytics" element={<PromotionsAnalyticsPage />} />
        <Route path="home-pins" element={<HomePinsPage />} />
        <Route path="home-stories" element={<HomeStoriesPage />} />
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="disputes" element={<DisputesPage />} />
        <Route path="reviews" element={<ReviewsModerationPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="moderation" element={<ContentModerationPage />} />
        <Route path="email-verification" element={<EmailVerificationPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="activity" element={<ActivityPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </QueryClientProvider>
  )
}
