import { useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { Link, useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, mediaUrl } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import type { ProviderOutletContext } from '../components/ProviderLayout'
import { useBusinessAccess } from '../hooks/useBusinessAccess'
import { ConversationContextChip } from '../components/messages/ConversationContextChip'
import { DmChatView, useConversationThread } from '../components/messages/dm'
import { useProviderMessagingSettings } from '../components/messages/useProviderMessagingSettings'
import type {
  ConversationContextPayload,
  MessagingContext,
} from '../components/messages/messageProviderUtils'
import { messageInboxPath } from '../components/messages/messageProviderUtils'
import '../components/messages/dm/dm-chat.css'
import '../components/provider/messages/provider-messages.css'

type ConversationOther = {
  id: number
  username: string
  display_name: string
  avatar?: string | null
}

type Conversation = {
  id: number
  other?: ConversationOther | null
  context?: ConversationContextPayload | null
  participants_detail: ConversationOther[]
}

type PublicProfile = {
  username: string
  display_name: string
  bio?: string
  city?: string
  region?: string
  user_type?: string
  avatar?: string | null
}

type Props = {
  context?: MessagingContext
}

export function MessageThread({ context = 'user' }: Props) {
  const { id } = useParams()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const backTo = (location.state as { from?: string } | null)?.from
  const isProvider = context === 'provider'
  const inboxPath = messageInboxPath(context)

  const { data: conversation } = useQuery({
    queryKey: ['conversation', id],
    enabled: !!profile && !!id,
    queryFn: () => apiFetch<Conversation>(`/api/messaging/conversations/${id}/`),
  })

  const other = useMemo(() => {
    if (conversation?.other) return conversation.other
    return conversation?.participants_detail.find((p) => p.username !== profile?.username)
  }, [conversation?.other, conversation?.participants_detail, profile?.username])

  const { data: otherProfile } = useQuery({
    queryKey: ['message-profile', other?.username],
    enabled: Boolean(other?.username),
    queryFn: () =>
      apiFetch<PublicProfile>(`/api/accounts/users/${encodeURIComponent(other!.username)}/`, { auth: false }),
  })

  const {
    messages,
    isLoading,
    body,
    setBody,
    send,
    sending,
    hasMore,
    loadOlder,
    loadingOlder,
    typingUsernames,
    canSendNow,
    imagePreview,
    videoPreview,
    onImagePick,
    onVideoPick,
    replyTo,
    setReplyTo,
    clearReplyTo,
    deleteMessage,
    forwardMessage,
    forwarding,
    voice,
  } = useConversationThread({
    conversationId: id,
    myUsername: profile?.username,
    enabled: Boolean(profile && id && other),
  })

  const outletCtx = useOutletContext<ProviderOutletContext>()
  const businessId = isProvider ? outletCtx?.activeBusiness?.id : undefined
  const { canManageSettings } = useBusinessAccess(businessId)

  const { data: providerMessagingSettings } = useProviderMessagingSettings({
    enabled: isProvider,
    businessId,
    canManageSettings,
  })

  const blockMut = useMutation({
    mutationFn: () =>
      apiFetch('/api/messaging/blocks/', {
        method: 'POST',
        body: JSON.stringify({ username: other!.username }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['conversations'] })
      void qc.invalidateQueries({ queryKey: ['messaging-unread-count'] })
      navigate(inboxPath, { replace: true })
    },
  })

  const personName = other?.display_name?.trim() || other?.username || 'Conversation'
  const personAvatar = mediaUrl(other?.avatar ?? otherProfile?.avatar ?? null)
  const providerQuickReplies =
    isProvider &&
    providerMessagingSettings?.quick_replies_enabled &&
    providerMessagingSettings.quick_replies.length > 0
      ? providerMessagingSettings.quick_replies
      : undefined

  const pageClass = isProvider ? 'dm-page dm-page--provider dm-page--thread' : 'dm-page dm-page--thread'

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
        <div className="dm-chat__state" role="status" aria-live="polite" aria-label="Loading conversation">
          <Loader2 size={24} strokeWidth={2.25} className="dm-chat__spin" aria-hidden />
        </div>
      </main>
    )
  }

  return (
    <main className={pageClass}>
      <DmChatView
        conversationId={id!}
        context={context}
        person={{
          username: other.username,
          display_name: other.display_name,
          avatar: personAvatar,
          city: otherProfile?.city,
          region: otherProfile?.region,
        }}
        personName={personName}
        myUsername={profile.username}
        messages={messages}
        showQuickReplies={isProvider}
        quickReplies={providerQuickReplies}
        body={body}
        onBodyChange={setBody}
        onSend={send}
        sending={sending}
        loading={isLoading}
        canSendNow={canSendNow}
        imagePreview={imagePreview}
        videoPreview={videoPreview}
        onImagePick={onImagePick}
        onVideoPick={onVideoPick}
        replyTo={replyTo}
        onClearReply={clearReplyTo}
        onReplyTo={setReplyTo}
        onDelete={deleteMessage}
        onForward={forwardMessage}
        forwarding={forwarding}
        voice={voice}
        hasMore={hasMore}
        loadingOlder={loadingOlder}
        onLoadOlder={loadOlder}
        typingUsernames={typingUsernames}
        onBlock={() => {
          if (
            window.confirm(
              `Block @${other.username}? They will no longer be able to message you.`,
            )
          ) {
            blockMut.mutate()
          }
        }}
        blocking={blockMut.isPending}
        onBack={() => navigate(backTo || inboxPath)}
        backLabel={isProvider ? 'Back to guest inbox' : 'Back to inbox'}
        inboxHref={inboxPath}
        inboxLabel={isProvider ? 'Guest inbox' : 'Inbox'}
        statusSlot={
          conversation?.context ? (
            <ConversationContextChip
              context={conversation.context}
              variant={isProvider ? 'provider' : 'user'}
            />
          ) : null
        }
        reportTarget={
          id
            ? {
                target_type: 'conversation',
                target_id: String(id),
                target_label: `Conversation with @${other.username}`,
              }
            : undefined
        }
      />
    </main>
  )
}
