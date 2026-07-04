import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Activity,
  BarChart3,
  Building2,
  CalendarCheck,
  Flag,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Megaphone,
  Package,
  Pin,
  Sparkles,
  Settings,
  ShieldCheck,
  ShieldAlert,
  Users,
  X,
} from 'lucide-react'
import { DelveAdminNotifications } from './DelveAdminNotifications'
import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/activity', label: 'Activity', icon: Activity },
  { to: '/admin/verifications', label: 'Verifications', icon: ShieldCheck },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/businesses', label: 'Businesses', icon: Building2 },
  { to: '/admin/listings', label: 'Listings', icon: Package },
  { to: '/admin/promotions', label: 'Featured partners', icon: Megaphone },
  { to: '/admin/home-pins', label: 'Home pins', icon: Pin },
  { to: '/admin/home-stories', label: 'Home stories', icon: Sparkles },
  { to: '/admin/bookings', label: 'Bookings', icon: CalendarCheck },
  { to: '/admin/reports', label: 'Reports', icon: Flag },
  { to: '/admin/moderation', label: 'Content', icon: ShieldAlert },
  { to: '/admin/email-verification', label: 'Email verify', icon: Mail },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

export function DelveAdminLayout() {
  const { profile, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const onLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="da-shell">
      <aside className={`da-sidebar${menuOpen ? ' da-sidebar--open' : ''}`}>
        <div className="da-sidebar__brand">
          <strong>DELVE</strong>
          <span>Admin</span>
        </div>
        <nav className="da-sidebar__nav" aria-label="Admin navigation">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `da-sidebar__link${isActive ? ' da-sidebar__link--active' : ''}`
              }
              onClick={() => setMenuOpen(false)}
            >
              <item.icon size={18} strokeWidth={2.25} aria-hidden />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="da-sidebar__foot">
          <a
            href={import.meta.env.VITE_PUBLIC_APP_URL || 'http://localhost:5173'}
            className="da-sidebar__public"
            target="_blank"
            rel="noreferrer"
          >
            Open DELVE app
          </a>
          {profile ? (
            <p className="da-sidebar__user">
              {profile.display_name || profile.username}
              <span>Platform admin</span>
            </p>
          ) : null}
          <button type="button" className="da-sidebar__logout" onClick={onLogout}>
            <LogOut size={16} strokeWidth={2.25} aria-hidden />
            Sign out
          </button>
        </div>
      </aside>

      {menuOpen ? (
        <button
          type="button"
          className="da-shell__backdrop"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <div className="da-shell__main">
        <header className="da-topbar">
          <button
            type="button"
            className="da-topbar__menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span className="da-topbar__label">Platform console</span>
          <DelveAdminNotifications />
        </header>
        <main className="da-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
