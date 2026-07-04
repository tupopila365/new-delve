import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { apiFetch, mediaUrl } from '../api/client'
import { friendlyApiMessage } from '../utils/friendlyError'
import { useAuth } from '../auth/AuthContext'
import type { PostsVisibility } from '../auth/AuthContext'
import { useBusinessAccess } from '../hooks/useBusinessAccess'
import {
  COUNTRY_ROWS,
  CURRENCY_OPTIONS,
  defaultCurrencyForCountry,
} from '../lib/countryCurrencyPreferences'
import { EmptyState } from '../components/ui'
import { ResendVerificationButton } from '../components/auth/ResendVerificationButton'
import { ProfileIdentityLinks } from '../components/profile/ProfileIdentityLinks'

type SettingsTab = 'profile' | 'privacy' | 'preferences' | 'account'

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'preferences', label: 'Prefs' },
  { id: 'account', label: 'Account' },
]

function SaveBanner({ saved, error }: { saved: boolean; error: string | null }) {
  if (error) return <p className="sp__banner sp__banner--err" role="alert">{error}</p>
  if (saved) return <p className="sp__banner sp__banner--ok" role="status">Saved successfully.</p>
  return null
}

export function Settings() {
  const { profile, refreshProfile, logout } = useAuth()
  const { businesses, canAccessProvider } = useBusinessAccess()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const qc = useQueryClient()
  const [tab, setTab] = useState<SettingsTab>('profile')

  // ── Profile fields ──────────────────────────────────────────
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [region, setRegion] = useState('')
  const [city, setCity] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const avatarRef = useRef<HTMLInputElement>(null)

  // ── Privacy fields ──────────────────────────────────────────
  const [isPrivate, setIsPrivate] = useState(false)
  const [postsVisibility, setPostsVisibility] = useState<PostsVisibility>('public')
  const [allowMessages, setAllowMessages] = useState(true)
  const [showInSearch, setShowInSearch] = useState(true)

  // ── Preference fields ───────────────────────────────────────
  const [countryCode, setCountryCode] = useState('')
  const [preferredCurrency, setPreferredCurrency] = useState('')

  // ── UI state ────────────────────────────────────────────────
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdSaved, setPwdSaved] = useState(false)
  const [pwdError, setPwdError] = useState<string | null>(null)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteUsername, setDeleteUsername] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteSaving, setDeleteSaving] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    const requested = searchParams.get('tab')
    if (requested === 'profile' || requested === 'privacy' || requested === 'preferences' || requested === 'account') {
      setTab(requested)
    }
    if (window.location.hash === '#delete-account') {
      setTab('account')
      setDeleteOpen(true)
    }
  }, [searchParams])

  useEffect(() => {
    if (!profile) return
    setDisplayName(profile.display_name ?? '')
    setBio(profile.bio ?? '')
    setRegion(profile.region ?? '')
    setCity(profile.city ?? '')
    setIsPrivate(profile.is_private ?? false)
    setPostsVisibility(profile.posts_visibility ?? 'public')
    setAllowMessages(profile.allow_messages ?? true)
    setShowInSearch(profile.show_in_search ?? true)
    setCountryCode(profile.country_code ?? '')
    setPreferredCurrency(profile.preferred_currency ?? '')
  }, [profile])

  function onAvatarChange(file: File | null) {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    setAvatarFile(file)
    setAvatarPreview(file ? URL.createObjectURL(file) : null)
  }

  function flashSaved() {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function handlePasswordChange() {
    setPwdSaving(true)
    setPwdSaved(false)
    setPwdError(null)
    if (newPassword !== confirmPassword) {
      setPwdError('New passwords do not match.')
      setPwdSaving(false)
      return
    }
    try {
      await apiFetch('/api/accounts/me/change-password/', {
        method: 'POST',
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
        headers: { 'Content-Type': 'application/json' },
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPwdSaved(true)
      setTimeout(() => setPwdSaved(false), 3000)
    } catch (err) {
      setPwdError(friendlyApiMessage(err, 'Could not update password.'))
    } finally {
      setPwdSaving(false)
    }
  }

  async function handleDeleteAccount() {
    if (!profile) return
    setDeleteSaving(true)
    setDeleteError(null)
    try {
      await apiFetch('/api/accounts/me/delete/', {
        method: 'POST',
        body: JSON.stringify({
          confirm_username: deleteUsername.trim(),
          current_password: deletePassword,
        }),
        headers: { 'Content-Type': 'application/json' },
      })
      logout()
      navigate('/', { state: { accountDeleted: true } })
    } catch (err) {
      setDeleteError(friendlyApiMessage(err, 'Could not delete account. Check your username and password.'))
    } finally {
      setDeleteSaving(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      if (tab === 'profile') {
        const fd = new FormData()
        fd.append('display_name', displayName)
        fd.append('bio', bio)
        fd.append('region', region)
        fd.append('city', city)
        if (avatarFile) fd.append('avatar', avatarFile)
        await apiFetch('/api/accounts/me/update/', { method: 'PATCH', body: fd })
      } else if (tab === 'privacy') {
        await apiFetch('/api/accounts/me/update/', {
          method: 'PATCH',
          body: JSON.stringify({ is_private: isPrivate, posts_visibility: postsVisibility, allow_messages: allowMessages, show_in_search: showInSearch }),
          headers: { 'Content-Type': 'application/json' },
        })
      } else if (tab === 'preferences') {
        await apiFetch('/api/accounts/me/update/', {
          method: 'PATCH',
          body: JSON.stringify({
            country_code: countryCode.trim().toUpperCase() || '',
            preferred_currency: preferredCurrency.trim().toUpperCase() || '',
          }),
          headers: { 'Content-Type': 'application/json' },
        })
      }
      await refreshProfile()
      // Invalidate the public profile cache so the profile page reflects changes immediately
      if (profile) await qc.invalidateQueries({ queryKey: ['public-profile', profile.username] })
      flashSaved()
      if (avatarFile) {
        setAvatarFile(null)
        if (avatarPreview) URL.revokeObjectURL(avatarPreview)
        setAvatarPreview(null)
      }
    } catch (e) {
      setError(friendlyApiMessage(e, 'Failed to save.'))
    } finally {
      setSaving(false)
    }
  }

  if (!profile) {
    return (
      <div className="settings-page">
        <EmptyState
          icon="⚙️"
          title="Sign in to manage settings"
          sub="Edit your profile, privacy, and preferences after you sign in."
          cta={{ label: 'Sign in', to: '/login' }}
        />
      </div>
    )
  }

  const avatarSrc = avatarPreview || (profile.avatar ? mediaUrl(profile.avatar) : null)
  const initial = (profile.display_name || profile.username || '?').charAt(0).toUpperCase()

  return (
    <div className="settings-page">
      <div className="settings-page__top-links">
        <Link to={`/u/${profile.username}`}>View profile</Link>
        <Link to="/account">Account hub</Link>
      </div>

      <div className="sp__tabs" role="tablist" aria-label="Settings sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            id={`sp-tab-${t.id}`}
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`sp-panel-${t.id}`}
            className={tab === t.id ? 'sp__tab sp__tab--active' : 'sp__tab'}
            onClick={() => { setTab(t.id); setSaved(false); setError(null) }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <SaveBanner saved={saved} error={error} />

      {/* ── EDIT PROFILE ── */}
      {tab === 'profile' && (
        <section className="sp__section settings-page__panel" id="sp-panel-profile" role="tabpanel" aria-labelledby="sp-tab-profile">
          <h2 id="sp-profile-title" className="sp__section-title">Edit profile</h2>

          {/* Avatar */}
          <div className="sp__av-row">
            <div className="sp__av-wrap">
              <div className="sp__av-circle" aria-hidden>
                {avatarSrc
                  ? <img src={avatarSrc} alt="Current avatar" />
                  : <span>{initial}</span>}
              </div>
              <button
                type="button"
                className="sp__av-edit"
                aria-label="Change profile photo"
                onClick={() => avatarRef.current?.click()}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <div>
              <button
                type="button"
                className="btn btn-ghost sp__av-btn"
                onClick={() => avatarRef.current?.click()}
              >
                Change photo
              </button>
              {avatarFile && (
                <button
                  type="button"
                  className="sp__av-remove"
                  onClick={() => { onAvatarChange(null); if (avatarRef.current) avatarRef.current.value = '' }}
                >
                  Remove
                </button>
              )}
              <p className="sp__av-hint">JPG or PNG. Recommended: square, min 200×200 px.</p>
            </div>
            <input
              ref={avatarRef}
              type="file"
              accept="image/*"
              className="visually-hidden"
              aria-label="Profile photo"
              onChange={(e) => onAvatarChange(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="sp__fields">
            <div className="sp__field">
              <label className="sp__label" htmlFor="sp-display-name">Display name</label>
              <input
                id="sp-display-name"
                className="input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                maxLength={80}
              />
            </div>

            <div className="sp__field">
              <label className="sp__label" htmlFor="sp-bio">Bio</label>
              <textarea
                id="sp-bio"
                className="input sp__textarea"
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell the community a little about yourself…"
                maxLength={500}
              />
              <p className="sp__char-count">{bio.length} / 500</p>
            </div>

            <div className="sp__row">
              <div className="sp__field">
                <label className="sp__label" htmlFor="sp-city">City</label>
                <input
                  id="sp-city"
                  className="input"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Windhoek"
                />
              </div>
              <div className="sp__field">
                <label className="sp__label" htmlFor="sp-region">Region</label>
                <input
                  id="sp-region"
                  className="input"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="e.g. Khomas"
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary sp__save-btn"
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </section>
      )}

      {/* ── PRIVACY ── */}
      {tab === 'privacy' && (
        <section className="sp__section settings-page__panel" id="sp-panel-privacy" role="tabpanel" aria-labelledby="sp-tab-privacy">
          <h2 id="sp-privacy-title" className="sp__section-title">Privacy &amp; visibility</h2>

          {/* Private account */}
          <div className="sp__toggle-card">
            <div className="sp__toggle-info">
              <p className="sp__toggle-label">Private account</p>
              <p className="sp__toggle-sub">
                When on, only you can see your posts, journeys, and saved items. Your profile header (name, bio) is still visible to everyone.
              </p>
            </div>
            <label className="sp__sw" aria-label="Private account">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
              />
              <span className="sp__sw-track" aria-hidden />
            </label>
          </div>

          {/* Posts visibility */}
          <div className="sp__field sp__field--mt">
            <p className="sp__label">Who can see your posts</p>
            <p className="sp__field-hint">Controls who sees your posts even when your account is public.</p>
            <div className="sp__radio-group" role="radiogroup" aria-label="Posts visibility">
              {[
                { value: 'public' as PostsVisibility, label: 'Everyone', desc: 'All Delve users can view your posts.' },
                { value: 'only_me' as PostsVisibility, label: 'Only me', desc: 'Your posts are hidden from everyone else.' },
              ].map((opt) => (
                <label key={opt.value} className={`sp__radio-card${postsVisibility === opt.value ? ' sp__radio-card--active' : ''}`}>
                  <input
                    type="radio"
                    name="posts_visibility"
                    value={opt.value}
                    checked={postsVisibility === opt.value}
                    onChange={() => setPostsVisibility(opt.value)}
                    className="visually-hidden"
                  />
                  <div className="sp__radio-dot" aria-hidden />
                  <div>
                    <p className="sp__radio-label">{opt.label}</p>
                    <p className="sp__radio-desc">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Message requests */}
          <div className="sp__toggle-card sp__toggle-card--mt">
            <div className="sp__toggle-info">
              <p className="sp__toggle-label">Allow message requests</p>
              <p className="sp__toggle-sub">
                When off, other users cannot send you new messages. Existing conversations are unaffected.
              </p>
            </div>
            <label className="sp__sw" aria-label="Allow message requests">
              <input
                type="checkbox"
                checked={allowMessages}
                onChange={(e) => setAllowMessages(e.target.checked)}
              />
              <span className="sp__sw-track" aria-hidden />
            </label>
          </div>

          {/* Search visibility */}
          <div className="sp__toggle-card sp__toggle-card--mt">
            <div className="sp__toggle-info">
              <p className="sp__toggle-label">Appear in search &amp; discovery</p>
              <p className="sp__toggle-sub">
                When off, your profile won't appear in search results or Delvers discovery.
              </p>
            </div>
            <label className="sp__sw" aria-label="Show in search">
              <input
                type="checkbox"
                checked={showInSearch}
                onChange={(e) => setShowInSearch(e.target.checked)}
              />
              <span className="sp__sw-track" aria-hidden />
            </label>
          </div>

          <button
            type="button"
            className="btn btn-primary sp__save-btn"
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? 'Saving…' : 'Save privacy settings'}
          </button>
        </section>
      )}

      {/* ── PREFERENCES ── */}
      {tab === 'preferences' && (
        <section className="sp__section settings-page__panel" id="sp-panel-preferences" role="tabpanel" aria-labelledby="sp-tab-preferences">
          <h2 id="sp-pref-title" className="sp__section-title">Region &amp; pricing</h2>
          <p className="sp__section-sub">
            Choose your location and preferred currency. This controls how prices are shown across the app.
          </p>

          <div className="sp__fields">
            <div className="sp__field">
              <label className="sp__label" htmlFor="sp-country">Country</label>
              <select
                id="sp-country"
                className="input"
                value={countryCode}
                onChange={(e) => {
                  const next = e.target.value
                  setCountryCode(next)
                  const d = defaultCurrencyForCountry(next)
                  if (d) setPreferredCurrency(d)
                }}
              >
                <option value="">Not set</option>
                {COUNTRY_ROWS.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="sp__field">
              <label className="sp__label" htmlFor="sp-currency">Preferred currency</label>
              <select
                id="sp-currency"
                className="input"
                value={preferredCurrency}
                onChange={(e) => setPreferredCurrency(e.target.value)}
              >
                <option value="">Not set</option>
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c.code} value={c.code}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary sp__save-btn"
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? 'Saving…' : 'Save preferences'}
          </button>
        </section>
      )}

      {/* ── ACCOUNT ── */}
      {tab === 'account' && (
        <section className="sp__section settings-page__panel" id="sp-panel-account" role="tabpanel" aria-labelledby="sp-tab-account">
          <h2 id="sp-acct-title" className="sp__section-title">Account</h2>

          {canAccessProvider ? (
            <div className="sp__identity-card">
              <p className="sp__section-sub">
                Your traveller account is separate from your business presence. Use the links below to jump between them.
              </p>
              <ProfileIdentityLinks
                username={profile.username}
                businesses={businesses.map((b) => ({ id: b.id, business_name: b.business_name }))}
                showDashboard
              />
            </div>
          ) : profile.user_type === 'normal' ? (
            <div className="sp__identity-card">
              <p className="sp__section-sub">
                Want to list stays, transport, food, or events? Upgrade to a service provider account — you can still
                travel and post from your personal profile.
              </p>
              <Link to="/provider/start" className="btn btn-primary">
                Become a service provider
              </Link>
            </div>
          ) : null}

          {/* Read-only info */}
          <div className="sp__info-card">
            <div className="sp__info-row">
              <span className="sp__info-label">Username</span>
              <span className="sp__info-val">@{profile.username}</span>
            </div>
            <div className="sp__info-row">
              <span className="sp__info-label">Email</span>
              <span className="sp__info-val">
                {profile.email}
                {!profile.email_verified && (
                  <Link to="/verify-email" className="sp__verify-link"> · Verify</Link>
                )}
              </span>
            </div>
            <div className="sp__info-row">
              <span className="sp__info-label">Account type</span>
              <span className="sp__info-val">
                {profile.user_type === 'service_provider' ? 'Service provider' : 'Explorer'}
              </span>
            </div>
            {!profile.email_verified && (
              <div className="sp__verify-banner">
                <span aria-hidden>✉️</span>
                <span>
                  Email not verified — you can browse and sign in, but bookings and reservations need verification.
                </span>
                <Link to="/verify-email" className="btn btn-ghost sp__verify-btn">Enter token</Link>
                <ResendVerificationButton
                  authenticated
                  className="btn btn-ghost sp__verify-btn"
                  messageClassName="sp__banner sp__banner--ok"
                  errorClassName="sp__banner sp__banner--err"
                />
              </div>
            )}
          </div>

          {/* Change password */}
          <div className="sp__action-card">
            <div>
              <p className="sp__action-title">Change password</p>
              <p className="sp__action-sub">Update your login password.</p>
            </div>
          </div>
          {pwdError ? <p className="sp__banner sp__banner--err" role="alert">{pwdError}</p> : null}
          {pwdSaved ? <p className="sp__banner sp__banner--ok" role="status">Password updated.</p> : null}
          <div className="sp__fields">
            <label className="sp__field">
              <span>Current password</span>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </label>
            <label className="sp__field">
              <span>New password</span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </label>
            <label className="sp__field">
              <span>Confirm new password</span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </label>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={pwdSaving || !currentPassword || !newPassword || !confirmPassword}
            onClick={() => void handlePasswordChange()}
          >
            {pwdSaving ? 'Updating…' : 'Update password'}
          </button>

          {/* Sign out */}
          <div className="sp__divider" />
          <button
            type="button"
            className="btn btn-ghost sp__signout-btn"
            onClick={() => { logout(); navigate('/') }}
          >
            Sign out
          </button>

          {/* Danger zone */}
          <div className="sp__danger-zone" id="delete-account">
            <p className="sp__danger-title">Danger zone</p>
            <div className="sp__action-card">
              <div>
                <p className="sp__action-title">Delete account</p>
                <p className="sp__action-sub">
                  Permanently anonymize your profile and hide your posts. Booking records are kept without personal
                  details. This cannot be undone.
                </p>
              </div>
            </div>
            {deleteError ? <p className="sp__banner sp__banner--err" role="alert">{deleteError}</p> : null}
            {!deleteOpen ? (
              <button
                type="button"
                className="btn btn-ghost"
                style={{ color: '#dc2626', marginTop: 12 }}
                onClick={() => {
                  setDeleteOpen(true)
                  setDeleteError(null)
                }}
              >
                Delete my account…
              </button>
            ) : (
              <div className="sp__fields" style={{ marginTop: 12 }}>
                <p className="sp__action-sub" style={{ marginBottom: 8 }}>
                  Type <strong>@{profile.username}</strong> and enter your password to confirm.
                </p>
                <label className="sp__field">
                  <span>Username</span>
                  <input
                    type="text"
                    value={deleteUsername}
                    onChange={(e) => setDeleteUsername(e.target.value)}
                    autoComplete="username"
                    placeholder={profile.username}
                  />
                </label>
                <label className="sp__field">
                  <span>Password</span>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ background: '#dc2626', borderColor: '#dc2626' }}
                    disabled={
                      deleteSaving
                      || deleteUsername.trim() !== profile.username
                      || !deletePassword
                    }
                    onClick={() => void handleDeleteAccount()}
                  >
                    {deleteSaving ? 'Deleting…' : 'Permanently delete account'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={deleteSaving}
                    onClick={() => {
                      setDeleteOpen(false)
                      setDeleteUsername('')
                      setDeletePassword('')
                      setDeleteError(null)
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
