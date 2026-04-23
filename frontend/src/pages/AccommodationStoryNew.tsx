import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { apiFetch, ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'

type MediaKind = 'image' | 'video'

type ListingRow = {
  id: number
  title: string
  owner_username: string
}

export function AccommodationStoryNew() {
  const nav = useNavigate()
  const { profile } = useAuth()
  const [body, setBody] = useState('')
  const [region, setRegion] = useState(profile?.region ?? '')
  const [listingId, setListingId] = useState<string>('')
  const [mediaKind, setMediaKind] = useState<MediaKind>('image')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const { data: listings } = useQuery({
    queryKey: ['acc-listings-for-stories', profile?.username],
    enabled: Boolean(profile?.username) && profile?.user_type === 'service_provider',
    queryFn: () => apiFetch<ListingRow[]>(`/api/accommodation/listings/`, { auth: true }),
  })

  const mine = (listings ?? []).filter((l) => l.owner_username === profile?.username)

  function onFileChange(f: File | null) {
    setFile(f)
    if (preview) {
      URL.revokeObjectURL(preview)
      setPreview(null)
    }
    if (f) setPreview(URL.createObjectURL(f))
  }

  const mut = useMutation({
    mutationFn: async () => {
      if (!file) {
        throw new Error('Add a photo or short video for your story.')
      }
      const fd = new FormData()
      fd.append('body', body)
      fd.append('region', region)
      fd.append('is_delvers', 'false')
      fd.append('is_accommodation_story', 'true')
      if (listingId) fd.append('listing', listingId)
      if (mediaKind === 'video') {
        fd.append('video', file)
      } else {
        fd.append('image', file)
      }
      return apiFetch('/api/social/posts/', { method: 'POST', body: fd })
    },
    onSuccess: () => nav('/accommodation'),
    onError: (e) => setErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Failed'),
  })

  if (!profile) {
    return (
      <div className="feed-max">
        <p>Sign in to post a host story.</p>
        <Link to="/login" className="btn btn-primary">
          Log in
        </Link>
      </div>
    )
  }

  if (profile.user_type !== 'service_provider') {
    return (
      <div className="feed-max">
        <h1 className="display" style={{ fontSize: '1.5rem', marginBottom: 8 }}>
          Host stories
        </h1>
        <p className="page-sub">Only service providers (hosts) can post accommodation stories. Switch to a provider account or register as one.</p>
        <Link to="/accommodation" className="btn btn-primary">
          Back to stays
        </Link>
      </div>
    )
  }

  return (
    <div className="feed-max">
      <Link to="/accommodation" className="acc-page__back" style={{ display: 'inline-block', marginBottom: 12 }}>
        ← Back to stays
      </Link>
      <h1 className="display" style={{ fontSize: '1.65rem', marginBottom: 8 }}>
        New host story
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginTop: 0, marginBottom: 20 }}>
        Stories appear in the rings on Places to stay — great for room tours, specials, and behind-the-scenes clips.
      </p>
      {err && <div className="error-banner">{err}</div>}

      <div
        className="card card--flat"
        style={{ padding: 16, marginBottom: 20, borderStyle: 'dashed', borderWidth: 2, borderColor: 'var(--hairline)' }}
      >
        {preview && mediaKind === 'image' && (
          <img src={preview} alt="" style={{ width: '100%', borderRadius: 12, maxHeight: 320, objectFit: 'cover', marginBottom: 12 }} />
        )}
        {preview && mediaKind === 'video' && (
          <video src={preview} controls muted playsInline style={{ width: '100%', borderRadius: 12, maxHeight: 360, background: '#000' }} />
        )}
        <div className="chip-row" style={{ marginBottom: 12 }}>
          <button
            type="button"
            className={`chip ${mediaKind === 'image' ? 'active' : ''}`}
            onClick={() => {
              setMediaKind('image')
              onFileChange(null)
            }}
          >
            Photo
          </button>
          <button
            type="button"
            className={`chip ${mediaKind === 'video' ? 'active' : ''}`}
            onClick={() => {
              setMediaKind('video')
              onFileChange(null)
            }}
          >
            Video
          </button>
        </div>
        <label className="label">Upload</label>
        <input
          type="file"
          accept={mediaKind === 'video' ? 'video/mp4,video/webm,video/quicktime' : 'image/*'}
          className="input"
          style={{ padding: 10 }}
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="field">
        <label className="label" htmlFor="host-story-cap">
          Caption
        </label>
        <textarea
          id="host-story-cap"
          className="input"
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Tonight’s special, new linen, sunset from the deck…"
        />
      </div>
      <div className="field">
        <label className="label" htmlFor="host-story-region">
          Region
        </label>
        <input id="host-story-region" className="input" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Khomas, Erongo…" />
      </div>
      <div className="field">
        <label className="label" htmlFor="host-story-listing">
          Link to a listing (optional)
        </label>
        <select id="host-story-listing" className="input" value={listingId} onChange={(e) => setListingId(e.target.value)}>
          <option value="">No link — CTA goes to your profile</option>
          {mine.map((l) => (
            <option key={l.id} value={String(l.id)}>
              {l.title}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        className="btn btn-primary btn-block"
        disabled={mut.isPending}
        onClick={() => {
          setErr(null)
          mut.mutate()
        }}
      >
        {mut.isPending ? 'Publishing…' : 'Publish story'}
      </button>
    </div>
  )
}
