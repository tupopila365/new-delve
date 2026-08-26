import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useAdminAuth } from '../auth/AdminAuthContext'
import { AdminHeader } from './AdminHeader'
import { AdminSidebar } from './AdminSidebar'

const MQ = '(min-width: 1024px)'

export function AdminLayout() {
  const { admin, sessionExpiresAt, logout, logoutAll } = useAdminAuth()
  const [desktop, setDesktop] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(MQ).matches : true))
  const [navOpen, setNavOpen] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(MQ).matches : true))

  useEffect(() => {
    const mq = window.matchMedia(MQ)
    const sync = () => {
      setDesktop(mq.matches)
      setNavOpen(mq.matches)
    }
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !desktop) setNavOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [desktop])

  if (!admin) return null

  return (
    <div className={`admin-shell ${navOpen && !desktop ? 'nav-open' : ''}`}>
      <AdminSidebar
        open={navOpen}
        onNavigate={() => {
          if (!desktop) setNavOpen(false)
        }}
      />
      {!desktop && navOpen ? (
        <button type="button" className="admin-backdrop" aria-label="Close navigation" onClick={() => setNavOpen(false)} />
      ) : null}
      <div className="admin-main">
        <AdminHeader
          admin={admin}
          sessionExpiresAt={sessionExpiresAt}
          onLogout={() => void logout()}
          onLogoutAll={() => void logoutAll()}
          onToggleNav={() => setNavOpen(v => !v)}
          navOpen={navOpen}
        />
        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
