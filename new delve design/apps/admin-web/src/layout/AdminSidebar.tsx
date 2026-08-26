import { NavLink } from 'react-router-dom'
import { Brand } from '../components/admin/Brand'
import { ADMIN_NAV } from './nav'

export function AdminSidebar({
  open,
  onNavigate,
}: {
  open: boolean
  onNavigate: () => void
}) {
  return (
    <aside
      id="admin-sidebar"
      className={`admin-sidebar ${open ? 'is-open' : ''}`}
      aria-label="Administrator navigation"
    >
      <div className="px-4 py-5" style={{ borderBottom: '1px solid var(--border)' }}>
        <Brand />
      </div>
      <nav className="px-3 py-4 flex flex-col gap-5 overflow-y-auto">
        {ADMIN_NAV.map(group => (
          <div key={group.id}>
            <p className="text-[11px] font-semibold tracking-[0.16em] uppercase m-0 mb-2 px-2" style={{ color: 'var(--muted)' }}>
              {group.label}
            </p>
            {group.id === 'finance' ? (
              <p className="text-xs font-semibold m-0 mb-1 px-2">Payments</p>
            ) : null}
            <ul className="list-none m-0 p-0 flex flex-col gap-0.5">
              {group.items.map(item => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) => `admin-nav-link ${isActive ? 'is-active' : ''}`}
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}
