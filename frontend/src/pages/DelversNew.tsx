import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
      if (!file) throw new Error('Add a photo or short video clip.')
      const fd = new FormData()
      fd.append('body', body)
      fd.append('region', region)
      fd.append('delvers_board', board)
      fd.append('is_delvers', 'true')
      if (mediaKind === 'video') fd.append('video', file)
      else fd.append('image', file)
      return apiFetch('/api/social/posts/', { method: 'POST', body: fd })
    },
    onSuccess: () => nav('/delvers'),
    onError: (e) => setErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Failed'),
  })

  if (!profile) {
    return (
      <div className="dvn-page">
        <Link to="/delvers" className="dvn-page__back">← Back to Delvers</Link>
        <div className="dvn-gate card">
          <h1 className="display dvn-gate__title">Sign in to post</h1>
          <p className="dvn-gate__text">
            Share moments with the Delvers community — browsing always stays free, posting just needs a quick sign-in.
          </p>
          <div className="dvn-gate__actions">
            <Link to="/login" className="btn btn-primary btn-block">Sign in</Link>
            <Link to="/register" className="btn btn-ghost btn-block">Create free account</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dvn-page">
      <Link to="/delvers" className="dvn-page__back">← Back to Delvers</Link>

      <header className="dvn-page__header">
        <h1 className="display dvn-page__title">New pin</h1>
        <p className="dvn-page__sub">
          Share a photo or short video — Delvers is your visual moodboard for everywhere.
        </p>
      </header>

      {err && <div className="error-banner">{err}</div>}

      {/* Media upload zone */}
      <div className="dvn-upload card">
        {/* Preview */}
        {preview && mediaKind === 'image' && (
          <img src={preview} alt="" className="dvn-upload__preview" />
        )}
        {preview && mediaKind === 'video' && (
          <video
            src={preview}
            controls
            muted
            playsInline
            className="dvn-upload__preview dvn-upload__preview--video"
          />
        )}

        {/* Photo / Video toggle */}
        <div className="dvn-upload__type-row">
          <button
            type="button"
            className={`dvn-upload__type-btn${mediaKind === 'image' ? ' dvn-upload__type-btn--active' : ''}`}
            onClick={() => { setMediaKind('image'); onFileChange(null) }}
          >
            <span aria-hidden>🖼</span> Photo
          </button>
          <button
            type="button"
            className={`dvn-upload__type-btn${mediaKind === 'video' ? ' dvn-upload__type-btn--active' : ''}`}
            onClick={() => { setMediaKind('video'); onFileChange(null) }}
          >
            <span aria-hidden>🎬</span> Video
          </button>
        </div>

        {/* File input */}
        <label className="dvn-upload__label">
          <input
            type="file"
            accept={mediaKind === 'video' ? 'video/mp4,video/webm,video/quicktime' : 'image/*'}
            className="dvn-upload__input"
            onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
          />
          <span className="dvn-upload__trigger">
            {file ? file.name : `Choose ${mediaKind === 'video' ? 'a video' : 'a photo'}`}
          </span>
        </label>
      </div>

      {/* Caption */}
      <div className="field">
        <label className="label" htmlFor="dvn-cap">Caption</label>
        <textarea
          id="dvn-cap"
          className="input"
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What should people feel?"
        />
      </div>

      {/* Board */}
      <div className="field">
        <label className="label" htmlFor="dvn-board">Board</label>
        <input
          id="dvn-board"
          className="input"
          value={board}
          onChange={(e) => setBoard(e.target.value)}
          placeholder="City breaks · Local eats · Road trips…"
        />
        <p className="dvn-page__hint">Boards group your pins — create any name you like.</p>
      </div>

      {/* Region */}
      <div className="field">
        <label className="label" htmlFor="dvn-region">Region</label>
        <input
          id="dvn-region"
          className="input"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          placeholder="Erongo, Khomas…"
        />
      </div>

      <button
        type="button"
        className="btn btn-primary btn-block"
        disabled={mut.isPending || !file}
        onClick={() => { setErr(null); mut.mutate() }}
      >
        {mut.isPending ? 'Publishing…' : 'Publish to Delvers'}
      </button>
    </div>
  )
}
