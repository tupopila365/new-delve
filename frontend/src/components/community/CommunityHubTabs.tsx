export type CommunityHubView = 'feed' | 'groups'

type Props = {
  view: CommunityHubView
  onChange: (view: CommunityHubView) => void
}

export function CommunityHubTabs({ view, onChange }: Props) {
  return (
    <div className="cm-hub-tabs" role="tablist" aria-label="Community sections">
      <button
        type="button"
        role="tab"
        aria-selected={view === 'feed'}
        className={view === 'feed' ? 'is-active' : ''}
        onClick={() => onChange('feed')}
      >
        Feed
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={view === 'groups'}
        className={view === 'groups' ? 'is-active' : ''}
        onClick={() => onChange('groups')}
      >
        Groups
      </button>
    </div>
  )
}
