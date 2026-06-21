import { Link } from 'react-router-dom'
import { ArrowRight, Lock } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { ConversationInbox } from '../components/messages/ConversationInbox'
import '../messages-redesign.css'

export function Messages() {
  const { profile } = useAuth()

  if (!profile) {
    return (
      <main className="msg-page msg-page--auth">
        <section className="msg-auth">
          <span className="msg-auth__icon" aria-hidden>
            <Lock size={22} strokeWidth={2.25} />
          </span>
          <h1>Sign in to see messages</h1>
          <p>Private chats with hosts, guides, and travellers stay in your DELVE account.</p>
          <Link to="/login" className="btn btn-primary">
            Sign in
            <ArrowRight size={16} strokeWidth={2.5} aria-hidden />
          </Link>
        </section>
      </main>
    )
  }

  return (
    <main className="msg-page">
      <ConversationInbox context="user" hideSearchPanel />
    </main>
  )
}
