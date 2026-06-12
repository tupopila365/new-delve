import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { mediaUrl } from '../api/client'

export function Account() {
  const { profile, logout } = useAuth()

  if (!profile) {
    return (
      <div>
        <h1 className="display" style={{ fontSize: '1.65rem' }}>Account</h1>
        <p>
          <Link to="/login">Sign in</Link> or <Link to="/register">create an account</Link>.
        </p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="display" style={{ fontSize: '1.65rem' }}>Account</h1>
      <div className="card" style={{ padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        {profile.avatar ? (
          <img src={mediaUrl(profile.avatar)} alt="" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--accent-soft)', display: 'grid', placeItems: 'center', fontSize: '1.5rem' }}>
            ☺
          </div>
        )}
        <div>
          <strong>{profile.display_name || profile.username}</strong>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>@{profile.username}</div>
          <div className="pill" style={{ marginTop: 6, display: 'inline-block' }}>
            {profile.user_type === 'service_provider' ? 'Service provider' : 'Explorer'}
          </div>
          {!profile.email_verified && (
            <div style={{ marginTop: 8, fontSize: '0.85rem', color: '#b45309' }}>
              Email not verified · <Link to="/verify-email">Verify</Link>
            </div>
          )}
        </div>
      </div>
      <div style={{ marginTop: '1.25rem', display: 'grid', gap: 8 }}>
        <Link
          to={`/u/${profile.username}`}
          className="btn btn-primary"
          style={{ textAlign: 'center', textDecoration: 'none' }}
        >
          View my profile
        </Link>
        <Link to="/settings" className="btn btn-ghost" style={{ textAlign: 'center', textDecoration: 'none' }}>
          Settings
        </Link>
        <button type="button" className="btn btn-ghost" onClick={logout}>
          Sign out
        </button>
      </div>
    </div>
  )
}
