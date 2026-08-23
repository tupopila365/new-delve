import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { CommunityRule } from '@delve/contracts'
import { createCommunityReport, listCommunityRules } from '../../api/communityClient'

const REASONS = [
  'Spam',
  'Harassment',
  'Dangerous advice',
  'Scam or fake deal',
  'Inappropriate content',
  'Other',
]

export default function CommunityReportSheet({
  open,
  communityId,
  targetType,
  targetId,
  onClose,
}: {
  open: boolean
  communityId: string
  targetType: 'POST' | 'COMMENT' | 'USER'
  targetId: string
  onClose: () => void
}) {
  const [reason, setReason] = useState(REASONS[0])
  const [description, setDescription] = useState('')
  const [ruleId, setRuleId] = useState<string>('')
  const [rules, setRules] = useState<CommunityRule[]>([])
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!open) return
    void listCommunityRules(communityId)
      .then(setRules)
      .catch(() => setRules([]))
  }, [open, communityId])

  useEffect(() => {
    if (!open) {
      setReason(REASONS[0])
      setDescription('')
      setRuleId('')
      setDone(false)
    }
  }, [open])

  if (!open) return null

  async function submit() {
    setBusy(true)
    try {
      await createCommunityReport(communityId, {
        targetType,
        targetId,
        reason,
        description: description.trim() || undefined,
        ruleId: ruleId || null,
      })
      setDone(true)
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
      <div className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold m-0" style={{ color: 'var(--fg)' }}>Report content</h2>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none' }}><X size={18} /></button>
        </div>
        {done ? (
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Report submitted. Moderators will review it.</p>
        ) : (
          <>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--fg-muted)' }}>Reason</label>
            <select value={reason} onChange={e => setReason(e.target.value)} style={inputStyle} className="mb-3">
              {REASONS.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            {rules.length > 0 && (
              <>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--fg-muted)' }}>Community rule (optional)</label>
                <select value={ruleId} onChange={e => setRuleId(e.target.value)} style={inputStyle} className="mb-3">
                  <option value="">None</option>
                  {rules.map(r => (
                    <option key={r.id} value={r.id}>{r.title}</option>
                  ))}
                </select>
              </>
            )}
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--fg-muted)' }}>Details (optional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} style={inputStyle} className="mb-3 resize-none" />
            <button type="button" disabled={busy} onClick={() => void submit()} className="w-full py-2.5 rounded-xl font-bold text-sm disabled:opacity-60" style={{ background: 'var(--primary)', color: '#fff', border: 'none' }}>
              {busy ? 'Submitting…' : 'Submit report'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
