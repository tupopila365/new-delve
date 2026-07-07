import './CommunityPageEnhancer.css'

/** Hidden sync target for AppLayout header search. */
export function CommunityPageEnhancer() {
  return (
    <div className="cm-page-enhancer" aria-hidden>
      <input id="cm-search" type="search" className="cm-page-enhancer__search-sync" tabIndex={-1} readOnly />
    </div>
  )
}
