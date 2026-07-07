import { Link } from 'react-router-dom'
import { communityGroupsTagPath } from '../../utils/communityGroups'

type Props = {
  tags: string[]
  className?: string
}

export function CommunityGroupTagChips({ tags, className = '' }: Props) {
  if (!tags.length) return null
  return (
    <div className={`cm-group-tags${className ? ` ${className}` : ''}`} aria-label="Group tags">
      {tags.map((slug) => (
        <Link key={slug} to={communityGroupsTagPath(slug)} className="cm-group-tags__chip">
          #{slug}
        </Link>
      ))}
    </div>
  )
}
