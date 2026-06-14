import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowRight, Inbox, Lock, MessageCircle, RefreshCw, Search, Send, UserRound } from 'lucide-react'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { EmptyState } from '../components/ui'
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
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

function participantLabel(participant?: Participant): string {
  return participant?.display_name?.trim() || participant?.username || 'Conversation'
}

function participantInitial(participant?: Participant): string {
  return participantLabel(participant).charAt(0).toUpperCase() || 'D'
}

function previewText(conversation: Conv): string {
  if (!conversation.last_message) return 'No messages yet'
  const body = conversation.last_message.body.trim()
  const clipped = body.length > 82 ? `${body.slice(0, 82)}…` : body
  return `${conversation.last_message.sender_username}: ${clipped}`
}

export function Messages() {
  const { profile } = useAuth()
  const qc = useQueryClient()
  const [uid, setUid] = useState('')
  const [query, setQuery] = useState('')

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['conversations'],
    enabled: !!profile,
    queryFn: () => apiFetch<Conv[]>('/api/messaging/conversations/'),
  })

  const conversations = useMemo(() => (Array.isArray(data) ? data : []), [data])

  const filteredConversations = useMemo(() => {
    const search = query.trim().toLowerCase()
    if (!search || !profile) return conversations
    return conversations.filter((conversation) => {
      const other = conversation.participants_detail.find((p) => p.username !== profile.username)
      const haystack = [participantLabel(other), other?.username, conversation.last_message?.body, conversation.last_message?.sender_username]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(search)
    })
  }, [conversations, profile, query])

  const activeToday = useMemo(() => {
    const now = new Date()
    return conversations.filter((conversation) => {
      const date = new Date(conversation.updated_at)
      return !Number.isNaN(date.getTime()) && date.toDateString() === now.toDateString()
    }).length
  }, [conversations])

  const startMut = useMutation({
    mutationFn: () => apiFetch<Conv>('/api/messaging/start/', { method: 'POST', body: JSON.stringify({ user_id: Number(uid) }) }),
    onSuccess: () => {
      setUid('')
      void qc.invalidateQueries({ queryKey: ['conversations'] })
    },
  })

  const startReady = uid.trim().length > 0 && Number.isFinite(Number(uid)) && Number(uid) > 0 && !startMut.isPending

  if (!profile) {
    return (
      <main className="messages-page messages-page--auth">
        <section className="messages-auth-card">
          <span className="messages-auth-card__icon" aria-hidden>
            <Lock size={30} strokeWidth={2} />
          </span>
          <p className="messages-kicker">Private inbox</p>
          <h1>Sign in to see your messages</h1>
          <p>Chats with hosts, guides, providers, and travellers are kept inside your DELVE account.</p>
          <Link to="/login" className="btn btn-primary messages-auth-card__cta">
            Sign in
            <ArrowRight size={16} strokeWidth={2.5} aria-hidden />
          </Link>
        </section>
      </main>
    )
  }

  return (
    <main className="messages-page">
      <section className="messages-hero">
        <div className="messages-hero__copy">
          <p className="messages-kicker">Messages</p>
          <h1>Your DELVE inbox</h1>
          <p>Keep travel planning, provider requests, and community conversations in one calm place.</p>
        </div>
        <div className="messages-hero__stats" aria-label="Message overview">
          <div>
            <strong>{conversations.length}</strong>
            <span>{conversations.length === 1 ? 'conversation' : 'conversations'}</span>
          </div>
          <div>
            <strong>{activeToday}</strong>
            <span>active today</span>
          </div>
        </div>
      </section>

      <section className="messages-layout">
        <aside className="messages-compose-card" aria-label="Start a chat">
          <span className="messages-compose-card__icon" aria-hidden>
            <Send size={22} strokeWidth={2.25} />
          </span>
          <div>
            <h2>Start chat</h2>
            <p>Use a user ID for now. Later this can become profile search.</p>
          </div>
          <label className="messages-field">
            <span>User ID</span>
            <input
              className="input"
              inputMode="numeric"
              placeholder="Enter user ID"
              value={uid}
              onChange={(event) => setUid(event.target.value)}
            />
          </label>
          <button type="button" className="btn btn-primary messages-start-btn" disabled={!startReady} onClick={() => startMut.mutate()}>
            {startMut.isPending ? 'Starting' : 'Start conversation'}
          </button>
          {startMut.isError ? <p className="messages-error">Could not start this chat. Check the user ID and try again.</p> : null}
        </aside>

        <section className="messages-inbox-card" aria-label="Conversations">
          <div className="messages-inbox-card__head">
            <div>
              <p className="messages-kicker">Inbox</p>
              <h2>Conversations</h2>
            </div>
            <button type="button" className="messages-refresh" onClick={() => void refetch()} disabled={isLoading} aria-label="Refresh messages">
              <RefreshCw size={16} strokeWidth={2.25} aria-hidden />
              Refresh
            </button>
          </div>

          <label className="messages-search">
            <Search size={17} strokeWidth={2.25} aria-hidden />
            <span className="visually-hidden">Search conversations</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, username, or message" />
          </label>

          {isLoading ? (
            <div className="messages-skeleton" aria-label="Loading conversations">
              {[1, 2, 3].map((item) => <div key={item} className="messages-skeleton__row" />)}
            </div>
          ) : null}

          {isError ? (
            <EmptyState
              iconElement={<MessageCircle size={28} strokeWidth={2} aria-hidden />}
              title="We couldn't load messages"
              sub="Please check your connection and try again."
              cta={{ label: 'Try again', onClick: () => void refetch() }}
            />
          ) : null}

          {!isLoading && !isError && conversations.length === 0 ? (
            <EmptyState
              iconElement={<Inbox size={28} strokeWidth={2} aria-hidden />}
              title="No messages yet"
              sub="Start a chat from a guide, host, provider, or traveller profile."
            />
          ) : null}

          {!isLoading && !isError && conversations.length > 0 && filteredConversations.length === 0 ? (
            <EmptyState
              iconElement={<Search size={28} strokeWidth={2} aria-hidden />}
              title="No matches"
              sub="Try a different name, username, or message keyword."
            />
          ) : null}

          <div className="messages-list">
            {filteredConversations.map((conversation) => {
              const other = conversation.participants_detail.find((p) => p.username !== profile.username)
              const label = participantLabel(other)
              return (
                <Link key={conversation.id} to={`/messages/${conversation.id}`} className="messages-thread-card">
                  <span className="messages-thread-card__avatar" aria-hidden>
                    {other ? participantInitial(other) : <UserRound size={18} strokeWidth={2} />}
                  </span>
                  <span className="messages-thread-card__body">
                    <span className="messages-thread-card__topline">
                      <strong>{label}</strong>
                      <small>{formatConversationTime(conversation.updated_at)}</small>
                    </span>
                    <span className="messages-thread-card__preview">{previewText(conversation)}</span>
                  </span>
                  <ArrowRight size={17} strokeWidth={2.5} className="messages-thread-card__arrow" aria-hidden />
                </Link>
              )
            })}
          </div>
        </section>
      </section>
    </main>
  )
}
