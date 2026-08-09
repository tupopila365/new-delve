import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import type { AdminUser, AdminUserProfile } from '../api/types'
import { DelveAdminDrawer } from './DelveAdminDataTools'
import { DelveAdminLoading } from './DelveAdminLoading'
import { DelveAdminStatusBadge } from './DelveAdminStatusBadge'
import { userStatusLabel, userStatusVariant } from '../data/demoData'

const PUBLIC_APP_URL = (import.meta.env.VITE_PUBLIC_APP_URL ?? 'http://localhost:5173').replace(/\/$/, '')

type Props = {
  userId: number | null
  onClose: () => void
}

export function UserInspectorDrawer({ userId, onClose }: Props) {
  const qc = useQueryClient()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [postAction, setPostAction] = useState<{ postId: number; action: 'remove' | 'restore' } | null>(null)

  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: () => apiFetch<AdminUserProfile>(`/api/accounts/admin/users/${userId}/profile/`),
    enabled: userId != null,
  })

  const invalidateAll = (id: number) => {
    void qc.invalidateQueries({ queryKey: ['users'] })
    void qc.invalidateQueries({ queryKey: ['user', id] })
    void qc.invalidateQueries({ queryKey: ['user-profile', id] })
    void qc.invalidateQueries({ queryKey: ['activity'] })
    void qc.invalidateQueries({ queryKey: ['moderation'] })
  }

  const updateMut = useMutation({
    mutationFn: (payload: { id: number; is_active?: boolean; is_staff?: boolean }) =>
      apiFetch<AdminUser>(`/api/accounts/admin/users/${payload.id}/update/`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: payload.is_active, is_staff: payload.is_staff }),
      }),
    onSuccess: (updated) => invalidateAll(updated.id),
  })

  const deleteMut = useMutation({
    mutationFn: (payload: { id: number; confirm_username: string }) =>
      apiFetch<{ detail: string }>(`/api/accounts/admin/users/${payload.id}/delete/`, {
        method: 'POST',
        body: JSON.stringify({ confirm_username: payload.confirm_username }),
      }),
    onSuccess: () => {
      setDeleteOpen(false)
      setDeleteConfirm('')
      setDeleteError('')
      onClose()
      void qc.invalidateQueries({ queryKey: ['users'] })
      void qc.invalidateQueries({ queryKey: ['activity'] })
    },
    onError: () => setDeleteError('Could not delete account. Check the username and try again.'),
  })

  const postModMut = useMutation({
    mutationFn: (payload: { postId: number; action: 'remove' | 'restore'; reason: string }) =>
      apiFetch('/api/accounts/admin/moderation/', {
        method: 'PATCH',
        body: JSON.stringify({
          target_type: 'post',
          target_id: String(payload.postId),
          action: payload.action,
          reason: payload.reason,
        }),
      }),
    onSuccess: () => {
      setPostAction(null)
      if (userId != null) invalidateAll(userId)
    },
  })

  const user = profile?.user
  const status = user
    ? user.is_active
      ? user.is_staff
        ? 'Admin'
        : userStatusLabel(user)
      : 'Suspended'
    : ''

  return (
    <>
      <DelveAdminDrawer
        open={userId != null}
        title={profile?.profile.display_name || user?.username || 'User inspector'}
        onClose={onClose}
      >
        {isLoading || !profile || !user ? (
          <DelveAdminLoading count={3} />
        ) : (
          <div className="da-inspector">
            <header className="da-inspector__hero">
              {profile.profile.avatar ? (
                <img src={profile.profile.avatar} alt="" className="da-inspector__avatar" />
              ) : (
                <div className="da-inspector__avatar da-inspector__avatar--placeholder" aria-hidden>
                  {(profile.profile.display_name || user.username).charAt(0).toUpperCase()}
                </div>
              )}
              <div className="da-inspector__hero-text">
                <p className="da-inspector__name">{profile.profile.display_name || user.username}</p>
                <p className="da-inspector__handle">@{user.username}</p>
                <DelveAdminStatusBadge status={status} variant={userStatusVariant(status)} />
              </div>
            </header>

            {profile.profile.bio ? <p className="da-inspector__bio">{profile.profile.bio}</p> : null}

            <div className="da-inspector__links">
              <a
                href={`${PUBLIC_APP_URL}/u/${user.username}`}
                target="_blank"
                rel="noreferrer"
                className="da-link-btn"
              >
                View public profile
              </a>
              {profile.stats.reports_against_open > 0 ? (
                <Link to="/admin/reports" className="da-link-btn">
                  {profile.stats.reports_against_open} open report
                  {profile.stats.reports_against_open === 1 ? '' : 's'}
                </Link>
              ) : null}
              {profile.businesses.length > 0 ? (
                <Link to="/admin/verifications" className="da-link-btn">
                  Verification queue
                </Link>
              ) : null}
            </div>

            <section className="da-inspector__section">
              <h3>Stats</h3>
              <div className="da-inspector__stats">
                <span>{profile.stats.posts_count} posts</span>
                <span>{profile.stats.photos_count} photos</span>
                <span>{profile.stats.followers_count} followers</span>
                <span>{profile.stats.following_count} following</span>
                {profile.stats.posts_hidden_count > 0 ? (
                  <span className="da-inspector__warn">{profile.stats.posts_hidden_count} hidden</span>
                ) : null}
              </div>
            </section>

            <section className="da-inspector__section">
              <h3>Account</h3>
              <dl className="da-dl">
                <div>
                  <dt>Email</dt>
                  <dd>{user.email}</dd>
                </div>
                <div>
                  <dt>Type</dt>
                  <dd>{user.user_type === 'service_provider' ? 'Provider' : 'Traveller'}</dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>
                    {[profile.profile.city, profile.profile.region].filter(Boolean).join(', ') || '—'}
                  </dd>
                </div>
                <div>
                  <dt>Privacy</dt>
                  <dd>
                    {profile.profile.is_private ? 'Private account' : 'Public'} · posts{' '}
                    {profile.profile.posts_visibility.replace(/_/g, ' ')}
                  </dd>
                </div>
                <div>
                  <dt>Bookings</dt>
                  <dd>
                    {profile.bookings_summary.as_traveler} as traveller ·{' '}
                    {profile.bookings_summary.as_provider} as provider
                  </dd>
                </div>
                <div>
                  <dt>Joined</dt>
                  <dd>{new Date(user.date_joined).toLocaleDateString()}</dd>
                </div>
              </dl>
            </section>

            {profile.businesses.length > 0 ? (
              <section className="da-inspector__section">
                <h3>Businesses</h3>
                <ul className="da-inspector__list">
                  {profile.businesses.map((b) => (
                    <li key={b.id}>
                      <div>
                        <strong>{b.business_name}</strong>
                        <span className="da-inspector__meta">
                          {b.verification_status} · {b.city || b.region || 'Namibia'}
                        </span>
                      </div>
                      <a
                        href={`${PUBLIC_APP_URL}/business/${b.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="da-link-btn"
                      >
                        View
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {profile.guide_profile ? (
              <section className="da-inspector__section">
                <h3>Guide profile</h3>
                <p>
                  {profile.guide_profile.headline} · ★ {profile.guide_profile.rating_avg} (
                  {profile.guide_profile.rating_count})
                </p>
              </section>
            ) : null}

            {profile.recent_posts.length > 0 ? (
              <section className="da-inspector__section">
                <h3>Recent posts</h3>
                <ul className="da-inspector__posts">
                  {profile.recent_posts.map((post) => (
                    <li key={post.id} className={post.is_hidden ? 'da-inspector__post--hidden' : undefined}>
                      <p>{post.body || '(no text)'}</p>
                      <div className="da-inspector__post-meta">
                        <span>{new Date(post.created_at).toLocaleDateString()}</span>
                        {post.is_accommodation_story ? (
                          <span className="da-inspector__pill">Stay story</span>
                        ) : post.is_delvers ? (
                          <span className="da-inspector__pill">Delvers</span>
                        ) : (
                          <span className="da-inspector__pill da-inspector__pill--muted">Feed</span>
                        )}
                        {post.delvers_board ? <span className="da-inspector__meta">{post.delvers_board}</span> : null}
                        {post.is_hidden ? <span className="da-inspector__warn">Hidden</span> : null}
                        <button
                          type="button"
                          className="da-link-btn"
                          disabled={postModMut.isPending}
                          onClick={() =>
                            setPostAction({
                              postId: post.id,
                              action: post.is_hidden ? 'restore' : 'remove',
                            })
                          }
                        >
                          {post.is_hidden ? 'Restore' : 'Hide'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {profile.reports.length > 0 ? (
              <section className="da-inspector__section">
                <h3>Reports</h3>
                <ul className="da-inspector__list">
                  {profile.reports.slice(0, 5).map((r) => (
                    <li key={r.id}>
                      <div>
                        <strong>{r.reason_label}</strong>
                        <span className="da-inspector__meta">
                          {r.target_type} · {r.status} · @{r.reporter_username}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <div className="da-verify-actions">
              {user.is_active ? (
                <button
                  type="button"
                  className="da-btn da-btn--danger"
                  disabled={updateMut.isPending}
                  onClick={() => updateMut.mutate({ id: user.id, is_active: false })}
                >
                  Suspend account
                </button>
              ) : (
                <button
                  type="button"
                  className="da-btn da-btn--primary"
                  disabled={updateMut.isPending}
                  onClick={() => updateMut.mutate({ id: user.id, is_active: true })}
                >
                  Reactivate account
                </button>
              )}
              {!user.is_staff ? (
                <button
                  type="button"
                  className="da-btn da-btn--ghost"
                  disabled={updateMut.isPending}
                  onClick={() => updateMut.mutate({ id: user.id, is_staff: true })}
                >
                  Make platform admin
                </button>
              ) : (
                <button
                  type="button"
                  className="da-btn da-btn--ghost"
                  disabled={updateMut.isPending}
                  onClick={() => updateMut.mutate({ id: user.id, is_staff: false })}
                >
                  Remove admin access
                </button>
              )}
              {!user.username.startsWith('deleted_') && !user.is_staff ? (
                <button
                  type="button"
                  className="da-btn da-btn--danger"
                  disabled={updateMut.isPending}
                  onClick={() => {
                    setDeleteConfirm('')
                    setDeleteError('')
                    setDeleteOpen(true)
                  }}
                >
                  Delete account (GDPR)
                </button>
              ) : null}
            </div>
          </div>
        )}
      </DelveAdminDrawer>

      {postAction ? (
        <>
          <button type="button" className="da-drawer__backdrop" aria-label="Close" onClick={() => setPostAction(null)} />
          <aside className="da-drawer da-drawer--confirm" role="dialog" aria-modal="true">
            <div className="da-drawer__head">
              <h2>{postAction.action === 'remove' ? 'Hide post' : 'Restore post'}</h2>
              <button type="button" className="da-drawer__close" onClick={() => setPostAction(null)}>
                ×
              </button>
            </div>
            <div className="da-drawer__body">
              <p className="da-delete-copy">
                {postAction.action === 'remove'
                  ? 'This hides the post from public feeds and the author profile.'
                  : 'This makes the post visible again on Delves.'}
              </p>
              <div className="da-verify-actions">
                <button type="button" className="da-btn da-btn--ghost" onClick={() => setPostAction(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="da-btn da-btn--danger"
                  disabled={postModMut.isPending}
                  onClick={() =>
                    postModMut.mutate({
                      postId: postAction.postId,
                      action: postAction.action,
                      reason: postAction.action === 'remove' ? 'Removed from user inspector' : '',
                    })
                  }
                >
                  {postModMut.isPending ? 'Saving…' : postAction.action === 'remove' ? 'Hide post' : 'Restore post'}
                </button>
              </div>
            </div>
          </aside>
        </>
      ) : null}

      {deleteOpen && user ? (
        <>
          <button type="button" className="da-drawer__backdrop" aria-label="Close" onClick={() => setDeleteOpen(false)} />
          <aside className="da-drawer da-drawer--confirm" role="dialog" aria-modal="true">
            <div className="da-drawer__head">
              <h2>Delete account</h2>
              <button type="button" className="da-drawer__close" onClick={() => setDeleteOpen(false)}>
                ×
              </button>
            </div>
            <div className="da-drawer__body">
              <p className="da-delete-copy">
                This permanently anonymizes <strong>@{user.username}</strong>. Personal data is removed, posts hidden,
                and listings unpublished.
              </p>
              <label className="da-field">
                <span>
                  Type <strong>{user.username}</strong> to confirm
                </span>
                <input
                  type="text"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
              {deleteError ? (
                <p className="da-delete-error" role="alert">
                  {deleteError}
                </p>
              ) : null}
              <div className="da-verify-actions">
                <button type="button" className="da-btn da-btn--ghost" onClick={() => setDeleteOpen(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="da-btn da-btn--danger"
                  disabled={deleteMut.isPending || deleteConfirm !== user.username}
                  onClick={() => deleteMut.mutate({ id: user.id, confirm_username: deleteConfirm })}
                >
                  {deleteMut.isPending ? 'Deleting…' : 'Permanently delete'}
                </button>
              </div>
            </div>
          </aside>
        </>
      ) : null}
    </>
  )
}
