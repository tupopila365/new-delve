import { CalendarDays, Clock } from 'lucide-react'

type DateField = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  min?: string
  required?: boolean
}

type TimeOption = { label: string; value: string }

type Props = {
  mode?: 'single' | 'range'
  checkIn?: DateField
  checkOut?: DateField
  date?: DateField
  time?: DateField & { options?: TimeOption[] }
  className?: string
}

export function BookingDateFields({ mode = 'range', checkIn, checkOut, date, time, className = '' }: Props) {
  return (
    <div className={`bk-dates ${className}`.trim()}>
      {mode === 'range' && checkIn && checkOut ? (
        <>
          <div className="field">
            <label className="label bk-dates__label" htmlFor={checkIn.id}>
              <CalendarDays size={14} strokeWidth={2.25} aria-hidden />
              {checkIn.label}
            </label>
            <input
              id={checkIn.id}
              className="input"
              type="date"
              required={checkIn.required ?? true}
              min={checkIn.min}
              value={checkIn.value}
              onChange={(e) => checkIn.onChange(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="label bk-dates__label" htmlFor={checkOut.id}>
              <CalendarDays size={14} strokeWidth={2.25} aria-hidden />
              {checkOut.label}
            </label>
            <input
              id={checkOut.id}
              className="input"
              type="date"
              required={checkOut.required ?? true}
              min={checkOut.min ?? (checkIn.value || checkIn.min)}
              value={checkOut.value}
              onChange={(e) => checkOut.onChange(e.target.value)}
            />
          </div>
        </>
      ) : null}
      {mode === 'single' && date ? (
        <div className="field">
          <label className="label bk-dates__label" htmlFor={date.id}>
            <CalendarDays size={14} strokeWidth={2.25} aria-hidden />
            {date.label}
          </label>
          <input
            id={date.id}
            className="input"
            type="date"
            required={date.required ?? true}
            min={date.min}
            value={date.value}
            onChange={(e) => date.onChange(e.target.value)}
          />
        </div>
      ) : null}
      {time ? (
        <div className="field">
          <label className="label bk-dates__label" htmlFor={time.id}>
            <Clock size={14} strokeWidth={2.25} aria-hidden />
            {time.label}
          </label>
          {time.options ? (
            <select id={time.id} className="input" value={time.value} onChange={(e) => time.onChange(e.target.value)}>
              <option value="">Select time</option>
              {time.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={time.id}
              className="input"
              type="time"
              value={time.value}
              onChange={(e) => time.onChange(e.target.value)}
            />
          )}
        </div>
      ) : null}
    </div>
  )
}
