import { useEffect, useId, useState, type ReactNode } from 'react'
import {
  ArrowLeft, Check, ChevronLeft, ChevronRight, CloudOff, Eye, HelpCircle,
  MoreHorizontal, Save, X,
} from 'lucide-react'
import type { AutosaveStatus, BuilderStep, ChecklistItem, ValidationItem } from './types'
import { InlineNotice } from './fields'

export interface BusinessBuilderShellProps {
  title: string
  subtitle?: string
  steps: BuilderStep[]
  stepIndex: number
  onStepChange: (index: number) => void
  autosave: AutosaveStatus
  lastSavedAt?: string | null
  publicationLabel: string
  checklist: ChecklistItem[]
  validations: ValidationItem[]
  preview: ReactNode
  children: ReactNode
  onExit: () => void
  onSaveDraft: () => void
  onContinue: () => void
  onBack: () => void
  onSubmitReview: () => void
  onPublish?: () => void
  primaryActionLabel?: string
  canPublish?: boolean
  mobilePreviewOpen?: boolean
  onTogglePreview?: () => void
}

function saveLabel(status: AutosaveStatus, lastSavedAt?: string | null) {
  if (status === 'saving') return 'Saving…'
  if (status === 'saved') return lastSavedAt ? `Saved ${lastSavedAt}` : 'Saved'
  if (status === 'unsaved') return 'Unsaved changes'
  if (status === 'offline') return 'Offline — changes not stored yet'
  if (status === 'error') return 'Could not save — try again'
  return 'Not saved yet'
}

export default function BusinessBuilderShell({
  title,
  subtitle,
  steps,
  stepIndex,
  onStepChange,
  autosave,
  lastSavedAt,
  publicationLabel,
  checklist,
  validations,
  preview,
  children,
  onExit,
  onSaveDraft,
  onContinue,
  onBack,
  onSubmitReview,
  onPublish,
  primaryActionLabel,
  canPublish,
  mobilePreviewOpen,
  onTogglePreview,
}: BusinessBuilderShellProps) {
  const [moreOpen, setMoreOpen] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const titleId = useId()
  const errors = validations.filter(v => v.severity === 'error')
  const warnings = validations.filter(v => v.severity === 'warning')
  const requiredLeft = checklist.filter(c => c.required && !c.done).length
  const isLast = stepIndex >= steps.length - 1

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        onSaveDraft()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onSaveDraft])

  function requestExit() {
    if (autosave === 'unsaved' || autosave === 'saving') setLeaveOpen(true)
    else onExit()
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col" style={{ background: 'var(--bg)', color: 'var(--fg)' }} role="dialog" aria-modal aria-labelledby={titleId}>
      <header
        className="shrink-0 flex items-center gap-2 px-3 sm:px-5 h-14 min-h-[56px]"
        style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}
      >
        <button type="button" onClick={requestExit} className="p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center" style={{ color: 'var(--fg-muted)' }} aria-label="Exit builder">
          <X size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 id={titleId} className="text-sm sm:text-base font-bold truncate" style={{ fontFamily: 'Syne, sans-serif' }}>{title}</h1>
          <p className="text-xs truncate" style={{ color: 'var(--fg-muted)' }}>
            {subtitle ?? publicationLabel} · {saveLabel(autosave, lastSavedAt)}
          </p>
        </div>
        <span className="hidden sm:inline-flex text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: 'rgba(95,47,201,0.1)', color: 'var(--primary)' }}>
          {publicationLabel}
        </span>
        <button type="button" onClick={onSaveDraft} className="hidden sm:inline-flex items-center gap-1.5 px-3 rounded-xl text-sm font-semibold min-h-[44px]" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}>
          <Save size={14} aria-hidden /> Save draft
        </button>
        <button type="button" onClick={onTogglePreview} className="lg:hidden p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center" style={{ color: 'var(--fg-muted)' }} aria-label="Preview">
          <Eye size={18} />
        </button>
        <button type="button" className="hidden md:inline-flex p-2.5 rounded-xl min-w-[44px] min-h-[44px] items-center justify-center" style={{ color: 'var(--fg-muted)' }} aria-label="Help">
          <HelpCircle size={18} />
        </button>
        <div className="relative">
          <button type="button" onClick={() => setMoreOpen(o => !o)} className="p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center" style={{ color: 'var(--fg-muted)' }} aria-label="More actions" aria-expanded={moreOpen}>
            <MoreHorizontal size={18} />
          </button>
          {moreOpen && (
            <div className="absolute right-0 top-full mt-1 w-52 rounded-xl p-1 z-20 shadow-lg" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} role="menu">
              {['Save and exit', 'Duplicate', 'Schedule publication', 'Pause', 'Archive'].map(label => (
                <button key={label} type="button" role="menuitem" onClick={() => { setMoreOpen(false); if (label === 'Save and exit') { onSaveDraft(); onExit() } }}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm min-h-[44px]" style={{ color: 'var(--fg)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {autosave === 'offline' && (
        <div className="px-4 py-2 flex items-center gap-2 text-sm" style={{ background: 'rgba(183,104,8,0.12)', color: '#B76808' }} role="status">
          <CloudOff size={16} aria-hidden /> You appear offline. Drafts are not stored until you reconnect.
        </div>
      )}

      <div className="flex-1 min-h-0 flex">
        {/* Step nav — desktop/tablet */}
        <nav className="hidden md:flex flex-col w-56 xl:w-64 shrink-0 overflow-y-auto p-3 gap-1" style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }} aria-label="Builder steps">
          {steps.map((step, i) => {
            const active = i === stepIndex
            const done = checklist.some(c => c.id.startsWith(step.id) && c.done) || i < stepIndex
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => onStepChange(i)}
                className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-left min-h-[44px]"
                style={{
                  background: active ? 'rgba(95,47,201,0.1)' : 'transparent',
                  color: active ? 'var(--primary)' : 'var(--fg-muted)',
                  border: 'none',
                  cursor: 'pointer',
                }}
                aria-current={active ? 'step' : undefined}
              >
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5"
                  style={{ background: done || active ? 'var(--primary)' : 'var(--surface-subtle)', color: done || active ? '#fff' : 'var(--fg-muted)' }}>
                  {done && !active ? <Check size={12} /> : i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold truncate" style={{ color: active ? 'var(--primary)' : 'var(--fg)' }}>{step.label}</span>
                  {step.optional && <span className="text-[11px]">Optional</span>}
                </span>
              </button>
            )
          })}
        </nav>

        {/* Main */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="md:hidden px-3 py-2 overflow-x-auto scroll-rail" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
            <div className="flex gap-2 min-w-max">
              {steps.map((step, i) => (
                <button key={step.id} type="button" onClick={() => onStepChange(i)}
                  className="px-3 py-2 rounded-full text-xs font-semibold whitespace-nowrap min-h-[40px]"
                  style={{
                    background: i === stepIndex ? 'var(--primary)' : 'var(--surface-subtle)',
                    color: i === stepIndex ? '#fff' : 'var(--fg-muted)',
                    border: '1px solid var(--border)',
                  }}>
                  {i + 1}. {step.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6">
            <div className="max-w-3xl mx-auto flex flex-col gap-4">
              {errors.length > 0 && (
                <InlineNotice tone="error">
                  <p className="font-semibold">{errors.length} item{errors.length === 1 ? '' : 's'} need attention</p>
                  <ul className="mt-1 list-disc pl-4">
                    {errors.slice(0, 4).map(e => <li key={e.id}>{e.message}</li>)}
                  </ul>
                </InlineNotice>
              )}
              {children}
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2 px-3 sm:px-5 py-3" style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
            <button type="button" onClick={onBack} disabled={stepIndex === 0}
              className="inline-flex items-center gap-1 px-3 rounded-xl text-sm font-semibold min-h-[44px] disabled:opacity-40"
              style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}>
              <ChevronLeft size={16} aria-hidden /> Back
            </button>
            <div className="flex-1 text-xs text-center" style={{ color: 'var(--fg-muted)' }}>
              Step {stepIndex + 1} of {steps.length}
              {requiredLeft > 0 ? ` · ${requiredLeft} required left` : ' · Ready for review'}
            </div>
            {!isLast ? (
              <button type="button" onClick={onContinue}
                className="inline-flex items-center gap-1 px-4 rounded-xl text-sm font-semibold min-h-[44px]"
                style={{ background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                Continue <ChevronRight size={16} aria-hidden />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button type="button" onClick={onSubmitReview}
                  className="px-3 rounded-xl text-sm font-semibold min-h-[44px]"
                  style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}>
                  Submit for review
                </button>
                {canPublish && onPublish && (
                  <button type="button" onClick={onPublish}
                    className="px-4 rounded-xl text-sm font-semibold min-h-[44px]"
                    style={{ background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                    {primaryActionLabel ?? 'Publish'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Completion + preview — desktop */}
        <aside className="hidden lg:flex flex-col w-[320px] xl:w-[360px] shrink-0 overflow-y-auto" style={{ background: 'var(--surface)', borderLeft: '1px solid var(--border)' }}>
          <div className="p-4 flex flex-col gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--fg-muted)' }}>Completion</p>
              <ul className="flex flex-col gap-2">
                {checklist.map(item => (
                  <li key={item.id} className="flex items-start gap-2 text-sm">
                    <span className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: item.done ? '#16845B' : 'var(--surface-subtle)', color: '#fff' }}>
                      {item.done && <Check size={10} />}
                    </span>
                    <span style={{ color: item.done ? 'var(--fg)' : 'var(--fg-muted)' }}>
                      {item.label}{item.required && !item.done ? ' *' : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            {warnings.length > 0 && (
              <InlineNotice tone="warning">
                {warnings[0].message}
              </InlineNotice>
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--fg-muted)' }}>Traveler preview</p>
              <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--surface-subtle)' }}>
                {preview}
              </div>
            </div>
            <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
              Publishing may require Delve review. Status comes from your account permissions — this screen does not invent approvals.
            </p>
          </div>
        </aside>
      </div>

      {/* Mobile preview sheet */}
      {mobilePreviewOpen && (
        <div className="lg:hidden fixed inset-0 z-[80] flex flex-col justify-end">
          <button type="button" className="absolute inset-0 border-0" style={{ background: 'rgba(0,0,0,0.45)' }} aria-label="Close preview" onClick={onTogglePreview} />
          <div className="relative rounded-t-3xl max-h-[88vh] overflow-y-auto p-4" style={{ background: 'var(--bg)' }} role="dialog" aria-label="Preview">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>Traveler preview</p>
              <button type="button" onClick={onTogglePreview} className="p-2.5 min-w-[44px] min-h-[44px]" aria-label="Close"><X size={18} /></button>
            </div>
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>{preview}</div>
          </div>
        </div>
      )}

      {leaveOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 border-0" style={{ background: 'rgba(0,0,0,0.45)' }} aria-label="Dismiss" onClick={() => setLeaveOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }} role="alertdialog" aria-labelledby="leave-title">
            <h2 id="leave-title" className="text-lg font-bold" style={{ fontFamily: 'Syne, sans-serif' }}>Unsaved changes</h2>
            <p className="text-sm mt-2" style={{ color: 'var(--fg-muted)' }}>Save your draft before leaving, or discard local edits. Only confirmed saves are kept.</p>
            <div className="flex flex-col sm:flex-row gap-2 mt-4">
              <button type="button" onClick={() => { onSaveDraft(); setLeaveOpen(false); onExit() }} className="flex-1 min-h-[44px] rounded-xl text-sm font-semibold" style={{ background: 'var(--primary)', color: '#fff' }}>Save and exit</button>
              <button type="button" onClick={() => { setLeaveOpen(false); onExit() }} className="flex-1 min-h-[44px] rounded-xl text-sm font-semibold" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', color: 'var(--fg)' }}>Discard</button>
              <button type="button" onClick={() => setLeaveOpen(false)} className="flex-1 min-h-[44px] rounded-xl text-sm font-semibold" style={{ color: 'var(--fg-muted)', background: 'transparent', border: 'none' }}>
                <span className="inline-flex items-center justify-center gap-1 w-full"><ArrowLeft size={14} /> Keep editing</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
