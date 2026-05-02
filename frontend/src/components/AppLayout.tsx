import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { MobileTopBar } from './MobileTopBar'
import { TopNav } from './TopNav'

const hideNavPaths = ['/login', '/register', '/verify-email']

export function AppLayout() {
  const loc = useLocation()
  const hide = hideNavPaths.some((p) => loc.pathname.startsWith(p))

  if (hide) {
    return (
      <div className="app-shell">
        <main className="app-main" style={{ paddingBottom: '1.5rem' }}>
          <Outlet />
        </main>
      </div>
    )
  }

  const homeMain = loc.pathname === '/'

  return (
    <div className="app-shell">
      {/* Desktop: sticky top nav bar */}
      <TopNav />

      {/* Mobile: sticky top bar with logo + icons */}
      <MobileTopBar />

      <main className={homeMain ? 'app-main app-main--home' : 'app-main'}>
        <Outlet />
      </main>

      {/* Mobile only: floating bottom nav */}
      <BottomNav />
    </div>
  )
}
