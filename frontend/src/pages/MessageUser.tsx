import { useEffect, useMemo, useRef } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Lock, MessageCircle, UserRound } from 'lucide-react'
import { apiFetch, mediaUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { DmChatView } from '../components/messages/dm'
import type { ConversationContextPayload, MessagingContext } from '../components/messages/messageProviderUtils'
import {
  messageInboxPath,
  messageThreadPath,
  placeContextStartPayload,
  readPlaceContextFromSearch,
} from '../components/messages/messageProviderUtils'
import '../components/messages/dm/dm-chat.css'
import '../components/provider/messages/provider-messages.css'

type PublicMessageProfile = {
  id?: number
  username: string
  display_name: string
  bio?: string
  city?: string
  region?: string
  avatar?: string | null
  allow_messages?: boolean
  user_type?: string
  relationship?: { can_message: boolean }
}

type Conversation = {
  id: number
  context?: ConversationContextPayload | null
  participants_detail: { id: number; username: string; display_name: string }[]
  updated_at: string
}

function displayName(profile?: PublicMessageProfile): string {
  return profile?.display_name?.trim() || profile?.username || 'Delver'
}

type Props = {
  context?: MessagingContext
}

export function MessageUser({ context = 'user' }: Props) {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const backTo = (location.state as { from?: string; guestName?: string } | null)?.from
  const place = useMemo(() => readPlaceContextFromSearch(searchParams), [searchParams])
  const username = useMemo(() => {
    const parts = location.pathname.split('/')
    const uIdx = parts.indexOf('u')
    return uIdx >= 0 ? decodeURIComponent(parts[uIdx + 1] ?? '').trim() : ''
  }, [location.pathname])

  const { profile: me } = useAuth()
  const navigate = useNavigate()
  const startedFor = useRef('')
  const inboxPath = messageInboxPath(context)
  const isProvider = context === 'provider'

  const targetQuery = useQuery({
    queryKey: ['message-profile', username],
    queryFn: () =>
      apiFetch<PublicMessageProfile>(`/api/accounts/users/${encodeURIComponent(username)}/`, { auth: false }),
    enabled: Boolean(username),
    retry: false,
  })

  const target = targetQuery.data
  const targetName = displayName(target)
  const targetAvatar = mediaUrl(target?.avatar ?? null)
  const isSelf = Boolean(me && target && me.username.toLowerCase() === target.username.toLowerCase())
  const messagesAllowed = Boolean(
    me &&
      target &&
      !isSelf &&
      (target.relationship?.can_message ?? target.allow_messages !== false),
  )

  const startMut = useMutation({
    mutationFn: () =>
      apiFetch<Conversation>('/api/messaging/start/', {
        method: 'POST',
        body: JSON.stringify({
          username,
          ...placeContextStartPayload(place),
        }),
      }),
    onSuccess: (next) => {
      navigate(messageThreadPath(next.id, context), {
        replace: true,
        state: backTo ? { from: backTo } : undefined,
      })
    },
  })

  useEffect(() => {
    if (!me || !target || isSelf || !messagesAllowed || !username) return
    const key = `${username.toLowerCase()}|${place?.type ?? ''}|${place?.id ?? ''}`
    if (startedFor.current === key) return
    startedFor.current = key
    startMut.mutate()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start once per username+context
  }, [isSelf, me, messagesAllowed, place?.id, place?.type, target, username])

  const pageClass = isProvider ? 'dm-page dm-page--provider' : 'dm-page'

  function handleBack() {
    if (backTo) navigate(backTo)
    else navigate(inboxPath)
  }

  if (!me) {
    return (
      <main className={`${pageClass} dm-page--centered`}>
        <section className="dm-card">
          <Lock size={28} strokeWidth={2} aria-hidden />
          <h1>Sign in to message {targetName}</h1>
          <p>Messages are private and only available inside your DELVE account.</p>
          <Link to="/login" className="btn btn-primary">
            Sign in
          </Link>
        </section>
      </main>
    )
  }

  if (targetQuery.isLoading) {
    return (
      <main className={pageClass}>
        <div className="dm-chat__state" style={{ margin: 'auto' }}>
          Loading profile…
        </div>
      </main>
    )
  }

  if (targetQuery.isError || !target) {
    return (
      <main className={`${pageClass} dm-page--centered`}>
        <section className="dm-card">
          <MessageCircle size={26} strokeWidth={2} aria-hidden />
          <h1>Profile not found</h1>
          <p>This user may have changed their username or removed the account.</p>
          <Link to={inboxPath} className="btn btn-ghost">
            {isProvider ? 'Back to guest inbox' : 'Open inbox'}
          </Link>
        </section>
      </main>
    )
  }

  if (isSelf) {
    return (
      <main className={`${pageClass} dm-page--centered`}>
        <section className="dm-card">
          <UserRound size={26} strokeWidth={2} aria-hidden />
          <h1>This is your profile</h1>
          <p>You cannot send a message to yourself.</p>
          <Link to={inboxPath} className="btn btn-ghost">
            {isProvider ? 'Back to guest inbox' : 'Open inbox'}
          </Link>
        </section>
      </main>
    )
  }

  if (!messagesAllowed) {
    return (
      <main className={`${pageClass} dm-page--centered`}>
        <section className="dm-card">
          <Lock size={26} strokeWidth={2} aria-hidden />
          <h1>Messages are disabled</h1>
          <p>This person is not accepting message requests right now.</p>
          <Link to={`/u/${target.username}`} className="btn btn-ghost">
            View profile
          </Link>
        </section>
      </main>
    )
  }

  if (startMut.isError) {
    return (
      <main className={`${pageClass} dm-page--centered`}>
        <section className="dm-card">
          <MessageCircle size={26} strokeWidth={2} aria-hidden />
          <h1>Could not open chat</h1>
          <p>Try again from the booking, or open your inbox.</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              startedFor.current = ''
              startMut.mutate()
            }}
          >
            Try again
          </button>
          <Link to={inboxPath} className="btn btn-ghost" style={{ marginTop: 8 }}>
            {isProvider ? 'Back to guest inbox' : 'Open inbox'}
          </Link>
        </section>
      </main>
    )
  }

  return (
    <main className={pageClass}>
      <DmChatView
        context={context}
        person={{
          username: target.username,
          display_name: target.display_name,
          avatar: targetAvatar,
          city: target.city,
          region: target.region,
        }}
        personName={targetName}
        myUsername={me.username}
        messages={[]}
        automatedMessages={[]}
        body=""
        onBodyChange={() => {}}
        onSend={() => {}}
        opening
        onBack={handleBack}
        inboxHref={inboxPath}
        inboxLabel={isProvider ? 'Guest inbox' : 'Inbox'}
        showQuickReplies={false}
      />
    </main>
  )
}
