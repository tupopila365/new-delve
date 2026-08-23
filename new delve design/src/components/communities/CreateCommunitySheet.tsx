import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import type { CommunityCategory, CreateCommunityBody } from '@delve/contracts'
import { createCommunity } from '../../api/communityClient'
import { AuthApiError } from '../../api/authClient'
import { COMMUNITY_CATEGORIES } from './communityCategories'

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export default function CreateCommunitySheet({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (communityId: string) => void
}) {
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<CommunityCategory>('OTHER')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [isGlobal, setIsGlobal] = useState(true)
  const [privacy, setPrivacy] = useState<'PUBLIC' | 'PRIVATE'>('PUBLIC')
  const [requireJoinApproval, setRequireJoinApproval] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const autoSlug = useMemo(() => slugify(name), [name])
  const effectiveSlug = slugTouched ? slug : autoSlug

  if (!open) return null

  async function submit() {
    if (!name.trim() || !effectiveSlug) return
    setBusy(true)
    setError(null)
    try {
      const body: CreateCommunityBody = {
        name: name.trim(),
        slug: effectiveSlug,
        description: description.trim() || undefined,
        category,
        isGlobal,
        city: isGlobal ? null : city.trim() || null,
        country: isGlobal ? null : country.trim() || null,
        destination: isGlobal ? 'Worldwide' : city.trim() || country.trim() || 'Unknown',
        privacy,
        requireJoinApproval,
      }
      const created = await createCommunity(body)
      onCreated(created.id)
      onClose()
      setName('')
      setSlug('')
      setDescription('')
    } catch (err) {
      setError(err instanceof AuthApiError || err instanceof Error ? err.message : 'Could not create community')
    } finally {
      setBusy(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 12,
    border: '1px solid var(--border)',
    background: 'var(--surface-subtle)',
    color: 'var(--fg)',
  } as const

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center">
      <button type="button" aria-label="Close" className="absolute inset-0 border-0" style={{ background: 'rgba(0,0,0,0.55)' }} onClick={onClose} />
      <div
        className="relative w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-4 max-h-[92vh] overflow-y-auto"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold m-0" style={{ color: 'var(--fg)', fontFamily: 'Syne, sans-serif' }}>
            Create Community
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: 'var(--fg-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {error && <p className="text-sm mb-3" style={{ color: '#E11D48' }}>{error}</p>}

        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--fg-muted)' }}>Name</label>
        <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} className="mb-3" placeholder="Namibia Road Trippers" />

        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--fg-muted)' }}>URL slug</label>
        <input
          value={effectiveSlug}
          onChange={e => { setSlugTouched(true); setSlug(e.target.value) }}
          style={inputStyle}
          className="mb-3"
          placeholder="namibia-road-trippers"
        />

        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--fg-muted)' }}>Short description</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} style={inputStyle} className="mb-3 resize-none" />

        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--fg-muted)' }}>Category</label>
        <select value={category} onChange={e => setCategory(e.target.value as CommunityCategory)} style={inputStyle} className="mb-3">
          {COMMUNITY_CATEGORIES.map(c => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>

        <label className="flex items-center gap-2 mb-3 text-sm" style={{ color: 'var(--fg)' }}>
          <input type="checkbox" checked={isGlobal} onChange={e => setIsGlobal(e.target.checked)} />
          Global community (not tied to one city)
        </label>

        {!isGlobal && (
          <div className="grid grid-cols-2 gap-2 mb-3">
            <input value={city} onChange={e => setCity(e.target.value)} placeholder="City" style={inputStyle} />
            <input value={country} onChange={e => setCountry(e.target.value)} placeholder="Country" style={inputStyle} />
          </div>
        )}

        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--fg-muted)' }}>Visibility</label>
        <select value={privacy} onChange={e => setPrivacy(e.target.value as 'PUBLIC' | 'PRIVATE')} style={inputStyle} className="mb-3">
          <option value="PUBLIC">Public</option>
          <option value="PRIVATE">Private</option>
        </select>

        <label className="flex items-center gap-2 mb-4 text-sm" style={{ color: 'var(--fg)' }}>
          <input type="checkbox" checked={requireJoinApproval} onChange={e => setRequireJoinApproval(e.target.checked)} />
          Require approval to join
        </label>

        <button
          type="button"
          disabled={busy || !name.trim() || !effectiveSlug}
          onClick={() => void submit()}
          className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-60"
          style={{ background: 'var(--primary)', color: '#fff', border: 'none' }}
        >
          {busy ? 'Creating…' : 'Create Community'}
        </button>
      </div>
    </div>
  )
}
