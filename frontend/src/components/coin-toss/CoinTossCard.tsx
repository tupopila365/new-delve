import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Compass, MapPin, Sparkles, ThumbsUp } from 'lucide-react'
import { categoryLabel, delveSearchUrl, type TossLocation } from '../../utils/coinToss'
import './coin-toss.css'

type CoinTossCardProps = {
  isSpinning: boolean
  winner: TossLocation | null
  error: string | null
  onToss: () => void
  disabled?: boolean
  onVote?: () => void
  voteBusy?: boolean
  voteMessage?: string | null
  canVote?: boolean
}

const SPIN_MS = 2400

export function CoinTossCard({
  isSpinning,
  winner,
  error,
  onToss,
  disabled,
  onVote,
  voteBusy,
  voteMessage,
  canVote,
}: CoinTossCardProps) {
  const [showResult, setShowResult] = useState(false)
  const revealTimer = useRef<number | null>(null)

  useEffect(() => {
    if (isSpinning) {
      setShowResult(false)
      if (revealTimer.current) window.clearTimeout(revealTimer.current)
      return
    }
    if (winner) {
      revealTimer.current = window.setTimeout(() => setShowResult(true), 120)
    }
    return () => {
      if (revealTimer.current) window.clearTimeout(revealTimer.current)
    }
  }, [isSpinning, winner])

  return (
    <div className="coin-toss-card">
      <div className={`coin-toss-card__arena${isSpinning ? ' is-spinning' : ''}`}>
        <span className="coin-toss-card__glow" aria-hidden />
        <button
          type="button"
          className={`coin-toss-card__coin${isSpinning ? ' is-spinning' : ''}`}
          onClick={onToss}
          disabled={disabled || isSpinning}
          aria-label={isSpinning ? 'Tossing…' : 'Toss the coin'}
        >
          <span className="coin-toss-card__coin-face coin-toss-card__coin-face--front">
            <Sparkles size={32} strokeWidth={2.2} aria-hidden />
            <span>DELVE</span>
          </span>
          <span className="coin-toss-card__coin-face coin-toss-card__coin-face--back" aria-hidden>
            ?
          </span>
        </button>
      </div>

      <p className="coin-toss-card__hint">
        {isSpinning ? 'Spinning for a surprise…' : 'Tap the coin — fate picks the spot'}
      </p>

      {error ? <p className="coin-toss-card__error" role="alert">{error}</p> : null}

      {showResult && winner ? (
        <article className="coin-toss-card__result" aria-live="polite">
          <p className="coin-toss-card__result-kicker">Your toss landed on</p>
          <h2 className="coin-toss-card__result-name">{winner.name}</h2>
          <p className="coin-toss-card__result-meta">
            <MapPin size={14} aria-hidden />
            <span>{categoryLabel(winner)}</span>
            {winner.city ? <span>· {winner.city}</span> : null}
            {typeof winner.upvote_count === 'number' ? (
              <span>
                · {winner.upvote_count} local upvote{winner.upvote_count === 1 ? '' : 's'}
              </span>
            ) : null}
          </p>
          {winner.description ? (
            <p className="coin-toss-card__result-desc">{winner.description}</p>
          ) : null}

          <div className="coin-toss-card__result-actions">
            <Link className="coin-toss-card__map" to={delveSearchUrl(winner.name)}>
              View on Delve
              <Compass size={14} aria-hidden />
            </Link>
            {onVote ? (
              canVote ? (
                <button
                  type="button"
                  className="coin-toss-card__vote"
                  onClick={onVote}
                  disabled={voteBusy}
                >
                  <ThumbsUp size={14} aria-hidden />
                  {voteBusy ? 'Checking…' : 'I am here — upvote'}
                </button>
              ) : (
                <Link className="coin-toss-card__vote" to="/login?next=/coin-toss">
                  <ThumbsUp size={14} aria-hidden />
                  Sign in to upvote
                </Link>
              )
            ) : null}
          </div>

          {voteMessage ? <p className="coin-toss-card__vote-msg">{voteMessage}</p> : null}
        </article>
      ) : null}

      <span className="sr-only" data-spin-ms={SPIN_MS} />
    </div>
  )
}
