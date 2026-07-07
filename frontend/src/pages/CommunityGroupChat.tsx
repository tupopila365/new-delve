import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError, apiFetch } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { GroupChatView } from '../components/community/group/GroupChatView'
import { useGroupThread } from '../components/community/group/useGroupThread'
import type { CommunityGroup } from '../utils/communityGroups'
import { groupDetailPath, groupInfoPath, groupJoinPath, isGroupMember } from '../utils/communityGroups'

type JoinResult = { joined: boolean; pending_request: boolean }

function communityGroupQueryKey(slug: string | undefined, username: string | null | undefined) {
  return ['community-group', slug, username ?? ''] as const
}

function canReadGroupChat(group: CommunityGroup): boolean {
  return isGroupMember(group)
}

function patchGroupJoined(
  qc: ReturnType<typeof useQueryClient>,
  slug: string,
  username: string | null | undefined,
  result: JoinResult,
) {
  const key = communityGroupQueryKey(slug, username)
  qc.setQueryData<CommunityGroup>(key, (old) => {
    if (!old) return old
    return {
      ...old,
      joined: result.joined,
      pending_request: result.pending_request,
      member_count: result.joined ? old.member_count + (old.joined ? 0 : 1) : old.member_count,
    }
  })
}

export function CommunityGroupChat() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { profile, loading: authLoading } = useAuth()
  const username = profile?.username

  const groupQuery = useQuery({
    queryKey: communityGroupQueryKey(slug, username),
    enabled: Boolean(slug) && !authLoading,
    queryFn: () => apiFetch<CommunityGroup>(groupDetailPath(slug!)),
  })

  const joinMut = useMutation({
    mutationFn: () => apiFetch<JoinResult>(groupJoinPath(slug!), { method: 'POST' }),
    onMutate: async () => {
      const key = communityGroupQueryKey(slug, username)
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<CommunityGroup>(key)
      if (previous && previous.visibility === 'public') {
        qc.setQueryData<CommunityGroup>(key, {
          ...previous,
          joined: true,
          pending_request: false,
          member_count: previous.member_count + (previous.joined ? 0 : 1),
        })
      }
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(communityGroupQueryKey(slug, username), ctx.previous)
      }
    },
    onSuccess: (result) => {
      patchGroupJoined(qc, slug!, username, result)
      void qc.invalidateQueries({ queryKey: ['community-group', slug] })
      void qc.invalidateQueries({ queryKey: ['community-groups'] })
      void qc.invalidateQueries({ queryKey: ['group-msgs', slug] })
      void qc.invalidateQueries({ queryKey: ['community-group-members', slug] })
    },
  })

  const group = groupQuery.data
  const isJoined = isGroupMember(group ? { ...group, joined: Boolean(group.joined || joinMut.data?.joined) } : null)
  const canRead = group ? canReadGroupChat({ ...group, joined: isJoined }) : false
  const canSend = Boolean(profile && isJoined)
  const thread = useGroupThread({
    slug,
    myUsername: username,
    enabled: canRead,
  })

  if (authLoading || groupQuery.isLoading) {
    return (
      <main className="group-chat">
        <div className="group-chat__state">
          <p>Loading group…</p>
        </div>
      </main>
    )
  }

  if (groupQuery.isError || !group) {
    const message = groupQuery.error instanceof ApiError ? groupQuery.error.message : 'Group not found.'
    return (
      <main className="group-chat">
        <div className="group-chat__state">
          <p>{message}</p>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/community?view=groups')}>
            Back to groups
          </button>
        </div>
      </main>
    )
  }

  if (!canRead) {
    return (
      <main className="group-chat">
        <header className="group-chat__head">
          <button
            type="button"
            className="group-chat__back"
            onClick={() => navigate('/community?view=groups')}
            aria-label="Back"
          >
            ←
          </button>
          <Link to={groupInfoPath(group.slug)} className="group-chat__profile-link">
            <div className="group-chat__title">
              <strong>{group.name}</strong>
              <small>{group.member_count} members · Private</small>
            </div>
          </Link>
        </header>
        <div className="group-chat__state">
          <p>
            {group.pending_request || joinMut.data?.pending_request
              ? 'Your request to join is pending.'
              : 'Request to join this private group to see messages.'}
          </p>
          {!profile ? (
            <Link to="/login" className="btn btn-primary">
              Sign in
            </Link>
          ) : !group.pending_request && !joinMut.data?.pending_request ? (
            <button
              type="button"
              className="btn btn-primary"
              disabled={joinMut.isPending}
              onClick={() => joinMut.mutate()}
            >
              Request to join
            </button>
          ) : null}
        </div>
      </main>
    )
  }

  const joinBanner =
    !canSend && profile ? (
      <button
        type="button"
        className="group-chat__join-banner"
        disabled={joinMut.isPending}
        onClick={() => joinMut.mutate()}
      >
        {joinMut.isPending ? 'Joining…' : 'Join to send'}
      </button>
    ) : !canSend ? (
      <Link to="/login" className="group-chat__join-banner group-chat__join-banner--link">
        Sign in to join
      </Link>
    ) : null

  return (
    <GroupChatView
      group={{ ...group, joined: isJoined }}
      myUsername={profile?.username ?? ''}
      messages={thread.messages}
      body={thread.body}
      onBodyChange={thread.setBody}
      onSend={thread.send}
      sending={thread.sending}
      loading={thread.isLoading}
      canSend={canSend}
      canSendNow={thread.canSendNow}
      imagePreview={thread.imagePreview}
      videoPreview={thread.videoPreview}
      onImagePick={canSend ? thread.onImagePick : undefined}
      onVideoPick={canSend ? thread.onVideoPick : undefined}
      onBack={() => navigate('/community?view=groups')}
      hasMore={thread.hasMore}
      loadingOlder={thread.loadingOlder}
      onLoadOlder={thread.loadOlder}
      statusSlot={joinBanner}
      replyTo={thread.replyTo}
      onClearReply={thread.clearReplyTo}
      onReplyTo={thread.setReplyTo}
      onReact={thread.react}
      onDelete={thread.deleteMessage}
      onForward={thread.forwardMessage}
      forwarding={thread.forwarding}
      canReact={canSend}
      voice={thread.voice}
    />
  )
}
