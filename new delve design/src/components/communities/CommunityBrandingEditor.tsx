import { useState } from 'react'
import { Image as ImageIcon, Loader2, Upload } from 'lucide-react'
import type { CommunityDetail, MediaAssetDto } from '@delve/contracts'
import { updateCommunity } from '../../api/communityClient'
import { AuthApiError } from '../../api/authClient'
import MediaStudio from '../../pages/MediaStudio'

type BrandingPatch = { avatarUrl?: string | null; coverUrl?: string | null }

export default function CommunityBrandingEditor({
  community,
  onUpdated,
}: {
  community: CommunityDetail
  onUpdated: (next: CommunityDetail) => void
}) {
  const [avatarStudioOpen, setAvatarStudioOpen] = useState(false)
  const [coverStudioOpen, setCoverStudioOpen] = useState(false)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const [coverBusy, setCoverBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(patch: BrandingPatch, slot: 'avatar' | 'cover') {
    setError(null)
    if (slot === 'avatar') setAvatarBusy(true)
    else setCoverBusy(true)
    try {
      const next = await updateCommunity(community.id, patch)
      onUpdated(next)
    } catch (err) {
      setError(err instanceof AuthApiError || err instanceof Error ? err.message : 'Could not update branding')
    } finally {
      setAvatarBusy(false)
      setCoverBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold m-0 mb-1" style={{ color: 'var(--fg)', fontFamily: 'Syne, sans-serif' }}>
          Community branding
        </h3>
        <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>
          Set a profile photo and banner members see on your community page.
        </p>
      </div>

      {error && (
        <p className="text-xs m-0" style={{ color: '#E11D48' }} role="alert">{error}</p>
      )}

      <div className="flex items-center gap-3 p-3 rounded-xl" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
        {community.avatarUrl ? (
          <img src={community.avatarUrl} alt="" className="w-16 h-16 rounded-2xl object-cover" />
        ) : (
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold"
            style={{ background: 'var(--primary)', color: '#fff' }}
          >
            {community.name.charAt(0)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold m-0" style={{ color: 'var(--fg)' }}>Profile photo</p>
          <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>Square image works best</p>
          <div className="flex flex-wrap gap-2 mt-2">
            <button
              type="button"
              disabled={avatarBusy}
              onClick={() => setAvatarStudioOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-60"
              style={{ background: 'var(--primary)', color: '#fff', border: 'none' }}
            >
              {avatarBusy ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              {community.avatarUrl ? 'Replace' : 'Upload'}
            </button>
            {community.avatarUrl && (
              <button
                type="button"
                disabled={avatarBusy}
                onClick={() => void save({ avatarUrl: null }, 'avatar')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-60"
                style={{ border: '1px solid var(--border)', background: 'var(--surface-subtle)', color: 'var(--fg-muted)' }}
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="p-3 rounded-xl space-y-2" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold m-0" style={{ color: 'var(--fg)' }}>Banner</p>
            <p className="text-xs m-0" style={{ color: 'var(--fg-muted)' }}>Wide cover for the community header</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={coverBusy}
              onClick={() => setCoverStudioOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-60"
              style={{ background: 'var(--primary)', color: '#fff', border: 'none' }}
            >
              {coverBusy ? <Loader2 size={12} className="animate-spin" /> : <ImageIcon size={12} />}
              {community.coverUrl ? 'Replace' : 'Upload'}
            </button>
            {community.coverUrl && (
              <button
                type="button"
                disabled={coverBusy}
                onClick={() => void save({ coverUrl: null }, 'cover')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-60"
                style={{ border: '1px solid var(--border)', background: 'var(--surface-subtle)', color: 'var(--fg-muted)' }}
              >
                Remove
              </button>
            )}
          </div>
        </div>
        <div className="relative w-full overflow-hidden rounded-xl" style={{ aspectRatio: '16 / 9', background: 'var(--surface-subtle)' }}>
          {community.coverUrl ? (
            <img src={community.coverUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div
              className="w-full h-full"
              style={{ background: 'linear-gradient(135deg, rgba(140,82,255,0.35), rgba(0,0,0,0.2))' }}
            />
          )}
        </div>
      </div>

      <MediaStudio
        open={avatarStudioOpen}
        onClose={() => setAvatarStudioOpen(false)}
        initialContext="community"
        lockContext
        onMediaReady={(assets: MediaAssetDto[]) => {
          const url = assets[0]?.delivery?.url
          setAvatarStudioOpen(false)
          if (url) void save({ avatarUrl: url }, 'avatar')
        }}
      />
      <MediaStudio
        open={coverStudioOpen}
        onClose={() => setCoverStudioOpen(false)}
        initialContext="community"
        lockContext
        onMediaReady={(assets: MediaAssetDto[]) => {
          const url = assets[0]?.delivery?.url
          setCoverStudioOpen(false)
          if (url) void save({ coverUrl: url }, 'cover')
        }}
      />
    </div>
  )
}
