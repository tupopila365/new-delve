import { useEffect, useRef, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark, Clock3, MapPin, Play } from 'lucide-react'
import {
  activityCover,
  activityLocationLine,
  type ActivityListing,
} from '../../utils/activityListing'
import './activities.css'

type Props = {
  activity: ActivityListing
  saved?: boolean
  saveBusy?: boolean
  onToggleSave?: (id: number, e: MouseEvent) => void
}

export function ActivityCard({ activity, saved = false, saveBusy = false, onToggleSave }: Props) {
  const cover = activityCover(activity)
  const videoRef = useRef<HTMLVideoElement>(null)
  const rootRef = useRef<HTMLAnchorElement>(null)
  const location = activityLocationLine(activity)

  useEffect(() => {
    const root = rootRef.current
    const video = videoRef.current
    if (!root || !video || cover?.kind !== 'video') return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void video.play().catch(() => {})
        else video.pause()
      },
      { threshold: 0.4 },
    )
    io.observe(root)
    return () => io.disconnect()
  }, [cover?.kind, cover?.src])

  return (
    <Link ref={rootRef} to={`/activities/${activity.id}`} className="act-card">
      <div className="act-card__media">
        {cover?.kind === 'video' ? (
          <video ref={videoRef} src={cover.src} muted loop playsInline preload="metadata" />
        ) : cover?.src ? (
          <img src={cover.src} alt="" loading="lazy" />
        ) : (
          <img
            src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=70"
            alt=""
            loading="lazy"
          />
        )}
        <span className="act-card__badge">{activity.category_label || activity.category}</span>
        {onToggleSave ? (
          <button
            type="button"
            className={`act-card__save${saved ? ' is-active' : ''}`}
            aria-label={saved ? 'Remove from saved' : 'Save activity'}
            aria-pressed={saved}
            disabled={saveBusy}
            onClick={(e) => onToggleSave(activity.id, e)}
          >
            <Bookmark size={16} strokeWidth={2.25} fill={saved ? 'currentColor' : 'none'} aria-hidden />
          </button>
        ) : null}
        {cover?.kind === 'video' ? (
          <span className="act-card__play" aria-hidden>
            <Play size={14} strokeWidth={2.5} />
          </span>
        ) : null}
      </div>
      <div className="act-card__body">
        <strong>{activity.title}</strong>
        {activity.tagline ? <span className="act-card__meta">{activity.tagline}</span> : null}
        <div className="act-card__meta">
          {location ? (
            <span>
              <MapPin size={12} strokeWidth={2.25} aria-hidden /> {location}
            </span>
          ) : null}
          {activity.duration_label ? (
            <span>
              <Clock3 size={12} strokeWidth={2.25} aria-hidden /> {activity.duration_label}
            </span>
          ) : null}
        </div>
        <span className="act-card__price">{activity.price_label || activity.price_from}</span>
      </div>
    </Link>
  )
}
