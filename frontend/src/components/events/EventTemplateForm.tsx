import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ApiError, apiFetch } from '../../api/client'
import { EventCategoryPicker } from './EventCategoryPicker'
import {
  buildEventTemplatePayload,
  canSubmitEventTemplateForm,
  emptyEventTemplateFormState,
  type EventTemplateFormState,
} from '../../utils/eventTemplateForm'

type Props = {
  businessId?: number | null
  defaultRegion?: string
  onCreated?: () => void
}

const WEEKDAY_OPTIONS = [
  { value: '0', label: 'Monday' },
  { value: '1', label: 'Tuesday' },
  { value: '2', label: 'Wednesday' },
  { value: '3', label: 'Thursday' },
  { value: '4', label: 'Friday' },
  { value: '5', label: 'Saturday' },
  { value: '6', label: 'Sunday' },
]

const RECURRENCE_OPTIONS = [
  { value: 'weekly', label: 'Every week' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Every month' },
] as const

export function EventTemplateForm({ businessId, defaultRegion = '', onCreated }: Props) {
  const qc = useQueryClient()
  const [state, setState] = useState<EventTemplateFormState>(() => emptyEventTemplateFormState(defaultRegion))
  const [err, setErr] = useState<string | null>(null)

  const canSubmit = canSubmitEventTemplateForm(state)

  const createMut = useMutation({
    mutationFn: () =>
      apiFetch('/api/events/templates/', {
        method: 'POST',
        body: JSON.stringify(buildEventTemplatePayload(state, businessId)),
      }),
    onSuccess: () => {
      setState(emptyEventTemplateFormState(defaultRegion))
      setErr(null)
      void qc.invalidateQueries({ queryKey: ['event-templates'] })
      onCreated?.()
    },
    onError: (e) => {
      setErr(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Could not save template.')
    },
  })

  const patch = (next: Partial<EventTemplateFormState>) => setState((prev) => ({ ...prev, ...next }))

  return (
    <form
      className="ce-form ev-template-form"
      onSubmit={(e) => {
        e.preventDefault()
        if (!canSubmit || createMut.isPending) return
        setErr(null)
        createMut.mutate()
      }}
      noValidate
    >
      <div className="ce-form__field">
        <label className="ce-form__label" htmlFor="et-title">
          Template name <span aria-hidden>*</span>
        </label>
        <input
          id="et-title"
          type="text"
          className="input ce-form__input"
          placeholder="Saturday farmers market, weekly jazz…"
          value={state.title}
          onChange={(e) => patch({ title: e.target.value })}
          maxLength={200}
          required
        />
      </div>

      <EventCategoryPicker value={state.category} onChange={(category) => patch({ category })} />

      <div className="ce-form__field">
        <label className="ce-form__label" htmlFor="et-desc">
          Description <span className="ce-form__label-opt">optional</span>
        </label>
        <textarea
          id="et-desc"
          className="input ce-form__textarea"
          rows={3}
          value={state.description}
          onChange={(e) => patch({ description: e.target.value })}
        />
      </div>

      <div className="ce-form__row">
        <div className="ce-form__field">
          <label className="ce-form__label" htmlFor="et-venue">
            Venue
          </label>
          <input
            id="et-venue"
            type="text"
            className="input ce-form__input"
            value={state.venue}
            onChange={(e) => patch({ venue: e.target.value })}
          />
        </div>
        <div className="ce-form__field">
          <label className="ce-form__label" htmlFor="et-city">
            City
          </label>
          <input
            id="et-city"
            type="text"
            className="input ce-form__input"
            value={state.city}
            onChange={(e) => patch({ city: e.target.value })}
          />
        </div>
      </div>

      <div className="ce-form__row">
        <div className="ce-form__field">
          <label className="ce-form__label" htmlFor="et-recurrence">
            Repeats
          </label>
          <select
            id="et-recurrence"
            className="input ce-form__input"
            value={state.recurrence}
            onChange={(e) => patch({ recurrence: e.target.value as EventTemplateFormState['recurrence'] })}
          >
            {RECURRENCE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {state.recurrence === 'monthly' ? (
          <div className="ce-form__field">
            <label className="ce-form__label" htmlFor="et-dom">
              Day of month <span aria-hidden>*</span>
            </label>
            <input
              id="et-dom"
              type="number"
              min={1}
              max={28}
              className="input ce-form__input"
              value={state.dayOfMonth}
              onChange={(e) => patch({ dayOfMonth: e.target.value })}
              required
            />
          </div>
        ) : (
          <div className="ce-form__field">
            <label className="ce-form__label" htmlFor="et-weekday">
              Day of week
            </label>
            <select
              id="et-weekday"
              className="input ce-form__input"
              value={state.weekday}
              onChange={(e) => patch({ weekday: e.target.value })}
            >
              {WEEKDAY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="ce-form__row">
        <div className="ce-form__field">
          <label className="ce-form__label" htmlFor="et-start-time">
            Start time <span aria-hidden>*</span>
          </label>
          <input
            id="et-start-time"
            type="time"
            className="input ce-form__input"
            value={state.startTime}
            onChange={(e) => patch({ startTime: e.target.value })}
            required
          />
        </div>
        <div className="ce-form__field">
          <label className="ce-form__label" htmlFor="et-duration">
            Duration <span className="ce-form__label-opt">minutes</span>
          </label>
          <input
            id="et-duration"
            type="number"
            min={15}
            step={15}
            className="input ce-form__input"
            value={state.durationMinutes}
            onChange={(e) => patch({ durationMinutes: e.target.value })}
          />
        </div>
      </div>

      <fieldset className="ce-form__fieldset">
        <legend className="ce-form__label">Entry</legend>
        <label className="ce-form__radio">
          <input
            type="radio"
            name="templateEntry"
            checked={state.isFree}
            onChange={() => patch({ isFree: true, price: '', ticketUrl: '' })}
          />
          Free entry
        </label>
        <label className="ce-form__radio">
          <input
            type="radio"
            name="templateEntry"
            checked={!state.isFree}
            onChange={() => patch({ isFree: false })}
          />
          Paid — external ticket link required
        </label>
      </fieldset>

      {!state.isFree ? (
        <>
          <div className="ce-form__field">
            <label className="ce-form__label" htmlFor="et-ticket-url">
              Ticket link <span aria-hidden>*</span>
            </label>
            <input
              id="et-ticket-url"
              type="url"
              className="input ce-form__input"
              placeholder="https://tickets.example.com/series"
              value={state.ticketUrl}
              onChange={(e) => patch({ ticketUrl: e.target.value })}
              required
            />
          </div>
          <div className="ce-form__field">
            <label className="ce-form__label" htmlFor="et-price">
              Display price <span className="ce-form__label-opt">optional</span>
            </label>
            <input
              id="et-price"
              type="text"
              inputMode="decimal"
              className="input ce-form__input"
              placeholder="80"
              value={state.price}
              onChange={(e) => patch({ price: e.target.value.replace(/[^\d.]/g, '') })}
            />
          </div>
        </>
      ) : null}

      <div className="ce-form__field">
        <label className="ce-form__label" htmlFor="et-capacity">
          Capacity <span className="ce-form__label-opt">optional</span>
        </label>
        <input
          id="et-capacity"
          type="number"
          min={1}
          className="input ce-form__input"
          value={state.capacity}
          onChange={(e) => patch({ capacity: e.target.value })}
        />
      </div>

      {err ? (
        <p className="ce-form__err" role="alert">
          {err}
        </p>
      ) : null}

      <div className="ce-form__actions">
        <button type="submit" className="btn btn-primary btn-sm" disabled={!canSubmit || createMut.isPending}>
          {createMut.isPending ? 'Saving…' : 'Save template'}
        </button>
      </div>
    </form>
  )
}
