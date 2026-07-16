import { useState } from 'react'
import { CloudRain, Pencil, RefreshCw, Sparkles } from 'lucide-react'
import type { TripReflections } from '../../data/mockTrips'
import { JourneySection } from './JourneySection'

type Props = {
  reflections?: TripReflections | null
  isAuthor?: boolean
  saving?: boolean
  onSave?: (next: TripReflections) => void | Promise<void>
  className?: string
}

const EMPTY: TripReflections = { highs: [], lows: [], would_change: '', takeaway: '' }

function linesToList(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}

export function JourneyReflections({ reflections, isAuthor = false, saving = false, onSave, className = '' }: Props) {
  const data = reflections ?? EMPTY
  const hasHighs = data.highs.length > 0
  const hasLows = data.lows.length > 0
  const hasChange = Boolean(data.would_change.trim())
  const hasAny = hasHighs || hasLows || hasChange || Boolean(data.takeaway.trim())

  const [editing, setEditing] = useState(false)
  const [highs, setHighs] = useState(data.highs.join('\n'))
  const [lows, setLows] = useState(data.lows.join('\n'))
  const [wouldChange, setWouldChange] = useState(data.would_change)
  const [takeaway, setTakeaway] = useState(data.takeaway)

  function openEditor() {
    setHighs(data.highs.join('\n'))
    setLows(data.lows.join('\n'))
    setWouldChange(data.would_change)
    setTakeaway(data.takeaway)
    setEditing(true)
  }

  async function submit() {
    if (!onSave) return
    await onSave({
      highs: linesToList(highs),
      lows: linesToList(lows),
      would_change: wouldChange.trim(),
      takeaway: takeaway.trim(),
    })
    setEditing(false)
  }

  if (!hasAny && !isAuthor) return null

  const editAction =
    isAuthor && onSave && !editing ? (
      <button type="button" className="jd-btn jd-btn--sm" onClick={openEditor}>
        <Pencil size={13} strokeWidth={2.25} aria-hidden />
        {hasAny ? 'Edit' : 'Add reflections'}
      </button>
    ) : null

  return (
    <JourneySection title="Reflections" action={editAction} className={`jn-reflect ${className}`.trim()}>
      {editing ? (
        <div className="jn-reflect__editor">
          <label className="jn-reflect__field">
            <span>Highs (one per line)</span>
            <textarea rows={3} value={highs} onChange={(e) => setHighs(e.target.value)} placeholder={'Sunrise at the dunes\nThe food in Swakop'} />
          </label>
          <label className="jn-reflect__field">
            <span>Lows (one per line)</span>
            <textarea rows={3} value={lows} onChange={(e) => setLows(e.target.value)} placeholder={'Midday heat\nLong gravel roads'} />
          </label>
          <label className="jn-reflect__field">
            <span>What I'd do differently</span>
            <textarea rows={2} value={wouldChange} onChange={(e) => setWouldChange(e.target.value)} />
          </label>
          <label className="jn-reflect__field">
            <span>The takeaway (closing thought)</span>
            <textarea rows={2} value={takeaway} onChange={(e) => setTakeaway(e.target.value)} />
          </label>
          <div className="jn-reflect__actions">
            <button type="button" className="jd-btn" onClick={() => setEditing(false)} disabled={saving}>
              Cancel
            </button>
            <button type="button" className="jd-btn jd-btn--primary" onClick={() => void submit()} disabled={saving}>
              {saving ? 'Saving…' : 'Save reflections'}
            </button>
          </div>
        </div>
      ) : hasAny ? (
        <div className="jn-reflect__grid">
          {hasHighs ? (
            <div className="jn-reflect__card jn-reflect__card--high">
              <p className="jn-reflect__label">
                <Sparkles size={15} strokeWidth={2.25} aria-hidden />
                Highs
              </p>
              <ul className="jn-reflect__list">
                {data.highs.map((h, i) => (
                  <li key={`high-${i}`}>{h}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {hasLows ? (
            <div className="jn-reflect__card jn-reflect__card--low">
              <p className="jn-reflect__label">
                <CloudRain size={15} strokeWidth={2.25} aria-hidden />
                Lows
              </p>
              <ul className="jn-reflect__list">
                {data.lows.map((l, i) => (
                  <li key={`low-${i}`}>{l}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {hasChange ? (
            <div className="jn-reflect__card jn-reflect__card--change">
              <p className="jn-reflect__label">
                <RefreshCw size={15} strokeWidth={2.25} aria-hidden />
                What I'd do differently
              </p>
              <p className="jn-reflect__body">{data.would_change}</p>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="jn-reflect__empty">Share the highs, the lows, and what you'd do differently.</p>
      )}
    </JourneySection>
  )
}

export function JourneyTakeaway({ text, className = '' }: { text?: string; className?: string }) {
  const value = text?.trim()
  if (!value) return null
  return (
    <section className={`jn-takeaway ${className}`.trim()} aria-label="The takeaway">
      <p className="jn-takeaway__label">The takeaway</p>
      <p className="jn-takeaway__body">{value}</p>
    </section>
  )
}
