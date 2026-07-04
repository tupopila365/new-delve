import { useEffect } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { AdminAccessGate } from '../components/admin'
import { ListSkeleton } from '../components/ui'
import { adminConsoleUrl } from '../utils/adminAppUrl'

export function PlatformAdminHandoff() {
  const { profile, loading } = useAuth()
  const location = useLocation()

  const adminPath = location.pathname.replace(/^\/admin/, '') || ''
  const target = `${adminConsoleUrl(adminPath)}${location.search}`

  useEffect(() => {
    if (!profile?.is_staff) return
    const timer = window.setTimeout(() => {
      window.location.replace(target)
    }, 400)
    return () => window.clearTimeout(timer)
  }, [profile?.is_staff, target])

  if (loading) {
    return (
      <div className="adm-handoff">
        <p className="adm-handoff__sub">Loading…</p>
        <ListSkeleton count={2} variant="row" />
      </div>
    )
  }

  if (!profile) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`)
    return <Navigate to={`/login?next=${next}`} replace />
  }

  if (!profile.is_staff) {
    return (
      <div className="adm-handoff adm-handoff--gate">
        <AdminAccessGate />
      </div>
    )
  }

  return (
    <div className="adm-handoff">
      <div className="adm-handoff__card">
        <p className="adm-handoff__eyebrow">Platform admin</p>
        <h1 className="adm-handoff__title">Opening Delve Admin console</h1>
        <p className="adm-handoff__sub">
          Staff tools (users, verifications, moderation, email queue, analytics) live in the dedicated Delve Admin
          app — not in the traveller frontend.
        </p>
        <a href={target} className="adm-handoff__cta">
          Continue to Delve Admin →
        </a>
        <p className="adm-handoff__meta">
          <Link to="/">Back to DELVE</Link>
          <span aria-hidden> · </span>
          <Link to="/account">Account</Link>
        </p>
      </div>
    </div>
  )
}
