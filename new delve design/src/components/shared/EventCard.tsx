import { useState } from 'react'
import type { MouseEvent } from 'react'
import { MapPin, Users, Star, Check, Clock } from 'lucide-react'
import EntityCard from './EntityCard'
import EntityCardMedia, { type MediaSource } from './EntityCardMedia'
import SaveButton from './SaveButton'

export type AttendanceStatus = 'GOING' | 'INTERESTED' | null

export interface EventCardProps {
  id: string
  title: string
  location: string
  startAt: string
  endAt?: string
  media: MediaSource
  attendingCount: number
  interestedCount?: number
  myAttendance?: AttendanceStatus
  onAttendanceChange?: (id: string, status: AttendanceStatus) => void
  category?: string
  isSaved?: boolean
  onSave?: (id: string) => void
  onClick?: () => void
  className?: string
}

function parseDate(iso: string) {
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return { month: 'TBD', day: '--', weekday: '', time: '' }
    const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase()
    const day = d.getDate()
    const weekday = d.toLocaleString('en-US', { weekday: 'short' })
    const time = d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    return { month, day, weekday, time }
  } catch {
    return { month: 'TBD', day: '--', weekday: '', time: '' }
  }
}

export default function EventCard({
  id,
  title,
  location,
  startAt,
  endAt,
  media,
  attendingCount: initialAttendingCount = 0,
  interestedCount: initialInterestedCount = 0,
  myAttendance: initialMyAttendance = null,
  onAttendanceChange,
  category,
  isSaved = false,
  onSave,
  onClick,
  className = '',
}: EventCardProps) {
  const [attendance, setAttendance] = useState<AttendanceStatus>(initialMyAttendance)
  const [attendingCount, setAttendingCount] = useState(initialAttendingCount)
  const [interestedCount, setInterestedCount] = useState(initialInterestedCount)

  const date = parseDate(startAt)

  const handleToggleInterested = (e: MouseEvent) => {
    e.stopPropagation()
    const next: AttendanceStatus = attendance === 'INTERESTED' ? null : 'INTERESTED'
    
    // Adjust counts
    if (attendance === 'GOING') {
      setAttendingCount(c => Math.max(0, c - 1))
    }
    if (next === 'INTERESTED') {
      setInterestedCount(c => c + 1)
    } else if (attendance === 'INTERESTED') {
      setInterestedCount(c => Math.max(0, c - 1))
    }

    setAttendance(next)
    onAttendanceChange?.(id, next)
  }

  const handleToggleGoing = (e: MouseEvent) => {
    e.stopPropagation()
    const next: AttendanceStatus = attendance === 'GOING' ? null : 'GOING'

    // Adjust counts
    if (attendance === 'INTERESTED') {
      setInterestedCount(c => Math.max(0, c - 1))
    }
    if (next === 'GOING') {
      setAttendingCount(c => c + 1)
    } else if (attendance === 'GOING') {
      setAttendingCount(c => Math.max(0, c - 1))
    }

    setAttendance(next)
    onAttendanceChange?.(id, next)
  }

  const handleSave = () => {
    onSave?.(id)
  }

  return (
    <EntityCard onClick={onClick} className={className} ariaLabel={`Event: ${title}`}>
      {/* Multimedia Header with Calendar Tear-Off UI & Save Button */}
      <EntityCardMedia
        media={media}
        aspectRatio="wide"
        alt={title}
        overlayTopLeft={
          <div className="flex items-start gap-2">
            {/* Calendar Tear-Off UI */}
            <div
              className="w-12 rounded-xl overflow-hidden shadow-lg border border-white/20 text-center flex flex-col backdrop-blur-md"
              style={{ background: 'rgba(255,255,255,0.95)' }}
            >
              <div
                className="py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white"
                style={{ background: 'linear-gradient(135deg, var(--primary) 0%, #E05C1A 100%)' }}
              >
                {date.month}
              </div>
              <div className="py-1">
                <span
                  className="block text-base font-extrabold leading-none"
                  style={{ fontFamily: 'Syne, sans-serif', color: '#1A1814' }}
                >
                  {date.day}
                </span>
                <span className="block text-[9px] font-semibold uppercase text-gray-500 mt-0.5">
                  {date.weekday}
                </span>
              </div>
            </div>

            {category && (
              <span
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-md"
                style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}
              >
                {category}
              </span>
            )}
          </div>
        }
        overlayTopRight={
          onSave ? (
            <SaveButton
              isSaved={isSaved}
              onClick={handleSave}
              size="sm"
              variant="filled"
              ariaLabel={`Save event ${title}`}
            />
          ) : undefined
        }
      />

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs mb-1.5" style={{ color: 'var(--fg-muted)' }}>
            <Clock size={12} className="text-[var(--primary)] shrink-0" />
            <span>{date.time || 'All Day'}</span>
            <span>·</span>
            <span className="flex items-center gap-1 truncate">
              <MapPin size={11} className="shrink-0" />
              <span className="truncate">{location}</span>
            </span>
          </div>

          <h3
            className="text-base font-bold m-0 mb-2 line-clamp-1"
            style={{ fontFamily: 'Syne, var(--font-display, sans-serif)', color: 'var(--fg)' }}
          >
            {title}
          </h3>

          <div className="flex items-center gap-3 text-xs mb-3" style={{ color: 'var(--fg-muted)' }}>
            <span className="inline-flex items-center gap-1">
              <Users size={12} className="text-[var(--primary)]" />
              <strong style={{ color: 'var(--fg)' }}>{attendingCount}</strong> going
            </span>
            {interestedCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <Star size={12} className="text-amber-400" />
                <strong style={{ color: 'var(--fg)' }}>{interestedCount}</strong> interested
              </span>
            )}
          </div>
        </div>

        {/* Social Media RSVP Action Bar */}
        <div className="pt-3 border-t flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
          <button
            type="button"
            onClick={handleToggleInterested}
            className="min-h-[44px] flex-1 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            style={{
              background: attendance === 'INTERESTED' ? 'rgba(140,82,255,0.15)' : 'var(--surface-subtle)',
              color: attendance === 'INTERESTED' ? 'var(--primary)' : 'var(--fg)',
              border: `1px solid ${attendance === 'INTERESTED' ? 'var(--primary)' : 'var(--border)'}`,
            }}
          >
            <Star
              size={14}
              className={attendance === 'INTERESTED' ? 'fill-[var(--primary)] text-[var(--primary)]' : ''}
            />
            <span>{attendance === 'INTERESTED' ? 'Interested ✓' : 'Interested'}</span>
          </button>

          <button
            type="button"
            onClick={handleToggleGoing}
            className="min-h-[44px] flex-1 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            style={{
              background: attendance === 'GOING' ? '#10A760' : 'var(--primary)',
              color: '#fff',
              border: 'none',
              boxShadow: attendance === 'GOING' ? '0 2px 8px rgba(16,167,96,0.25)' : 'none',
            }}
          >
            <Check size={14} />
            <span>{attendance === 'GOING' ? 'Going ✓' : 'Going'}</span>
          </button>
        </div>
      </div>
    </EntityCard>
  )
}
