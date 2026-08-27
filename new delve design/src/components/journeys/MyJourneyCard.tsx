import { useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { Bookmark, Check, GripVertical, Heart, MessageCircle, Pencil, X } from 'lucide-react'
import type { JourneySummary } from '@delve/contracts'
import { likeJourney, unlikeJourney } from '../../api/journeyClient'
import { saveItem, unsaveItem } from '../../api/socialClient'
import JourneyCoverMedia from './JourneyCoverMedia'
import { formatUsername } from '../../lib/formatUsername'
import { deriveJourneyLifecycle, lifecycleLabel } from './journeyLifecycle'

interface MyJourneyCardProps {
  journey: JourneySummary
  signedIn?: boolean
  onSignIn?: () => void
  onOpen: (id: string) => void
  onJourneyUpdated?: (journey: JourneySummary) => void
  customTitle?: string
  customNotes?: string
  onTitleChange?: (id: string, title: string) => void
  onNotesChange?: (id: string, notes: string) => void
  /** DnD — passed from parent */
  dragging?: boolean
  onDragStart?: (e: React.DragEvent) => void
  onDragEnter?: (e: React.DragEvent) => void
  onDragEnd?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent) => void
}

export default function MyJourneyCard({
  journey,
  signedIn = false,
  onSignIn,
  onOpen,
  onJourneyUpdated,
  customTitle,
  customNotes,
  onTitleChange,
  onNotesChange,
  dragging = false,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onDragOver,
}: MyJourneyCardProps) {
  const [busy, setBusy] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingNotes, setEditingNotes] = useState(false)
  const [draftTitle, setDraftTitle] = useState(customTitle ?? journey.title)
  const [draftNotes, setDraftNotes] = useState(customNotes ?? '')
  const titleInputRef = useRef<HTMLInputElement>(null)
  const notesRef = useRef<HTMLTextAreaElement>(null)

  const status = journey.lifecycleStatus ?? deriveJourneyLifecycle(journey)
  const displayTitle = customTitle ?? journey.title

  const patch = (next: Partial<JourneySummary>) => onJourneyUpdated?.({ ...journey, ...next })

  async function toggleLike(e: MouseEvent) {
    e.stopPropagation()
    if (!signedIn) { onSignIn?.(); return }
    if (busy) return
    setBusy(true)
    try {
      const updated = journey.likedByMe ? await unlikeJourney(journey.id) : await likeJourney(journey.id)
      patch({ likedByMe: updated.likedByMe, likeCount: updated.likeCount })
    } catch { /* ignore */ } finally { setBusy(false) }
  }

  async function toggleSave(e: MouseEvent) {
    e.stopPropagation()
    if (!signedIn) { onSignIn?.(); return }
    if (busy) return
    setBusy(true)
    try {
      if (journey.savedByMe) {
        await unsaveItem({ targetType: 'JOURNEY', targetId: journey.id })
        patch({ savedByMe: false, saveCount: Math.max(0, journey.saveCount - 1) })
      } else {
        await saveItem({ targetType: 'JOURNEY', targetId: journey.id })
        patch({ savedByMe: true, saveCount: journey.saveCount + 1 })
      }
    } catch { /* ignore */ } finally { setBusy(false) }
  }

  function commitTitle() {
    const t = draftTitle.trim() || journey.title
    setDraftTitle(t)
    onTitleChange?.(journey.id, t)
    setEditingTitle(false)
  }

  function commitNotes() {
    onNotesChange?.(journey.id, draftNotes)
    setEditingNotes(false)
  }

  return (
    <article
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      className="overflow-hidden w-full min-w-0 sm:rounded-2xl transition-all duration-200"
      style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        opacity: dragging ? 0.45 : 1,
        boxShadow: dragging ? '0 8px 24px rgba(0,0,0,0.18)' : 'none',
        transform: dragging ? 'scale(1.01)' : 'none',
      }}
      aria-label={`Journey card: ${displayTitle}`}
    >
      {/* Card header: drag handle + author */}
      <div className="flex items-center gap-2.5 px-3 py-3">
        {/* Drag handle */}
        <button
          type="button"
          className="flex-shrink-0 touch-none cursor-grab active:cursor-grabbing p-1 rounded-lg"
          style={{ background: 'none', border: 'none', color: 'var(--border)', marginLeft: -4 }}
          aria-label="Drag to reorder"
          tabIndex={-1}
        >
          <GripVertical size={18} />
        </button>

        <button
          type="button"
          onClick={() => onOpen(journey.id)}
          className="flex items-center gap-2 min-w-0 flex-1 text-left"
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          aria-label={`Open journey: ${displayTitle}`}
        >
          {journey.author.avatarUrl ? (
            <img src={journey.author.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" loading="lazy" decoding="async" />
          ) : (
            <div className="w-9 h-9 rounded-full flex-shrink-0" style={{ background: 'rgba(140,82,255,0.12)' }} />
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold m-0 truncate" style={{ color: 'var(--fg)' }}>
              {journey.author.displayName || formatUsername(journey.author.username)}
            </p>
            <p className="text-[11px] font-medium m-0" style={{ color: 'var(--primary)' }}>
              {lifecycleLabel(status)}
            </p>
          </div>
        </button>
      </div>

      {/* Cover image */}
      {journey.coverUrl && (
        <button
          type="button"
          onClick={() => onOpen(journey.id)}
          className="relative block w-full overflow-hidden"
          style={{ aspectRatio: '4/3', background: 'var(--surface-subtle)', border: 'none', cursor: 'pointer', padding: 0 }}
          aria-label={`Open ${displayTitle}`}
        >
          <JourneyCoverMedia
            url={journey.coverUrl}
            resourceType={journey.coverResourceType}
            className="absolute inset-0 w-full h-full object-cover"
            variant="card"
            priority="low"
          />
        </button>
      )}

      {/* Body: title editing, notes, social bar */}
      <div className="px-4 py-3">
        {/* Editable title */}
        <div className="flex items-start gap-1.5 mb-1.5">
          {editingTitle ? (
            <div className="flex items-center gap-1.5 flex-1">
              <input
                ref={titleInputRef}
                value={draftTitle}
                onChange={e => setDraftTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') commitTitle(); if (e.key === 'Escape') setEditingTitle(false) }}
                className="flex-1 text-sm font-semibold rounded-lg px-2 py-1 min-h-[32px]"
                style={{ border: '1.5px solid var(--primary)', background: 'var(--surface-subtle)', color: 'var(--fg)', outline: 'none' }}
                autoFocus
                aria-label="Edit journey title"
              />
              <button type="button" onClick={commitTitle} className="p-1.5 rounded-lg" style={{ background: 'var(--primary)', border: 'none', color: '#fff', cursor: 'pointer' }} aria-label="Save title">
                <Check size={14} />
              </button>
              <button type="button" onClick={() => { setDraftTitle(customTitle ?? journey.title); setEditingTitle(false) }} className="p-1.5 rounded-lg" style={{ background: 'var(--surface-subtle)', border: '1px solid var(--border)', cursor: 'pointer' }} aria-label="Cancel title edit">
                <X size={14} style={{ color: 'var(--fg-muted)' }} />
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold m-0 flex-1" style={{ color: 'var(--fg)' }}>
                {displayTitle}
              </p>
              <button
                type="button"
                onClick={() => { setDraftTitle(customTitle ?? journey.title); setEditingTitle(true) }}
                className="flex-shrink-0 p-1.5 rounded-lg"
                style={{ background: 'none', border: 'none', color: 'var(--fg-muted)', cursor: 'pointer' }}
                aria-label="Edit journey title"
              >
                <Pencil size={13} />
              </button>
            </>
          )}
        </div>

        {/* Notes */}
        {editingNotes ? (
          <div className="mb-2">
            <textarea
              ref={notesRef}
              value={draftNotes}
              onChange={e => setDraftNotes(e.target.value)}
              onBlur={commitNotes}
              onKeyDown={e => { if (e.key === 'Escape') commitNotes() }}
              rows={3}
              placeholder="Add personal notes…"
              className="w-full rounded-xl px-3 py-2 text-xs resize-none"
              style={{ border: '1.5px solid var(--primary)', background: 'var(--surface-subtle)', color: 'var(--fg)', outline: 'none' }}
              autoFocus
              aria-label="Edit personal notes"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => { setDraftNotes(customNotes ?? ''); setEditingNotes(true) }}
            className="block w-full text-left mb-2 text-xs px-2 py-1.5 rounded-xl"
            style={{ background: 'var(--surface-subtle)', border: '1px dashed var(--border)', color: customNotes ? 'var(--fg)' : 'var(--fg-muted)', cursor: 'pointer' }}
            aria-label={customNotes ? 'Edit personal notes' : 'Add personal notes'}
          >
            {customNotes || '+ Add personal notes…'}
          </button>
        )}

        {/* Social actions */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            disabled={busy}
            onClick={toggleLike}
            style={{ background: 'none', border: 'none', color: journey.likedByMe ? 'var(--primary)' : 'var(--fg)', cursor: 'pointer', padding: 0 }}
            aria-label={journey.likedByMe ? 'Unlike journey' : 'Like journey'}
            aria-pressed={journey.likedByMe}
          >
            <Heart size={20} fill={journey.likedByMe ? 'currentColor' : 'none'} />
          </button>
          <button
            type="button"
            onClick={() => onOpen(journey.id)}
            style={{ background: 'none', border: 'none', color: 'var(--fg)', cursor: 'pointer', padding: 0 }}
            aria-label={`View comments for ${displayTitle}`}
          >
            <MessageCircle size={20} />
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={toggleSave}
            className="ml-auto"
            style={{ background: 'none', border: 'none', color: journey.savedByMe ? 'var(--primary)' : 'var(--fg)', cursor: 'pointer', padding: 0 }}
            aria-label={journey.savedByMe ? 'Unsave journey' : 'Save journey'}
            aria-pressed={journey.savedByMe}
          >
            <Bookmark size={20} fill={journey.savedByMe ? 'currentColor' : 'none'} />
          </button>
        </div>

        <p className="text-xs m-0 mt-1.5" style={{ color: 'var(--fg-muted)' }}>
          {journey.durationDays}d · {journey.stopCount} stops
        </p>
      </div>
    </article>
  )
}
