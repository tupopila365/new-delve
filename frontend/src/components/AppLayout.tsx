import { Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { MobileTopBar } from './MobileTopBar'
import { SidebarNav } from './SidebarNav'

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
      <SidebarNav />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <MobileTopBar />
        <main className={homeMain ? 'app-main app-main--home' : 'app-main'}>
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
