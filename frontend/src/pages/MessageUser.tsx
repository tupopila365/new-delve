import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Lock, MessageCircle, Send, UserRound } from 'lucide-react'
import { apiFetch, mediaUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import '../message-user.css'

type PublicMessageProfile = {
  id?: number
  username: string
  display_name: string
  bio?: string
  city?: string
  region?: string
  avatar?: string | null
  allow_messages?: boolean
}

type Conversation = {
  id: number
  participants_detail: { id: number; username: string; display_name: string }[]
  updated_at: string
}

type Message = {
  id: number
  sender_username: string
  body: string
  created_at: string
}

function displayName(profile?: PublicMessageProfile): string {
  return profile?.display_name?.trim() || profile?.username || 'Delver'
}

function fallbackUserId(username: string): number | null {
  if (username.toLowerCase() === 'demo_user') return 1
  if (username.toLowerCase() === 'demo_provider') return 2
  return null
}

function messageTime(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export function MessageUser() {
  const { username: rawUsername } = useParams()
  const username = rawUsername?.trim() ?? ''
  const { profile: me } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const bottomRef = useRef<HTMLDivElement>(null)
  const startedFor = useRef('')
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [body, setBody] = useState('')

  const targetQuery = useQuery({
    queryKey: ['message-profile', username],
    queryFn: () => apiFetch<PublicMessageProfile>(`/api/accounts/users/${encodeURIComponent(username)}/`, { auth: false }),
    enabled: Boolean(username),
    retry: false,
  })

  const target = targetQuery.data
  const targetName = displayName(target)
  const targetAvatar = mediaUrl(target?.avatar ?? null)
  const targetLocation = [target?.city, target?.region].filter(Boolean).join(', ')
  const isSelf = Boolean(me && target && me.username.toLowerCase() === target.username.toLowerCase())
  const messagesAllowed = target?.allow_messages !== false
  const otherUserId = useMemo(() => target?.id ?? fallbackUserId(username), [target?.id, username])

  const startMut = useMutation({
    mutationFn: (userId: number) =>
      apiFetch<Conversation>('/api/messaging/start/', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      }),
    onSuccess: (next) => setConversation(next),
  })

  useEffect(() => {
    if (!me || !target || isSelf || !messagesAllowed || !otherUserId) return
    const key = `${target.username}:${otherUserId}`
    if (startedFor.current === key) return
    startedFor.current = key
    startMut.mutate(otherUserId)
  }, [isSelf, me, messagesAllowed, otherUserId, startMut, target])

  const messagesQuery = useQuery({
    queryKey: ['msgs', conversation?.id],
    enabled: Boolean(me && conversation?.id),
    queryFn: () => apiFetch<Message[]>(`/api/messaging/conversations/${conversation?.id}/messages/`),
    refetchInterval: 8000,
  })

  const sendMut = useMutation({
    mutationFn: () =>
      apiFetch(`/api/messaging/conversations/${conversation?.id}/messages/`, {
        method: 'POST',
        body: JSON.stringify({ body: body.trim() }),
      }),
    onSuccess: () => {
      setBody('')
      void qc.invalidateQueries({ queryKey: ['msgs', conversation?.id] })
      void qc.invalidateQueries({ queryKey: ['conversations'] })
    },
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messagesQuery.data])

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!conversation?.id || !body.trim() || sendMut.isPending) return
    sendMut.mutate()
  }

  if (!me) {
    return (
      <main className="dm-page dm-page--centered">
        <section className="dm-card dm-card--auth">
          <Lock size={28} strokeWidth={2} aria-hidden />
          <h1>Sign in to message {targetName}</h1>
          <p>Messages are private and only available inside your DELVE account.</p>
          <Link to="/login" className="btn btn-primary">Sign in</Link>
        </section>
      </main>
    )
  }

  return (
    <main className="dm-page">
      <section className="dm-shell" aria-label={`Message ${targetName}`}>
        <header className="dm-head">
          <button type="button" className="dm-back" onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft size={19} strokeWidth={2.25} aria-hidden />
          </button>
          <Link to={`/u/${encodeURIComponent(target?.username ?? username)}`} className="dm-person">
            <span className="dm-person__avatar" aria-hidden>
              {targetAvatar ? <img src={targetAvatar} alt="" /> : <UserRound size={19} strokeWidth={2} />}
            </span>
            <span>
              <strong>{targetName}</strong>
              <small>@{target?.username ?? username}{targetLocation ? ` · ${targetLocation}` : ''}</small>
            </span>
          </Link>
        </header>

        {targetQuery.isLoading ? (
          <div className="dm-status">Loading profile…</div>
        ) : null}

        {targetQuery.isError ? (
          <div className="dm-empty">
            <MessageCircle size={26} strokeWidth={2} aria-hidden />
            <h2>Profile not found</h2>
            <p>This user may have changed their username or removed the account.</p>
          </div>
        ) : null}

        {isSelf ? (
          <div className="dm-empty">
            <UserRound size={26} strokeWidth={2} aria-hidden />
            <h2>This is your profile</h2>
            <p>You cannot send a message to yourself.</p>
            <Link to="/messages" className="btn btn-ghost">Open inbox</Link>
          </div>
        ) : null}

        {!isSelf && !messagesAllowed ? (
          <div className="dm-empty">
            <Lock size={26} strokeWidth={2} aria-hidden />
            <h2>Messages are disabled</h2>
            <p>This user is not accepting message requests right now.</p>
          </div>
        ) : null}

        {!isSelf && messagesAllowed && !conversation?.id && !startMut.isError ? (
          <div className="dm-status">Opening chat…</div>
        ) : null}

        {startMut.isError || (!otherUserId && target && messagesAllowed && !isSelf) ? (
          <div className="dm-empty">
            <MessageCircle size={26} strokeWidth={2} aria-hidden />
            <h2>Could not open chat</h2>
            <p>Try again from the profile, or open your inbox.</p>
            <Link to="/messages" className="btn btn-ghost">Open inbox</Link>
          </div>
        ) : null}

        {conversation?.id ? (
          <>
            <div className="dm-messages" aria-label="Conversation messages">
              {(messagesQuery.data ?? []).length === 0 && !messagesQuery.isLoading ? (
                <div className="dm-empty dm-empty--compact">
                  <MessageCircle size={24} strokeWidth={2} aria-hidden />
                  <h2>Start the conversation</h2>
                  <p>Send a clear, friendly message. Keep travel details in one place.</p>
                </div>
              ) : null}

              {(messagesQuery.data ?? []).map((message) => {
                const mine = message.sender_username === me.username
                return (
                  <article key={message.id} className={mine ? 'dm-bubble dm-bubble--mine' : 'dm-bubble'}>
                    <p>{message.body}</p>
                    <small>{messageTime(message.created_at)}</small>
                  </article>
                )
              })}
              <div ref={bottomRef} />
            </div>

            <form className="dm-composer" onSubmit={onSubmit}>
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder={`Message ${targetName}`}
                rows={1}
              />
              <button type="submit" disabled={!body.trim() || sendMut.isPending} aria-label="Send message">
                <Send size={18} strokeWidth={2.4} aria-hidden />
              </button>
            </form>
          </>
        ) : null}
      </section>
    </main>
  )
}
