import { useEffect, useRef, useState } from 'react'
import { TossSpotDetail } from './TossSpotDetail'
import type { TossLocation } from '../../utils/coinToss'
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
  onSave?: () => void
  saveBusy?: boolean
  canSave?: boolean
}

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
  onSave,
  saveBusy,
  canSave,
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
      revealTimer.current = window.setTimeout(() => setShowResult(true), 80)
    }
    return () => {
      if (revealTimer.current) window.clearTimeout(revealTimer.current)
    }
  }, [isSpinning, winner])

  return (
    <div className="coin-toss-card">
      <div className={`coin-toss-card__arena${isSpinning ? ' is-spinning' : ''}`}>
        <button
          type="button"
          className={`coin-toss-card__coin${isSpinning ? ' is-spinning' : ''}`}
          onClick={onToss}
          disabled={disabled || isSpinning}
          aria-label={isSpinning ? 'Tossing…' : 'Toss the coin'}
        >
          <span className="coin-toss-card__coin-rim" aria-hidden />
          <span className="coin-toss-card__coin-face coin-toss-card__coin-face--front">
            <span className="coin-toss-card__coin-mark">D</span>
          </span>
          <span className="coin-toss-card__coin-face coin-toss-card__coin-face--back" aria-hidden>
            <span className="coin-toss-card__coin-mark coin-toss-card__coin-mark--q">?</span>
          </span>
        </button>
      </div>

      <p className="coin-toss-card__hint">
        {isSpinning ? 'In the air…' : disabled ? 'Share location to toss' : 'Tap the coin'}
      </p>

      {error ? <p className="coin-toss-card__error" role="alert">{error}</p> : null}

      {showResult && winner ? (
        <div aria-live="polite">
          <TossSpotDetail
            spot={winner}
            kicker="Landed on"
            onVote={onVote}
            voteBusy={voteBusy}
            voteMessage={voteMessage}
            canVote={canVote}
            onSave={onSave}
            saveBusy={saveBusy}
            canSave={canSave}
          />
        </div>
      ) : null}
    </div>
  )
}
