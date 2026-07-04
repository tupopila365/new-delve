import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useOutletContext } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil } from 'lucide-react'
import { apiFetch, mediaUrl } from '../api/client'
import { friendlyApiMessage } from '../utils/friendlyError'
import { useAuth } from '../auth/AuthContext'
import type { ProviderOutletContext } from '../components/ProviderLayout'
import { useBusinessAccess } from '../hooks/useBusinessAccess'
import { ProviderUiChips, ProviderUiHeader, ProviderUiPage } from '../components/provider/ui'
import { BusinessVerificationCard } from '../components/provider'
import '../components/provider/settings/provider-settings.css'
import { ResendVerificationButton } from '../components/auth/ResendVerificationButton'
import { ProfileIdentityLinks } from '../components/profile/ProfileIdentityLinks'

type SettingsTab = 'business' | 'profile' | 'account'

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'business', label: 'Business' },
  { id: 'profile', label: 'Profile' },
  { id: 'account', label: 'Account' },
]

const SERVICE_LABELS: Record<string, string> = {
  accommodation: 'Stays',
  guide: 'Guides',
  transport: 'Transport',
  food_drink: 'Food & drink',
}

function verificationPill(status?: string) {
  if (status === 'verified') return <span className="prov-ui__pill prov-ui__pill--ok">Verified</span>
  if (status === 'pending') return <span className="prov-ui__pill prov-ui__pill--warn">Pending review</span>
  if (status === 'suspended') return <span className="prov-ui__pill prov-ui__pill--bad">Suspended</span>
  return <span className="prov-ui__pill prov-ui__pill--warn">Unverified</span>
}

function SaveBanner({ saved, error }: { saved: boolean; error: string | null }) {
  if (error) return <p className="prov-settings__banner prov-settings__banner--err" role="alert">{error}</p>
  if (saved) return <p className="prov-settings__banner prov-settings__banner--ok" role="status">Saved successfully.</p>
  return null
}

export function ProviderSettings() {
  const { profile, refreshProfile, logout } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { activeBusiness } = useOutletContext<ProviderOutletContext>()
  const { canManageSettings, businesses } = useBusinessAccess(activeBusiness?.id)

  const [tab, setTab] = useState<SettingsTab>('business')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [businessName, setBusinessName] = useState('')
  const [tagline, setTagline] = useState('')
  const [description, setDescription] = useState('')
  const [bizRegion, setBizRegion] = useState('')
  const [bizCity, setBizCity] = useState('')

  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [region, setRegion] = useState('')
  const [city, setCity] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const avatarRef = useRef<HTMLInputElement>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const logoRef = useRef<HTMLInputElement>(null)
  const coverRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!activeBusiness) return
    setBusinessName(activeBusiness.business_name ?? '')
    setTagline(activeBusiness.tagline ?? '')
    setDescription(activeBusiness.description ?? '')
    setBizRegion(activeBusiness.region ?? '')
    setBizCity(activeBusiness.city ?? '')
  }, [activeBusiness])

  useEffect(() => {
    if (!profile) return
    setDisplayName(profile.display_name ?? '')
    setBio(profile.bio ?? '')
    setRegion(profile.region ?? '')
    setCity(profile.city ?? '')
  }, [profile])

  const saveBusinessMut = useMutation({
    mutationFn: async () => {
      const hasFiles = Boolean(logoFile || coverFile)
      if (hasFiles) {
        const fd = new FormData()
        fd.append('business_name', businessName.trim())
        fd.append('tagline', tagline.trim())
        fd.append('description', description.trim())
        fd.append('region', bizRegion.trim())
        fd.append('city', bizCity.trim())
        if (logoFile) fd.append('logo', logoFile)
        if (coverFile) fd.append('cover_image', coverFile)
        return apiFetch(`/api/accounts/me/businesses/${activeBusiness!.id}/`, {
          method: 'PATCH',
          body: fd,
        })
      }
      return apiFetch(`/api/accounts/me/businesses/${activeBusiness!.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({
          business_name: businessName.trim(),
          tagline: tagline.trim(),
          description: description.trim(),
          region: bizRegion.trim(),
          city: bizCity.trim(),
        }),
      })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['my-businesses'] })
      if (activeBusiness) {
        void qc.invalidateQueries({ queryKey: ['business-profile', String(activeBusiness.id)] })
        void qc.invalidateQueries({ queryKey: ['user-businesses', profile?.username] })
      }
    },
  })

  function onAvatarChange(file: File | null) {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    setAvatarFile(file)
    setAvatarPreview(file ? URL.createObjectURL(file) : null)
  }

  function onLogoChange(file: File | null) {
    if (logoPreview) URL.revokeObjectURL(logoPreview)
    setLogoFile(file)
    setLogoPreview(file ? URL.createObjectURL(file) : null)
  }

  function onCoverChange(file: File | null) {
    if (coverPreview) URL.revokeObjectURL(coverPreview)
    setCoverFile(file)
    setCoverPreview(file ? URL.createObjectURL(file) : null)
  }

  function flashSaved() {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      if (tab === 'business') {
        await saveBusinessMut.mutateAsync()
        if (logoFile) {
          setLogoFile(null)
          if (logoPreview) URL.revokeObjectURL(logoPreview)
          setLogoPreview(null)
        }
        if (coverFile) {
          setCoverFile(null)
          if (coverPreview) URL.revokeObjectURL(coverPreview)
          setCoverPreview(null)
        }
      } else if (tab === 'profile') {
        const fd = new FormData()
        fd.append('display_name', displayName)
        fd.append('bio', bio)
        fd.append('region', region)
        fd.append('city', city)
        if (avatarFile) fd.append('avatar', avatarFile)
        await apiFetch('/api/accounts/me/update/', { method: 'PATCH', body: fd })
        await refreshProfile()
        if (profile) await qc.invalidateQueries({ queryKey: ['public-profile', profile.username] })
        if (avatarFile) {
          setAvatarFile(null)
          if (avatarPreview) URL.revokeObjectURL(avatarPreview)
          setAvatarPreview(null)
        }
      }
      flashSaved()
    } catch (e) {
      setError(friendlyApiMessage(e, 'Failed to save.'))
    } finally {
      setSaving(false)
    }
  }

  if (!profile) return <Navigate to="/login" replace />

  const avatarSrc = avatarPreview || (profile.avatar ? mediaUrl(profile.avatar) : null)
  const initial = (profile.display_name || profile.username || '?').charAt(0).toUpperCase()
  const serviceTypes = (activeBusiness?.business_types ?? []).filter((t) => t !== 'multi_provider')
  const logoSrc =
    logoPreview || (activeBusiness?.logo ? mediaUrl(activeBusiness.logo) : null)
  const coverSrc =
    coverPreview || (activeBusiness?.cover_image ? mediaUrl(activeBusiness.cover_image) : null)

  return (
    <ProviderUiPage>
      <ProviderUiHeader
        title="Settings"
        subtitle="Manage your business profile, personal details, and account."
        badge={activeBusiness ? verificationPill(activeBusiness.verification_status) : null}
        actions={
          activeBusiness ? (
            <Link to={`/business/${activeBusiness.id}`} className="prov-ui__btn prov-ui__btn--ghost">
              View public
            </Link>
          ) : null
        }
      />

      <ProviderUiChips
        chips={TABS}
        active={tab}
        onChange={(id) => {
          setTab(id as SettingsTab)
          setSaved(false)
          setError(null)
        }}
        ariaLabel="Settings sections"
      />

      {canManageSettings ? (
        <Link to="/provider/messages/settings" className="prov-settings__msg-automation">
          <strong>Messaging automation</strong>
          <span>Configure an automated welcome when guests message you, plus optional reply shortcuts.</span>
        </Link>
      ) : null}

      <SaveBanner saved={saved} error={error} />

      {tab === 'business' && activeBusiness ? (
        <section className="prov-settings__panel">
          <h2 className="prov-settings__panel-title">Business profile</h2>
          <p className="prov-settings__panel-sub">
            These details appear on your public business page and listings. Personal traveller settings live under{' '}
            <Link to="/settings" className="prov-ui__link">Settings</Link>.
          </p>

          {profile ? (
            <ProfileIdentityLinks
              username={profile.username}
              businesses={businesses.map((b) => ({ id: b.id, business_name: b.business_name }))}
              showDashboard
            />
          ) : null}

          {!canManageSettings ? (
            <p className="prov-settings__hint">Your role can view business settings but not edit them.</p>
          ) : null}

          <BusinessVerificationCard
            status={activeBusiness.verification_status}
            notes={activeBusiness.verification_notes}
            canManage={canManageSettings}
          />

          <div className="prov-settings__info-card">
            <div className="prov-settings__info-row">
              <span>Services</span>
              <div className="prov-settings__service-chips">
                {serviceTypes.length > 0
                  ? serviceTypes.map((t) => <span key={t}>{SERVICE_LABELS[t] ?? t.replace(/_/g, ' ')}</span>)
                  : <span>None</span>}
              </div>
            </div>
          </div>

          <div className="prov-settings__media-row">
            <div className="prov-settings__media-block">
              <p className="prov-settings__media-label">Logo</p>
              <div className="prov-settings__logo-preview">
                {logoSrc ? <img src={logoSrc} alt="" /> : <span>{businessName.charAt(0) || 'B'}</span>}
              </div>
              <button
                type="button"
                className="prov-ui__btn prov-ui__btn--ghost"
                disabled={!canManageSettings}
                onClick={() => logoRef.current?.click()}
              >
                {logoSrc ? 'Change logo' : 'Upload logo'}
              </button>
              <input
                ref={logoRef}
                type="file"
                accept="image/*"
                className="visually-hidden"
                aria-label="Business logo"
                disabled={!canManageSettings}
                onChange={(e) => onLogoChange(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="prov-settings__media-block">
              <p className="prov-settings__media-label">Cover image</p>
              <div className="prov-settings__cover-preview">
                {coverSrc ? <img src={coverSrc} alt="" /> : <span>No cover yet</span>}
              </div>
              <button
                type="button"
                className="prov-ui__btn prov-ui__btn--ghost"
                disabled={!canManageSettings}
                onClick={() => coverRef.current?.click()}
              >
                {coverSrc ? 'Change cover' : 'Upload cover'}
              </button>
              <input
                ref={coverRef}
                type="file"
                accept="image/*"
                className="visually-hidden"
                aria-label="Business cover image"
                disabled={!canManageSettings}
                onChange={(e) => onCoverChange(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          <div className="prov-settings__fields">
            <label className="prov-settings__field">
              Business name
              <input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Your business name"
                disabled={!canManageSettings}
                maxLength={120}
              />
            </label>

            <label className="prov-settings__field">
              Tagline
              <input
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Short description of what you offer"
                disabled={!canManageSettings}
                maxLength={160}
              />
            </label>

            <label className="prov-settings__field">
              Description
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell travellers about your business…"
                disabled={!canManageSettings}
                rows={4}
                maxLength={2000}
              />
              <p className="prov-settings__char-count">{description.length} / 2000</p>
            </label>

            <div className="prov-settings__row">
              <label className="prov-settings__field">
                City
                <input
                  value={bizCity}
                  onChange={(e) => setBizCity(e.target.value)}
                  placeholder="e.g. Windhoek"
                  disabled={!canManageSettings}
                />
              </label>
              <label className="prov-settings__field">
                Region
                <input
                  value={bizRegion}
                  onChange={(e) => setBizRegion(e.target.value)}
                  placeholder="e.g. Khomas"
                  disabled={!canManageSettings}
                />
              </label>
            </div>
          </div>

          {canManageSettings ? (
            <button
              type="button"
              className="prov-ui__btn prov-ui__btn--primary prov-settings__save"
              disabled={saving || !businessName.trim()}
              onClick={() => void handleSave()}
            >
              {saving ? 'Saving…' : 'Save business profile'}
            </button>
          ) : null}
        </section>
      ) : null}

      {tab === 'profile' && (
        <section className="prov-settings__panel">
          <h2 className="prov-settings__panel-title">Personal profile</h2>
          <p className="prov-settings__panel-sub">
            This is your public traveller identity at{' '}
            <Link to={`/u/${profile?.username ?? ''}`} className="prov-ui__link">
              /u/{profile?.username}
            </Link>
            . Business branding is edited on the Business tab.
          </p>
          <p className="prov-settings__panel-sub">
            Your name and photo shown to guests when you message or reply to reviews.
          </p>

          <div className="prov-settings__av-row">
            <div className="prov-settings__av-wrap">
              <div className="prov-settings__av-circle" aria-hidden>
                {avatarSrc ? <img src={avatarSrc} alt="" /> : <span>{initial}</span>}
              </div>
              <button
                type="button"
                className="prov-settings__av-edit"
                aria-label="Change profile photo"
                onClick={() => avatarRef.current?.click()}
              >
                <Pencil size={12} strokeWidth={2.5} aria-hidden />
              </button>
            </div>
            <div>
              <button type="button" className="prov-ui__btn prov-ui__btn--ghost" onClick={() => avatarRef.current?.click()}>
                Change photo
              </button>
              {avatarFile ? (
                <button
                  type="button"
                  className="prov-settings__av-remove"
                  onClick={() => {
                    onAvatarChange(null)
                    if (avatarRef.current) avatarRef.current.value = ''
                  }}
                >
                  Remove
                </button>
              ) : null}
              <p className="prov-settings__av-hint">JPG or PNG. Square, min 200×200 px.</p>
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

          <div className="prov-settings__fields">
            <label className="prov-settings__field">
              Display name
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                maxLength={80}
              />
            </label>

            <label className="prov-settings__field">
              Bio
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A short bio for your personal profile…"
                rows={4}
                maxLength={500}
              />
              <p className="prov-settings__char-count">{bio.length} / 500</p>
            </label>

            <div className="prov-settings__row">
              <label className="prov-settings__field">
                City
                <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Windhoek" />
              </label>
              <label className="prov-settings__field">
                Region
                <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="e.g. Khomas" />
              </label>
            </div>
          </div>

          <button
            type="button"
            className="prov-ui__btn prov-ui__btn--primary prov-settings__save"
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </section>
      )}

      {tab === 'account' && (
        <section className="prov-settings__panel">
          <h2 className="prov-settings__panel-title">Account</h2>

          <div className="prov-settings__info-card">
            <div className="prov-settings__info-row">
              <span>Username</span>
              <span>@{profile.username}</span>
            </div>
            <div className="prov-settings__info-row">
              <span>Email</span>
              <span>
                {profile.email}
                {!profile.email_verified ? (
                  <Link to="/verify-email" className="prov-ui__link"> · Verify</Link>
                ) : null}
              </span>
            </div>
            <div className="prov-settings__info-row">
              <span>Account type</span>
              <span>Service provider</span>
            </div>
            {!profile.email_verified ? (
              <div className="prov-settings__verify-banner">
                <span>
                  Email not verified — bookings and provider listings need verification. You can still browse and sign
                  in.
                </span>
                <Link to="/verify-email" className="prov-ui__link">Enter token</Link>
                <ResendVerificationButton
                  authenticated
                  className="prov-ui__link prov-settings__resend-btn"
                  messageClassName="prov-settings__resend-msg"
                  errorClassName="prov-settings__resend-msg prov-settings__resend-msg--err"
                />
              </div>
            ) : null}
          </div>

          <Link to="/settings?tab=account" className="prov-settings__action-card">
            <div>
              <strong>Change password</strong>
              <span>Update your login password.</span>
            </div>
            <span className="prov-ui__link">Open</span>
          </Link>

          <Link to="/settings" className="prov-settings__action-card">
            <div>
              <strong>Privacy & preferences</strong>
              <span>Messages, visibility, currency, and traveller settings.</span>
            </div>
            <span className="prov-ui__link">Open</span>
          </Link>

          <div className="prov-settings__divider" />

          <button
            type="button"
            className="prov-ui__btn prov-ui__btn--ghost prov-settings__save"
            onClick={() => {
              logout()
              navigate('/')
            }}
          >
            Sign out
          </button>

          <p className="prov-settings__danger-title">Danger zone</p>
          <Link to="/settings?tab=account#delete-account" className="prov-settings__action-card">
            <div>
              <strong>Delete account</strong>
              <span>Permanently anonymize your profile and hide your content.</span>
            </div>
            <span className="prov-ui__link" style={{ color: '#dc2626' }}>Open</span>
          </Link>
        </section>
      )}
    </ProviderUiPage>
  )
}
