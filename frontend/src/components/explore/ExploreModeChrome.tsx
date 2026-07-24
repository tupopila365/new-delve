import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, X } from 'lucide-react'
import { useExploreDestination } from '../../hooks/useExploreDestination'
import './ExploreModeChrome.css'

/** Sprint 2 + 4 — body class + persistent Explore ON bar. */
export function ExploreModeChrome() {
  const { exploring, label, exitExplore } = useExploreDestination()

  useEffect(() => {
    const on = exploring
    document.body.classList.toggle('delve-explore-on', on)
    document.body.classList.toggle('delve-explore-off', !on)
    return () => {
      document.body.classList.remove('delve-explore-on', 'delve-explore-off')
    }
  }, [exploring])

  if (!exploring) return null

  return (
    <div className="explore-mode-bar" role="status" aria-live="polite">
      <p className="explore-mode-bar__copy">
        <MapPin size={14} strokeWidth={2.35} aria-hidden />
        <span>
          Exploring <strong>{label}</strong>
        </span>
        <Link to="/explore" className="explore-mode-bar__change">
          Change
        </Link>
      </p>
      <button type="button" className="explore-mode-bar__exit" onClick={() => exitExplore()}>
        <span>Back to my Delve</span>
        <X size={14} strokeWidth={2.5} aria-hidden />
      </button>
    </div>
  )
}
