import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useOutletContext } from 'react-router-dom'
import { Inbox, MessageCircle, PenLine, Search, Settings2, UserRound } from 'lucide-react'
import { apiFetch } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { groupsInboxPath, type InboxGroupThread } from '../../utils/communityGroups'
import { UserAvatar } from '../UserAvatar'
import type { ProviderOutletContext } from '../ProviderLayout'
import { useBusinessAccess } from '../../hooks/useBusinessAccess'
import { SearchPanel } from '../marketplace'
import { MessagesEmptyState } from './MessagesEmptyState'
import { NewMessageSheet, type MessagePerson } from './NewMessageSheet'
import { ConversationContextChip } from './ConversationContextChip'
import {
  conversationOther,
  formatConversationTime,
  groupInitial,
  groupPreviewText,
  mergeInboxEntries,
  participantLabel,
  previewText,
  type InboxConversation,
} from './conversationInboxUtils'
import type { MessagingContext } from './messageProviderUtils'
import { messageThreadPath } from './messageProviderUtils'
import { groupChatPath } from '../../utils/communityGroups'

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
}

export function ConversationInbox({ context = 'user' }: Props) {
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

  const groupsQuery = useQuery({
    queryKey: ['group-inbox'],
    enabled: Boolean(profile) && context === 'user',
    queryFn: () => apiFetch<InboxGroupThread[]>(groupsInboxPath()),
    refetchInterval: 20_000,
  })

  const conversations = useMemo(() => (Array.isArray(data) ? data : []), [data])
  const groupThreads = useMemo(
    () => (Array.isArray(groupsQuery.data) ? groupsQuery.data : []),
    [groupsQuery.data],
  )
  const inboxEntries = useMemo(
    () => mergeInboxEntries(conversations, groupThreads),
    [conversations, groupThreads],
  )

  const isLoadingInbox = isLoading || (context === 'user' && groupsQuery.isLoading)
  const isErrorInbox = isError || (context === 'user' && groupsQuery.isError)
  const refetchInbox = () => {
    void refetch()
    if (context === 'user') void groupsQuery.refetch()
  }

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

  const filteredEntries = useMemo(() => {
    let list = inboxEntries
    if (whenFilter === 'today') {
      const now = new Date()
      list = list.filter((entry) => {
        const date = new Date(entry.data.updated_at)
        return !Number.isNaN(date.getTime()) && date.toDateString() === now.toDateString()
      })
    }
    const search = query.trim().toLowerCase()
    if (!search || !profile) return list
    return list.filter((entry) => {
      if (entry.kind === 'group') {
        const thread = entry.data
        const haystack = [
          thread.name,
          thread.last_message?.body,
          thread.last_message?.sender_username,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        return haystack.includes(search)
      }
      const conversation = entry.data
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
  }, [inboxEntries, profile, query, whenFilter])

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
        className={context === 'provider' ? 'prov-msg-inbox__search' : 'msg-page__search'}
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
        <div className="msg-page__filters" role="group" aria-label="Filter conversations">
          <button
            type="button"
            className={`msg-page__chip${whenFilter === 'all' ? ' msg-page__chip--active' : ''}`}
            onClick={() => setWhenFilter('all')}
          >
            All
          </button>
          <button
            type="button"
            className={`msg-page__chip${whenFilter === 'today' ? ' msg-page__chip--active' : ''}`}
            onClick={() => setWhenFilter('today')}
          >
            Today
          </button>
        </div>
      )}

      <div className={context === 'provider' ? 'prov-msg-inbox__toolbar' : 'msg-page__toolbar'}>
        <p className={context === 'provider' ? 'prov-msg-inbox__count' : 'msg-page__count'} role="status">
          {filteredEntries.length}{' '}
          {filteredEntries.length === 1 ? copy.countSingular : copy.countPlural}
          {whenFilter === 'today' ? ' · today' : ''}
        </p>
        <div className={context === 'provider' ? 'prov-msg-inbox__toolbar-actions' : 'msg-page__toolbar-actions'}>
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

      {isLoadingInbox ? (
        <div className={context === 'provider' ? 'prov-msg-inbox__loading' : 'msg-page__loading'} aria-label="Loading conversations">
          {[1, 2, 3, 4].map((item) => (
            <span key={item} />
          ))}
        </div>
      ) : null}

      {isErrorInbox ? (
        <MessagesEmptyState
          icon={<MessageCircle size={22} strokeWidth={1.75} />}
          title="Couldn't load messages"
          subtitle="Check your connection and try again."
          action={{ label: 'Try again', onClick: () => void refetchInbox() }}
        />
      ) : null}

      {!isLoadingInbox && !isErrorInbox && inboxEntries.length === 0 ? (
        <MessagesEmptyState
          icon={<Inbox size={22} strokeWidth={1.75} />}
          title={copy.emptyTitle}
          subtitle={copy.emptySubtitle}
          action={{ label: copy.newMessage, onClick: () => setComposeOpen(true) }}
        />
      ) : null}

      {!isLoadingInbox && !isErrorInbox && inboxEntries.length > 0 && filteredEntries.length === 0 ? (
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

      {!isLoadingInbox && !isErrorInbox && filteredEntries.length > 0 ? (
        <ul className={listClass} aria-label="Conversations">
          {filteredEntries.map((entry) => {
            if (entry.kind === 'group') {
              const thread = entry.data
              const preview = groupPreviewText(thread, profile.username)
              const unread = (thread.unread_count ?? 0) > 0
              const initial = groupInitial(thread.name)
              return (
                <li key={`group-${thread.id}`}>
                  <Link to={groupChatPath(thread.slug)} className={rowClass}>
                    <span className={`${context === 'provider' ? 'prov-msg-inbox__avatar' : 'msg-row__avatar'} msg-row__avatar--group`}>
                      {thread.cover_src ? (
                        <img src={thread.cover_src} alt="" loading="lazy" decoding="async" />
                      ) : (
                        <span>{initial}</span>
                      )}
                    </span>
                    <span className={context === 'provider' ? 'prov-msg-inbox__main' : 'msg-row__main'}>
                      <span className={context === 'provider' ? 'prov-msg-inbox__top' : 'msg-row__top'}>
                        <strong>
                          {thread.name}
                          <span className="msg-row__badge">Group</span>
                        </strong>
                        <time dateTime={thread.updated_at}>{formatConversationTime(thread.updated_at)}</time>
                      </span>
                      <span
                        className={
                          preview.fromYou
                            ? 'msg-row__preview msg-row__preview--you'
                            : 'msg-row__preview'
                        }
                      >
                        {preview.text}
                      </span>
                    </span>
                    {unread ? (
                      <span className="msg-row__unread" aria-label="Unread messages" />
                    ) : null}
                  </Link>
                </li>
              )
            }

            const conversation = entry.data
            const other = conversationOther(conversation, profile.username)
            const label = participantLabel(other)
            const preview = previewText(conversation, profile.username)
            const unread = (conversation.unread_count ?? 0) > 0
            const avatarClass = context === 'provider' ? 'prov-msg-inbox__avatar' : 'msg-row__avatar'
            return (
              <li key={conversation.id}>
                <Link to={messageThreadPath(conversation.id, context)} className={rowClass}>
                  <UserAvatar
                    src={other?.avatar}
                    name={label}
                    className={avatarClass}
                    fill
                  />
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
