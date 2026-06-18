import { Languages, MapPin } from 'lucide-react'
import { BookingNotesField } from '../BookingNotesField'
import { formatGuideDate } from '../bookingUtils'

type Props = {
  date: string
  startTime: string
  groupSize: number
  languagePref: string
  languages: string[]
  meetingPoint: string
  notes: string
  defaultMeetingPoint?: string
  onLanguageChange: (v: string) => void
  onMeetingPointChange: (v: string) => void
  onNotesChange: (v: string) => void
  onBack: () => void
  onContinue: () => void
}

export function GuideDetailsPanel({
  date,
  startTime,
  groupSize,
  languagePref,
  languages,
  meetingPoint,
  notes,
  defaultMeetingPoint,
  onLanguageChange,
  onMeetingPointChange,
  onNotesChange,
  onBack,
  onContinue,
}: Props) {
  return (
    <section className="guide-card guide-details" aria-labelledby="guide-details-title">
      <h2 id="guide-details-title" className="guide-card__title">
        Trip details
      </h2>
      <p className="guide-card__sub">
        Tell the guide where to meet and anything they should know before confirming.
      </p>

      <ul className="guide-avail__facts">
        <li className="guide-avail__fact">
          <span>Date</span>
          <span>{formatGuideDate(date)}</span>
        </li>
        {startTime ? (
          <li className="guide-avail__fact">
            <span>Start time</span>
            <span>{startTime}</span>
          </li>
        ) : null}
        <li className="guide-avail__fact">
          <span>Travellers</span>
          <span>{groupSize}</span>
        </li>
      </ul>

      {languages.length > 0 ? (
        <label className="guide-details__field">
          <span className="label">
            <Languages size={14} strokeWidth={2.25} aria-hidden style={{ verticalAlign: -2, marginRight: 4 }} />
            Preferred language
          </span>
          <select className="input" value={languagePref} onChange={(e) => onLanguageChange(e.target.value)}>
            {languages.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="guide-details__field">
        <span className="label">
          <MapPin size={14} strokeWidth={2.25} aria-hidden style={{ verticalAlign: -2, marginRight: 4 }} />
          Pickup / meeting note
        </span>
        <textarea
          className="input"
          rows={2}
          value={meetingPoint}
          onChange={(e) => onMeetingPointChange(e.target.value)}
          placeholder={defaultMeetingPoint || 'Hotel lobby, landmark, or station exit'}
        />
      </label>

      <BookingNotesField
        id="guide-book-notes"
        label="Message to guide"
        value={notes}
        onChange={onNotesChange}
        placeholder="What you want to see, pace, accessibility needs, kids, photography interests…"
        hint="A short message helps the guide tailor the experience."
      />

      <div className="guide-card__actions">
        <button type="button" className="btn btn-primary btn-block" onClick={onContinue}>
          Review request
        </button>
        <button type="button" className="btn btn-ghost btn-block" onClick={onBack}>
          Back to availability
        </button>
      </div>
    </section>
  )
}
