import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Share2 } from 'lucide-react'
import './business-profile.css'

type Props = {
  title?: string
  onShare?: () => void
  shareLabel?: string
  children: ReactNode
}

export function goBackFromProfile(navigate: ReturnType<typeof useNavigate>) {
  if (window.history.length > 1) {
    navigate(-1)
    return
  }
  navigate('/')
}

export function BusinessProfileShell({ title = 'Provider', onShare, shareLabel = 'Share profile', children }: Props) {
  const navigate = useNavigate()

  return (
    <div className="biz-profile">
      <header className="biz-profile__bar">
        <button
          type="button"
          className="biz-profile__back"
          onClick={() => goBackFromProfile(navigate)}
          aria-label="Go back"
        >
          <ArrowLeft size={20} strokeWidth={2.25} aria-hidden />
        </button>
        <span className="biz-profile__bar-title">{title}</span>
        {onShare ? (
          <button type="button" className="biz-profile__share" onClick={onShare} aria-label={shareLabel}>
            <Share2 size={18} strokeWidth={2.25} aria-hidden />
          </button>
        ) : (
          <span className="biz-profile__bar-spacer" aria-hidden />
        )}
      </header>
      <div className="biz-profile__wrap">{children}</div>
    </div>
  )
}
