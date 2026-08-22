import { useEffect, useState } from 'react'
import {
  SUPPORTED_CURRENCIES,
  SUPPORTED_LANGUAGES,
  TRAVEL_INTEREST_LABELS,
  TRAVEL_INTERESTS,
  type NotificationPreferences,
  type SessionSummary,
  type TravelInterest,
  type TravelerProfileDto,
} from '@delve/contracts'
import UsernameSettingsPanel from './UsernameSettingsPanel'
import SessionCard from '../components/auth/SessionCard'
import ConfirmationDialog from '../components/auth/ConfirmationDialog'
import {
  AuthApiError,
  changePassword,
  deactivateAccount,
  fetchOnboarding,
  fetchPreferences,
  fetchSessions,
  logoutAllDevices,
  logoutOtherDevices,
  requestEmailChange,
  revokeSession,
  updatePreferences,
  updateProfile,
} from '../api/authClient'
import { formatUsername } from '../lib/formatUsername'
import { MediaPreview, MediaUploader } from '../media'

type Section = 'profile' | 'identity' | 'security' | 'notifications' | 'sessions' | 'status'

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'identity', label: 'Account and identity' },
  { id: 'security', label: 'Security' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'sessions', label: 'Sessions and devices' },
  { id: 'status', label: 'Account status' },
]

export interface AccountSettingsPageProps {
  onSignOut: () => void
  onOpenOnboarding?: () => void
}

export default function AccountSettingsPage({ onSignOut, onOpenOnboarding }: AccountSettingsPageProps) {
  const [section, setSection] = useState<Section>('profile')
  const [profile, setProfile] = useState<TravelerProfileDto | null>(null)
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null)
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [confirmLogoutAll, setConfirmLogoutAll] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [profileLoading, setProfileLoading] = useState(true)

  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [homeCity, setHomeCity] = useState('')
  const [homeCountryCode, setHomeCountryCode] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [language, setLanguage] = useState('en')
  const [interests, setInterests] = useState<TravelInterest[]>([])

  const [newEmail, setNewEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [deactivatePassword, setDeactivatePassword] = useState('')
  const [deactivateConfirm, setDeactivateConfirm] = useState(false)

  useEffect(() => {
    void refreshAll()
  }, [])

  async function refreshAll() {
    setProfileLoading(true)
    setError(null)
    try {
      const p = await fetchOnboarding()
      setProfile(p)
      setDisplayName(p.displayName)
      setBio(p.bio || '')
      setHomeCity(p.homeCity || '')
      setHomeCountryCode(p.homeCountryCode || '')
      setCurrency(p.preferredCurrency)
      setLanguage(p.preferredLanguage)
      setInterests(p.interests)
      const [pr, s] = await Promise.all([fetchPreferences(), fetchSessions()])
      setPrefs(pr)
      setSessions(s)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load account settings')
    } finally {
      setProfileLoading(false)
    }
  }

  const profileDirty =
    profile &&
    (displayName !== profile.displayName ||
      bio !== (profile.bio || '') ||
      homeCity !== (profile.homeCity || '') ||
      homeCountryCode !== (profile.homeCountryCode || '') ||
      currency !== profile.preferredCurrency ||
      language !== profile.preferredLanguage ||
      JSON.stringify(interests) !== JSON.stringify(profile.interests))

  const fieldClass = 'w-full min-h-[44px] rounded-xl px-3 py-2.5 text-sm'
  const fieldStyle = {
    background: 'var(--surface-subtle)',
    border: '1px solid var(--border)',
    color: 'var(--fg)',
  } as const

  return (
    <div className="pb-6 min-w-0">
      <div className="px-1 mb-4">
        <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--fg)' }}>
          Account settings
        </h1>
        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
          {formatUsername(profile?.username)} · Each section saves on its own
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {SECTIONS.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setSection(item.id)
              setMessage(null)
              setError(null)
            }}
            className="min-h-[44px] px-3 rounded-xl text-sm font-semibold whitespace-nowrap"
            style={{
              background: section === item.id ? 'var(--primary)' : 'var(--surface)',
              color: section === item.id ? '#fff' : 'var(--fg)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {message && (
        <p className="mb-3 text-sm" style={{ color: 'var(--primary)' }}>
          {message}
        </p>
      )}
      {error && (
        <p className="mb-3 text-sm" style={{ color: 'var(--danger, #c2410c)' }}>
          {error}
        </p>
      )}

      {section === 'profile' && (
        <section className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {profile?.onboardingStatus !== 'COMPLETED' && onOpenOnboarding && (
            <button
              type="button"
              onClick={onOpenOnboarding}
              className="min-h-[44px] rounded-xl text-sm font-semibold"
              style={{ background: 'rgba(140,82,255,0.12)', color: 'var(--primary)', border: 'none', cursor: 'pointer' }}
            >
              Resume profile setup
            </button>
          )}
          {profile?.storageConfigured ? (
            <MediaUploader
              purpose="avatar"
              label="Profile photo"
              chooseLabel="Choose photo"
              disabled={busy}
              profileLoading={profileLoading}
              currentUrl={profile?.avatarUrl}
              placeholderName={displayName || profile?.username || 'D'}
              onReady={(_id, url) => {
                setProfile(current => (current ? { ...current, avatarUrl: url } : current))
                setMessage('Profile photo updated')
              }}
            />
          ) : (
            <div className="flex items-center gap-3">
              <MediaPreview
                currentUrl={profile?.avatarUrl}
                placeholderName={displayName || profile?.username || 'D'}
                loading={profileLoading}
                alt={profile?.avatarUrl ? 'Profile photo' : 'Profile photo placeholder'}
              />
              <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                Photo upload is unavailable right now.
              </p>
            </div>
          )}
          <label className="text-sm font-semibold">Display name</label>
          <input className={fieldClass} style={fieldStyle} value={displayName} onChange={e => setDisplayName(e.target.value)} />
          <label className="text-sm font-semibold">Bio ({bio.length}/280)</label>
          <textarea className="w-full rounded-xl px-3 py-2.5 text-sm min-h-[88px]" style={fieldStyle} maxLength={280} value={bio} onChange={e => setBio(e.target.value)} />
          <label className="text-sm font-semibold">Home city</label>
          <input className={fieldClass} style={fieldStyle} value={homeCity} onChange={e => setHomeCity(e.target.value)} />
          <label className="text-sm font-semibold">Country code</label>
          <input className={fieldClass} style={fieldStyle} value={homeCountryCode} maxLength={2} onChange={e => setHomeCountryCode(e.target.value.toUpperCase())} />
          <label className="text-sm font-semibold">Currency</label>
          <select className={fieldClass} style={fieldStyle} value={currency} onChange={e => setCurrency(e.target.value)}>
            {SUPPORTED_CURRENCIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <label className="text-sm font-semibold">Language</label>
          <select className={fieldClass} style={fieldStyle} value={language} onChange={e => setLanguage(e.target.value)}>
            {SUPPORTED_LANGUAGES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <p className="text-sm font-semibold">Interests</p>
          <div className="flex flex-wrap gap-2">
            {TRAVEL_INTERESTS.map(id => {
              const selected = interests.includes(id)
              return (
                <button
                  key={id}
                  type="button"
                  className="min-h-[44px] px-3 rounded-xl text-sm"
                  style={{
                    background: selected ? 'rgba(140,82,255,0.15)' : 'var(--surface-subtle)',
                    color: selected ? 'var(--primary)' : 'var(--fg)',
                    border: `1px solid ${selected ? 'var(--primary)' : 'var(--border)'}`,
                    cursor: 'pointer',
                  }}
                  onClick={() =>
                    setInterests(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
                  }
                >
                  {TRAVEL_INTEREST_LABELS[id]}
                </button>
              )
            })}
          </div>
          <button
            type="button"
            disabled={!profileDirty || busy}
            className="min-h-[44px] rounded-xl text-sm font-semibold"
            style={{
              background: profileDirty ? 'var(--primary)' : 'var(--surface-subtle)',
              color: profileDirty ? '#fff' : 'var(--fg-muted)',
              border: 'none',
              cursor: profileDirty ? 'pointer' : 'not-allowed',
            }}
            onClick={() => {
              void (async () => {
                setBusy(true)
                setError(null)
                try {
                  const updated = await updateProfile({
                    displayName: displayName.trim(),
                    bio: bio.trim() || null,
                    homeCity: homeCity.trim() || null,
                    homeCountryCode: homeCountryCode.trim() || null,
                    preferredCurrency: currency as TravelerProfileDto['preferredCurrency'],
                    preferredLanguage: language as TravelerProfileDto['preferredLanguage'],
                    interests,
                  })
                  setProfile(updated)
                  setMessage('Profile saved')
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Could not save profile')
                } finally {
                  setBusy(false)
                }
              })()
            }}
          >
            {busy ? 'Saving…' : 'Save profile'}
          </button>
        </section>
      )}

      {section === 'identity' && (
        <div className="flex flex-col gap-3">
          <UsernameSettingsPanel />
          <section className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <h2 className="font-display text-lg font-bold">Change email</h2>
            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
              Current: {profile?.email}. Your existing email stays active until the new address is verified.
            </p>
            <input className={fieldClass} style={fieldStyle} placeholder="New email" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
            <input className={fieldClass} style={fieldStyle} type="password" placeholder="Current password" value={emailPassword} onChange={e => setEmailPassword(e.target.value)} />
            <button
              type="button"
              disabled={busy}
              className="min-h-[44px] rounded-xl text-sm font-semibold"
              style={{ background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer' }}
              onClick={() => {
                void (async () => {
                  setBusy(true)
                  setError(null)
                  try {
                    const result = await requestEmailChange({ newEmail, currentPassword: emailPassword })
                    setMessage(result.message)
                    setEmailPassword('')
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Could not start email change')
                  } finally {
                    setBusy(false)
                  }
                })()
              }}
            >
              Send confirmation link
            </button>
          </section>
        </div>
      )}

      {section === 'security' && (
        <section className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h2 className="font-display text-lg font-bold">Change password</h2>
          <input className={fieldClass} style={fieldStyle} type="password" placeholder="Current password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
          <input className={fieldClass} style={fieldStyle} type="password" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          <input className={fieldClass} style={fieldStyle} type="password" placeholder="Confirm new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
          <button
            type="button"
            disabled={busy}
            className="min-h-[44px] rounded-xl text-sm font-semibold"
            style={{ background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer' }}
            onClick={() => {
              void (async () => {
                setBusy(true)
                setError(null)
                try {
                  const result = await changePassword({
                    currentPassword,
                    newPassword,
                    newPasswordConfirmation: confirmPassword,
                  })
                  setMessage(result.message)
                  setCurrentPassword('')
                  setNewPassword('')
                  setConfirmPassword('')
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Could not change password')
                } finally {
                  setBusy(false)
                }
              })()
            }}
          >
            Update password
          </button>
        </section>
      )}

      {section === 'notifications' && prefs && (
        <section className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          {(
            [
              ['securityAccount', 'Security and account emails', true],
              ['bookingTrip', 'Booking and trip updates', false],
              ['providerMessages', 'Messages from providers', false],
              ['communityActivity', 'Community activity', false],
              ['productUpdates', 'Delve product updates', false],
              ['marketing', 'Marketing emails', false],
              ['inApp', 'In-app notifications', false],
            ] as const
          ).map(([key, label, locked]) => (
            <label key={key} className="flex items-center justify-between gap-3 min-h-[44px]">
              <span className="text-sm" style={{ color: 'var(--fg)' }}>
                {label}
                {locked ? ' (required)' : ''}
              </span>
              <input
                type="checkbox"
                checked={Boolean(prefs[key])}
                disabled={locked || busy}
                onChange={e => {
                  void (async () => {
                    setBusy(true)
                    setError(null)
                    try {
                      const updated = await updatePreferences({ [key]: e.target.checked })
                      setPrefs(updated)
                      setMessage('Preferences saved')
                    } catch (err) {
                      setError(err instanceof AuthApiError ? err.message : 'Could not save preferences')
                    } finally {
                      setBusy(false)
                    }
                  })()
                }}
              />
            </label>
          ))}
        </section>
      )}

      {section === 'sessions' && (
        <section className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h2 className="font-display text-lg font-bold m-0">Sessions and devices</h2>
          <p className="text-sm m-0" style={{ color: 'var(--fg-muted)' }}>
            Review where you’re signed in. Revoking a session cannot be undone — that device will need to sign in again.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              className="min-h-[44px] px-3 rounded-xl text-sm font-semibold"
              style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', cursor: busy ? 'not-allowed' : 'pointer' }}
              onClick={() => {
                void (async () => {
                  setBusy(true)
                  setError(null)
                  try {
                    const out = await logoutOtherDevices()
                    setMessage(`Signed out ${out.revokedCount} other device${out.revokedCount === 1 ? '' : 's'}`)
                    setSessions(await fetchSessions())
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Could not sign out other devices')
                  } finally {
                    setBusy(false)
                  }
                })()
              }}
            >
              Sign out other devices
            </button>
            <button
              type="button"
              disabled={busy}
              className="min-h-[44px] px-3 rounded-xl text-sm font-semibold"
              style={{ background: 'rgba(224,92,26,0.12)', color: 'var(--danger, #c2410c)', border: 'none', cursor: busy ? 'not-allowed' : 'pointer' }}
              onClick={() => setConfirmLogoutAll(true)}
            >
              Sign out everywhere
            </button>
          </div>
          <div className="flex flex-col gap-3" role="list">
            {sessions.map(session => (
              <div key={session.id} role="listitem">
                <SessionCard
                  session={session}
                  busy={busy || revokingId === session.id}
                  onRevoke={() => {
                    void (async () => {
                      setRevokingId(session.id)
                      setError(null)
                      try {
                        const result = await revokeSession(session.id)
                        if (result.revokedCurrent) {
                          onSignOut()
                          return
                        }
                        setSessions(await fetchSessions())
                        setMessage(result.message)
                      } catch (err) {
                        setError(err instanceof Error ? err.message : 'Could not revoke session')
                      } finally {
                        setRevokingId(null)
                      }
                    })()
                  }}
                />
              </div>
            ))}
            {sessions.length === 0 && (
              <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
                No active sessions found.
              </p>
            )}
          </div>
          <ConfirmationDialog
            open={confirmLogoutAll}
            title="Sign out everywhere?"
            description="This signs you out on every device, including this one. Revocation cannot be undone — you’ll need your password to sign in again."
            confirmLabel="Sign out everywhere"
            cancelLabel="Keep sessions"
            busy={busy}
            onCancel={() => setConfirmLogoutAll(false)}
            onConfirm={() => {
              void (async () => {
                setBusy(true)
                setError(null)
                try {
                  await logoutAllDevices()
                  setConfirmLogoutAll(false)
                  onSignOut()
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Could not sign out everywhere')
                  setBusy(false)
                }
              })()
            }}
          />
        </section>
      )}

      {section === 'status' && (
        <section className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <h2 className="font-display text-lg font-bold">Deactivate account</h2>
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
            Deactivation stops access immediately, signs you out everywhere, and keeps records needed for security and legal obligations. This is not a permanent delete.
          </p>
          <input className={fieldClass} style={fieldStyle} type="password" placeholder="Current password" value={deactivatePassword} onChange={e => setDeactivatePassword(e.target.value)} />
          <label className="flex items-center gap-2 text-sm min-h-[44px]">
            <input type="checkbox" checked={deactivateConfirm} onChange={e => setDeactivateConfirm(e.target.checked)} />
            I understand access will stop
          </label>
          <button
            type="button"
            disabled={busy || !deactivateConfirm}
            className="min-h-[44px] rounded-xl text-sm font-semibold"
            style={{ background: 'rgba(224,92,26,0.9)', color: '#fff', border: 'none', cursor: deactivateConfirm ? 'pointer' : 'not-allowed' }}
            onClick={() => {
              void (async () => {
                setBusy(true)
                setError(null)
                try {
                  await deactivateAccount({ currentPassword: deactivatePassword, confirm: true })
                  onSignOut()
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Could not deactivate account')
                } finally {
                  setBusy(false)
                }
              })()
            }}
          >
            Deactivate account
          </button>
        </section>
      )}
    </div>
  )
}
