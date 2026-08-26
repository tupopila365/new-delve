import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import type { AdminModerationDetail, ContentModerationActionType, ContentReportReason } from '@delve/contracts'
import { adminDecideModerationCase, adminGetModerationCase } from '../api/moderation'
import { AdminPageHeader } from '../components/admin/AdminPageHeader'
import { ErrorState } from '../components/admin/ErrorState'
import { LoadingSkeleton } from '../components/admin/LoadingSkeleton'
import { StatusBadge } from '../components/admin/StatusBadge'

const REASONS: ContentReportReason[] = [
  'SPAM',
  'SCAM_OR_FRAUD',
  'HARASSMENT',
  'HATE_OR_ABUSE',
  'SEXUAL_CONTENT',
  'VIOLENCE_OR_THREATS',
  'MISLEADING_INFORMATION',
  'ILLEGAL_OR_DANGEROUS',
  'PRIVACY',
  'IMPERSONATION',
  'COMMUNITY_RULE_VIOLATION',
  'OTHER',
]

function confirmCopy(action: ContentModerationActionType) {
  if (action === 'REMOVE') {
    return {
      title: 'Remove this content?',
      body: 'It will no longer appear publicly on Delve. The report and moderation history will be preserved.',
      confirm: 'Remove',
    }
  }
  if (action === 'HIDE') {
    return {
      title: 'Hide this content?',
      body: 'It will no longer appear publicly on Delve. History and media records stay in place.',
      confirm: 'Hide',
    }
  }
  if (action === 'PLATFORM_RESTRICT') {
    return {
      title: 'Restrict this community on the platform?',
      body: 'The community will no longer be discoverable. Community records and reports remain.',
      confirm: 'Restrict community',
    }
  }
  if (action === 'RESTORE') {
    return {
      title: 'Restore this content?',
      body: 'It can appear publicly again if it still meets its own visibility rules. Previous moderation history remains.',
      confirm: 'Restore',
    }
  }
  return {
    title: 'Take no enforcement action?',
    body: 'Open reports will be closed. Content visibility will not change.',
    confirm: 'Confirm',
  }
}

export default function ModerationCasePage() {
  const { targetType = '', targetId = '' } = useParams()
  const [detail, setDetail] = useState<AdminModerationDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [reason, setReason] = useState<ContentReportReason>('SPAM')
  const [note, setNote] = useState('')
  const [pending, setPending] = useState<ContentModerationActionType | null>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      setDetail(await adminGetModerationCase(targetType, targetId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load case')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [targetType, targetId])

  async function apply(action: ContentModerationActionType) {
    setBusy(true)
    setError(null)
    try {
      const next = await adminDecideModerationCase(targetType, targetId, {
        action,
        reason: action === 'NO_ACTION' || action === 'RESTORE' ? undefined : reason,
        note: note.trim() || null,
        reportResolution: action === 'NO_ACTION' ? 'DISMISSED' : 'RESOLVED',
      })
      setDetail(next)
      setPending(null)
      setNote('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not apply action')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Moderation review"
        description="Review the content, reports, and domain-safe actions. Account restriction is a separate Traveler 360 action."
      />
      {loading ? <LoadingSkeleton rows={4} /> : null}
      {error ? <ErrorState title="Case unavailable" detail={error} onRetry={() => void load()} /> : null}
      {!loading && detail ? (
        <div className="moderation-case-layout">
          <div className="flex flex-col gap-4 min-w-0">
            <section>
              <h2 className="text-sm font-semibold m-0 mb-2">Content</h2>
              <p className="text-sm m-0">{detail.preview}</p>
              {detail.body ? <p className="text-sm m-0 mt-2 whitespace-pre-wrap">{detail.body}</p> : null}
              <div className="flex flex-wrap gap-2 mt-2">
                {detail.mediaUrls.map(url => (
                  <img key={url} src={url} alt="" style={{ maxWidth: 160, maxHeight: 120, objectFit: 'cover', borderRadius: 8 }} />
                ))}
              </div>
              <p className="text-xs m-0 mt-2" style={{ color: 'var(--muted)' }}>
                Created {detail.createdAt ? new Date(detail.createdAt).toLocaleString() : '—'} · visibility {detail.visibility || '—'} ·{' '}
                <StatusBadge>{detail.contentStatus}</StatusBadge>
                {detail.moderationStatus ? (
                  <>
                    {' '}
                    <StatusBadge>{detail.moderationStatus}</StatusBadge>
                  </>
                ) : null}
              </p>
            </section>
            <section>
              <h2 className="text-sm font-semibold m-0 mb-2">Context</h2>
              {detail.context.communityId ? (
                <p className="text-xs m-0">
                  Community{' '}
                  <Link to={`/moderation/communities?q=${encodeURIComponent(detail.context.communityName || detail.context.communityId)}`}>
                    {detail.context.communityName || detail.context.communitySlug}
                  </Link>
                  {detail.context.memberRole ? ` · author role ${detail.context.memberRole}` : ''}
                </p>
              ) : (
                <p className="text-xs m-0">{detail.context.location || 'No additional context.'}</p>
              )}
              {detail.context.startAt ? <p className="text-xs m-0">Starts {new Date(detail.context.startAt).toLocaleString()}</p> : null}
              {detail.communityRules.length ? (
                <ul className="text-xs mt-2 pl-4">
                  {detail.communityRules.map(rule => (
                    <li key={rule.id}>
                      <strong>{rule.title}</strong> — {rule.description}
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
            <section>
              <h2 className="text-sm font-semibold m-0 mb-2">Reports ({detail.reports.length})</h2>
              {detail.reports.length === 0 ? <p className="text-xs m-0">No stored reports on this target.</p> : null}
              {detail.reports.map(report => (
                <div key={report.id} className="rounded-xl p-3 mb-2" style={{ border: '1px solid var(--border)' }}>
                  <p className="text-xs m-0">
                    {report.reason} · {new Date(report.createdAt).toLocaleString()} · {report.status}
                  </p>
                  <p className="text-xs m-0" style={{ color: 'var(--muted)' }}>
                    Reporter @{report.reporterUsername}
                    {report.communityRuleTitle ? ` · community rule: ${report.communityRuleTitle}` : ''}
                  </p>
                  {report.details ? <p className="text-xs m-0 mt-1">{report.details}</p> : null}
                </div>
              ))}
            </section>
            <section>
              <h2 className="text-sm font-semibold m-0 mb-2">History</h2>
              {detail.history.length === 0 ? <p className="text-xs m-0">No prior platform moderation actions.</p> : null}
              {detail.history.map(item => (
                <p key={item.id} className="text-xs m-0">
                  {item.action} · {item.reason || 'no reason'} · {new Date(item.createdAt).toLocaleString()}
                  {item.note ? ` · ${item.note}` : ''}
                </p>
              ))}
              {detail.communityAudit.length ? (
                <div className="mt-3">
                  <p className="text-xs font-semibold m-0 mb-1">Community moderator history</p>
                  {detail.communityAudit.map((item, i) => (
                    <p key={`${item.action}-${i}`} className="text-xs m-0">
                      {item.action} · {new Date(item.createdAt).toLocaleString()}
                    </p>
                  ))}
                </div>
              ) : null}
            </section>
          </div>
          <aside className="flex flex-col gap-3">
            <section className="rounded-xl p-4" style={{ background: 'var(--elevated)', border: '1px solid var(--border)' }}>
              <h2 className="text-sm font-semibold m-0 mb-2">Creator</h2>
              {detail.creatorUserId ? (
                <>
                  <p className="text-sm m-0">{detail.creatorDisplayName || detail.creatorUsername}</p>
                  <p className="text-xs m-0">@{detail.creatorUsername}</p>
                  <p className="text-xs m-0 mt-1">
                    Account <StatusBadge>{detail.creatorAccountStatus || 'unknown'}</StatusBadge>
                  </p>
                  <p className="text-xs m-0 mt-2">Hidden or removed content: {detail.creatorRemovedContentCount}</p>
                  <p className="text-xs m-0">Resolved reports against content: {detail.creatorResolvedReportCount}</p>
                  <p className="text-xs m-0 mt-2">
                    <Link to={`/travelers/${detail.creatorUserId}`}>Open Traveler 360</Link>
                  </p>
                </>
              ) : (
                <p className="text-xs m-0">Creator is not available.</p>
              )}
            </section>
            <section className="rounded-xl p-4" style={{ background: 'var(--elevated)', border: '1px solid var(--border)' }}>
              <h2 className="text-sm font-semibold m-0 mb-2">Actions</h2>
              <label className="text-xs block mb-2">
                Internal reason
                <select className="admin-input mt-1" value={reason} onChange={e => setReason(e.target.value as ContentReportReason)}>
                  {REASONS.map(r => (
                    <option key={r} value={r}>
                      {r.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs block mb-3">
                Internal note
                <input className="admin-input mt-1" value={note} onChange={e => setNote(e.target.value)} maxLength={500} />
              </label>
              <div className="flex flex-col gap-2">
                {detail.allowedActions.map(action => (
                  <button key={action} type="button" className="admin-btn-secondary" disabled={busy} onClick={() => setPending(action)}>
                    {action.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
              <p className="text-xs m-0 mt-3" style={{ color: 'var(--muted)' }}>
                These actions do not restrict the traveler account. There is no permanent delete control here.
              </p>
            </section>
          </aside>
        </div>
      ) : null}
      {pending ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }}>
          <div className="rounded-xl p-5 max-w-md" style={{ background: 'var(--elevated)', border: '1px solid var(--border)' }}>
            <h3 className="text-sm font-semibold m-0 mb-2">{confirmCopy(pending).title}</h3>
            <p className="text-xs m-0 mb-4">{confirmCopy(pending).body}</p>
            <div className="flex gap-2 justify-end">
              <button type="button" className="admin-btn-secondary" disabled={busy} onClick={() => setPending(null)}>
                Cancel
              </button>
              <button type="button" className="admin-btn-secondary" disabled={busy} onClick={() => void apply(pending)}>
                {confirmCopy(pending).confirm}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <style>{`
        .moderation-case-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 280px;
          gap: 1.25rem;
        }
        @media (max-width: 1024px) {
          .moderation-case-layout {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}
