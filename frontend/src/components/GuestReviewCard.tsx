import { useState } from 'react'
import { MiniRating } from './MiniRating'

export type ReviewItem = {
  name: string
  place: string
  rating: number
  body: string
  avatar: string | null
  sellerReply?: string
}

/** Collapse long bodies; “Read more” reveals full text. */
export const REVIEW_BODY_COLLAPSE_CHARS = 200

function reviewInitials(name: string): string {
  const parts = name
    .replace(/&/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0][0]
  const last = parts.length > 1 ? parts[parts.length - 1][0] : ''
  return `${first}${last}`.toUpperCase().slice(0, 2)
}

function parseReviewAvatar(o: Record<string, unknown>): string | null {
  const raw = o.avatar ?? o.avatar_url ?? o.photo ?? o.profile_image
  if (typeof raw !== 'string') return null
  const s = raw.trim()
  return s ? s : null
}

function parseReviewRating(v: unknown): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v
  if (typeof v === 'string') {
    const n = parseFloat(v)
    return Number.isNaN(n) ? 0 : n
  }
  return 0
}

export function normalizeReviews(raw: unknown): ReviewItem[] {
  if (!Array.isArray(raw)) return []
  const out: ReviewItem[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const o = row as Record<string, unknown>
    const name = typeof o.name === 'string' ? o.name.trim() : ''
    const place = typeof o.place === 'string' ? o.place.trim() : ''
    const body = typeof o.body === 'string' ? o.body.trim() : ''
    const rating = parseReviewRating(o.rating)
    const avatar = parseReviewAvatar(o)
    const sellerRaw = o.seller_reply ?? o.sellerReply ?? o.response
    const sellerReply =
      typeof sellerRaw === 'string' && sellerRaw.trim() ? sellerRaw.trim() : undefined
    if (name && body) out.push({ name, place, body, rating, avatar, sellerReply })
  }
  return out
}

export function GuestReviewCard({ r }: { r: ReviewItem }) {
  const [expanded, setExpanded] = useState(false)
  const [avatarFailed, setAvatarFailed] = useState(false)
  const showPhoto = r.avatar && !avatarFailed
  const canToggle = r.body.length > REVIEW_BODY_COLLAPSE_CHARS
  const clamped = canToggle && !expanded

  return (
    <blockquote className="acc-detail__review card">
      <div className="acc-detail__review-layout">
        <div className="acc-detail__review-avatar-wrap">
          {showPhoto ? (
            <img
              className="acc-detail__review-avatar acc-detail__review-avatar--img"
              src={r.avatar!}
              alt=""
              width={48}
              height={48}
              loading="lazy"
              decoding="async"
              onError={() => setAvatarFailed(true)}
            />
          ) : (
            <span className="acc-detail__review-avatar acc-detail__review-avatar--initials" aria-hidden>
              {reviewInitials(r.name)}
            </span>
          )}
        </div>
        <div className="acc-detail__review-main">
          <div className="acc-detail__review-head">
            <span className="acc-detail__review-name">{r.name}</span>
            {r.place ? <span className="acc-detail__review-place">{r.place}</span> : null}
            {r.rating > 0 ? (
              <MiniRating rating={r.rating} className="acc-detail__review-rating" />
            ) : null}
          </div>
          <p className={`acc-detail__review-body${clamped ? ' acc-detail__review-body--clamped' : ''}`}>{r.body}</p>
          {canToggle ? (
            <button
              type="button"
              className="acc-detail__review-toggle"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
            >
              {expanded ? 'Show less' : 'Read more'}
            </button>
          ) : null}
          {r.sellerReply ? (
            <div className="acc-detail__review-reply">
              <span className="acc-detail__review-reply-label">Response from host</span>
              <p className="acc-detail__review-reply-body">{r.sellerReply}</p>
            </div>
          ) : null}
        </div>
      </div>
    </blockquote>
  )
}
