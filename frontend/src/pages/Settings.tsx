import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch, ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'

export function Settings() {
  const { profile, refreshProfile } = useAuth()
  const qc = useQueryClient()
  const [region, setRegion] = useState(profile?.region ?? '')
  const [city, setCity] = useState(profile?.city ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [userType, setUserType] = useState(profile?.user_type ?? 'normal')
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  const mut = useMutation({
    mutationFn: () =>
      apiFetch('/api/accounts/me/update/', {
        method: 'PATCH',
        body: JSON.stringify({ region, city, bio, user_type: userType }),
      }),
    onSuccess: async () => {
      setOk(true)
      await refreshProfile()
      void qc.invalidateQueries()
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : 'Failed'),
  })

  if (!profile) {
    return <p>Sign in to edit settings.</p>
  }

  return (
    <div>
      <h1 className="display" style={{ fontSize: '1.65rem' }}>Settings</h1>
      <p style={{ color: 'var(--text-secondary)' }}>Region powers your home feed ranking.</p>
      {err && <div className="error-banner">{err}</div>}
      {ok && (
        <div className="success-banner">
          Saved.
        </div>
      )}
      <div className="field">
        <label className="label">Region</label>
        <input className="input" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Windhoek" />
      </div>
      <div className="field">
        <label className="label">City</label>
        <input className="input" value={city} onChange={(e) => setCity(e.target.value)} />
      </div>
      <div className="field">
        <label className="label">Bio</label>
        <textarea className="input" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
      </div>
      <div className="field">
        <span className="label">Account type</span>
        <div className="chip-row">
          <button type="button" className={`chip ${userType === 'normal' ? 'active' : ''}`} onClick={() => setUserType('normal')}>
            Normal
          </button>
          <button type="button" className={`chip ${userType === 'service_provider' ? 'active' : ''}`} onClick={() => setUserType('service_provider')}>
            Service provider
          </button>
        </div>
      </div>
      <button type="button" className="btn btn-primary btn-block" disabled={mut.isPending} onClick={() => { setErr(null); setOk(false); mut.mutate() }}>
        {mut.isPending ? 'Saving…' : 'Save'}
      </button>
    </div>
  )
}
