import { useEffect, useState } from 'react'

import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { LogIn, Plus } from 'lucide-react'

import { apiFetch, asArray } from '../../api/client'

import { useAuth } from '../../auth/AuthContext'

import type { CommunityGroup } from '../../utils/communityGroups'

import {

  COMMUNITY_GROUP_TOPICS,

  groupChatPath,

  groupInfoPath,

  groupJoinPath,

  groupsListPath,

  isGroupMember,

} from '../../utils/communityGroups'

import { parseTagFromSearch } from '../../utils/communityTags'

import { CommunityCircleEmpty } from './CommunityCircleEmpty'

import { CommunityGroupModal } from './CommunityGroupModal'

import { CommunityGroupTagChips } from './CommunityGroupTagChips'

import { useCommunityMediaViewer } from './CommunityMediaViewer'

import './community-feed-cards.css'

import './communityHub.css'



type JoinResult = { joined: boolean; pending_request: boolean }



function formatRelativeTime(iso?: string | null): string {

  if (!iso) return ''

  const then = new Date(iso).getTime()

  if (!Number.isFinite(then)) return ''

  const diffH = Math.round((Date.now() - then) / 3_600_000)

  if (diffH < 1) return 'Now'

  if (diffH < 24) return `${diffH}h`

  return `${Math.round(diffH / 24)}d`

}



function GroupRow({ group }: { group: CommunityGroup }) {
  const navigate = useNavigate()
  const { openImage } = useCommunityMediaViewer()
  const initial = group.name.trim().charAt(0).toUpperCase()
  const openChat = () => navigate(groupChatPath(group.slug))

  return (
    <div
      className="cm-group-row"
      onClick={openChat}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault()
        openChat()
      }}
      role="button"
      tabIndex={0}
    >
      <button
        type="button"
        className="cm-group-row__avatar cm-group-row__avatar--media"
        disabled={!group.cover_src}
        aria-label={group.cover_src ? `View ${group.name} cover` : undefined}
        onClick={(event) => {
          event.stopPropagation()
          if (group.cover_src) openImage(group.cover_src, group.name, group.name)
        }}
      >
        {group.cover_src ? (
          <img src={group.cover_src} alt="" loading="lazy" decoding="async" />
        ) : (
          <span>{initial}</span>
        )}
      </button>
      <div className="cm-group-row__body">
        <Link
          to={groupInfoPath(group.slug)}
          className="cm-group-row__name"
          onClick={(event) => event.stopPropagation()}
        >
          <strong>{group.name}</strong>
        </Link>
        <span className="cm-group-row__preview">
          {group.last_message_preview ?? group.description}
        </span>
      </div>
      <span className="cm-group-row__meta">{formatRelativeTime(group.last_active_at)}</span>
    </div>
  )
}



type Props = {

  searchQuery: string

}



export function CommunityGroupsView({ searchQuery }: Props) {

  const navigate = useNavigate()

  const [searchParams, setSearchParams] = useSearchParams()

  const { profile, loading: authLoading } = useAuth()

  const { openImage } = useCommunityMediaViewer()

  const qc = useQueryClient()

  const username = profile?.username

  const [createOpen, setCreateOpen] = useState(false)

  const tagFromUrl = searchParams.get('tag')?.trim() || null
  const tagFromSearch = parseTagFromSearch(searchQuery)
  const activeTag = tagFromUrl || tagFromSearch
  const textSearch = tagFromSearch ? '' : searchQuery



  const openCreate = () => {

    if (!profile) {

      navigate('/login')

      return

    }

    setCreateOpen(true)

  }



  useEffect(() => {

    if (searchParams.get('createGroup') !== '1') return

    openCreate()

    setSearchParams((params) => {

      const next = new URLSearchParams(params)

      next.delete('createGroup')

      return next

    }, { replace: true })

  }, [searchParams, setSearchParams, profile])



  const mineQuery = useQuery({

    queryKey: ['community-groups', 'mine', username ?? '', textSearch, activeTag ?? ''],

    queryFn: () =>

      apiFetch<CommunityGroup[]>(

        groupsListPath({ mine: true, q: textSearch, tag: activeTag }),

      ),

    enabled: Boolean(profile) && !authLoading,

  })



  const discoverQuery = useQuery({

    queryKey: ['community-groups', 'discover', username ?? '', textSearch, activeTag ?? ''],

    queryFn: () =>

      apiFetch<CommunityGroup[]>(

        groupsListPath({ q: textSearch, tag: activeTag }),

      ),

    enabled: !authLoading,

  })



  const joinMut = useMutation({

    mutationFn: (groupSlug: string) =>

      apiFetch<JoinResult>(groupJoinPath(groupSlug), { method: 'POST' }),

    onSuccess: (result, groupSlug) => {

      qc.setQueriesData<CommunityGroup[]>({ queryKey: ['community-groups'] }, (old) =>

        old?.map((g) =>

          g.slug === groupSlug

            ? {

                ...g,

                joined: result.joined,

                pending_request: result.pending_request,

                member_count: result.joined ? g.member_count + (g.joined ? 0 : 1) : g.member_count,

              }

            : g,

        ),

      )

      qc.setQueryData<CommunityGroup>(['community-group', groupSlug, username ?? ''], (old) =>

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

      void qc.invalidateQueries({ queryKey: ['community-group', groupSlug] })

    },

  })



  const myGroups = asArray<CommunityGroup>(mineQuery.data)

  const discoverGroups = asArray<CommunityGroup>(discoverQuery.data).filter((g) => !isGroupMember(g))



  return (

    <div className="cm-groups">

      <CommunityGroupModal

        open={createOpen}

        onClose={() => setCreateOpen(false)}

        onCreated={(group) => navigate(`/community/g/${encodeURIComponent(group.slug)}`)}

      />



      {profile ? (

        <div className="cm-groups__create-row">

          <button

            type="button"

            className="cm-feed-toolbar__item cm-feed-toolbar__item--action"

            onClick={openCreate}

          >

            <span className="cm-feed-toolbar__circle" aria-hidden>

              <Plus size={20} strokeWidth={2.5} />

            </span>

            <span className="cm-feed-toolbar__label">Create group</span>

          </button>

        </div>

      ) : null}



      <h2 className="cm-groups__section-title">My groups</h2>

      {!profile ? (

        <CommunityCircleEmpty

          title="Sign in to see your groups"

          sub="Join groups to chat with travellers on the same route."

          actions={[{ label: 'Sign in', to: '/login', icon: <LogIn size={20} strokeWidth={2.25} /> }]}

        />

      ) : mineQuery.isLoading ? (

        <p className="cm-groups__coming">Loading your groups…</p>

      ) : myGroups.length === 0 ? (

        <CommunityCircleEmpty

          title="No groups yet"

          sub="Join a group below or create one for your route."

          actions={[{ label: 'Create group', onClick: openCreate, icon: <Plus size={20} strokeWidth={2.5} /> }]}

        />

      ) : (

        <ul className="cm-groups__list">

          {myGroups.map((group) => (

            <li key={group.id}>

              <GroupRow group={group} />

            </li>

          ))}

        </ul>

      )}



      <h2 className="cm-groups__section-title">Discover</h2>

      {activeTag ? (
        <div className="cm-groups__tag-filter">
          <span>Showing groups tagged <strong>#{activeTag}</strong></span>
          <button
            type="button"
            onClick={() =>
              setSearchParams((params) => {
                const next = new URLSearchParams(params)
                next.delete('tag')
                return next
              }, { replace: true })
            }
          >
            Clear
          </button>
        </div>
      ) : null}

      <div className="cm-group-discover">

        {discoverQuery.isLoading ? (

          <p className="cm-groups__coming">Loading groups…</p>

        ) : discoverGroups.length === 0 ? (

          <p className="cm-groups__coming">No groups match your search.</p>

        ) : (

          discoverGroups.map((group) => {

            const topicLabel = COMMUNITY_GROUP_TOPICS.find((t) => t.id === group.topic)?.label ?? group.topic

            const justJoined =

              joinMut.isSuccess && joinMut.variables === group.slug && joinMut.data?.joined

            const joined = group.joined || justJoined
            const isMember = isGroupMember({ ...group, joined })

            const pending = group.pending_request || (joinMut.variables === group.slug && joinMut.data?.pending_request)
            const canOpenChat = group.visibility === 'public' || isMember
            const openGroup = () => navigate(canOpenChat ? groupChatPath(group.slug) : groupInfoPath(group.slug))

            return (

              <article
                key={group.id}
                className={`cm-group-card${canOpenChat ? ' cm-group-card--clickable' : ''}`}
                onClick={openGroup}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return
                  event.preventDefault()
                  openGroup()
                }}
                role="button"
                tabIndex={0}
              >

                <div className="cm-group-card__head">

                  <button
                    type="button"
                    className="cm-group-card__icon cm-group-card__icon--media"
                    disabled={!group.cover_src}
                    aria-label={group.cover_src ? `View ${group.name} cover` : undefined}
                    onClick={(event) => {
                      event.stopPropagation()
                      if (group.cover_src) openImage(group.cover_src, group.name, group.name)
                    }}
                  >
                    {group.cover_src ? (
                      <img src={group.cover_src} alt="" loading="lazy" decoding="async" />
                    ) : null}
                  </button>

                  <div>

                    <Link
                      to={groupInfoPath(group.slug)}
                      className="cm-group-card__title-link"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <h3 className="cm-group-card__title">{group.name}</h3>
                    </Link>

                    <span className="cm-group-card__topic">{topicLabel}</span>

                  </div>

                </div>

                <p className="cm-group-card__desc">{group.description}</p>

                <div onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                  <CommunityGroupTagChips tags={group.tag_slugs ?? []} className="cm-group-card__tags" />
                </div>

                <div className="cm-group-card__foot">

                  <span className="cm-group-card__members">{group.member_count} members</span>

                  {!joined ? (

                    <div className="cm-group-card__actions">

                      <button

                        type="button"

                        className={

                          group.visibility === 'private'

                            ? 'cm-group-card__join cm-group-card__join--private'

                            : 'cm-group-card__join'

                        }

                        disabled={pending || joinMut.isPending}

                        onClick={(event) => {

                          event.stopPropagation()

                          joinMut.mutate(group.slug)

                        }}

                      >

                        {pending ? 'Requested' : group.visibility === 'private' ? 'Request' : 'Join'}

                      </button>

                    </div>

                  ) : null}

                </div>

              </article>

            )

          })

        )}

      </div>

    </div>

  )

}


