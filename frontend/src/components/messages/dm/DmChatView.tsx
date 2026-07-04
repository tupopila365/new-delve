import type { FormEvent, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Ban, Bot, Loader2, Send, UserRound } from 'lucide-react'
import { ReportButton } from '../../report/ReportButton'
import { formatMessageTime } from './messagingUtils'
import type { MessagingContext } from '../messageProviderUtils'
import './dm-chat.css'

export type DmMessage = {
  id: number | string
  sender_username: string
  body: string
  created_at?: string
  is_automated?: boolean
  pending?: boolean
  failed?: boolean
}

type Person = {
  username: string
  display_name?: string
  avatar?: string | null
  city?: string
  region?: string
}

type Props = {
  person: Person
  personName: string
  myUsername: string
  messages: DmMessage[]
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
}

export function DmChatView({
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
}: Props) {
  const location = [person.city, person.region].filter(Boolean).join(', ')
  const isProviderContext = context === 'provider'
  const replies = quickReplies ?? []
  const showQuickReplyChips = (showQuickReplies ?? isProviderContext) && replies.length > 0
  const chatClass = context === 'provider' ? 'dm-chat dm-chat--provider' : 'dm-chat'

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!body.trim() || sending) return
    onSend()
  }

  const applyQuickReply = (text: string) => {
    onBodyChange(body.trim() ? `${body.trim()}\n${text}` : text)
  }

  return (
    <section className={chatClass} aria-label={`Chat with ${personName}`}>
      <header className="dm-chat__head">
        <button type="button" className="dm-chat__back" onClick={onBack} aria-label={backLabel}>
          <ArrowLeft size={18} strokeWidth={2.25} aria-hidden />
        </button>
        <Link to={`/u/${encodeURIComponent(person.username)}`} className="dm-chat__person">
          <span className="dm-chat__avatar" aria-hidden>
            {person.avatar ? <img src={person.avatar} alt="" /> : <UserRound size={18} strokeWidth={2} />}
          </span>
          <span className="dm-chat__person-copy">
            <strong>{personName}</strong>
            <small>
              @{person.username}
              {location ? ` · ${location}` : ''}
              {context === 'provider' ? ' · Guest' : ''}
            </small>
          </span>
        </Link>
        {onBlock ? (
          <button
            type="button"
            className="dm-chat__block"
            onClick={onBlock}
            disabled={blocking}
            aria-label={`Block ${personName}`}
            title={`Block ${personName}`}
          >
            {blocking ? (
              <Loader2 size={16} strokeWidth={2.25} className="dm-chat__spin" aria-hidden />
            ) : (
              <Ban size={16} strokeWidth={2.25} aria-hidden />
            )}
          </button>
        ) : null}
        {reportTarget ? (
          <ReportButton
            className="dm-chat__report"
            iconOnly
            triggerLabel="Report conversation"
            target={reportTarget}
          />
        ) : null}
        <Link to={inboxHref} className="dm-chat__inbox">
          {inboxLabel}
        </Link>
      </header>

      {statusSlot ? <div className="dm-chat__status">{statusSlot}</div> : null}

      <div className="dm-chat__thread" aria-label="Messages" aria-live="polite">
        {opening ? (
          <div className="dm-chat__state">
            <Loader2 size={22} strokeWidth={2.25} className="dm-chat__spin" aria-hidden />
            <p>Opening chat…</p>
          </div>
        ) : null}

        {loading ? (
          <div className="dm-chat__state">
            <Loader2 size={22} strokeWidth={2.25} className="dm-chat__spin" aria-hidden />
            <p>Loading messages…</p>
          </div>
        ) : null}

        {!opening && !loading ? (
          <>
            {hasMore && onLoadOlder ? (
              <div className="dm-chat__load-older">
                <button
                  type="button"
                  className="dm-chat__load-older-btn"
                  onClick={onLoadOlder}
                  disabled={loadingOlder}
                >
                  {loadingOlder ? (
                    <>
                      <Loader2 size={14} strokeWidth={2.25} className="dm-chat__spin" aria-hidden />
                      Loading…
                    </>
                  ) : (
                    'Load earlier messages'
                  )}
                </button>
              </div>
            ) : null}

            {messages.map((message) => {
              const mine = message.sender_username === myUsername
              const automated = Boolean(message.is_automated) && !mine
              return (
                <article
                  key={message.id}
                  className={[
                    'dm-chat__bubble',
                    automated ? 'dm-chat__bubble--auto' : mine ? 'dm-chat__bubble--mine' : 'dm-chat__bubble--theirs',
                    message.pending ? 'dm-chat__bubble--pending' : '',
                    message.failed ? 'dm-chat__bubble--failed' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {automated ? (
                    <span className="dm-chat__auto-label">
                      <Bot size={12} strokeWidth={2.25} aria-hidden />
                      Automated · Provider
                    </span>
                  ) : null}
                  <p>{message.body}</p>
                  {message.pending ? (
                    <small>Sending…</small>
                  ) : message.created_at ? (
                    <small>{formatMessageTime(message.created_at)}</small>
                  ) : null}
                </article>
              )
            })}

            {typingUsernames.length > 0 ? (
              <p className="dm-chat__typing" aria-live="polite">
                {typingUsernames.length === 1
                  ? `${personName} is typing…`
                  : 'They are typing…'}
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

      <form className="dm-chat__composer" onSubmit={onSubmit}>
        <textarea
          value={body}
          onChange={(event) => onBodyChange(event.target.value)}
          placeholder={context === 'provider' ? `Reply to ${personName}…` : `Message ${personName}…`}
          rows={1}
          aria-label={context === 'provider' ? `Reply to ${personName}` : `Message ${personName}`}
        />
        <button type="submit" disabled={!body.trim() || sending || opening} aria-label="Send message">
          {sending ? (
            <Loader2 size={18} strokeWidth={2.4} className="dm-chat__spin" aria-hidden />
          ) : (
            <Send size={18} strokeWidth={2.4} aria-hidden />
          )}
        </button>
      </form>
    </section>
  )
}
