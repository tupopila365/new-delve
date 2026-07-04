import { Link } from 'react-router-dom'
import { Compass, Megaphone, MessageCircle, Plus } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../../auth/AuthContext'
import { apiFetch, asArray } from '../../../api/client'

type UserPost = {
  id: number
  is_delvers?: boolean
}

export function ProviderDashboardDelvers() {
  const { profile } = useAuth()
  const username = profile?.username

  const { data: posts = [] } = useQuery({
    queryKey: ['provider-delvers-posts', username],
    queryFn: async () => {
      const rows = await apiFetch<UserPost[]>(`/api/social/users/${encodeURIComponent(username!)}/posts/`)
      return asArray<UserPost>(rows)
    },
    enabled: Boolean(username),
  })

  const delversCount = posts.filter((p) => p.is_delvers).length

  if (!profile) return null

  return (
    <section className="prov-ui__panel">
      <h2 className="prov-ui__panel-title">Delvers</h2>
      <p className="prov-ui__panel-hint">
        Share travel moments on Delvers and sponsor your posts or listings in the feed.
      </p>
      <div className="prov-ui__stats">
        <div>
          <span className="prov-ui__muted">Your Delvers posts</span>
          <strong>{delversCount}</strong>
        </div>
      </div>
      <div className="prov-ui__shortcuts">
        <Link to="/delvers" className="prov-ui__shortcut">
          <Compass size={18} strokeWidth={2.25} aria-hidden />
          <span>Browse Delvers</span>
        </Link>
        <Link to="/create/highlight" className="prov-ui__shortcut">
          <Plus size={18} strokeWidth={2.25} aria-hidden />
          <span>Add highlight</span>
        </Link>
        <Link to="/provider/promotions" className="prov-ui__shortcut">
          <Megaphone size={18} strokeWidth={2.25} aria-hidden />
          <span>Promotions</span>
        </Link>
        <Link to="/provider/questions" className="prov-ui__shortcut">
          <MessageCircle size={18} strokeWidth={2.25} aria-hidden />
          <span>Questions</span>
        </Link>
      </div>
    </section>
  )
}
