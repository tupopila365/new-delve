import { useEffect, useRef, useState } from 'react'
import type { BusinessMembershipDto, UpdateBusinessBody } from '@delve/contracts'
import { updateBusiness } from '../api/businessClient'
import { useMediaUpload } from '../media/useMediaUpload'
import MediaStudio from '../pages/MediaStudio'

interface BusinessProfilePanelProps {
  membership: BusinessMembershipDto
  onUpdated: (membership: BusinessMembershipDto) => void
}

function canEdit(role: BusinessMembershipDto['role']) {
  return role === 'OWNER' || role === 'MANAGER'
}

export default function BusinessProfilePanel({ membership, onUpdated }: BusinessProfilePanelProps) {
  const business = membership.business
  const editable = canEdit(membership.role)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [studioKind, setStudioKind] = useState<'logo' | 'cover' | null>(null)
  const [form, setForm] = useState({
    name: business.name,
    description: business.description ?? '',
    email: business.email ?? '',
    phone: business.phone ?? '',
    website: business.website ?? '',
    city: business.city ?? '',
    countryCode: business.countryCode ?? '',
    address: business.address ?? '',
    category: business.category ?? '',
  })

  const logoInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const logoUpload = useMediaUpload('business_profile')
  const coverUpload = useMediaUpload('business_profile')

  useEffect(() => {
    setForm({
      name: business.name,
      description: business.description ?? '',
      email: business.email ?? '',
      phone: business.phone ?? '',
      website: business.website ?? '',
      city: business.city ?? '',
      countryCode: business.countryCode ?? '',
      address: business.address ?? '',
      category: business.category ?? '',
    })
  }, [business])

  async function handleSave() {
    if (!editable || saving) return
    setSaving(true)
    setError(null)
    try {
      const body: UpdateBusinessBody = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        website: form.website.trim() || null,
        city: form.city.trim() || null,
        countryCode: form.countryCode.trim() ? form.countryCode.trim().toUpperCase() : null,
        address: form.address.trim() || null,
        category: form.category.trim() || null,
      }
      const updated = await updateBusiness(business.id, body)
      onUpdated({ ...membership, business: updated })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save business')
    } finally {
      setSaving(false)
    }
  }

  async function uploadImage(kind: 'logo' | 'cover', file: File) {
    if (!editable) return
    const uploader = kind === 'logo' ? logoUpload : coverUpload
    const saved = await uploader.start(file, undefined, { businessId: business.id })
    if (!saved?.delivery?.url) return
    try {
      const updated = await updateBusiness(business.id, {
        ...(kind === 'logo' ? { logoUrl: saved.delivery.url } : { coverUrl: saved.delivery.url }),
      })
      onUpdated({ ...membership, business: updated })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save image')
    }
  }

  async function applyStudioMedia(kind: 'logo' | 'cover', url: string) {
    try {
      const updated = await updateBusiness(business.id, {
        ...(kind === 'logo' ? { logoUrl: url } : { coverUrl: url }),
      })
      onUpdated({ ...membership, business: updated })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save image')
    }
  }

  return (
    <div className="p-4 sm:p-6 h-full overflow-y-auto space-y-4">
      <div>
        <h1 className="font-display text-xl font-extrabold m-0" style={{ color: 'var(--fg)' }}>
          Business profile
        </h1>
        <p className="text-sm m-0 mt-1" style={{ color: 'var(--fg-muted)' }}>
          {editable ? 'Update how travelers see your business.' : 'You can view this profile, but your role cannot edit it.'}
        </p>
      </div>

      <div
        className="relative overflow-hidden rounded-2xl min-h-[120px]"
        style={{ border: '1px solid var(--border)' }}
      >
        {business.coverUrl ? (
          <img src={business.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #2a2140, var(--primary))' }} />
        )}
        <div className="relative z-[1] flex items-end gap-3 px-4 py-4" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.45))', minHeight: 120 }}>
          <div
            className="h-14 w-14 rounded-xl overflow-hidden flex items-center justify-center"
            style={{ background: '#fff' }}
          >
            {business.logoUrl ? (
              <img src={business.logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm font-bold" style={{ color: 'var(--primary)' }}>
                {business.name.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div className="text-white pb-0.5">
            <p className="font-semibold m-0">{business.name}</p>
            <p className="text-xs m-0 opacity-90">{business.status.replace(/_/g, ' ')}</p>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm m-0" style={{ color: 'var(--auth-danger)' }} role="alert">
          {error}
        </p>
      )}

      <div
        className="rounded-2xl px-4 py-4 space-y-3"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        {(
          [
            ['name', 'Name'],
            ['description', 'Description'],
            ['email', 'Email'],
            ['phone', 'Phone'],
            ['website', 'Website'],
            ['city', 'City'],
            ['countryCode', 'Country code'],
            ['address', 'Address'],
            ['category', 'Category'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block">
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--fg-muted)' }}>
              {label}
            </span>
            {key === 'description' ? (
              <textarea
                value={form[key]}
                disabled={!editable}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                rows={3}
                className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
              />
            ) : (
              <input
                type="text"
                value={form[key]}
                disabled={!editable}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
              />
            )}
          </label>
        ))}

        {editable && (
          <>
            <div className="flex flex-wrap gap-2 pt-1">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={e => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (file) void uploadImage('logo', file)
                }}
              />
              <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={e => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (file) void uploadImage('cover', file)
                }}
              />
              <button
                type="button"
                disabled={logoUpload.busy}
                onClick={() => logoInputRef.current?.click()}
                className="rounded-xl px-3 py-2 text-sm font-semibold"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)', cursor: 'pointer' }}
              >
                {logoUpload.busy ? 'Uploading logo…' : 'Quick logo'}
              </button>
              <button
                type="button"
                disabled={coverUpload.busy}
                onClick={() => coverInputRef.current?.click()}
                className="rounded-xl px-3 py-2 text-sm font-semibold"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)', cursor: 'pointer' }}
              >
                {coverUpload.busy ? 'Uploading cover…' : 'Quick cover'}
              </button>
              <button
                type="button"
                onClick={() => setStudioKind('logo')}
                className="rounded-xl px-3 py-2 text-sm font-semibold text-white"
                style={{ background: 'var(--primary)', border: 'none', cursor: 'pointer' }}
              >
                Logo in Studio
              </button>
              <button
                type="button"
                onClick={() => setStudioKind('cover')}
                className="rounded-xl px-3 py-2 text-sm font-semibold text-white"
                style={{ background: 'var(--primary)', border: 'none', cursor: 'pointer' }}
              >
                Cover in Studio
              </button>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
              style={{ background: 'var(--primary)', border: 'none', cursor: saving ? 'wait' : 'pointer' }}
            >
              {saving ? 'Saving…' : 'Save profile'}
            </button>
          </>
        )}
      </div>

      <MediaStudio
        open={studioKind != null}
        onClose={() => setStudioKind(null)}
        initialContext="business-content"
        businessId={business.id}
        lockContext
        onMediaReady={assets => {
          const kind = studioKind
          const url = assets[0]?.delivery?.url
          setStudioKind(null)
          if (kind && url) void applyStudioMedia(kind, url)
        }}
      />
    </div>
  )
}
