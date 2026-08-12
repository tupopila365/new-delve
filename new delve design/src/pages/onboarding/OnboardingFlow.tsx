import { useEffect, useState } from 'react'
import {
  SUPPORTED_CURRENCIES,
  SUPPORTED_LANGUAGES,
  TRAVEL_INTEREST_LABELS,
  TRAVEL_INTERESTS,
  type TravelInterest,
  type TravelerProfileDto,
} from '@delve/contracts'
import {
  AuthHeader,
  AuthShell,
  InlineAlert,
  PrimaryButton,
  SecondaryButton,
  TextButton,
} from '../../components/auth'
import { completeOnboarding, fetchOnboarding, getStoredUser, patchOnboarding } from '../../api/authClient'
import { formatUsername } from '../../lib/formatUsername'
import { MediaUploader } from '../../media'

export interface OnboardingFlowProps {
  onComplete: () => void
  onLeave: () => void
}

function suggestCurrency(): (typeof SUPPORTED_CURRENCIES)[number] {
  try {
    const locale = navigator.language || 'en-US'
    if (locale.includes('GB')) return 'GBP'
    if (locale.includes('ZA')) return 'ZAR'
    if (locale.includes('NA')) return 'NAD'
    if (locale.includes('EU') || locale.startsWith('fr') || locale.startsWith('de')) return 'EUR'
  } catch {
    /* ignore */
  }
  return 'USD'
}

function suggestLanguage(): (typeof SUPPORTED_LANGUAGES)[number] {
  try {
    const lang = (navigator.language || 'en').slice(0, 2).toLowerCase()
    if ((SUPPORTED_LANGUAGES as readonly string[]).includes(lang)) {
      return lang as (typeof SUPPORTED_LANGUAGES)[number]
    }
  } catch {
    /* ignore */
  }
  return 'en'
}

function initialsAvatar(name: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() || '')
    .join('') || 'D'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="#5F2FC9"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#fff" font-family="Arial" font-size="36" font-weight="700">${initials}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

export default function OnboardingFlow({ onComplete, onLeave }: OnboardingFlowProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<TravelerProfileDto | null>(null)

  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [homeCity, setHomeCity] = useState('')
  const [homeCountryCode, setHomeCountryCode] = useState('')
  const [interests, setInterests] = useState<TravelInterest[]>([])
  const [currency, setCurrency] = useState(suggestCurrency())
  const [language, setLanguage] = useState(suggestLanguage())

  const username = profile?.username || getStoredUser()?.username || ''

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const data = await fetchOnboarding()
        if (cancelled) return
        setProfile(data)
        setDisplayName(data.displayName || '')
        setBio(data.bio || '')
        setHomeCity(data.homeCity || '')
        setHomeCountryCode(data.homeCountryCode || '')
        setInterests(data.interests || [])
        setCurrency(data.preferredCurrency || suggestCurrency())
        setLanguage(data.preferredLanguage || suggestLanguage())
        if (data.onboardingStatus === 'COMPLETED') onComplete()
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load onboarding')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [onComplete])

  async function saveStep(partial: Parameters<typeof patchOnboarding>[0], nextStep?: number) {
    setSaving(true)
    setError(null)
    try {
      const data = await patchOnboarding(partial)
      setProfile(data)
      if (nextStep) setStep(nextStep)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save progress')
    } finally {
      setSaving(false)
    }
  }

  async function finish() {
    setSaving(true)
    setError(null)
    try {
      await completeOnboarding({
        displayName: displayName.trim(),
        preferredCurrency: currency,
        preferredLanguage: language,
        bio: bio.trim() || null,
        homeCity: homeCity.trim() || null,
        homeCountryCode: homeCountryCode.trim() ? homeCountryCode.trim().toUpperCase() : null,
        interests,
      })
      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not finish onboarding')
    } finally {
      setSaving(false)
    }
  }

  function toggleInterest(id: TravelInterest) {
    setInterests(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
  }

  const fieldClass =
    'w-full min-h-[44px] rounded-xl px-3 py-2.5 text-sm outline-none'
  const fieldStyle = {
    background: 'var(--surface-subtle)',
    border: '1px solid var(--border)',
    color: 'var(--fg)',
  } as const

  return (
    <AuthShell layout="stacked" image="dunes">
      <AuthHeader onClose={onLeave} />
      <div className="px-5 py-6 sm:px-8 flex flex-col gap-4 max-w-lg mx-auto w-full min-w-0">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--primary)' }}>
            Welcome to Delve
          </p>
          <h1 className="font-display text-2xl font-bold mb-1" style={{ color: 'var(--fg)' }}>
            Set up your traveler profile
          </h1>
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
            Step {step} of 3 · Required fields are marked. Optional steps can be skipped.
          </p>
          <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${(step / 3) * 100}%`, background: 'var(--primary)' }}
            />
          </div>
        </div>

        {loading && <InlineAlert tone="info" title="Loading">Preparing your onboarding…</InlineAlert>}
        {error && (
          <InlineAlert tone="error" title="Something went wrong">
            {error}
          </InlineAlert>
        )}

        {!loading && step === 1 && (
          <div className="flex flex-col gap-3">
            {profile?.storageConfigured ? (
              <MediaUploader
                purpose="avatar"
                label="Profile photo"
                chooseLabel="Choose photo"
                disabled={saving}
                profileLoading={loading}
                currentUrl={profile?.avatarUrl}
                placeholderName={displayName || username || 'D'}
                onReady={(_id, url) => {
                  setProfile(current => (current ? { ...current, avatarUrl: url } : current))
                }}
              />
            ) : (
              <div className="flex items-center gap-3">
                <img
                  src={profile?.avatarUrl || initialsAvatar(displayName || username || 'D')}
                  alt=""
                  width={64}
                  height={64}
                  className="h-16 w-16 rounded-full object-cover"
                />
                <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                  Profile picture is optional — uploads are unavailable until storage is configured.
                </p>
              </div>
            )}
            <label className="text-sm font-semibold" htmlFor="ob-display" style={{ color: 'var(--fg)' }}>
              Display name (required)
            </label>
            <input
              id="ob-display"
              className={fieldClass}
              style={fieldStyle}
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              autoComplete="name"
            />
            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
              Username: <strong style={{ color: 'var(--fg)' }}>{formatUsername(username) || 'Not set yet'}</strong>
              <br />
              Confirmed from registration. Change later in Account Settings (30-day cooldown).
            </p>
            <PrimaryButton
              loading={saving}
              disabled={displayName.trim().length < 2}
              onClick={() =>
                void saveStep({ displayName: displayName.trim(), step: 'identity' }, 2)
              }
            >
              Continue
            </PrimaryButton>
            <TextButton onClick={onLeave}>Leave and resume later</TextButton>
          </div>
        )}

        {!loading && step === 2 && (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
              Your travel world <span style={{ color: 'var(--fg-muted)', fontWeight: 500 }}>(optional)</span>
            </p>
            <label className="text-sm" htmlFor="ob-city">
              Home city
            </label>
            <input
              id="ob-city"
              className={fieldClass}
              style={fieldStyle}
              value={homeCity}
              onChange={e => setHomeCity(e.target.value)}
            />
            <label className="text-sm" htmlFor="ob-country">
              Country code (ISO, e.g. NA)
            </label>
            <input
              id="ob-country"
              className={fieldClass}
              style={fieldStyle}
              value={homeCountryCode}
              maxLength={2}
              onChange={e => setHomeCountryCode(e.target.value.toUpperCase())}
            />
            <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
              Location is not shown publicly by default.
            </p>
            <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
              Travel interests
            </p>
            <div className="flex flex-wrap gap-2">
              {TRAVEL_INTERESTS.map(id => {
                const selected = interests.includes(id)
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleInterest(id)}
                    className="min-h-[44px] px-3 rounded-xl text-sm font-medium"
                    style={{
                      background: selected ? 'rgba(140,82,255,0.15)' : 'var(--surface-subtle)',
                      color: selected ? 'var(--primary)' : 'var(--fg)',
                      border: `1px solid ${selected ? 'var(--primary)' : 'var(--border)'}`,
                      cursor: 'pointer',
                    }}
                  >
                    {TRAVEL_INTEREST_LABELS[id]}
                  </button>
                )
              })}
            </div>
            <label className="text-sm" htmlFor="ob-bio">
              Short bio ({bio.length}/280)
            </label>
            <textarea
              id="ob-bio"
              className="w-full rounded-xl px-3 py-2.5 text-sm min-h-[96px]"
              style={fieldStyle}
              maxLength={280}
              value={bio}
              onChange={e => setBio(e.target.value)}
            />
            <div className="flex flex-col gap-2">
              <PrimaryButton
                loading={saving}
                onClick={() =>
                  void saveStep(
                    {
                      homeCity: homeCity.trim() || null,
                      homeCountryCode: homeCountryCode.trim() || null,
                      interests,
                      bio: bio.trim() || null,
                      step: 'travel',
                    },
                    3,
                  )
                }
              >
                Continue
              </PrimaryButton>
              <SecondaryButton
                disabled={saving}
                onClick={() =>
                  void saveStep({ bio: null, homeCity: null, homeCountryCode: null, interests: [], step: 'travel' }, 3)
                }
              >
                Skip optional questions
              </SecondaryButton>
              <TextButton onClick={() => setStep(1)}>Back</TextButton>
            </div>
          </div>
        )}

        {!loading && step === 3 && (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
              Preferences (required — confirm defaults)
            </p>
            <label className="text-sm" htmlFor="ob-currency">
              Preferred currency
            </label>
            <select
              id="ob-currency"
              className={fieldClass}
              style={fieldStyle}
              value={currency}
              onChange={e => setCurrency(e.target.value as typeof currency)}
            >
              {SUPPORTED_CURRENCIES.map(code => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
            <label className="text-sm" htmlFor="ob-language">
              Preferred language
            </label>
            <select
              id="ob-language"
              className={fieldClass}
              style={fieldStyle}
              value={language}
              onChange={e => setLanguage(e.target.value as typeof language)}
            >
              {SUPPORTED_LANGUAGES.map(code => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
            <div className="rounded-xl p-3 text-sm" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)' }}>
              <p style={{ color: 'var(--fg)' }}>
                <strong>{displayName}</strong> · {formatUsername(username)}
              </p>
              <p style={{ color: 'var(--fg-muted)' }}>
                {currency} · {language}
                {homeCity ? ` · ${homeCity}` : ''}
                {homeCountryCode ? `, ${homeCountryCode}` : ''}
              </p>
            </div>
            <PrimaryButton loading={saving} onClick={() => void finish()}>
              Finish and explore Delve
            </PrimaryButton>
            <TextButton onClick={() => setStep(2)}>Back</TextButton>
            <TextButton onClick={onLeave}>Leave and resume later</TextButton>
          </div>
        )}
      </div>
    </AuthShell>
  )
}
