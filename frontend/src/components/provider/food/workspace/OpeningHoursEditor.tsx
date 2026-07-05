import type { DayKey, OpeningHoursSchedule } from '../openingHoursUtils'
import { DAY_LABELS, DAY_ORDER } from '../openingHoursUtils'
import { copyMondayToWeekdays, copyWeekdaysToAll } from '../openingHoursUtils'

type Props = {
  schedule: OpeningHoursSchedule
  onChange: (schedule: OpeningHoursSchedule) => void
}

function patchDay(schedule: OpeningHoursSchedule, day: DayKey, partial: Partial<OpeningHoursSchedule[number]>) {
  return schedule.map((d) => (d.day === day ? { ...d, ...partial } : d))
}

export function OpeningHoursEditor({ schedule, onChange }: Props) {
  return (
    <div className="fv-hours">
      <div className="fv-hours__quick">
        <button type="button" className="fv-hours__quick-btn" onClick={() => onChange(copyMondayToWeekdays(schedule))}>
          Copy Monday to weekdays
        </button>
        <button type="button" className="fv-hours__quick-btn" onClick={() => onChange(copyWeekdaysToAll(schedule))}>
          Same hours Mon–Sat
        </button>
      </div>
      <ul className="fv-hours__list">
        {DAY_ORDER.map((day) => {
          const row = schedule.find((d) => d.day === day)!
          return (
            <li key={day} className={`fv-hours__row${row.open ? '' : ' fv-hours__row--closed'}`}>
              <label className="fv-hours__day">
                <input
                  type="checkbox"
                  checked={row.open}
                  onChange={(e) => onChange(patchDay(schedule, day, { open: e.target.checked }))}
                />
                <span>{DAY_LABELS[day]}</span>
              </label>
              {row.open ? (
                <div className="fv-hours__times">
                  <label>
                    <span className="visually-hidden">Opens</span>
                    <input
                      type="time"
                      value={row.opens}
                      onChange={(e) => onChange(patchDay(schedule, day, { opens: e.target.value }))}
                    />
                  </label>
                  <span aria-hidden>–</span>
                  <label>
                    <span className="visually-hidden">Closes</span>
                    <input
                      type="time"
                      value={row.closes}
                      onChange={(e) => onChange(patchDay(schedule, day, { closes: e.target.value }))}
                    />
                  </label>
                </div>
              ) : (
                <span className="fv-hours__closed-label">Closed</span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
