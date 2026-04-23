import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../api/client'
import { useAuth, type Profile } from '../auth/AuthContext'
import { DelversStoriesRow } from '../components/DelversStoriesRow'
import { PostMedia } from '../components/PostMedia'

type PinPost = {
  id: number
  author: { username: string; display_name: string; avatar?: string | null }
  body: string
  region: string
  image: string | null
  video: string | null
  delvers_board: string
  liked_by_me: boolean
  saved_by_me: boolean
  likes_count: number
  saves_count: number
  created_at?: string
}

function firstName(p: Profile) {
  const n = (p.display_name || p.username || '').trim().split(/\s+/)[0]
  return n || 'there'
}

function pinMatchesQuery(p: PinPost, q: string) {
  const n = q.toLowerCase()
  const hay = [
    p.body,
    p.region,
    p.delvers_board,
    p.author.username,
    p.author.display_name,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return hay.includes(n)
}

export function Delvers() {
  const { profile } = useAuth()
  const [pinSearchInput, setPinSearchInput] = useState('')
  const [pinSearch, setPinSearch] = useState('')

  useEffect(() => {
    const t = window.setTimeout(() => setPinSearch(pinSearchInput.trim()), 350)
    return () => window.clearTimeout(t)
  }, [pinSearchInput])

  const qc = useQueryClient()
  const qk = ['delvers', profile?.region] as const
  const { data, isLoading } = useQuery({
    queryKey: qk,
    queryFn: () =>
      apiFetch<PinPost[]>(
        `/api/social/delvers/${profile?.region ? `?region=${encodeURIComponent(profile.region)}` : ''}`,
        { auth: false },
      ),
  })

  const likeMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/social/posts/${id}/like/`, { method: 'POST' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk }),
  })

  const saveMut = useMutation({
    mutationFn: (id: number) => apiFetch(`/api/social/posts/${id}/save/`, { method: 'POST' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk }),
  })

  const filteredPins = useMemo(() => {
    if (!data?.length) return []
    if (!pinSearch) return data
    return data.filter((p) => pinMatchesQuery(p, pinSearch))
  }, [data, pinSearch])

  return (
    <div className="delvers-page">
      <header className="delvers-page__head">
        <div className="delvers-page__head-text">
          <p className="delvers-page__eyebrow">Pins · ideas · moments</p>
          <h1 className="display delvers-page__title">Delvers</h1>
          <p className="delvers-page__lead">
            A calm grid of photos and clips from real people — save what inspires you, heart what resonates. No trip budget required; your feed is free to browse.
          </p>
        </div>
        {profile ? (
          <Link to="/create" className="delvers-page__create btn btn-primary">
            New post
          </Link>
        ) : null}
      </header>

      {!isLoading && data && data.length > 0 ? (
        <section className="delvers-page__stories" aria-label="Delvers stories">
          <DelversStoriesRow pins={data} myUsername={profile?.username ?? null} />
        </section>
      ) : null}

      {profile ? (
        <aside className="delvers-page__welcome" aria-label="Welcome">
          <p>
            <strong>Hi {firstName(profile)}.</strong> Your saves are private to you — curate boards in your own time. There&apos;s no algorithm judging what you like.
          </p>
        </aside>
      ) : (
        <aside className="delvers-page__welcome delvers-page__welcome--guest" aria-label="Browse freely">
          <p>
            <strong>Look around all you like.</strong> Sign in when you want to save pins or show love — no paywall on scrolling.
          </p>
          <div className="delvers-page__welcome-links">
            <Link to="/login">Sign in</Link>
            <span aria-hidden>·</span>
            <Link to="/register">Join free</Link>
          </div>
        </aside>
      )}

      <div className="delvers-page__search">
        <label className="visually-hidden" htmlFor="delvers-search-q">
          Search pins
        </label>
        <div className="acc-page__search-inner">
          <span className="acc-page__search-icon" aria-hidden>
            ⌕
          </span>
          <input
            id="delvers-search-q"
            type="search"
            className="acc-page__search-input input"
            placeholder="Caption, board, place, or @username…"
            value={pinSearchInput}
            onChange={(e) => setPinSearchInput(e.target.value)}
            autoComplete="off"
            enterKeyHint="search"
          />
          {pinSearchInput ? (
            <button
              type="button"
              className="acc-page__search-clear"
              onClick={() => setPinSearchInput('')}
              aria-label="Clear search"
            >
              ×
            </button>
          ) : null}
        </div>
      </div>

      {isLoading && (
        <div className="masonry delvers-page__masonry">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="masonry-item">
              <div className="delvers-pin delvers-pin--skeleton">
                <div className="skeleton delvers-pin__sk-img" style={{ height: 140 + (i % 3) * 48 }} />
                <div className="delvers-pin__sk-foot">
                  <div className="skeleton" style={{ height: 12, width: '70%', borderRadius: 6 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && filteredPins.length > 0 ? (
        <div className="masonry delvers-page__masonry">
          {filteredPins.map((p) => {
            const name = p.author.display_name || p.author.username
            const initial = name.trim().charAt(0).toUpperCase() || '?'
            const likeBusy = likeMut.isPending && likeMut.variables === p.id
            const saveBusy = saveMut.isPending && saveMut.variables === p.id

            return (
              <article key={p.id} className="masonry-item">
                <div className="delvers-pin">
                  <div className="delvers-pin__media">
                    <Link to={`/posts/${p.id}`} className="delvers-pin__media-link">
                      <span className="visually-hidden">View full post</span>
                      <PostMedia image={p.image} video={p.video} variant="pin" alt="" />
                    </Link>
                    <div className="delvers-pin__float">
                      {p.delvers_board ? <span className="delvers-pin__board">{p.delvers_board}</span> : null}
                      <Link
                        to={`/u/${encodeURIComponent(p.author.username)}`}
                        className="delvers-pin__profile-link delvers-pin__profile-link--on-dark delvers-pin__float-user"
                      >
                        @{p.author.username}
                      </Link>
                    </div>
                  </div>

                  <div className="delvers-pin__footer">
                    <div className="delvers-pin__user-row">
                      <span className="delvers-pin__avatar" aria-hidden>
                        {initial}
                      </span>
                    <div className="delvers-pin__user-meta">
                      <Link
                        to={`/u/${encodeURIComponent(p.author.username)}`}
                        className="delvers-pin__profile-link delvers-pin__display-name"
                      >
                        {name}
                      </Link>
                      {p.region ? <span className="delvers-pin__region">{p.region}</span> : null}
                    </div>
                    </div>

                    {p.body ? <p className="delvers-pin__caption">{p.body}</p> : null}

                    {profile ? (
                      <div className="delvers-pin__toolbar" role="toolbar" aria-label="Post actions">
                        <button
                          type="button"
                          className={`delvers-pin__action${p.liked_by_me ? ' delvers-pin__action--liked' : ''}`}
                          onClick={() => likeMut.mutate(p.id)}
                          disabled={likeBusy}
                          aria-pressed={p.liked_by_me}
                          aria-label={p.liked_by_me ? 'Unlike' : 'Like'}
                        >
                          <span className="delvers-pin__action-icon" aria-hidden>
                            {p.liked_by_me ? '♥' : '♡'}
                          </span>
                          <span className="delvers-pin__action-count">{p.likes_count}</span>
                        </button>
                        <button
                          type="button"
                          className={`delvers-pin__action delvers-pin__action--save${p.saved_by_me ? ' delvers-pin__action--saved' : ''}`}
                          onClick={() => saveMut.mutate(p.id)}
                          disabled={saveBusy}
                          aria-pressed={p.saved_by_me}
                          aria-label={p.saved_by_me ? 'Remove save' : 'Save pin'}
                        >
                          <span className="delvers-pin__action-icon" aria-hidden>
                            {p.saved_by_me ? '★' : '☆'}
                          </span>
                          <span className="delvers-pin__action-label">{p.saved_by_me ? 'Saved' : 'Save'}</span>
                          {p.saves_count > 0 ? <span className="delvers-pin__action-count">{p.saves_count}</span> : null}
                        </button>
                      </div>
                    ) : (
                      <p className="delvers-pin__guest-hint">
                        <Link to="/login">Sign in</Link> to like &amp; save — browsing stays free.
                      </p>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      ) : null}

      {!isLoading && data && data.length > 0 && filteredPins.length === 0 && pinSearch ? (
        <div className="delvers-page__empty delvers-page__empty--search" role="status">
          <p className="delvers-page__empty-title">No pins match &ldquo;{pinSearch}&rdquo;</p>
          <p className="delvers-page__empty-text">
            Try another word — board names, places, or people.
          </p>
          <button type="button" className="btn btn-ghost delvers-page__empty-cta" onClick={() => setPinSearchInput('')}>
            Clear search
          </button>
        </div>
      ) : null}

      {!isLoading && data?.length === 0 && (
        <div className="delvers-page__empty">
          <p className="delvers-page__empty-title">Quiet grid for now</p>
          <p className="delvers-page__empty-text">
            Someone will post the first pin soon — maybe you. Share a corner of your day; expensive gear and perfect trips optional.
          </p>
          {profile ? (
            <Link to="/create" className="btn btn-primary delvers-page__empty-cta">
              Share a pin
            </Link>
          ) : (
            <Link to="/register" className="btn btn-primary delvers-page__empty-cta">
              Join to post
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
