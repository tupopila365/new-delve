import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Building2, Pencil } from 'lucide-react'
import type { BusinessDto, BusinessMembershipDto, UpdateBusinessBody } from '@delve/contracts'
import {
  createBusiness,
  fetchMyBusinesses,
  updateBusiness,
} from '../api/businessClient'
import { useMediaUpload } from '../media/useMediaUpload'

interface ProviderBusinessPageProps {
  authReady?: boolean
  signedIn?: boolean
  onBack?: () => void
  /** When true, open edit form once a business is loaded. */
  editMode?: boolean
}

function statusLabel(status: BusinessDto['status']) {
  switch (status) {
    case 'DRAFT':
      return 'Draft'
    case 'PENDING_VERIFICATION':
      return 'Pending verification'
    case 'VERIFIED':
      return 'Verified'
    case 'REJECTED':
      return 'Rejected'
    case 'SUSPENDED':
      return 'Suspended'
    default:
      return status
  }
}

function canEditProfile(role: BusinessMembershipDto['role']) {
  return role === 'OWNER' || role === 'MANAGER'
}

export default function ProviderBusinessPage({
  authReady = true,
  signedIn = true,
  onBack,
  editMode = false,
}: ProviderBusinessPageProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [membership, setMembership] = useState<BusinessMembershipDto | null>(null)
  const [editing, setEditing] = useState(editMode)
  const [saving, setSaving] = useState(false)
  const [createName, setCreateName] = useState('')
  const [creating, setCreating] = useState(false)

  const [form, setForm] = useState({
    name: '',
    description: '',
    email: '',
    phone: '',
    website: '',
    city: '',
    countryCode: '',
    address: '',
    category: '',
  })

  const logoInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const logoUpload = useMediaUpload('business_profile')
  const coverUpload = useMediaUpload('business_profile')

  useEffect(() => {
    if (!authReady) {
      setLoading(true)
      return
    }
    if (!signedIn) {
      setLoading(false)
      setMembership(null)
      setError('Sign in required')
      return
    }

    let cancelled = false
    void (async () => {
      setLoading(true)
      setError(null)
      try {
        const rows = await fetchMyBusinesses()
        if (cancelled) return
        const first = rows[0] ?? null
        setMembership(first)
        if (first) {
          const b = first.business
          setForm({
            name: b.name,
            description: b.description ?? '',
            email: b.email ?? '',
            phone: b.phone ?? '',
            website: b.website ?? '',
            city: b.city ?? '',
            countryCode: b.countryCode ?? '',
            address: b.address ?? '',
            category: b.category ?? '',
          })
          if (editMode && canEditProfile(first.role)) setEditing(true)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load business')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [authReady, signedIn, editMode])

  async function handleCreate() {
    const name = createName.trim()
    if (name.length < 2 || creating) return
    setCreating(true)
    setError(null)
    try {
      const created = await createBusiness({ name })
      setMembership(created)
      setForm({
        name: created.business.name,
        description: '',
        email: '',
        phone: '',
        website: '',
        city: '',
        countryCode: '',
        address: '',
        category: '',
      })
      setEditing(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create business')
    } finally {
      setCreating(false)
    }
  }

  async function handleSave() {
    if (!membership || saving) return
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
      const updated = await updateBusiness(membership.business.id, body)
      setMembership({ ...membership, business: updated })
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save business')
    } finally {
      setSaving(false)
    }
  }

  async function uploadImage(kind: 'logo' | 'cover', file: File) {
    if (!membership) return
    const uploader = kind === 'logo' ? logoUpload : coverUpload
    const saved = await uploader.start(file, undefined, { businessId: membership.business.id })
    if (!saved?.delivery?.url) return
    const patch =
      kind === 'logo'
        ? { logoUrl: saved.delivery.url }
        : { coverUrl: saved.delivery.url }
    try {
      const updated = await updateBusiness(membership.business.id, patch)
      setMembership({ ...membership, business: updated })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save image')
    }
  }

  if (!authReady || loading) {
    return (
      <div className="pb-8 px-4 py-10">
        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
          Loading business…
        </p>
      </div>
    )
  }

  if (error === 'Sign in required') {
    return (
      <div className="pb-8 px-4 py-10">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold"
            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
        )}
        <p className="text-sm font-semibold m-0" style={{ color: 'var(--fg)' }}>
          Sign in required
        </p>
        <p className="text-sm m-0 mt-1" style={{ color: 'var(--fg-muted)' }}>
          Sign in to create or manage a business profile.
        </p>
      </div>
    )
  }

  if (!membership) {
    return (
      <div className="pb-8 px-4 sm:px-0">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mb-4 inline-flex items-center gap-2 text-sm font-semibold"
            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
        )}
        <div
          className="rounded-2xl px-5 py-8 text-center"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <Building2 size={28} style={{ color: 'var(--primary)', margin: '0 auto 12px' }} />
          <h1 className="font-display text-xl font-extrabold m-0 mb-2" style={{ color: 'var(--fg)' }}>
            Create your business
          </h1>
          <p className="text-sm m-0 mb-5" style={{ color: 'var(--fg-muted)' }}>
            Set up a provider profile on Delve. Listings and deals come next.
          </p>
          <input
            type="text"
            value={createName}
            onChange={e => setCreateName(e.target.value)}
            placeholder="Business name"
            className="w-full max-w-sm mx-auto block rounded-xl px-3 py-2.5 text-sm mb-3"
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              color: 'var(--fg)',
            }}
          />
          {error && (
            <p className="text-sm mb-3" style={{ color: 'var(--auth-danger)' }} role="alert">
              {error}
            </p>
          )}
          <button
            type="button"
            disabled={creating || createName.trim().length < 2}
            onClick={() => void handleCreate()}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
            style={{
              background: 'var(--primary)',
              border: 'none',
              cursor: creating ? 'wait' : 'pointer',
              opacity: creating || createName.trim().length < 2 ? 0.6 : 1,
            }}
          >
            {creating ? 'Creating…' : 'Create business'}
          </button>
        </div>
      </div>
    )
  }

  const business = membership.business
  const editable = canEditProfile(membership.role)

  return (
    <div className="pb-8">
      <div className="px-4 sm:px-0 mb-4 flex items-center justify-between gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-semibold"
            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
          >
            <ArrowLeft size={16} />
            Back
          </button>
        ) : (
          <span />
        )}
        {editable && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--fg)',
              cursor: 'pointer',
            }}
          >
            <Pencil size={14} />
            Edit business profile
          </button>
        )}
      </div>

      <div
        className="relative overflow-hidden sm:rounded-2xl mb-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', minHeight: 140 }}
      >
        {business.coverUrl ? (
          <img src={business.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #2a2140, #8C52FF)' }} />
        )}
        <div className="relative z-[1] px-4 py-8 flex items-end gap-4" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.45))' }}>
          <div
            className="h-16 w-16 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.92)', border: '2px solid rgba(255,255,255,0.7)' }}
          >
            {business.logoUrl ? (
              <img src={business.logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Building2 size={24} style={{ color: 'var(--primary)' }} />
            )}
          </div>
          <div className="min-w-0 pb-1">
            <h1 className="font-display text-2xl font-extrabold m-0 text-white truncate">{business.name}</h1>
            <p className="text-sm m-0 mt-1 text-white/90">
              {statusLabel(business.status)} · {membership.role.replace('_', ' ')}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <p className="px-4 sm:px-0 text-sm mb-3" style={{ color: 'var(--auth-danger)' }} role="alert">
          {error}
        </p>
      )}

      {editing && editable ? (
        <div
          className="mx-4 sm:mx-0 rounded-2xl px-4 py-4 space-y-3"
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
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                />
              ) : (
                <input
                  type="text"
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)' }}
                />
              )}
            </label>
          ))}

          <div className="flex flex-wrap gap-2 pt-2">
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
              {logoUpload.busy ? 'Uploading logo…' : 'Upload logo'}
            </button>
            <button
              type="button"
              disabled={coverUpload.busy}
              onClick={() => coverInputRef.current?.click()}
              className="rounded-xl px-3 py-2 text-sm font-semibold"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--fg)', cursor: 'pointer' }}
            >
              {coverUpload.busy ? 'Uploading cover…' : 'Upload cover'}
            </button>
          </div>
          {(logoUpload.error || coverUpload.error) && (
            <p className="text-sm m-0" style={{ color: 'var(--auth-danger)' }}>
              {logoUpload.error || coverUpload.error}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
              style={{ background: 'var(--primary)', border: 'none', cursor: saving ? 'wait' : 'pointer' }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold"
              style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--fg)', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div
          className="mx-4 sm:mx-0 rounded-2xl px-4 py-4 space-y-2"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p className="text-sm m-0" style={{ color: 'var(--fg)' }}>
            {business.description || 'No description yet.'}
          </p>
          <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
            {[business.city, business.countryCode].filter(Boolean).join(', ') || 'Location not set'}
          </p>
          {(business.email || business.phone || business.website) && (
            <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
              {[business.email, business.phone, business.website].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
