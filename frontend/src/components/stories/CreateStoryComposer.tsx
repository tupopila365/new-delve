import { useEffect, useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ImagePlus, Music, Send, Sparkles, Type, Video, Wand2, X } from 'lucide-react'
import { ApiError, apiFetch } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import '../../story-create.css'

type MediaKind = 'image' | 'video'
type StoryFilter = 'original' | 'warm' | 'mono' | 'dusk' | 'vivid'
type CaptionAlign = 'bottom' | 'middle' | 'top'

const FILTERS: { id: StoryFilter; label: string }[] = [
  { id: 'original', label: 'Original' },
  { id: 'warm', label: 'Warm' },
  { id: 'mono', label: 'Mono' },
  { id: 'dusk', label: 'Dusk' },
  { id: 'vivid', label: 'Vivid' },
]

const MUSIC = [
  'No music',
  'Soft travel beat',
  'City night drive',
  'Coastal morning',
  'Desert sunset',
]

function filterClass(filter: StoryFilter): string {
  return filter === 'original' ? '' : `story-create-preview__media--${filter}`
}

export function CreateStoryComposer() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [mediaKind, setMediaKind] = useState<MediaKind>('image')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [region, setRegion] = useState(profile?.region ?? '')
  const [filter, setFilter] = useState<StoryFilter>('original')
  const [captionAlign, setCaptionAlign] = useState<CaptionAlign>('bottom')
  const [music, setMusic] = useState(MUSIC[0])
  const [musicFile, setMusicFile] = useState<File | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  const captionPreview = useMemo(() => caption.trim() || 'Add a short caption', [caption])

  const onPickFile = (nextFile: File | null) => {
    if (preview) URL.revokeObjectURL(preview)
    setFile(nextFile)
    setPreview(nextFile ? URL.createObjectURL(nextFile) : null)
  }

  const publish = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Choose a photo or video first.')
      const fd = new FormData()
      fd.append('body', caption.trim())
      fd.append('region', region.trim())
      fd.append('delvers_board', 'Stories')
      fd.append('is_delvers', 'true')
      if (mediaKind === 'video') fd.append('video', file)
      else fd.append('image', file)
      return apiFetch('/api/social/posts/', { method: 'POST', body: fd })
    },
    onSuccess: () => navigate('/delvers'),
    onError: (err) => setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Could not publish story.'),
  })

  if (!profile) {
    return (
      <main className="story-create story-create--gate">
        <section className="story-create-gate">
          <h1>Create a story</h1>
          <p>Sign in to share short image and video stories with Delvers.</p>
          <div className="story-create-gate__actions">
            <Link to="/login" className="btn btn-primary">Sign in</Link>
            <Link to="/register" className="btn btn-ghost">Create account</Link>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="story-create">
      <header className="story-create-topbar">
        <button type="button" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft size={18} strokeWidth={2.3} aria-hidden />
        </button>
        <div>
          <strong>Create story</strong>
          <span>Photo or video</span>
        </div>
        <button type="button" onClick={() => navigate('/delvers')} aria-label="Close">
          <X size={18} strokeWidth={2.3} aria-hidden />
        </button>
      </header>

      <section className="story-create-shell">
        <div className="story-create-preview" aria-label="Story preview">
          <div className="story-create-preview__phone">
            {preview && mediaKind === 'image' ? (
              <img src={preview} alt="" className={`story-create-preview__media ${filterClass(filter)}`} />
            ) : null}
            {preview && mediaKind === 'video' ? (
              <video src={preview} muted playsInline controls className={`story-create-preview__media ${filterClass(filter)}`} />
            ) : null}
            {!preview ? (
              <label className="story-create-dropzone">
                <input
                  type="file"
                  accept={mediaKind === 'video' ? 'video/mp4,video/webm,video/quicktime' : 'image/*'}
                  onChange={(event) => onPickFile(event.target.files?.[0] ?? null)}
                />
                {mediaKind === 'video' ? <Video size={32} strokeWidth={1.8} aria-hidden /> : <ImagePlus size={32} strokeWidth={1.8} aria-hidden />}
                <span>Choose {mediaKind === 'video' ? 'video' : 'photo'}</span>
              </label>
            ) : null}

            <div className={`story-create-caption story-create-caption--${captionAlign}`}>
              {captionPreview}
            </div>

            {music !== MUSIC[0] || musicFile ? (
              <div className="story-create-music-pill">
                <Music size={12} strokeWidth={2.4} aria-hidden />
                {musicFile?.name || music}
              </div>
            ) : null}
          </div>
        </div>

        <aside className="story-create-tools" aria-label="Story tools">
          {error ? <p className="story-create-error">{error}</p> : null}

          <div className="story-create-section">
            <span className="story-create-label"><Video size={14} strokeWidth={2.2} aria-hidden /> Format</span>
            <div className="story-create-toggle">
              <button type="button" className={mediaKind === 'image' ? 'is-active' : ''} onClick={() => { setMediaKind('image'); onPickFile(null) }}>Photo</button>
              <button type="button" className={mediaKind === 'video' ? 'is-active' : ''} onClick={() => { setMediaKind('video'); onPickFile(null) }}>Video</button>
            </div>
          </div>

          {preview ? (
            <label className="story-create-replace">
              <input
                type="file"
                accept={mediaKind === 'video' ? 'video/mp4,video/webm,video/quicktime' : 'image/*'}
                onChange={(event) => onPickFile(event.target.files?.[0] ?? null)}
              />
              Replace media
            </label>
          ) : null}

          <div className="story-create-section">
            <span className="story-create-label"><Type size={14} strokeWidth={2.2} aria-hidden /> Caption</span>
            <textarea value={caption} onChange={(event) => setCaption(event.target.value)} rows={3} placeholder="Write a short story caption" />
            <div className="story-create-align">
              {(['bottom', 'middle', 'top'] as CaptionAlign[]).map((item) => (
                <button key={item} type="button" className={captionAlign === item ? 'is-active' : ''} onClick={() => setCaptionAlign(item)}>{item}</button>
              ))}
            </div>
          </div>

          <div className="story-create-section">
            <span className="story-create-label"><Wand2 size={14} strokeWidth={2.2} aria-hidden /> Filters</span>
            <div className="story-create-filters">
              {FILTERS.map((item) => (
                <button key={item.id} type="button" className={filter === item.id ? 'is-active' : ''} onClick={() => setFilter(item.id)}>
                  <span className={`story-create-filter-dot story-create-filter-dot--${item.id}`} />
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="story-create-section">
            <span className="story-create-label"><Music size={14} strokeWidth={2.2} aria-hidden /> Music</span>
            <select value={music} onChange={(event) => setMusic(event.target.value)}>
              {MUSIC.map((item) => <option key={item}>{item}</option>)}
            </select>
            <label className="story-create-audio">
              <input type="file" accept="audio/*" onChange={(event) => setMusicFile(event.target.files?.[0] ?? null)} />
              Upload audio
            </label>
          </div>

          <div className="story-create-section">
            <span className="story-create-label"><Sparkles size={14} strokeWidth={2.2} aria-hidden /> Place</span>
            <input value={region} onChange={(event) => setRegion(event.target.value)} placeholder="Region or city" />
          </div>

          <button type="button" className="story-create-publish" disabled={!file || publish.isPending} onClick={() => { setError(''); publish.mutate() }}>
            <Send size={16} strokeWidth={2.4} aria-hidden />
            {publish.isPending ? 'Publishing' : 'Publish story'}
          </button>
          <p className="story-create-note">Filters and music preview here before publishing. The story saves as a Delvers media story.</p>
        </aside>
      </section>
    </main>
  )
}
