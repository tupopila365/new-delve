import { useEffect, useRef, useState } from 'react'
import { Bot, X } from 'lucide-react'
import { mediaUrl } from '../../../api/client'
import { VoiceNotePlayer } from '../chat/VoiceNotePlayer'
import '../chat/voice-note-player.css'
import { formatMessageTime } from './messagingUtils'
import type { DmMessageDeleteScope } from './dmMessageUtils'
import { dmMessagePreview, dmReplyPreviewLabel } from './dmMessageUtils'
import type { ThreadMessage } from './useConversationThread'
import { DmMessageActionMenu } from './DmMessageActions'

type Props = {
  message: ThreadMessage
  mine: boolean
  automated?: boolean
  onReplyTo: (message: ThreadMessage) => void
  onDelete: (messageId: number | string, scope: DmMessageDeleteScope) => void
  onForward: (message: ThreadMessage) => void
  onOpenMedia: (img?: string, vid?: string, body?: string, sender?: string) => void
  onRequestComposerFocus?: () => void
}

const LONG_PRESS_MS = 450

export function DmChatBubble({
  message,
  mine,
  automated = false,
  onReplyTo,
  onDelete,
  onForward,
  onOpenMedia,
  onRequestComposerFocus,
}: Props) {
  const bubbleRef = useRef<HTMLElement>(null)
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressRef = useRef(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [pressed, setPressed] = useState(false)
  const isDeleted = Boolean(message.is_deleted)
  const img = !isDeleted ? message.local_image ?? (message.image ? mediaUrl(message.image) : undefined) : undefined
  const vid = !isDeleted ? message.local_video ?? (message.video ? mediaUrl(message.video) : undefined) : undefined
  const audio = !isDeleted ? message.local_audio ?? (message.audio ? mediaUrl(message.audio) : undefined) : undefined
  const canInteract =
    !automated && !message.pending && !String(message.id).startsWith('temp-') && !isDeleted

  useEffect(() => {
    if (!menuOpen) setPressed(false)
  }, [menuOpen])

  const clearPressTimer = () => {
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
    }
  }

  const openMenu = () => {
    if (!canInteract) return
    setMenuOpen(true)
  }

  const onLongPressStart = () => {
    if (!canInteract) return
    longPressRef.current = false
    clearPressTimer()
    pressTimerRef.current = setTimeout(() => {
      longPressRef.current = true
      setPressed(true)
      openMenu()
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(10)
    }, LONG_PRESS_MS)
  }

  const onLongPressEnd = () => {
    clearPressTimer()
    if (!menuOpen && !longPressRef.current) setPressed(false)
  }

  return (
    <div
      className={[
        'group-chat__message',
        mine ? 'group-chat__message--mine' : '',
        pressed || menuOpen ? 'group-chat__message--active' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onTouchStart={onLongPressStart}
      onTouchEnd={onLongPressEnd}
      onTouchCancel={onLongPressEnd}
      onTouchMove={onLongPressEnd}
    >
      <div className="group-chat__bubble-wrap">
        <article
          ref={bubbleRef}
          className={[
            'group-chat__bubble',
            automated ? 'dm-chat__bubble--auto' : mine ? 'group-chat__bubble--mine' : 'group-chat__bubble--theirs',
            message.pending ? 'group-chat__bubble--pending' : '',
            message.failed ? 'dm-chat__bubble--failed' : '',
            isDeleted ? 'group-chat__bubble--deleted' : '',
            img || vid ? 'group-chat__bubble--media' : '',
            audio && !message.body ? 'group-chat__bubble--voice' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onContextMenu={(event) => {
            if (!canInteract) return
            event.preventDefault()
            openMenu()
          }}
        >
          {automated ? (
            <span className="dm-chat__auto-label">
              <Bot size={12} strokeWidth={2.25} aria-hidden />
              Automated · Provider
            </span>
          ) : null}

          {message.forwarded_from && !isDeleted ? (
            <div className="group-chat__forwarded-label">Forwarded</div>
          ) : null}

          {message.reply_to ? (
            <div className="group-chat__reply-quote" aria-label="Replied message">
              <strong>@{message.reply_to.sender_username}</strong>
              <span>{dmReplyPreviewLabel(message.reply_to)}</span>
            </div>
          ) : null}

          {isDeleted ? (
            <p className="group-chat__deleted-copy">This message was deleted</p>
          ) : null}

          {!isDeleted && (img || vid) ? (
            <button
              type="button"
              className="group-chat__media-open cm-media-open"
              aria-label="Open media fullscreen"
              onClick={() => onOpenMedia(img, vid, message.body, message.sender_username)}
            >
              {vid ? (
                <video className="group-chat__media" src={vid} muted playsInline preload="metadata" />
              ) : (
                <img className="group-chat__media" src={img} alt="" loading="lazy" />
              )}
            </button>
          ) : null}

          {!isDeleted && audio ? (
            <VoiceNotePlayer
              src={audio}
              durationSec={message.audio_duration_sec}
              mine={mine}
              sentAt={!message.body ? message.created_at : undefined}
              pending={Boolean(message.pending)}
            />
          ) : null}

          {!isDeleted && message.body ? <p>{message.body}</p> : null}

          {message.pending && !audio ? (
            <small>Sending…</small>
          ) : message.created_at && (!audio || message.body) ? (
            <small>{formatMessageTime(message.created_at)}</small>
          ) : null}
        </article>
      </div>

      {canInteract ? (
        <DmMessageActionMenu
          open={menuOpen}
          anchorRef={bubbleRef}
          alignEnd={mine}
          canUnsend={Boolean(message.can_unsend)}
          onClose={() => setMenuOpen(false)}
          onReply={() => {
            onReplyTo(message)
            setMenuOpen(false)
            onRequestComposerFocus?.()
          }}
          onForward={() => {
            onForward(message)
            setMenuOpen(false)
          }}
          onDelete={(scope) => {
            onDelete(message.id, scope)
            setMenuOpen(false)
          }}
        />
      ) : null}
    </div>
  )
}

type ReplyBarProps = {
  message: ThreadMessage
  onClear: () => void
}

export function DmChatReplyBar({ message, onClear }: ReplyBarProps) {
  return (
    <div className="group-chat__reply-bar">
      <div className="group-chat__reply-bar-copy">
        <strong>Replying to @{message.sender_username}</strong>
        <span>{dmMessagePreview(message)}</span>
      </div>
      <button type="button" className="group-chat__reply-bar-clear" onClick={onClear} aria-label="Cancel reply">
        <X size={16} strokeWidth={2.25} aria-hidden />
      </button>
    </div>
  )
}
