import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, LogOut, Share2, UserPlus, Users } from 'lucide-react'
import { useState } from 'react'
import { apiFetch, asArray } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { CommunityAddMembersModal } from '../components/community/CommunityAddMembersModal'
import { CommunityGroupTagChips } from '../components/community/CommunityGroupTagChips'
import { UserAvatar } from '../components/UserAvatar'
import {
  COMMUNITY_GROUP_TOPICS,
  type CommunityGroup,
  type GroupMember,
  groupDetailPath,
  groupJoinPath,
  groupLeavePath,
  groupMembersPath,
  groupPendingMembersPath,
  groupReviewMemberPath,
  groupShareUrl,
} from '../utils/communityGroups'
import './CommunityGroupProfile.css'

type JoinResult = { joined: boolean; pending_request: boolean }

async function shareGroup(group: CommunityGroup) {
  const url = groupShareUrl(group.slug)
  const text = group.description || `Join ${group.name} on Delve`
  if (navigator.share) {
    await navigator.share({ title: group.name, text, url })
    return
  }
  await navigator.clipboard.writeText(url)
}

export function CommunityGroupProfile() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { profile, loading: authLoading } = useAuth()
  const username = profile?.username
  const [addMembersOpen, setAddMembersOpen] = useState(false)

  const groupQuery = useQuery({
    queryKey: ['community-group', slug, username ?? ''],
    enabled: Boolean(slug) && !authLoading,
    queryFn: () => apiFetch<CommunityGroup>(groupDetailPath(slug!)),
  })

  const membersQuery = useQuery({
    queryKey: ['community-group-members', slug],
    enabled: Boolean(slug) && Boolean(groupQuery.data?.joined),
    queryFn: () => apiFetch<GroupMember[]>(groupMembersPath(slug!)),
  })

  const pendingQuery = useQuery({
    queryKey: ['community-group-pending', slug],
    enabled: Boolean(slug) && groupQuery.data?.my_role === 'admin',
    queryFn: () => apiFetch<GroupMember[]>(groupPendingMembersPath(slug!)),
  })

  const joinMut = useMutation({
    mutationFn: () => apiFetch<JoinResult>(groupJoinPath(slug!), { method: 'POST' }),
    onMutate: async () => {
      const key = ['community-group', slug, username ?? ''] as const
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
        qc.setQueryData(['community-group', slug, username ?? ''], ctx.previous)
      }
    },
    onSuccess: (result) => {
      qc.setQueryData<CommunityGroup>(['community-group', slug, username ?? ''], (old) =>
        old
          ? {
              ...old,
              joined: result.joined,
              pending_request: result.pending_request,
              member_count: result.joined ? old.member_count + (old.joined ? 0 : 1) : old.member_count,
            }
          : old,
      )
      void qc.invalidateQueries({ queryKey: ['community-groups'] })
      void qc.invalidateQueries({ queryKey: ['community-group-members', slug] })
    },
  })

  const leaveMut = useMutation({
    mutationFn: () => apiFetch<{ left: boolean }>(groupLeavePath(slug!), { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['community-group', slug] })
      void qc.invalidateQueries({ queryKey: ['community-group-members', slug] })
      void qc.invalidateQueries({ queryKey: ['community-groups'] })
      navigate('/community?view=groups')
    },
  })

  const reviewMut = useMutation({
    mutationFn: ({ userId, action }: { userId: number; action: 'approve' | 'reject' }) =>
      apiFetch<{ action: string; joined: boolean }>(groupReviewMemberPath(slug!), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, action }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['community-group-pending', slug] })
      void qc.invalidateQueries({ queryKey: ['community-group-members', slug] })
      void qc.invalidateQueries({ queryKey: ['community-group', slug] })
      void qc.invalidateQueries({ queryKey: ['community-groups'] })
    },
  })

  const group = groupQuery.data
  const members = asArray<GroupMember>(membersQuery.data)
  const topicLabel = COMMUNITY_GROUP_TOPICS.find((t) => t.id === group?.topic)?.label ?? group?.topic
  const isJoined = Boolean(group?.joined || joinMut.data?.joined)
  const isAdmin = group?.my_role === 'admin'

  if (authLoading || groupQuery.isLoading) {
    return (
      <main className="group-profile">
        <p className="group-profile__muted">Loading…</p>
      </main>
    )
  }

  if (!group) {
    return (
      <main className="group-profile">
        <p className="group-profile__muted">Group not found.</p>
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/community?view=groups')}>
          Back
        </button>
      </main>
    )
  }

  const initial = group.name.trim().charAt(0).toUpperCase()

  const onLeave = () => {
    if (!window.confirm(`Leave ${group.name}?`)) return
    leaveMut.mutate()
  }

  const onShare = async () => {
    try {
      await shareGroup(group)
    } catch {
      /* user cancelled share */
    }
  }

  return (
    <main className="group-profile">
      <header className="group-profile__head">
        <button type="button" className="group-profile__back" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowLeft size={18} strokeWidth={2.25} aria-hidden />
        </button>
        <h1>Group info</h1>
      </header>

      <div className="group-profile__hero">
        <div className="group-profile__avatar">
          {group.cover_src ? <img src={group.cover_src} alt="" /> : <span>{initial}</span>}
        </div>
        <h2>{group.name}</h2>
        {topicLabel ? <span className="group-profile__topic">{topicLabel}</span> : null}
        <CommunityGroupTagChips tags={group.tag_slugs ?? []} className="group-profile__tags" />
        <p className="group-profile__meta">
          <Users size={14} strokeWidth={2.25} aria-hidden />
          {group.member_count} members · {group.visibility === 'private' ? 'Private' : 'Public'}
        </p>
      </div>

      {group.description ? (
        <section className="group-profile__section">
          <h3>About</h3>
          <p>{group.description}</p>
        </section>
      ) : null}

      {isAdmin && group.visibility === 'private' ? (
        <section className="group-profile__section">
          <h3>Join requests</h3>
          {pendingQuery.isLoading ? (
            <p className="group-profile__muted">Loading requests…</p>
          ) : (pendingQuery.data ?? []).length === 0 ? (
            <p className="group-profile__muted">No pending requests.</p>
          ) : (
            <ul className="group-profile__members">
              {(pendingQuery.data ?? []).map((row) => (
                <li key={row.user.username} className="group-profile__pending-row">
                  <Link to={`/u/${encodeURIComponent(row.user.username)}`} className="group-profile__member-pill">
                    <UserAvatar
                      src={row.user.avatar}
                      name={row.user.display_name}
                      size="xs"
                      className="group-profile__member-pill-avatar"
                    />
                    <span>{row.user.display_name}</span>
                  </Link>
                  <div className="group-profile__pending-actions">
                    <button
                      type="button"
                      className="group-profile__pending-btn group-profile__pending-btn--approve"
                      disabled={reviewMut.isPending}
                      onClick={() => reviewMut.mutate({ userId: row.user.id, action: 'approve' })}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="group-profile__pending-btn"
                      disabled={reviewMut.isPending}
                      onClick={() => reviewMut.mutate({ userId: row.user.id, action: 'reject' })}
                    >
                      Decline
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <section className="group-profile__section">
        <div className="group-profile__section-head">
          <h3>Members</h3>
          {isAdmin ? (
            <button type="button" className="group-profile__add-members" onClick={() => setAddMembersOpen(true)}>
              <UserPlus size={14} strokeWidth={2.25} aria-hidden />
              Add
            </button>
          ) : null}
        </div>
        {membersQuery.isLoading ? (
          <p className="group-profile__muted">Loading members…</p>
        ) : members.length === 0 ? (
          <p className="group-profile__muted">No members yet.</p>
        ) : (
          <ul className="group-profile__members">
            {members.map((row) => (
              <li key={row.user.username}>
                <Link to={`/u/${encodeURIComponent(row.user.username)}`} className="group-profile__member-pill">
                  <UserAvatar
                    src={row.user.avatar}
                    name={row.user.display_name}
                    size="xs"
                    className="group-profile__member-pill-avatar"
                  />
                  <span>{row.user.display_name}</span>
                  {row.role === 'admin' ? <span className="group-profile__member-pill-badge">Admin</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="group-profile__actions">
        <button type="button" className="group-profile__action" onClick={onShare}>
          <Share2 size={15} strokeWidth={2.25} aria-hidden />
          Share
        </button>
        {profile && !isJoined && !group.pending_request && !joinMut.data?.pending_request ? (
          <button
            type="button"
            className="group-profile__action group-profile__action--primary"
            disabled={joinMut.isPending}
            onClick={() => joinMut.mutate()}
          >
            {group.visibility === 'private' ? 'Request' : 'Join'}
          </button>
        ) : null}
        {profile && isJoined ? (
          <button
            type="button"
            className="group-profile__action group-profile__action--danger"
            onClick={onLeave}
            disabled={leaveMut.isPending}
          >
            <LogOut size={15} strokeWidth={2.25} aria-hidden />
            Leave
          </button>
        ) : null}
      </div>

      <CommunityAddMembersModal
        open={addMembersOpen}
        slug={group.slug}
        groupName={group.name}
        onClose={() => setAddMembersOpen(false)}
      />
    </main>
  )
}
