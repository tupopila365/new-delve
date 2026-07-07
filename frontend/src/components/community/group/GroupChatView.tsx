import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { MessageComposer } from '../../ui/MessageComposer'
import { useCommunityMediaViewer } from '../CommunityMediaViewer'
import type { CommunityGroup, GroupMessageDeleteScope } from '../../../utils/communityGroups'
import { groupInfoPath } from '../../../utils/communityGroups'
import type { GroupThreadMessage } from './useGroupThread'
import type { VoiceRecorderState } from '../../../hooks/useVoiceRecorder'
import { GroupChatBubble, GroupChatReplyBar } from './GroupChatBubble'
import { GroupForwardSheet } from './GroupForwardSheet'
import '../community-media-lightbox.css'
import './group-chat.css'

type Props = {
  group: CommunityGroup
  myUsername: string
  messages: GroupThreadMessage[]
  body: string
  onBodyChange: (value: string) => void
  onSend: () => void
  sending?: boolean
  loading?: boolean
  onBack: () => void
  statusSlot?: ReactNode
  hasMore?: boolean
  loadingOlder?: boolean
  onLoadOlder?: () => void
  canSend?: boolean
  canSendNow?: boolean
  canReact?: boolean
  imagePreview?: string | null
  videoPreview?: string | null
  onImagePick?: (file: File | null, preview: string | null) => void
  onVideoPick?: (file: File | null, preview: string | null) => void
  replyTo?: GroupThreadMessage | null
  onClearReply?: () => void
  onReplyTo?: (message: GroupThreadMessage) => void
  onReact?: (messageId: number | string, emoji: string) => void
  onDelete?: (messageId: number | string, scope: GroupMessageDeleteScope) => void
  onForward?: (messageId: number | string, toGroupSlug: string) => void
  forwarding?: boolean
  voice?: Pick<VoiceRecorderState, 'isRecording' | 'durationSec' | 'audioPreview' | 'error' | 'levels'> & {
    startRecording: () => Promise<void>
    stopRecording: () => void
    cancelRecording: () => void
  }
}

export function GroupChatView({
  group,
  myUsername,
  messages,
  body,
  onBodyChange,
  onSend,
  sending = false,
  loading = false,
  onBack,
  statusSlot,
  hasMore = false,
  loadingOlder = false,
  onLoadOlder,
  canSend = true,
  canSendNow = false,
  canReact = false,
  imagePreview = null,
  videoPreview = null,
  onImagePick,
  onVideoPick,
  replyTo = null,
  onClearReply,
  onReplyTo,
  onReact,
  onDelete,
  onForward,
  forwarding = false,
  voice,
}: Props) {
  const { openImage, openVideo } = useCommunityMediaViewer()
  const composerShellRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const threadRef = useRef<HTMLDivElement>(null)
  const [forwardMessage, setForwardMessage] = useState<GroupThreadMessage | null>(null)
  const initial = group.name.trim().charAt(0).toUpperCase()
  const hasMedia = Boolean(onImagePick && onVideoPick)

  const focusComposer = useCallback(() => {
    requestAnimationFrame(() => {
      threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' })
      composerShellRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
      inputRef.current?.focus({ preventScroll: true })
    })
  }, [])

  const handleReplyTo = useCallback(
    (message: GroupThreadMessage) => {
      onReplyTo?.(message)
      focusComposer()
    },
    [focusComposer, onReplyTo],
  )

  const handleForwardPick = (toGroupSlug: string) => {
    if (!forwardMessage) return
    onForward?.(forwardMessage.id, toGroupSlug)
    setForwardMessage(null)
  }

  useEffect(() => {
    if (!replyTo) return
    focusComposer()
  }, [focusComposer, replyTo])

  useEffect(() => {
    const shell = composerShellRef.current
    const vv = window.visualViewport
    if (!shell || !vv) return

    const syncKeyboardOffset = () => {
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      shell.style.setProperty('--keyboard-offset', offset > 0 ? `${offset}px` : '0px')
    }

    syncKeyboardOffset()
    vv.addEventListener('resize', syncKeyboardOffset)
    vv.addEventListener('scroll', syncKeyboardOffset)
    return () => {
      vv.removeEventListener('resize', syncKeyboardOffset)
      vv.removeEventListener('scroll', syncKeyboardOffset)
      shell.style.removeProperty('--keyboard-offset')
    }
  }, [])

  const openMessageMedia = (img?: string, vid?: string, bodyText?: string, sender?: string) => {
    const caption = bodyText?.trim() || (sender ? `@${sender}` : undefined)
    if (vid) {
      openVideo(vid, img ?? null, caption)
      return
    }
    if (img) {
      openImage(img, 'Group message', caption)
    }
  }

  return (
    <section className="group-chat" aria-label={`${group.name} group chat`}>
      <header className="group-chat__head">
        <button type="button" className="group-chat__back" onClick={onBack} aria-label="Back to groups">
          <ArrowLeft size={18} strokeWidth={2.25} aria-hidden />
        </button>
        <Link to={groupInfoPath(group.slug)} className="group-chat__profile-link">
          <div className="group-chat__avatar">
            {group.cover_src ? <img src={group.cover_src} alt="" /> : <span>{initial}</span>}
          </div>
          <div className="group-chat__title">
            <strong>{group.name}</strong>
            <small>
              {group.member_count} members
              {group.visibility === 'private' ? ' · Private' : ' · Public'}
            </small>
          </div>
        </Link>
      </header>

      {statusSlot ? <div className="group-chat__status">{statusSlot}</div> : null}

      <div ref={threadRef} className="group-chat__thread" aria-label="Group messages" aria-live="polite">
        {loading ? (
          <div className="group-chat__state">
            <Loader2 size={22} strokeWidth={2.25} className="group-chat__spin" aria-hidden />
            <p>Loading messages…</p>
          </div>
        ) : null}

        {!loading ? (
          <>
            {hasMore && onLoadOlder ? (
              <div className="group-chat__load-older">
                <button
                  type="button"
                  className="group-chat__load-older-btn"
                  onClick={onLoadOlder}
                  disabled={loadingOlder}
                >
                  {loadingOlder ? 'Loading…' : 'Load earlier messages'}
                </button>
              </div>
            ) : null}

            {messages.map((message) => (
              <GroupChatBubble
                key={message.id}
                message={message}
                mine={message.sender_username === myUsername}
                canReact={canReact}
                onReact={(id, emoji) => onReact?.(id, emoji)}
                onReplyTo={handleReplyTo}
                onDelete={(id, scope) => onDelete?.(id, scope)}
                onForward={(row) => setForwardMessage(row)}
                onRequestComposerFocus={focusComposer}
                onOpenMedia={openMessageMedia}
              />
            ))}
          </>
        ) : null}
      </div>

      {canSend ? (
        <div ref={composerShellRef} className="msg-composer-shell msg-composer-shell--group-chat">
          {replyTo && onClearReply ? <GroupChatReplyBar message={replyTo} onClear={onClearReply} /> : null}
          <MessageComposer
            theme="dark"
            value={body}
            onChange={onBodyChange}
            onSubmit={onSend}
            inputRef={inputRef}
            placeholder={replyTo ? `Reply to @${replyTo.sender_username}…` : `Message ${group.name}…`}
            inputAriaLabel={`Message ${group.name}`}
            sendAriaLabel="Send message"
            sendDisabled={!canSendNow}
            sending={sending}
            media={
              hasMedia
                ? {
                    imagePreview,
                    videoPreview,
                    audioPreview: voice?.audioPreview ?? null,
                    audioDurationSec: voice?.durationSec ?? 0,
                    isRecordingVoice: voice?.isRecording ?? false,
                    recordingDurationSec: voice?.durationSec ?? 0,
                    voiceLevels: voice?.levels,
                    skipVideoEditor: true,
                    onImageChange: onImagePick!,
                    onVideoChange: onVideoPick!,
                    onVoiceRecordStart: voice?.startRecording,
                    onVoiceRecordStop: voice?.stopRecording,
                    onVoiceRecordCancel: voice?.cancelRecording,
                  }
                : undefined
            }
          />
          {voice?.error ? <p className="dm-chat__voice-error">{voice.error}</p> : null}
        </div>
      ) : null}

      <GroupForwardSheet
        open={Boolean(forwardMessage)}
        currentGroupSlug={group.slug}
        busy={forwarding}
        onClose={() => setForwardMessage(null)}
        onPick={handleForwardPick}
      />
    </section>
  )
}
