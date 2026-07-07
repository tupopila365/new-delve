import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CommunityFeedView } from '../components/community/CommunityFeedView'
import { CommunityGroupsView } from '../components/community/CommunityGroupsView'
import { CommunityHubTabs, type CommunityHubView } from '../components/community/CommunityHubTabs'
import { useCommunityHeaderSearch } from '../hooks/useCommunityHeaderSearch'
import { communityTagPath } from '../utils/communityTags'
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
  const hubView = parseHubView(searchParams.get('view'))
  const searchQuery = useCommunityHeaderSearch()

  useEffect(() => {
    const legacyTag = searchParams.get('tag')
    if (!legacyTag) return
    const slug = normalizeTag(legacyTag)
    if (!slug) return
    navigate(communityTagPath(slug), { replace: true })
  }, [navigate, searchParams])

  const setHubView = (view: CommunityHubView) => {
    setSearchParams((params) => {
      const next = new URLSearchParams(params)
      if (view === 'feed') next.delete('view')
      else next.set('view', view)
      return next
    }, { replace: true })
  }

  return (
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
}
