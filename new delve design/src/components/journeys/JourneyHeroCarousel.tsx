import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Clock, MapPin } from 'lucide-react'
import type { JourneySummary } from '@delve/contracts'
import { formatUsername } from '../../lib/formatUsername'
import JourneyCoverMedia from './JourneyCoverMedia'
import { lifecycleLabel, deriveJourneyLifecycle } from './journeyLifecycle'

interface Props {
  journeys: JourneySummary[]
  onOpen: (id: string) => void
}

const AUTO_ADVANCE_MS = 4200

export default function JourneyHeroCarousel({ journeys, onOpen }: Props) {
  const slides = journeys.slice(0, 5)
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Touch/drag swipe tracking
  const touchStartX = useRef<number | null>(null)

  const goTo = useCallback((idx: number) => {
    setActive(((idx % slides.length) + slides.length) % slides.length)
  }, [slides.length])

  const next = useCallback(() => goTo(active + 1), [active, goTo])
  const prev = useCallback(() => goTo(active - 1), [active, goTo])

  // Auto-advance
  useEffect(() => {
    if (paused || slides.length <= 1) return
    timerRef.current = setTimeout(next, AUTO_ADVANCE_MS)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [active, paused, slides.length, next])

  if (!slides.length) return null

  const journey = slides[active]!
  const lifecycle = deriveJourneyLifecycle(journey)

  return (
    <section
      className="relative overflow-hidden w-full"
      style={{ aspectRatio: '16/9', maxHeight: '60vh', minHeight: 220, background: 'var(--surface-subtle)' }}
      aria-label="Featured journeys carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={e => { touchStartX.current = e.touches[0]?.clientX ?? null }}
      onTouchEnd={e => {
        if (touchStartX.current === null) return
        const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current
        touchStartX.current = null
        if (Math.abs(dx) < 40) return
        dx < 0 ? next() : prev()
      }}
    >
      {/* Slides */}
      {slides.map((j, i) => (
        <div
          key={j.id}
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: i === active ? 1 : 0, pointerEvents: i === active ? 'auto' : 'none' }}
          aria-hidden={i !== active}
        >
          {/* Cover image */}
          {j.coverUrl ? (
            <JourneyCoverMedia
              url={j.coverUrl}
              resourceType={j.coverResourceType}
              className="absolute inset-0 w-full h-full object-cover"
              alt={j.title}
              variant="card"
              priority={i === 0 ? 'high' : 'low'}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'var(--surface-subtle)' }}>
              <MapPin size={48} style={{ color: 'var(--border)' }} />
            </div>
          )}

          {/* Gradient overlay */}
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.18) 50%, transparent 100%)' }}
          />

          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-14 sm:pb-12">
            <span
              className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-2"
              style={{ background: 'rgba(255,255,255,0.18)', color: '#fff', backdropFilter: 'blur(6px)' }}
            >
              {lifecycleLabel(lifecycle)}
            </span>
            <h2 className="text-xl sm:text-2xl font-extrabold m-0 mb-1 leading-tight text-white" style={{ fontFamily: 'Syne, sans-serif', textShadow: '0 1px 6px rgba(0,0,0,0.4)' }}>
              {j.title}
            </h2>
            <p className="text-xs text-white/80 m-0 mb-3 inline-flex items-center gap-2">
              {j.author.displayName || formatUsername(j.author.username)}
              {j.durationDays > 0 && (
                <span className="inline-flex items-center gap-1"><Clock size={11} />{j.durationDays}d</span>
              )}
              {j.startPlace && (
                <span className="inline-flex items-center gap-1"><MapPin size={11} />{j.startPlace}</span>
              )}
            </p>
            <button
              type="button"
              onClick={() => onOpen(j.id)}
              className="inline-flex items-center px-4 py-2 rounded-xl text-sm font-bold text-white"
              style={{ background: 'var(--primary)', border: 'none', cursor: 'pointer', boxShadow: '0 2px 12px rgba(95,47,201,0.45)' }}
              aria-label={`View journey: ${j.title}`}
            >
              View Journey →
            </button>
          </div>
        </div>
      ))}

      {/* Prev / Next — only on sm+ */}
      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 items-center justify-center w-9 h-9 rounded-full"
            style={{ background: 'rgba(0,0,0,0.35)', border: 'none', color: '#fff', cursor: 'pointer', backdropFilter: 'blur(4px)' }}
            aria-label="Previous slide"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={next}
            className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 items-center justify-center w-9 h-9 rounded-full"
            style={{ background: 'rgba(0,0,0,0.35)', border: 'none', color: '#fff', cursor: 'pointer', backdropFilter: 'blur(4px)' }}
            aria-label="Next slide"
          >
            <ChevronRight size={18} />
          </button>
        </>
      )}

      {/* Dot pagination */}
      {slides.length > 1 && (
        <div
          className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5"
          role="tablist"
          aria-label="Carousel slide indicators"
        >
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={`Slide ${i + 1}`}
              onClick={() => goTo(i)}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === active ? 20 : 6,
                height: 6,
                background: i === active ? '#fff' : 'rgba(255,255,255,0.45)',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            />
          ))}
        </div>
      )}
    </section>
  )
}
