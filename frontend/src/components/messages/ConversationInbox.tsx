import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useOutletContext } from 'react-router-dom'
import { Inbox, MessageCircle, PenLine, Search, Settings2, UserRound } from 'lucide-react'
import { apiFetch, mediaUrl } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import type { ProviderOutletContext } from '../ProviderLayout'
import { useBusinessAccess } from '../../hooks/useBusinessAccess'
import { SearchPanel } from '../marketplace'
import { MessagesEmptyState } from './MessagesEmptyState'
import { NewMessageSheet, type MessagePerson } from './NewMessageSheet'
import { ConversationContextChip } from './ConversationContextChip'
import {
  conversationOther,
  formatConversationTime,
  participantInitial,
  participantLabel,
  previewText,
  type InboxConversation,
} from './conversationInboxUtils'
import type { MessagingContext } from './messageProviderUtils'
import { messageThreadPath } from './messageProviderUtils'

type WhenFilter = 'all' | 'today'

type Copy = {
  searchLabel: string
  searchPlaceholder: string
  countSingular: string
  countPlural: string
  newMessage: string
  emptyTitle: string
  emptySubtitle: string
  noMatchesTitle: string
  noMatchesSubtitle: string
  showAllLabel: string
  guestBadge?: string
}

const COPY: Record<MessagingContext, Copy> = {
  user: {
    searchLabel: 'Search messages',
    searchPlaceholder: 'Search name or message',
    countSingular: 'chat',
    countPlural: 'chats',
    newMessage: 'New message',
    emptyTitle: 'No messages yet',
    emptySubtitle: 'Search for someone and send your first message.',
    noMatchesTitle: 'No matches',
    noMatchesSubtitle: 'Try another name or clear your filters.',
    showAllLabel: 'Show all chats',
  },
  provider: {
    searchLabel: 'Search guest messages',
    searchPlaceholder: 'Search guest name or message',
    countSingular: 'conversation',
    countPlural: 'conversations',
    newMessage: 'Message guest',
    emptyTitle: 'No guest messages yet',
    emptySubtitle: 'When travellers message you about bookings or listings, conversations appear here.',
    noMatchesTitle: 'No matching conversations',
    noMatchesSubtitle: 'Try another guest name or clear your filters.',
    showAllLabel: 'Show all conversations',
    guestBadge: 'Guest',
  },
}

type Props = {
  context?: MessagingContext
  /** User inbox hides search in DOM for AppLayout header sync */
  hideSearchPanel?: boolean
}

export function ConversationInbox({ context = 'user', hideSearchPanel = false }: Props) {
  const { profile } = useAuth()
  const outletCtx = useOutletContext<ProviderOutletContext>()
  const { canManageSettings } = useBusinessAccess(
    context === 'provider' ? outletCtx?.activeBusiness?.id : undefined,
  )
  const copy = COPY[context]
  const [query, setQuery] = useState('')
  const [whenFilter, setWhenFilter] = useState<WhenFilter>('all')
  const [composeOpen, setComposeOpen] = useState(false)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['conversations'],
    enabled: !!profile,
    queryFn: () => apiFetch<InboxConversation[]>('/api/messaging/conversations/'),
    refetchInterval: 20_000,
  })

  const conversations = useMemo(() => (Array.isArray(data) ? data : []), [data])

  const recentPeople = useMemo((): MessagePerson[] => {
    if (!profile) return []
    const seen = new Set<string>()
    const people: MessagePerson[] = []
    for (const conversation of conversations) {
      const other = conversationOther(conversation, profile.username)
      if (!other || seen.has(other.username)) continue
      seen.add(other.username)
      people.push({
        id: other.id,
        username: other.username,
        display_name: other.display_name,
      })
    }
    return people
  }, [conversations, profile])

  const filteredConversations = useMemo(() => {
    let list = conversations
    if (whenFilter === 'today') {
      const now = new Date()
      list = list.filter((conversation) => {
        const date = new Date(conversation.updated_at)
        return !Number.isNaN(date.getTime()) && date.toDateString() === now.toDateString()
      })
    }
    const search = query.trim().toLowerCase()
    if (!search || !profile) return list
    return list.filter((conversation) => {
      const other = conversationOther(conversation, profile.username)
      const haystack = [
        participantLabel(other),
        other?.username,
        conversation.last_message?.body,
        conversation.last_message?.sender_username,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(search)
    })
  }, [conversations, profile, query, whenFilter])

  if (!profile) return null

  const rootClass = context === 'provider' ? 'prov-msg-inbox' : 'msg-page'
  const listClass = context === 'provider' ? 'prov-msg-inbox__list' : 'msg-inbox'
  const rowClass = context === 'provider' ? 'prov-msg-inbox__row' : 'msg-row'

  return (
    <div className={rootClass}>
      {context === 'provider' ? (
        <header className="prov-msg-inbox__head">
          <h1 className="prov-msg-inbox__title">Guest messages</h1>
          <p className="prov-msg-inbox__sub">Reply to travellers about bookings, availability, and enquiries.</p>
        </header>
      ) : null}

      <SearchPanel
        id="msg-search"
        label={copy.searchLabel}
        placeholder={copy.searchPlaceholder}
        value={query}
        onChange={setQuery}
        onClear={() => setQuery('')}
        className={hideSearchPanel ? 'msg-page__search-sync' : context === 'provider' ? 'prov-msg-inbox__search' : undefined}
      />

      {context === 'provider' ? (
        <div className="prov-msg-inbox__filters" role="group" aria-label="Filter conversations">
          <button
            type="button"
            className={`prov-msg-inbox__chip${whenFilter === 'all' ? ' prov-msg-inbox__chip--active' : ''}`}
            onClick={() => setWhenFilter('all')}
          >
            All
          </button>
          <button
            type="button"
            className={`prov-msg-inbox__chip${whenFilter === 'today' ? ' prov-msg-inbox__chip--active' : ''}`}
            onClick={() => setWhenFilter('today')}
          >
            Today
          </button>
        </div>
      ) : (
        <div className="msg-page__filter-sync" aria-hidden>
          <button type="button" onClick={() => setWhenFilter('all')}>
            All
          </button>
          <button type="button" onClick={() => setWhenFilter('today')}>
            Today
          </button>
        </div>
      )}

      <div className={context === 'provider' ? 'prov-msg-inbox__toolbar' : 'msg-page__toolbar'}>
        <p className={context === 'provider' ? 'prov-msg-inbox__count' : 'msg-page__count'} role="status">
          {filteredConversations.length}{' '}
          {filteredConversations.length === 1 ? copy.countSingular : copy.countPlural}
          {whenFilter === 'today' ? ' · today' : ''}
        </p>
        <div className="prov-msg-inbox__toolbar-actions">
          <button
            type="button"
            className={context === 'provider' ? 'prov-msg-inbox__compose' : 'msg-page__new-toggle'}
            aria-expanded={composeOpen}
            onClick={() => setComposeOpen(true)}
          >
            <PenLine size={14} strokeWidth={2.35} aria-hidden />
            {copy.newMessage}
          </button>
          {context === 'provider' && canManageSettings ? (
            <Link to="/provider/messages/settings" className="prov-msg-inbox__settings" aria-label="Messaging automation settings">
              <Settings2 size={16} strokeWidth={2.25} aria-hidden />
            </Link>
          ) : null}
        </div>
      </div>

      {isLoading ? (
        <div className={context === 'provider' ? 'prov-msg-inbox__loading' : 'msg-page__loading'} aria-label="Loading conversations">
          {[1, 2, 3, 4].map((item) => (
            <span key={item} />
          ))}
        </div>
      ) : null}

      {isError ? (
        <MessagesEmptyState
          icon={<MessageCircle size={22} strokeWidth={1.75} />}
          title="Couldn't load messages"
          subtitle="Check your connection and try again."
          action={{ label: 'Try again', onClick: () => void refetch() }}
        />
      ) : null}

      {!isLoading && !isError && conversations.length === 0 ? (
        <MessagesEmptyState
          icon={<Inbox size={22} strokeWidth={1.75} />}
          title={copy.emptyTitle}
          subtitle={copy.emptySubtitle}
          action={{ label: copy.newMessage, onClick: () => setComposeOpen(true) }}
        />
      ) : null}

      {!isLoading && !isError && conversations.length > 0 && filteredConversations.length === 0 ? (
        <MessagesEmptyState
          icon={<Search size={22} strokeWidth={1.75} />}
          title={copy.noMatchesTitle}
          subtitle={copy.noMatchesSubtitle}
          action={{
            label: copy.showAllLabel,
            onClick: () => {
              setQuery('')
              setWhenFilter('all')
            },
          }}
        />
      ) : null}

      {!isLoading && !isError && filteredConversations.length > 0 ? (
        <ul className={listClass} aria-label="Conversations">
          {filteredConversations.map((conversation) => {
            const other = conversationOther(conversation, profile.username)
            const label = participantLabel(other)
            const preview = previewText(conversation, profile.username)
            const unread = (conversation.unread_count ?? 0) > 0
            const avatarSrc = mediaUrl(other?.avatar ?? null)
            return (
              <li key={conversation.id}>
                <Link to={messageThreadPath(conversation.id, context)} className={rowClass}>
                  <span className={context === 'provider' ? 'prov-msg-inbox__avatar' : 'msg-row__avatar'} aria-hidden>
                    {avatarSrc ? (
                      <img src={avatarSrc} alt="" />
                    ) : other ? (
                      participantInitial(other)
                    ) : (
                      <UserRound size={18} strokeWidth={2} />
                    )}
                  </span>
                  <span className={context === 'provider' ? 'prov-msg-inbox__main' : 'msg-row__main'}>
                    <span className={context === 'provider' ? 'prov-msg-inbox__top' : 'msg-row__top'}>
                      <strong>
                        {label}
                        {copy.guestBadge ? (
                          <span className="prov-msg-inbox__badge">{copy.guestBadge}</span>
                        ) : null}
                      </strong>
                      <time dateTime={conversation.updated_at}>{formatConversationTime(conversation.updated_at)}</time>
                    </span>
                    <span
                      className={
                        preview.fromYou
                          ? context === 'provider'
                            ? 'prov-msg-inbox__preview prov-msg-inbox__preview--you'
                            : 'msg-row__preview msg-row__preview--you'
                          : context === 'provider'
                            ? 'prov-msg-inbox__preview'
                            : 'msg-row__preview'
                      }
                    >
                      {preview.text}
                    </span>
                    {conversation.context?.label ? (
                      <ConversationContextChip
                        context={conversation.context}
                        className="msg-context-chip--inbox"
                        variant={context === 'provider' ? 'provider' : 'user'}
                      />
                    ) : null}
                  </span>
                  {unread ? (
                    <span
                      className={context === 'provider' ? 'prov-msg-inbox__unread' : 'msg-row__unread'}
                      aria-label="Unread messages"
                    />
                  ) : null}
                </Link>
              </li>
            )
          })}
        </ul>
      ) : null}

      <NewMessageSheet
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        recentPeople={recentPeople}
        context={context}
      />
    </div>
  )
}
