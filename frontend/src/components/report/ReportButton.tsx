import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Flag } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { apiFetch } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import './report-sheet.css'

export type ReportTarget = {
  target_type: string
  target_id: string
  target_label?: string
}

const REASONS = [
  { value: 'spam', label: 'Spam or misleading' },
  { value: 'harassment', label: 'Harassment or abuse' },
  { value: 'fake_or_misleading', label: 'Fake or misleading' },
  { value: 'safety_concern', label: 'Safety concern' },
  { value: 'inappropriate_content', label: 'Inappropriate content' },
  { value: 'fraud', label: 'Fraud or scam' },
  { value: 'other', label: 'Other' },
] as const

type Props = {
  target: ReportTarget
  triggerLabel?: string
  className?: string
  iconOnly?: boolean
  iconSize?: number
}

export function ReportButton({ target, triggerLabel = 'Report', className = '', iconOnly, iconSize = 14 }: Props) {
  const { profile } = useAuth()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState<(typeof REASONS)[number]['value']>('spam')
  const [description, setDescription] = useState('')
  const [done, setDone] = useState(false)

  const submitMut = useMutation({
    mutationFn: () =>
      apiFetch('/api/reports/', {
        method: 'POST',
        body: JSON.stringify({
          target_type: target.target_type,
          target_id: target.target_id,
          target_label: target.target_label,
          reason,
          description: description.trim(),
        }),
      }),
    onSuccess: () => {
      setDone(true)
      setDescription('')
    },
  })

  if (!profile) {
    return (
      <Link to="/login" className={`report-btn ${className}`.trim()} title="Sign in to report">
        {iconOnly ? <Flag size={iconSize} strokeWidth={2.25} aria-hidden /> : triggerLabel}
      </Link>
    )
  }

  return (
    <>
      <button
        type="button"
        className={`report-btn ${className}`.trim()}
        onClick={() => {
          setOpen(true)
          setDone(false)
        }}
        aria-label={triggerLabel}
      >
        {iconOnly ? <Flag size={iconSize} strokeWidth={2.25} aria-hidden /> : triggerLabel}
      </button>

      {open ? (
        <>
          <button type="button" className="report-sheet__backdrop" aria-label="Close" onClick={() => setOpen(false)} />
          <div className="report-sheet" role="dialog" aria-modal="true" aria-labelledby="report-sheet-title">
            <h2 id="report-sheet-title">Report content</h2>
            <p className="report-sheet__sub">
              {target.target_label ?? `${target.target_type} ${target.target_id}`}
            </p>
            {done ? (
              <p className="report-sheet__done" role="status">
                Thank you — our team will review this report.
              </p>
            ) : (
              <>
                <label className="report-sheet__field">
                  <span>Reason</span>
                  <select value={reason} onChange={(e) => setReason(e.target.value as typeof reason)}>
                    {REASONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="report-sheet__field">
                  <span>Details (optional)</span>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell us what happened…"
                  />
                </label>
                {submitMut.isError ? (
                  <p className="report-sheet__error" role="alert">
                    Could not submit report. Please try again.
                  </p>
                ) : null}
                <div className="report-sheet__actions">
                  <button type="button" className="report-sheet__cancel" onClick={() => setOpen(false)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="report-sheet__submit"
                    disabled={submitMut.isPending}
                    onClick={() => submitMut.mutate()}
                  >
                    {submitMut.isPending ? 'Submitting…' : 'Submit report'}
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      ) : null}
    </>
  )
}
