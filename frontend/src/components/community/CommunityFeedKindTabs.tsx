export type FeedKind = 'question' | 'tip'

type Props = {
  kind: FeedKind
  onChange: (kind: FeedKind) => void
}

export function CommunityFeedKindTabs({ kind, onChange }: Props) {
  return (
    <div className="cm-feed-kind-tabs" role="tablist" aria-label="Feed type">
      <button
        type="button"
        role="tab"
        aria-selected={kind === 'question'}
        className={kind === 'question' ? 'is-active' : ''}
        onClick={() => onChange('question')}
      >
        Questions
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={kind === 'tip'}
        className={kind === 'tip' ? 'is-active' : ''}
        onClick={() => onChange('tip')}
      >
        Tips
      </button>
    </div>
  )
}
