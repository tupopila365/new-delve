import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch, ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'

type Destination = 'feed' | 'delvers'
type MediaKind = 'image' | 'video'

export function CreatePost() {
  const nav = useNavigate()
  const qc = useQueryClient()
  const { profile } = useAuth()

  const [dest, setDest] = useState<Destination>('feed')
  const [body, setBody] = useState('')
  const [region, setRegion] = useState(profile?.region ?? '')
  const [board, setBoard] = useState('')
  const [mediaKind, setMediaKind] = useState<MediaKind>('image')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  function clearPreview() {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
  }

  function onFileChange(f: File | null) {
    setFile(f)
    clearPreview()
    if (f) setPreview(URL.createObjectURL(f))
  }

  const canPublish = useMemo(() => {
    return Boolean(body.trim() || file)
  }, [body, file])

  const mut = useMutation({
    mutationFn: async () => {
      if (!canPublish) throw new Error('Add a caption or upload media.')
      const fd = new FormData()
      fd.append('body', body)
      fd.append('region', region)
      fd.append('is_delvers', dest === 'delvers' ? 'true' : 'false')
      if (dest === 'delvers') fd.append('delvers_board', board)
      if (file) {
        if (mediaKind === 'video') fd.append('video', file)
        else fd.append('image', file)
      }
      return apiFetch('/api/social/posts/', { method: 'POST', body: fd })
    },
    onSuccess: async () => {
      clearPreview()
      setFile(null)
      await qc.invalidateQueries({ queryKey: ['feed'] })
      await qc.invalidateQueries({ queryKey: ['delvers'] })
      nav(dest === 'delvers' ? '/delvers' : '/')
    },
    onError: (e) => setErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Failed'),
  })

  if (!profile) {
    return (
      <p>
        <Link to="/login">Sign in</Link> to post.
      </p>
    )
  }

  return (
    <div className="feed-max">
      <header className="page-header">
        <div>
          <Link to="/create" className="page-back">
            ← Create
          </Link>
          <h1 className="display">Delvers post</h1>
          <p className="page-sub">Post to your local feed or to Delvers pins</p>
        </div>
        <div className="segmented" role="tablist" aria-label="Destination">
          <button type="button" className={dest === 'feed' ? 'active' : ''} onClick={() => setDest('feed')}>
            Feed
          </button>
          <button type="button" className={dest === 'delvers' ? 'active' : ''} onClick={() => setDest('delvers')}>
            Delvers
          </button>
        </div>
      </header>

      {err && <div className="error-banner">{err}</div>}

      <div className="card card--flat" style={{ padding: 16, marginBottom: 18 }}>
        {preview && mediaKind === 'image' && (
          <img
            src={preview}
            alt=""
            style={{ width: '100%', borderRadius: 12, maxHeight: 340, objectFit: 'cover', marginBottom: 12 }}
          />
        )}
        {preview && mediaKind === 'video' && (
          <video
            src={preview}
            controls
            muted
            playsInline
            style={{ width: '100%', borderRadius: 12, maxHeight: 380, background: '#000', marginBottom: 12 }}
          />
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
        <label className="label">Upload (optional)</label>
        <input
          type="file"
          accept={mediaKind === 'video' ? 'video/mp4,video/webm,video/quicktime' : 'image/*'}
          className="input"
          style={{ padding: 10 }}
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
        />
      </div>

      {dest === 'delvers' && (
        <div className="field">
          <label className="label" htmlFor="bd">
            Board
          </label>
          <input
            id="bd"
            className="input"
            value={board}
            onChange={(e) => setBoard(e.target.value)}
            placeholder="Namibia views · Weekend trips…"
          />
        </div>
      )}

      <div className="field">
        <label className="label" htmlFor="rg">
          Region
        </label>
        <input id="rg" className="input" value={region} onChange={(e) => setRegion(e.target.value)} />
      </div>

      <div className="field">
        <label className="label" htmlFor="cap">
          Caption
        </label>
        <textarea
          id="cap"
          className="input"
          rows={4}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={dest === 'feed' ? "What's happening near you?" : "What should people feel?"}
        />
      </div>

      <button
        type="button"
        className="btn btn-primary btn-block"
        disabled={mut.isPending || !canPublish}
        onClick={() => {
          setErr(null)
          mut.mutate()
        }}
      >
        {mut.isPending ? 'Publishing…' : dest === 'delvers' ? 'Publish to Delvers' : 'Publish to Feed'}
      </button>
    </div>
  )
}

