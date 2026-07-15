import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CommunityFeedView } from '../components/community/CommunityFeedView'
import { CommunityGroupsView } from '../components/community/CommunityGroupsView'
import { CommunityHubTabs, type CommunityHubView } from '../components/community/CommunityHubTabs'
import { CommunityTrailShell } from '../components/community/CommunityTrailShell'
import { communityTagPath, parseTagFromSearch } from '../utils/communityTags'
import { normalizeTag } from '../utils/hashtags'
import '../components/community/communityHub.css'
import './CommunityPage.css'

type CommunityProps = {
  embedded?: boolean
}

function parseHubView(raw: string | null): CommunityHubView {
  return raw === 'groups' ? 'groups' : 'feed'
}

export function Community({ embedded = false }: CommunityProps = {}) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchQuery, setSearchQuery] = useState('')
  const hubView = parseHubView(searchParams.get('view'))

  useEffect(() => {
    const legacyTag = searchParams.get('tag')
    if (!legacyTag) return
    const slug = normalizeTag(legacyTag)
    if (!slug) return
    navigate(communityTagPath(slug), { replace: true })
  }, [navigate, searchParams])

  const setHubView = (view: CommunityHubView) => {
    setSearchParams(
      (params) => {
        const next = new URLSearchParams(params)
        if (view === 'feed') next.delete('view')
        else next.set('view', view)
        return next
      },
      { replace: true },
    )
  }

  const onSearchEnter = (value: string) => {
    const slug = parseTagFromSearch(value)
    if (!slug) return
    if (hubView === 'groups') {
      navigate(`/community?view=groups&tag=${encodeURIComponent(slug)}`)
      return
    }
    navigate(communityTagPath(slug))
  }

  const body = (
    <div className={`cm-simple${embedded ? ' cm-simple--embedded' : ''}`}>
      <div className="cm-simple__panel">
        <CommunityHubTabs view={hubView} onChange={setHubView} />

        {hubView === 'feed' ? (
          <CommunityFeedView searchQuery={searchQuery} />
        ) : (
          <CommunityGroupsView searchQuery={searchQuery} />
        )}
      </div>
    </div>
  )

  if (embedded) {
    return <CommunityTrailShell embedded>{body}</CommunityTrailShell>
  }

  return (
    <CommunityTrailShell
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      onSearchEnter={onSearchEnter}
    >
      {body}
    </CommunityTrailShell>
  )
}
