import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Ban, Loader2 } from 'lucide-react'
import { UserAvatar } from '../../UserAvatar'
import { ReportButton } from '../../report/ReportButton'
import { MessageComposer } from '../../ui/MessageComposer'
import { CommunityMediaViewerProvider, useCommunityMediaViewer } from '../../community/CommunityMediaViewer'
import type { MessagingContext } from '../messageProviderUtils'
import type { DmMessageDeleteScope } from './dmMessageUtils'
import { DmChatBubble, DmChatReplyBar } from './DmChatBubble'
import { DmForwardSheet } from './DmForwardSheet'
import type { ThreadMessage } from './useConversationThread'
import type { VoiceRecorderState } from '../../../hooks/useVoiceRecorder'
import '../../community/group/group-chat.css'
import '../../community/community-media-lightbox.css'
import './dm-chat.css'

export type { DmMessage } from './useConversationThread'

type Person = {
  username: string
  display_name?: string
  avatar?: string | null
  city?: string
  region?: string
}

type VoiceState = Pick<
  VoiceRecorderState,
  'isRecording' | 'durationSec' | 'audioPreview' | 'error' | 'levels'
> & {
  audioFile: File | null
  startRecording: () => Promise<void>
  stopRecording: () => void
  cancelRecording: () => void
  clearAudio: () => void
}

type Props = {
  conversationId?: string | number
  person: Person
  personName: string
  myUsername: string
  messages: ThreadMessage[]
  body: string
  onBodyChange: (value: string) => void
  onSend: () => void
  sending?: boolean
  loading?: boolean
  opening?: boolean
  backLabel?: string
  onBack: () => void
  inboxHref?: string
  inboxLabel?: string
  statusSlot?: ReactNode
  showQuickReplies?: boolean
  context?: MessagingContext
  quickReplies?: readonly string[]
  reportTarget?: { target_type: string; target_id: string; target_label?: string }
  hasMore?: boolean
  loadingOlder?: boolean
  onLoadOlder?: () => void
  typingUsernames?: string[]
  onBlock?: () => void
  blocking?: boolean
  canSendNow?: boolean
  imagePreview?: string | null
  videoPreview?: string | null
  onImagePick?: (file: File | null, preview: string | null) => void
  onVideoPick?: (file: File | null, preview: string | null) => void
  replyTo?: ThreadMessage | null
  onClearReply?: () => void
  onReplyTo?: (message: ThreadMessage) => void
  onDelete?: (messageId: number | string, scope: DmMessageDeleteScope) => void
  onForward?: (messageId: number | string, toConversationId: number) => void
  forwarding?: boolean
  voice?: VoiceState
}

export function DmChatView(props: Props) {
  return (
    <CommunityMediaViewerProvider>
      <DmChatViewInner {...props} />
    </CommunityMediaViewerProvider>
  )
}

function DmChatViewInner({
  conversationId = '',
  person,
  personName,
  myUsername,
  messages,
  body,
  onBodyChange,
  onSend,
  sending = false,
  loading = false,
  opening = false,
  backLabel = 'Back',
  onBack,
  inboxHref = '/messages',
  inboxLabel = 'Inbox',
  statusSlot,
  showQuickReplies,
  context = 'user',
  quickReplies,
  reportTarget,
  hasMore = false,
  loadingOlder = false,
  onLoadOlder,
  typingUsernames = [],
  onBlock,
  blocking = false,
  canSendNow = false,
  imagePreview = null,
  videoPreview = null,
  onImagePick,
  onVideoPick,
  replyTo = null,
  onClearReply,
  onReplyTo,
  onDelete,
  onForward,
  forwarding = false,
  voice,
}: Props) {
  const { openImage, openVideo } = useCommunityMediaViewer()
  const composerShellRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const threadRef = useRef<HTMLDivElement>(null)
  const [forwardMessage, setForwardMessage] = useState<ThreadMessage | null>(null)
  const location = [person.city, person.region].filter(Boolean).join(', ')
  const isProviderContext = context === 'provider'
  const replies = quickReplies ?? []
  const showQuickReplyChips = (showQuickReplies ?? isProviderContext) && replies.length > 0
  const hasMedia = Boolean(onImagePick && onVideoPick)

  const focusComposer = useCallback(() => {
    requestAnimationFrame(() => {
      threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' })
      composerShellRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
      inputRef.current?.focus({ preventScroll: true })
    })
  }, [])

  const handleReplyTo = useCallback(
    (message: ThreadMessage) => {
      onReplyTo?.(message)
      focusComposer()
    },
    [focusComposer, onReplyTo],
  )

  const handleForwardPick = (toConversationId: number) => {
    if (!forwardMessage) return
    onForward?.(forwardMessage.id, toConversationId)
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

  const applyQuickReply = (text: string) => {
    onBodyChange(body.trim() ? `${body.trim()}\n${text}` : text)
    inputRef.current?.focus()
  }

  const openMessageMedia = (img?: string, vid?: string, bodyText?: string, sender?: string) => {
    const caption = bodyText?.trim() || (sender ? `@${sender}` : undefined)
    if (vid) {
      openVideo(vid, img ?? null, caption)
      return
    }
    if (img) {
      openImage(img, 'Message', caption)
    }
  }

  return (
    <section
      className={`group-chat dm-chat${isProviderContext ? ' dm-chat--provider' : ''}`}
      aria-label={`Chat with ${personName}`}
    >
      <header className="group-chat__head dm-chat__head">
        <button type="button" className="group-chat__back" onClick={onBack} aria-label={backLabel}>
          <ArrowLeft size={18} strokeWidth={2.25} aria-hidden />
        </button>
        <Link to={`/u/${encodeURIComponent(person.username)}`} className="group-chat__profile-link">
          <div className="group-chat__avatar dm-chat__avatar">
            <UserAvatar src={person.avatar} name={personName} className="dm-chat__avatar-inner" fill />
          </div>
          <div className="group-chat__title">
            <strong>{personName}</strong>
            <small>
              @{person.username}
              {location ? ` · ${location}` : ''}
              {context === 'provider' ? ' · Guest' : ''}
            </small>
          </div>
        </Link>
        <div className="dm-chat__head-actions">
          {onBlock ? (
            <button
              type="button"
              className="dm-chat__head-btn"
              onClick={onBlock}
              disabled={blocking}
              aria-label={`Block ${personName}`}
              title={`Block ${personName}`}
            >
              {blocking ? (
                <Loader2 size={16} strokeWidth={2.25} className="group-chat__spin" aria-hidden />
              ) : (
                <Ban size={16} strokeWidth={2.25} aria-hidden />
              )}
            </button>
          ) : null}
          {reportTarget ? (
            <ReportButton
              className="dm-chat__head-btn dm-chat__head-btn--report"
              iconOnly
              triggerLabel="Report conversation"
              target={reportTarget}
            />
          ) : null}
          <Link to={inboxHref} className="dm-chat__inbox-pill">
            {inboxLabel}
          </Link>
        </div>
      </header>

      {statusSlot ? <div className="group-chat__status">{statusSlot}</div> : null}

      <div ref={threadRef} className="group-chat__thread" aria-label="Messages" aria-live="polite">
        {opening ? (
          <div className="group-chat__state">
            <Loader2 size={22} strokeWidth={2.25} className="group-chat__spin" aria-hidden />
            <p>Opening chat…</p>
          </div>
        ) : null}

        {loading ? (
          <div className="group-chat__state">
            <Loader2 size={22} strokeWidth={2.25} className="group-chat__spin" aria-hidden />
            <p>Loading messages…</p>
          </div>
        ) : null}

        {!opening && !loading ? (
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

            {messages.map((message) => {
              const mine = message.sender_username === myUsername
              const automated = Boolean(message.is_automated) && !mine
              return (
                <DmChatBubble
                  key={message.id}
                  message={message}
                  mine={mine}
                  automated={automated}
                  onReplyTo={handleReplyTo}
                  onDelete={(id, scope) => onDelete?.(id, scope)}
                  onForward={(row) => setForwardMessage(row)}
                  onOpenMedia={openMessageMedia}
                  onRequestComposerFocus={focusComposer}
                />
              )
            })}

            {typingUsernames.length > 0 ? (
              <p className="dm-chat__typing" aria-live="polite">
                {typingUsernames.length === 1 ? `${personName} is typing…` : 'They are typing…'}
              </p>
            ) : null}
          </>
        ) : null}
      </div>

      {showQuickReplyChips && replies.length > 0 && !opening ? (
        <div className="dm-chat__quick" aria-label="Quick replies">
          {replies.map((text) => (
            <button key={text} type="button" className="dm-chat__quick-btn" onClick={() => applyQuickReply(text)}>
              {text}
            </button>
          ))}
        </div>
      ) : null}

      <div ref={composerShellRef} className="msg-composer-shell msg-composer-shell--group-chat">
        {replyTo && onClearReply ? <DmChatReplyBar message={replyTo} onClear={onClearReply} /> : null}
        <MessageComposer
          theme="dark"
          value={body}
          onChange={onBodyChange}
          onSubmit={onSend}
          inputRef={inputRef}
          placeholder={
            replyTo
              ? `Reply to @${replyTo.sender_username}…`
              : context === 'provider'
                ? `Reply to ${personName}…`
                : `Message ${personName}…`
          }
          inputAriaLabel={
            replyTo
              ? `Reply to @${replyTo.sender_username}`
              : context === 'provider'
                ? `Reply to ${personName}`
                : `Message ${personName}`
          }
          sendAriaLabel="Send message"
          sendDisabled={!canSendNow || opening}
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

      <DmForwardSheet
        open={Boolean(forwardMessage)}
        currentConversationId={conversationId}
        busy={forwarding}
        onClose={() => setForwardMessage(null)}
        onPick={handleForwardPick}
      />
    </section>
  )
}
