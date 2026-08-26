import { useEffect, useId, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { SafeAdminUser } from '@delve/contracts'
import { resolvePageMeta } from './nav'

export function AdminHeader({
  admin,
  sessionExpiresAt,
  onLogout,
  onLogoutAll,
  onToggleNav,
  navOpen,
}: {
  admin: SafeAdminUser
  sessionExpiresAt: string | null
  onLogout: () => void
  onLogoutAll: () => void
  onToggleNav: () => void
  navOpen: boolean
}) {
  const { pathname } = useLocation()
  const meta = resolvePageMeta(pathname)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmEverywhere, setConfirmEverywhere] = useState(false)
  const [busy, setBusy] = useState(false)
  const menuId = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  const identity = admin.displayName || admin.username

  useEffect(() => {
    setMenuOpen(false)
    setConfirmEverywhere(false)
  }, [pathname])

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <header className="admin-header">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          className="admin-btn-secondary admin-nav-toggle"
          aria-controls="admin-sidebar"
          aria-expanded={navOpen}
          onClick={onToggleNav}
        >
          Menu
        </button>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.16em] uppercase m-0" style={{ color: 'var(--muted)' }}>
            Delve Admin
          </p>
          <h2 className="text-lg font-extrabold m-0 truncate" style={{ fontFamily: 'Syne, sans-serif' }}>
            {meta.title}
          </h2>
          <p className="text-xs m-0 truncate" style={{ color: 'var(--muted)' }}>
            {meta.crumbs.join(' / ')}
          </p>
        </div>
      </div>

      <div className="relative" ref={wrapRef}>
        <button
          type="button"
          className="admin-identity-btn"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          onClick={() => setMenuOpen(v => !v)}
        >
          <span className="font-semibold truncate max-w-[10rem] sm:max-w-xs">{identity}</span>
          <span aria-hidden="true">▾</span>
        </button>
        {menuOpen ? (
          <div
            id={menuId}
            role="menu"
            className="admin-menu"
          >
            <p className="text-xs m-0 px-3 py-2" style={{ color: 'var(--muted)' }}>
              {admin.email}
            </p>
            <p className="text-xs m-0 px-3 pb-2" style={{ color: 'var(--muted)' }}>
              Session expires {sessionExpiresAt ? new Date(sessionExpiresAt).toLocaleString() : '—'}
            </p>
            <button type="button" role="menuitem" className="admin-menu-item" onClick={onLogout}>
              Sign out
            </button>
            {!confirmEverywhere ? (
              <button type="button" role="menuitem" className="admin-menu-item" onClick={() => setConfirmEverywhere(true)}>
                Sign out everywhere
              </button>
            ) : (
              <div className="px-3 py-2 flex flex-col gap-2">
                <p className="text-xs m-0" role="status">
                  End every administrator session for this account?
                </p>
                <button
                  type="button"
                  className="admin-btn"
                  disabled={busy}
                  onClick={() => {
                    if (busy) return
                    setBusy(true)
                    onLogoutAll()
                  }}
                >
                  {busy ? 'Signing out…' : 'Yes, sign out everywhere'}
                </button>
                <button type="button" className="admin-btn-secondary" disabled={busy} onClick={() => setConfirmEverywhere(false)}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </header>
  )
}
