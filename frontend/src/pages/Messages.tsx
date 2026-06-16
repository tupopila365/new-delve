import { useMemo, useState } from 'react'

import { useQuery } from '@tanstack/react-query'

import { Link } from 'react-router-dom'

import { ArrowRight, Inbox, Lock, MessageCircle, PenLine, Search, UserRound } from 'lucide-react'

import { apiFetch } from '../api/client'

import { useAuth } from '../auth/AuthContext'

import { MessagesEmptyState } from '../components/messages/MessagesEmptyState'

import { NewMessageSheet, type MessagePerson } from '../components/messages/NewMessageSheet'

import { SearchPanel } from '../components/marketplace'

import '../messages-redesign.css'



type Participant = { id: number; username: string; display_name: string }



type Conv = {

  id: number

  participants_detail: Participant[]

  last_message: { body: string; sender_username: string } | null

  updated_at: string

}



function formatConversationTime(value: string): string {

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return ''

  const now = new Date()

  const today = date.toDateString() === now.toDateString()

  if (today) return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })

  const weekAgo = new Date(now)

  weekAgo.setDate(now.getDate() - 6)

  if (date >= weekAgo) return date.toLocaleDateString(undefined, { weekday: 'short' })

  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })

}



function participantLabel(participant?: Participant): string {

  return participant?.display_name?.trim() || participant?.username || 'Conversation'

}



function participantInitial(participant?: Participant): string {

  return participantLabel(participant).charAt(0).toUpperCase() || 'D'

}



function previewText(conversation: Conv, myUsername: string): { text: string; fromYou: boolean } {

  if (!conversation.last_message) return { text: 'No messages yet', fromYou: false }

  const body = conversation.last_message.body.trim()

  const clipped = body.length > 52 ? `${body.slice(0, 52)}…` : body

  const fromYou = conversation.last_message.sender_username === myUsername

  return { text: fromYou ? `You: ${clipped}` : clipped, fromYou }

}



export function Messages() {

  const { profile } = useAuth()

  const [query, setQuery] = useState('')

  const [whenFilter, setWhenFilter] = useState<'all' | 'today'>('all')

  const [composeOpen, setComposeOpen] = useState(false)



  const { data, isLoading, isError, refetch } = useQuery({

    queryKey: ['conversations'],

    enabled: !!profile,

    queryFn: () => apiFetch<Conv[]>('/api/messaging/conversations/'),

  })



  const conversations = useMemo(() => (Array.isArray(data) ? data : []), [data])



  const recentPeople = useMemo((): MessagePerson[] => {

    if (!profile) return []

    const seen = new Set<string>()

    const people: MessagePerson[] = []

    for (const conversation of conversations) {

      const other = conversation.participants_detail.find((p) => p.username !== profile.username)

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

      const other = conversation.participants_detail.find((p) => p.username !== profile.username)

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



  if (!profile) {

    return (

      <main className="msg-page msg-page--auth">

        <section className="msg-auth">

          <span className="msg-auth__icon" aria-hidden>

            <Lock size={22} strokeWidth={2.25} />

          </span>

          <h1>Sign in to see messages</h1>

          <p>Private chats with hosts, guides, and travellers stay in your DELVE account.</p>

          <Link to="/login" className="btn btn-primary">

            Sign in

            <ArrowRight size={16} strokeWidth={2.5} aria-hidden />

          </Link>

        </section>

      </main>

    )

  }



  return (

    <main className="msg-page">

      <SearchPanel

        id="msg-search"

        label="Search messages"

        placeholder="Search name or message"

        value={query}

        onChange={setQuery}

        onClear={() => setQuery('')}

        className="msg-page__search-sync"

      />



      <div className="msg-page__filter-sync" aria-hidden>

        <button type="button" onClick={() => setWhenFilter('all')}>

          All

        </button>

        <button type="button" onClick={() => setWhenFilter('today')}>

          Today

        </button>

      </div>



      <div className="msg-page__toolbar">

        <p className="msg-page__count" role="status">

          {filteredConversations.length}{' '}

          {filteredConversations.length === 1 ? 'chat' : 'chats'}

          {whenFilter === 'today' ? ' · today' : ''}

        </p>

        <button

          type="button"

          className="msg-page__new-toggle"

          aria-expanded={composeOpen}

          onClick={() => setComposeOpen(true)}

        >

          <PenLine size={14} strokeWidth={2.35} aria-hidden />

          New message

        </button>

      </div>



      {isLoading ? (

        <div className="msg-page__loading" aria-label="Loading conversations">

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

          title="No messages yet"

          subtitle="Search for someone and send your first message."

          action={{ label: 'New message', onClick: () => setComposeOpen(true) }}

        />

      ) : null}



      {!isLoading && !isError && conversations.length > 0 && filteredConversations.length === 0 ? (

        <MessagesEmptyState

          icon={<Search size={22} strokeWidth={1.75} />}

          title="No matches"

          subtitle="Try another name or clear your filters."

          action={{

            label: 'Show all chats',

            onClick: () => {

              setQuery('')

              setWhenFilter('all')

            },

          }}

        />

      ) : null}



      {!isLoading && !isError && filteredConversations.length > 0 ? (

        <ul className="msg-inbox" aria-label="Conversations">

          {filteredConversations.map((conversation) => {

            const other = conversation.participants_detail.find((p) => p.username !== profile.username)

            const label = participantLabel(other)

            const preview = previewText(conversation, profile.username)

            return (

              <li key={conversation.id}>

                <Link to={`/messages/${conversation.id}`} className="msg-row">

                  <span className="msg-row__avatar" aria-hidden>

                    {other ? participantInitial(other) : <UserRound size={18} strokeWidth={2} />}

                  </span>

                  <span className="msg-row__main">

                    <span className="msg-row__top">

                      <strong>{label}</strong>

                      <time dateTime={conversation.updated_at}>

                        {formatConversationTime(conversation.updated_at)}

                      </time>

                    </span>

                    <span

                      className={

                        preview.fromYou ? 'msg-row__preview msg-row__preview--you' : 'msg-row__preview'

                      }

                    >

                      {preview.text}

                    </span>

                  </span>

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

      />

    </main>

  )

}


