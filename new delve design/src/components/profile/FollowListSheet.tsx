import { useCallback, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { FollowListItem } from '@delve/contracts'
import {
  fetchFollowers,
  fetchFollowing,
  followTraveler,
  unfollowTraveler,
} from '../../api/socialClient'
import { formatUsername } from '../../lib/formatUsername'

export type FollowListTab = 'followers' | 'following'

interface FollowListSheetProps {
  open: FollowListTab | null
  username: string
  profileDisplayName?: string
  signedIn?: boolean
  viewerUserId?: string | null
  onClose: () => void
  onOpenProfile?: (username: string) => void
  onMessageUser?: (userId: string) => void
  isOwnProfile?: boolean
  onFollowingCountChange?: (delta: number) => void
}

function FollowRow({
  item,
  isSelf,
  signedIn,
  busyId,
  onOpenProfile,
  onMessageUser,
  onToggleFollow,
}: {
  item: FollowListItem
  isSelf: boolean
  signedIn: boolean
  busyId: string | null
  onOpenProfile?: (username: string) => void
  onMessageUser?: (userId: string) => void
  onToggleFollow: (item: FollowListItem) => void
}) {
  const name = item.displayName || formatUsername(item.username)
  const busy = busyId === item.id

  return (
    <div className="flex items-center gap-2.5 px-1 py-1.5">
      <button
        type="button"
        onClick={() => onOpenProfile?.(item.username)}
        className="flex items-center gap-2.5 min-w-0 flex-1 text-left rounded-xl px-1 py-1"
        style={{ background: 'none', border: 'none', cursor: onOpenProfile ? 'pointer' : 'default' }}
      >
        {item.avatarUrl ? (
          <img src={item.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full flex-shrink-0" style={{ background: 'var(--surface-subtle)' }} />
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold truncate" style={{ color: 'var(--fg)' }}>
            {name}
          </span>
          <span className="block text-xs truncate" style={{ color: 'var(--fg-muted)' }}>
            {formatUsername(item.username)}
            {item.followsYou ? ' · Follows you' : ''}
          </span>
        </span>
      </button>
      {!isSelf && signedIn && (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {onMessageUser && (
            <button
              type="button"
              onClick={() => onMessageUser(item.id)}
              className="rounded-lg px-2.5 py-1.5 text-xs font-semibold"
              style={{
                background: 'var(--surface-subtle)',
                border: '1px solid var(--border)',
                color: 'var(--fg)',
                cursor: 'pointer',
              }}
            >
              Message
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => onToggleFollow(item)}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
            style={{
              background: item.isFollowing ? 'var(--surface-subtle)' : 'var(--primary)',
              border: item.isFollowing ? '1px solid var(--border)' : 'none',
              color: item.isFollowing ? 'var(--fg)' : '#fff',
              cursor: busy ? 'default' : 'pointer',
            }}
          >
            {item.isFollowing ? 'Following' : 'Follow'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function FollowListSheet({
  open,
  username,
  profileDisplayName,
  signedIn = false,
  viewerUserId = null,
  onClose,
  onOpenProfile,
  onMessageUser,
  isOwnProfile = false,
  onFollowingCountChange,
}: FollowListSheetProps) {
  const [tab, setTab] = useState<FollowListTab>('followers')
  const [items, setItems] = useState<FollowListItem[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    if (open) setTab(open)
  }, [open])

  const loadPage = useCallback(
    async (activeTab: FollowListTab, cursor?: string, append = false) => {
      if (!username) return
      if (append) setLoadingMore(true)
      else setLoading(true)
      setError(null)
      try {
        const data =
          activeTab === 'followers'
            ? await fetchFollowers(username, cursor)
            : await fetchFollowing(username, cursor)
        setItems(prev => (append ? [...prev, ...data.items] : data.items))
        setNextCursor(data.nextCursor)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load list')
        if (!append) setItems([])
      } finally {
        if (append) setLoadingMore(false)
        else setLoading(false)
      }
    },
    [username],
  )

  useEffect(() => {
    if (!open) {
      setItems([])
      setNextCursor(null)
      setError(null)
      return
    }
    void loadPage(tab)
  }, [open, tab, loadPage])

  async function toggleFollow(item: FollowListItem) {
    if (!signedIn || busyId) return
    setBusyId(item.id)
    try {
      const result = item.isFollowing
        ? await unfollowTraveler(item.id)
        : await followTraveler(item.id)
      setItems(prev =>
        prev.map(row => (row.id === item.id ? { ...row, isFollowing: result.following } : row)),
      )
      if (isOwnProfile && item.isFollowing !== result.following) {
        onFollowingCountChange?.(result.following ? 1 : -1)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update follow')
    } finally {
      setBusyId(null)
    }
  }

  if (!open) return null

  const title = profileDisplayName?.trim() || formatUsername(username)
  const emptyLabel = tab === 'followers' ? 'No followers yet' : 'Not following anyone yet'

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(20,12,40,0.55)' }}
      role="dialog"
      aria-modal
      aria-label={tab === 'followers' ? 'Followers' : 'Following'}
    >
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Close"
        onClick={onClose}
        style={{ background: 'none', border: 'none' }}
      />
      <div
        className="relative w-full sm:max-w-md max-h-[88vh] flex flex-col rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div
          className="flex items-center justify-between gap-3 px-4 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider m-0" style={{ color: 'var(--fg-muted)' }}>
              {title}
            </p>
            <h2 className="font-display text-lg font-extrabold m-0 mt-0.5" style={{ color: 'var(--fg)' }}>
              {tab === 'followers' ? 'Followers' : 'Following'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 rounded-xl inline-flex items-center justify-center flex-shrink-0"
            style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--fg)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        <div
          className="grid grid-cols-2 flex-shrink-0"
          style={{ gap: 1, background: 'var(--border)', borderBottom: '1px solid var(--border)' }}
        >
          {(['followers', 'following'] as const).map(key => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className="py-2.5 text-sm font-semibold capitalize"
              style={{
                background: tab === key ? 'var(--surface)' : 'var(--surface-subtle)',
                border: 'none',
                color: tab === key ? 'var(--primary)' : 'var(--fg-muted)',
                cursor: 'pointer',
              }}
            >
              {key}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2">
          {loading ? (
            <p className="text-sm text-center py-10 m-0" style={{ color: 'var(--fg-muted)' }}>
              Loading…
            </p>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm m-0" style={{ color: 'var(--fg)' }}>{error}</p>
              <button
                type="button"
                onClick={() => void loadPage(tab)}
                className="rounded-xl px-4 py-2 text-sm font-semibold"
                style={{
                  background: 'var(--surface-subtle)',
                  border: '1px solid var(--border)',
                  color: 'var(--fg)',
                  cursor: 'pointer',
                }}
              >
                Retry
              </button>
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-center py-10 m-0" style={{ color: 'var(--fg-muted)' }}>
              {emptyLabel}
            </p>
          ) : (
            <>
              {items.map(item => (
                <FollowRow
                  key={item.id}
                  item={item}
                  isSelf={viewerUserId === item.id}
                  signedIn={signedIn}
                  busyId={busyId}
                  onOpenProfile={onOpenProfile}
                  onMessageUser={onMessageUser}
                  onToggleFollow={item => void toggleFollow(item)}
                />
              ))}
              {nextCursor && (
                <div className="py-3 text-center">
                  <button
                    type="button"
                    disabled={loadingMore}
                    onClick={() => void loadPage(tab, nextCursor, true)}
                    className="rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-60"
                    style={{
                      background: 'var(--surface-subtle)',
                      border: '1px solid var(--border)',
                      color: 'var(--fg)',
                      cursor: loadingMore ? 'default' : 'pointer',
                    }}
                  >
                    {loadingMore ? 'Loading…' : 'Load more'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
