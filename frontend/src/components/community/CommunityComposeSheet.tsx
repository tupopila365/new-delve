import { Link } from 'react-router-dom'
import { BookOpen, HelpCircle, MessageSquarePlus, X } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'

type Props = {
  open: boolean
  onClose: () => void
  onBrowseAdvice: () => void
}

export function CommunityComposeSheet({ open, onClose, onBrowseAdvice }: Props) {
  const { profile } = useAuth()
  const login = '/login'
  const askHref = profile ? '/create/ask' : login
  const groupHref = profile ? '/community?view=groups&createGroup=1' : login

  if (!open) return null

  return (
    <div className="cm-compose-sheet" role="dialog" aria-modal="true" aria-labelledby="cm-compose-title">
      <button type="button" className="cm-compose-sheet__backdrop" onClick={onClose} aria-label="Close" />
      <div className="cm-compose-sheet__panel">
        <div className="cm-compose-sheet__head">
          <h2 id="cm-compose-title">Get help</h2>
          <button type="button" onClick={onClose} aria-label="Close sheet">
            <X size={18} strokeWidth={2.25} aria-hidden />
          </button>
        </div>
        <p className="cm-compose-sheet__sub">
          Search the feed first — then ask, share advice, or start a group with travellers like you.
        </p>
        <ul className="cm-compose-sheet__options">
          <li>
            <Link to={askHref} className="cm-compose-sheet__option" onClick={onClose}>
              <span className="cm-compose-sheet__option-icon" aria-hidden>
                <HelpCircle size={20} strokeWidth={2.25} />
              </span>
              <span className="cm-compose-sheet__option-copy">
                <strong>Ask a question</strong>
                <span>Get answers from locals and recent travellers.</span>
              </span>
            </Link>
          </li>
          <li>
            <button type="button" className="cm-compose-sheet__option" onClick={() => { onBrowseAdvice(); onClose() }}>
              <span className="cm-compose-sheet__option-icon" aria-hidden>
                <BookOpen size={20} strokeWidth={2.25} />
              </span>
              <span className="cm-compose-sheet__option-copy">
                <strong>Browse advice</strong>
                <span>Read tips others have already shared.</span>
              </span>
            </button>
          </li>
          <li>
            <Link to={groupHref} className="cm-compose-sheet__option" onClick={onClose}>
              <span className="cm-compose-sheet__option-icon" aria-hidden>
                <MessageSquarePlus size={20} strokeWidth={2.25} />
              </span>
              <span className="cm-compose-sheet__option-copy">
                <strong>Create a group</strong>
                <span>Chat with a small crew around a route or topic.</span>
              </span>
            </Link>
          </li>
        </ul>
      </div>
    </div>
  )
}
