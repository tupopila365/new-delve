import { Check, HelpCircle, Plus } from 'lucide-react'

import type { FeedKind } from './CommunityFeedKindTabs'



type Props = {

  kind: FeedKind

  onKindChange: (kind: FeedKind) => void

  onAskClick: () => void

  onTipClick: () => void

}



export function CommunityFeedToolbar({ kind, onKindChange, onAskClick, onTipClick }: Props) {

  return (

    <div className="cm-feed-toolbar" role="toolbar" aria-label="Feed actions">

      <button

        type="button"

        className={`cm-feed-toolbar__item${kind === 'question' ? ' is-active' : ''}`}

        aria-pressed={kind === 'question'}

        onClick={() => onKindChange('question')}

      >

        <span className="cm-feed-toolbar__circle" aria-hidden>

          <HelpCircle size={20} strokeWidth={2} />

        </span>

        <span className="cm-feed-toolbar__label">Questions</span>

      </button>



      <button

        type="button"

        className={`cm-feed-toolbar__item${kind === 'tip' ? ' is-active' : ''}`}

        aria-pressed={kind === 'tip'}

        onClick={() => onKindChange('tip')}

      >

        <span className="cm-feed-toolbar__circle" aria-hidden>

          <Check size={20} strokeWidth={2.5} />

        </span>

        <span className="cm-feed-toolbar__label">Tips</span>

      </button>



      <button

        type="button"

        className="cm-feed-toolbar__item cm-feed-toolbar__item--action"

        onClick={onAskClick}

      >

        <span className="cm-feed-toolbar__circle" aria-hidden>

          <Plus size={20} strokeWidth={2.5} />

        </span>

        <span className="cm-feed-toolbar__label">Ask question</span>

      </button>



      <button

        type="button"

        className="cm-feed-toolbar__item cm-feed-toolbar__item--action"

        onClick={onTipClick}

      >

        <span className="cm-feed-toolbar__circle" aria-hidden>

          <Plus size={20} strokeWidth={2.5} />

        </span>

        <span className="cm-feed-toolbar__label">Create tip</span>

      </button>

    </div>

  )

}


