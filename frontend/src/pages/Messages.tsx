import { Link } from 'react-router-dom'
import { ArrowRight, Lock } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import { ConversationInbox } from '../components/messages/ConversationInbox'
import { HOME_ATMOSPHERE_BG } from '../data/homeDefaults'
import '../messages-redesign.css'

export function Messages() {
  const { profile } = useAuth()

  if (!profile) {
    return (
      <main className="msg-trail msg-trail--auth">
        <header className="msg-trail__hero">
          <div
            className="msg-trail__hero-photo"
            style={{ backgroundImage: `url(${HOME_ATMOSPHERE_BG})` }}
            aria-hidden
          />
          <div className="msg-trail__hero-veil" aria-hidden />
          <div className="msg-trail__hero-copy">
            <p className="msg-trail__kicker">On the line</p>
            <h1 className="msg-trail__title">Messages</h1>
          </div>
        </header>
        <section className="msg-trail__auth">
          <span className="msg-trail__auth-icon" aria-hidden>
            <Lock size={22} strokeWidth={2.25} />
          </span>
          <h2>Sign in to see messages</h2>
          <p>Private chats with hosts, guides, and travellers stay in your DELVE account.</p>
          <Link to="/login" className="msg-trail__auth-btn">
            Sign in
            <ArrowRight size={16} strokeWidth={2.5} aria-hidden />
          </Link>
        </section>
      </main>
    )
  }

  return (
    <main className="msg-trail">
      <header className="msg-trail__hero">
        <div
          className="msg-trail__hero-photo"
          style={{ backgroundImage: `url(${HOME_ATMOSPHERE_BG})` }}
          aria-hidden
        />
        <div className="msg-trail__hero-veil" aria-hidden />
        <div className="msg-trail__hero-copy">
          <p className="msg-trail__kicker">On the line</p>
          <h1 className="msg-trail__title">Messages</h1>
          <p className="msg-trail__lead">Hosts, guides, and travellers you’ve been talking to.</p>
        </div>
      </header>
      <div className="msg-trail__desk">
        <ConversationInbox context="user" />
      </div>
    </main>
  )
}
