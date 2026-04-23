import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { apiFetch, ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'

type MediaKind = 'image' | 'video'

export function DelversNew() {
  const nav = useNavigate()
  const { profile } = useAuth()
  const [body, setBody] = useState('')
  const [region, setRegion] = useState(profile?.region ?? '')
  const [board, setBoard] = useState('')
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
      if (!file) {
        throw new Error('Add a photo or short video clip.')
      }
      const fd = new FormData()
      fd.append('body', body)
      fd.append('region', region)
      fd.append('delvers_board', board)
      fd.append('is_delvers', 'true')
      if (mediaKind === 'video') {
        fd.append('video', file)
      } else {
        fd.append('image', file)
      }
      return apiFetch('/api/social/posts/', { method: 'POST', body: fd })
    },
    onSuccess: () => nav('/delvers'),
    onError: (e) => setErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Failed'),
  })

  if (!profile) {
    return <p>Sign in to post.</p>
  }

  return (
    <div className="feed-max">
      <h1 className="display" style={{ fontSize: '1.65rem', marginBottom: 8 }}>
        New pin
      </h1>
      <p style={{ color: 'var(--text-secondary)', marginTop: 0, marginBottom: 20 }}>
        Share a photo or a short video — Delvers is your visual moodboard for Namibia.
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
          <button type="button" className={`chip ${mediaKind === 'image' ? 'active' : ''}`} onClick={() => { setMediaKind('image'); onFileChange(null) }}>
            Photo
          </button>
          <button type="button" className={`chip ${mediaKind === 'video' ? 'active' : ''}`} onClick={() => { setMediaKind('video'); onFileChange(null) }}>
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
        <label className="label" htmlFor="cap">
          Caption
        </label>
        <textarea id="cap" className="input" rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="What should people feel?" />
      </div>
      <div className="field">
        <label className="label" htmlFor="bd">
          Board
        </label>
        <input id="bd" className="input" value={board} onChange={(e) => setBoard(e.target.value)} placeholder="Desert weekends · Windhoek eats…" />
      </div>
      <div className="field">
        <label className="label" htmlFor="rg">
          Region
        </label>
        <input id="rg" className="input" value={region} onChange={(e) => setRegion(e.target.value)} />
      </div>
      <button type="button" className="btn btn-primary btn-block" disabled={mut.isPending} onClick={() => { setErr(null); mut.mutate() }}>
        {mut.isPending ? 'Publishing…' : 'Publish to Delvers'}
      </button>
    </div>
  )
}
