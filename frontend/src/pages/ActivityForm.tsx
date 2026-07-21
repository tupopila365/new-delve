import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ImagePlus, Video, X } from 'lucide-react'
import { apiFetch, ApiError, formatApiErrorMessage } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { useBusinessAccess } from '../hooks/useBusinessAccess'
import { uploadHighlightMedia } from '../components/highlights/highlightMediaApi'
import {
  ProviderUiHeader,
  ProviderUiPage,
} from '../components/provider/ui'
import { ACTIVITY_CATEGORIES, type ActivityListing, type ActivityMediaItem } from '../utils/activityListing'
import '../components/activities/activities.css'

type FormState = {
  title: string
  tagline: string
  description: string
  category: string
  country_code: string
  region: string
  city: string
  meeting_point: string
  duration_hours: string
  price_from: string
  currency: string
  price_note: string
  max_group_size: string
  phone: string
  includes: string
  is_active: boolean
  media_gallery: ActivityMediaItem[]
  cover_image: string
  cover_kind: 'image' | 'video'
}

const emptyForm = (): FormState => ({
  title: '',
  tagline: '',
  description: '',
  category: 'drives',
  country_code: '',
  region: '',
  city: '',
  meeting_point: '',
  duration_hours: '2',
  price_from: '',
  currency: '',
  price_note: 'per person',
  max_group_size: '',
  phone: '',
  includes: '',
  is_active: false,
  media_gallery: [],
  cover_image: '',
  cover_kind: 'image',
})

function fromListing(row: ActivityListing): FormState {
  return {
    title: row.title || '',
    tagline: row.tagline || '',
    description: row.description || '',
    category: row.category || 'other',
    country_code: row.country_code || '',
    region: row.region || '',
    city: row.city || '',
    meeting_point: row.meeting_point || '',
    duration_hours: String(row.duration_hours ?? '2'),
    price_from: String(row.price_from ?? ''),
    currency: row.currency || '',
    price_note: row.price_note || '',
    max_group_size: row.max_group_size != null ? String(row.max_group_size) : '',
    phone: row.phone || '',
    includes: (row.includes || []).join('\n'),
    is_active: Boolean(row.is_active),
    media_gallery: activityGallerySafe(row),
    cover_image: row.cover_image || '',
    cover_kind: row.cover_kind === 'video' ? 'video' : 'image',
  }
}

function activityGallerySafe(row: ActivityListing): ActivityMediaItem[] {
  return (row.media_gallery || [])
    .filter((m) => m?.src)
    .map((m) => ({ kind: m.kind === 'video' ? 'video' : 'image', src: m.src, caption: m.caption }))
}

export function ActivityForm() {
  const { activityId } = useParams()
  const isEdit = Boolean(activityId)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { profile } = useAuth()
  const { canAccessProvider } = useBusinessAccess()
  const base = canAccessProvider ? '/provider/activities' : '/activities/manage'
  const [form, setForm] = useState<FormState>(emptyForm)
  const [err, setErr] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const { data: existing } = useQuery({
    queryKey: ['provider-activity', activityId],
    enabled: Boolean(profile && activityId),
    queryFn: () =>
      apiFetch<ActivityListing>(`/api/activities/provider-listings/${activityId}/`, { auth: true }),
  })

  useEffect(() => {
    if (existing) setForm(fromListing(existing))
  }, [existing])

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title.trim(),
        tagline: form.tagline.trim(),
        description: form.description.trim(),
        category: form.category,
        country_code: form.country_code.trim().toUpperCase().slice(0, 2),
        region: form.region.trim(),
        city: form.city.trim(),
        meeting_point: form.meeting_point.trim(),
        duration_hours: form.duration_hours || '2',
        price_from: form.price_from || '0',
        currency: form.currency.trim().toUpperCase().slice(0, 3),
        price_note: form.price_note.trim(),
        max_group_size: form.max_group_size ? Number(form.max_group_size) : null,
        phone: form.phone.trim(),
        includes: form.includes
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean),
        is_active: form.is_active,
        media_gallery: form.media_gallery,
        cover_image: form.cover_image || form.media_gallery[0]?.src || '',
        cover_kind: form.cover_kind || form.media_gallery[0]?.kind || 'image',
      }
      if (isEdit) {
        return apiFetch<ActivityListing>(`/api/activities/provider-listings/${activityId}/`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        })
      }
      return apiFetch<ActivityListing>('/api/activities/provider-listings/', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['provider-activities'] })
      void qc.invalidateQueries({ queryKey: ['activities'] })
      navigate(base)
    },
    onError: (e) => {
      setErr(e instanceof ApiError ? formatApiErrorMessage(e.body, e.message) : 'Could not save.')
    },
  })

  async function onAddMedia(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    setErr(null)
    try {
      const next = [...form.media_gallery]
      for (const file of Array.from(files)) {
        const kind = file.type.startsWith('video/') ? 'video' : 'image'
        const uploaded = await uploadHighlightMedia(file, kind)
        next.push({ kind, src: uploaded.url })
      }
      const cover = form.cover_image || next[0]?.src || ''
      const coverKind = form.cover_image ? form.cover_kind : next[0]?.kind || 'image'
      setForm({ ...form, media_gallery: next, cover_image: cover, cover_kind: coverKind })
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  function removeMedia(index: number) {
    const next = form.media_gallery.filter((_, i) => i !== index)
    const stillCover = next.some((m) => m.src === form.cover_image)
    setForm({
      ...form,
      media_gallery: next,
      cover_image: stillCover ? form.cover_image : next[0]?.src || '',
      cover_kind: stillCover ? form.cover_kind : next[0]?.kind || 'image',
    })
  }

  function setAsCover(item: ActivityMediaItem) {
    setForm({ ...form, cover_image: item.src, cover_kind: item.kind })
  }

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <ProviderUiPage>
      <ProviderUiHeader
        title={isEdit ? 'Edit activity' : 'New activity'}
        subtitle="Add photos and short videos so travellers can see the experience."
      />
      <form
        className="act-form"
        onSubmit={(e) => {
          e.preventDefault()
          setErr(null)
          saveMut.mutate()
        }}
      >
        <label>
          Title
          <input value={form.title} onChange={(e) => patch('title', e.target.value)} required />
        </label>
        <label>
          Tagline
          <input value={form.tagline} onChange={(e) => patch('tagline', e.target.value)} />
        </label>
        <label>
          Description
          <textarea value={form.description} onChange={(e) => patch('description', e.target.value)} rows={5} />
        </label>
        <div className="act-form__row">
          <label>
            Category
            <select value={form.category} onChange={(e) => patch('category', e.target.value)}>
              {ACTIVITY_CATEGORIES.filter((c) => c.value).map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Country code (ISO)
            <input
              value={form.country_code}
              onChange={(e) => patch('country_code', e.target.value)}
              placeholder="e.g. NA, ZA, KE"
              maxLength={2}
            />
          </label>
        </div>
        <div className="act-form__row">
          <label>
            Region
            <input value={form.region} onChange={(e) => patch('region', e.target.value)} />
          </label>
          <label>
            City
            <input value={form.city} onChange={(e) => patch('city', e.target.value)} />
          </label>
        </div>
        <label>
          Meeting point
          <input value={form.meeting_point} onChange={(e) => patch('meeting_point', e.target.value)} />
        </label>
        <div className="act-form__row">
          <label>
            Duration (hours)
            <input
              type="number"
              min="0.5"
              step="0.5"
              value={form.duration_hours}
              onChange={(e) => patch('duration_hours', e.target.value)}
            />
          </label>
          <label>
            Max group size
            <input
              type="number"
              min="1"
              value={form.max_group_size}
              onChange={(e) => patch('max_group_size', e.target.value)}
            />
          </label>
        </div>
        <div className="act-form__row">
          <label>
            Price from
            <input value={form.price_from} onChange={(e) => patch('price_from', e.target.value)} required />
          </label>
          <label>
            Currency
            <input
              value={form.currency}
              onChange={(e) => patch('currency', e.target.value)}
              placeholder="NAD, USD, EUR…"
              maxLength={3}
            />
          </label>
        </div>
        <label>
          Price note
          <input value={form.price_note} onChange={(e) => patch('price_note', e.target.value)} placeholder="per person" />
        </label>
        <label>
          Phone
          <input value={form.phone} onChange={(e) => patch('phone', e.target.value)} />
        </label>
        <label>
          Includes (one per line)
          <textarea value={form.includes} onChange={(e) => patch('includes', e.target.value)} rows={3} />
        </label>

        <div>
          <p style={{ margin: '0 0 8px', fontWeight: 750 }}>Photos & videos</p>
          <div className="act-form__media">
            {form.media_gallery.map((item, index) => (
              <div key={`${item.src}-${index}`} className="act-form__media-item">
                {item.kind === 'video' ? <video src={item.src} muted preload="metadata" /> : <img src={item.src} alt="" />}
                <button type="button" onClick={() => removeMedia(index)} aria-label="Remove media">
                  <X size={14} />
                </button>
                <button
                  type="button"
                  style={{ left: 4, right: 'auto', width: 'auto', padding: '0 6px', fontSize: 10 }}
                  onClick={() => setAsCover(item)}
                >
                  {form.cover_image === item.src ? 'Cover' : 'Set cover'}
                </button>
              </div>
            ))}
            <label className="act-form__media-item" style={{ display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                hidden
                onChange={(e) => {
                  void onAddMedia(e.target.files)
                  e.target.value = ''
                }}
              />
              {uploading ? 'Uploading…' : (
                <>
                  <ImagePlus size={18} />
                  <Video size={18} />
                </>
              )}
            </label>
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => patch('is_active', e.target.checked)}
          />
          Published (visible on Activities)
        </label>

        {err ? <p className="act-form__error">{err}</p> : null}

        <div className="act-form__actions">
          <button type="submit" className="act-detail__cta" disabled={saveMut.isPending || uploading || !form.title.trim()}>
            {saveMut.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create activity'}
          </button>
          <Link to={base} className="act-detail__cta act-detail__cta--ghost">
            Cancel
          </Link>
        </div>
      </form>
    </ProviderUiPage>
  )
}
