import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { ContentReportReason, ContentReportTargetType } from '@delve/contracts'
import { reportContent } from '../../api/socialClient'

const REASONS: Array<{ value: ContentReportReason; label: string }> = [
  { value: 'SPAM', label: 'Spam' },
  { value: 'SCAM_OR_FRAUD', label: 'Scam or fraud' },
  { value: 'HARASSMENT', label: 'Harassment' },
  { value: 'HATE_OR_ABUSE', label: 'Hate or abuse' },
  { value: 'SEXUAL_CONTENT', label: 'Sexual content' },
  { value: 'VIOLENCE_OR_THREATS', label: 'Violence or threats' },
  { value: 'MISLEADING_INFORMATION', label: 'Misleading information' },
  { value: 'ILLEGAL_OR_DANGEROUS', label: 'Illegal or dangerous' },
  { value: 'PRIVACY', label: 'Privacy' },
  { value: 'IMPERSONATION', label: 'Impersonation' },
  { value: 'OTHER', label: 'Other' },
]

export default function ContentReportSheet({
  open,
  targetType,
  targetId,
  onClose,
}: {
  open: boolean
  targetType: ContentReportTargetType
  targetId: string
  onClose: () => void
}) {
  const [reason, setReason] = useState<ContentReportReason>('SPAM')
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setReason('SPAM')
      setDetails('')
      setDone(false)
      setError(null)
    }
  }, [open])

  if (!open) return null

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      const result = await reportContent({
        targetType,
        targetId,
        reason,
        details: details.trim() || null,
      })
      setDone(true)
      void result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send report')
    } finally {
      setBusy(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 12,
    border: '1px solid var(--border)',
    background: 'var(--surface-subtle)',
    color: 'var(--fg)',
  } as const

  return (
    <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center">
      <button type="button" aria-label="Close" className="absolute inset-0 border-0" style={{ background: 'rgba(0,0,0,0.55)' }} onClick={onClose} />
      <div className="relative w-full max-w-md rounded-t-2xl sm:rounded-2xl p-4" style={{ background: 'var(--surface)' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold m-0" style={{ fontFamily: 'Syne, sans-serif' }}>
            Report
          </h2>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--fg)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>
        {done ? (
          <p className="text-sm m-0">Thanks for your report. Our team will review it.</p>
        ) : (
          <>
            <label className="text-xs block mb-2">
              Reason
              <select className="mt-1" style={inputStyle} value={reason} onChange={e => setReason(e.target.value as ContentReportReason)}>
                {REASONS.map(item => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs block mb-3">
              Optional details
              <textarea className="mt-1" style={inputStyle} rows={3} value={details} onChange={e => setDetails(e.target.value)} maxLength={2000} />
            </label>
            {error ? <p className="text-xs m-0 mb-2" style={{ color: '#C83B3B' }}>{error}</p> : null}
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit()}
              className="w-full rounded-xl py-2.5 text-sm font-semibold"
              style={{ background: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer' }}
            >
              Submit report
            </button>
          </>
        )}
      </div>
    </div>
  )
}
