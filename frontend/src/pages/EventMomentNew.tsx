import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { ApiError, apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'

type MediaKind = 'image' | 'video'

export function EventMomentNew() {
  const { id } = useParams()
  const nav = useNavigate()
  const { profile } = useAuth()
  const [body, setBody] = useState('')
  const [region, setRegion] = useState(profile?.region ?? '')
  const [mediaKind, setMediaKind] = useState<MediaKind>('image')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

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
      if (!id) throw new Error('Missing event.')
      const fd = new FormData()
      fd.append('body', body)
      fd.append('region', region)
      fd.append('is_delvers', 'true')
      fd.append('is_accommodation_story', 'false')
      fd.append('event', id)
      if (file) {
        if (mediaKind === 'video') fd.append('video', file)
        else fd.append('image', file)
      }
      return apiFetch('/api/social/posts/', { method: 'POST', body: fd })
    },
    onSuccess: () => nav(`/events/${id}`),
    onError: (e) => setErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Failed'),
  })

  if (!profile) {
    return (
      <div className="feed-max">
        <p>Sign in to share an event moment.</p>
        <Link to="/login" className="btn btn-primary">
          Log in
        </Link>
      </div>
    )
  }

  return (
    <div className="feed-max ce-page">
      <h1 className="ce-form__title">Share an event moment</h1>
      <p className="ce-form__sub">Post a photo or clip to Delvers and link it to this event.</p>
      <label className="ce-form__label">
        Caption
        <textarea className="ce-form__input" rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
      </label>
      <label className="ce-form__label">
        Region
        <input className="ce-form__input" value={region} onChange={(e) => setRegion(e.target.value)} />
      </label>
      <div className="ce-form__row">
        <label className="ce-form__label">
          Media type
          <select value={mediaKind} onChange={(e) => setMediaKind(e.target.value as MediaKind)}>
            <option value="image">Photo</option>
            <option value="video">Video</option>
          </select>
        </label>
        <label className="ce-form__label">
          {mediaKind === 'video' ? 'Video' : 'Photo'} (optional)
          <input type="file" accept={mediaKind === 'video' ? 'video/*' : 'image/*'} onChange={(e) => onFileChange(e.target.files?.[0] ?? null)} />
        </label>
      </div>
      {preview && mediaKind === 'image' ? <img src={preview} alt="" className="ce-form__cover-preview" /> : null}
      {err ? <p className="ce-form__err">{err}</p> : null}
      <div className="ce-form__actions">
        <Link to={`/events/${id}`} className="btn btn-ghost">
          Cancel
        </Link>
        <button type="button" className="btn btn-primary" disabled={mut.isPending || !body.trim()} onClick={() => mut.mutate()}>
          {mut.isPending ? 'Posting…' : 'Post moment'}
        </button>
      </div>
    </div>
  )
}
