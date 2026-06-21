import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { buildProviderAutomatedMessages, DmChatView } from '../components/messages/dm'
import type { MessagingContext } from '../components/messages/messageProviderUtils'
import { messageInboxPath } from '../components/messages/messageProviderUtils'
import '../components/messages/dm/dm-chat.css'
import '../components/provider/messages/provider-messages.css'

type Msg = { id: number; sender_username: string; body: string; created_at: string }

type Conversation = {
  id: number
  participants_detail: { id: number; username: string; display_name: string }[]
}

type PublicProfile = {
  username: string
  display_name: string
  bio?: string
  city?: string
  region?: string
  user_type?: string
}

type Props = {
  context?: MessagingContext
}

export function MessageThread({ context = 'user' }: Props) {
  const { id } = useParams()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [body, setBody] = useState('')
  const isProvider = context === 'provider'
  const inboxPath = messageInboxPath(context)

  const { data: conversation } = useQuery({
    queryKey: ['conversation', id],
    enabled: !!profile && !!id,
    queryFn: () => apiFetch<Conversation>(`/api/messaging/conversations/${id}/`),
  })

  const other = useMemo(
    () => conversation?.participants_detail.find((p) => p.username !== profile?.username),
    [conversation?.participants_detail, profile?.username],
  )

  const { data: otherProfile } = useQuery({
    queryKey: ['message-profile', other?.username],
    enabled: Boolean(other?.username),
    queryFn: () =>
      apiFetch<PublicProfile>(`/api/accounts/users/${encodeURIComponent(other!.username)}/`, { auth: false }),
  })

  const { data: messages, isLoading } = useQuery({
    queryKey: ['msgs', id],
    enabled: !!profile && !!id,
    queryFn: () => apiFetch<Msg[]>(`/api/messaging/conversations/${id}/messages/`),
    refetchInterval: 8000,
  })

  const sendMut = useMutation({
    mutationFn: () =>
      apiFetch(`/api/messaging/conversations/${id}/messages/`, {
        method: 'POST',
        body: JSON.stringify({ body: body.trim() }),
      }),
    onSuccess: () => {
      setBody('')
      void qc.invalidateQueries({ queryKey: ['msgs', id] })
      void qc.invalidateQueries({ queryKey: ['conversations'] })
    },
  })

  const personName = other?.display_name?.trim() || other?.username || 'Conversation'
  const automatedMessages = useMemo(() => {
    if (isProvider || !otherProfile) return []
    return buildProviderAutomatedMessages(otherProfile)
  }, [isProvider, otherProfile])

  const pageClass = isProvider ? 'dm-page dm-page--provider' : 'dm-page'

  if (!profile) {
    return (
      <main className={`${pageClass} dm-page--centered`}>
        <p>
          <Link to="/login">Sign in</Link> to view messages.
        </p>
      </main>
    )
  }

  if (!other) {
    return (
      <main className={pageClass}>
        <div className="dm-chat__state">Loading conversation…</div>
      </main>
    )
  }

  return (
    <main className={pageClass}>
      <DmChatView
        context={context}
        person={{
          username: other.username,
          display_name: other.display_name,
          city: otherProfile?.city,
          region: otherProfile?.region,
        }}
        personName={personName}
        myUsername={profile.username}
        messages={Array.isArray(messages) ? messages : []}
        automatedMessages={automatedMessages}
        body={body}
        onBodyChange={setBody}
        onSend={() => sendMut.mutate()}
        sending={sendMut.isPending}
        loading={isLoading}
        onBack={() => navigate(inboxPath)}
        backLabel={isProvider ? 'Back to guest inbox' : 'Back to inbox'}
        inboxHref={inboxPath}
        inboxLabel={isProvider ? 'Guest inbox' : 'Inbox'}
      />
    </main>
  )
}
