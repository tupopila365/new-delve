import { useState } from 'react'
import { X } from 'lucide-react'
import { useNoFace } from '../hooks/useNoFace'
import './no-face-invite.css'

/**
 * One-time invite letting people choose a quieter, social-free experience.
 * Default is always the full social app — this only offers the choice.
 */
export function NoFaceInvite() {
  const { shouldAsk, markAsked, setNoFace, enabled } = useNoFace()
  const [busy, setBusy] = useState(false)

  if (!shouldAsk || enabled) return null

  const keepSocial = () => markAsked()

  const tryNoFace = async () => {
    if (busy) return
    setBusy(true)
    try {
      await setNoFace(true)
      markAsked()
    } finally {
      setBusy(false)
    }
  }

  return (
    <aside className="noface-invite" role="note">
      <div className="noface-invite__body">
        <p className="noface-invite__kicker">Make Delve yours</p>
        <h3 className="noface-invite__title">Prefer a quieter Delve?</h3>
        <p className="noface-invite__text">
          Try <strong>No Face mode</strong> — find places, food, stays, events, guides, shops, and Coin
          Toss with no social feeds, stories, or faces. Or keep the full social experience. You can
          switch anytime in Settings.
        </p>
        <div className="noface-invite__actions">
          <button
            type="button"
            className="noface-invite__btn noface-invite__btn--primary"
            onClick={keepSocial}
          >
            Keep it social
          </button>
          <button type="button" className="noface-invite__btn" onClick={tryNoFace} disabled={busy}>
            {busy ? 'Switching…' : 'Try No Face'}
          </button>
        </div>
      </div>
      <button
        type="button"
        className="noface-invite__dismiss"
        onClick={keepSocial}
        aria-label="Dismiss"
      >
        <X size={18} aria-hidden />
      </button>
    </aside>
  )
}
