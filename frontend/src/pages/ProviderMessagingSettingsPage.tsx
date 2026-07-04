import { useEffect, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { apiFetch } from '../api/client'
import { friendlyApiMessage } from '../utils/friendlyError'
import { useAuth } from '../auth/AuthContext'
import type { ProviderOutletContext } from '../components/ProviderLayout'
import { useBusinessAccess } from '../hooks/useBusinessAccess'
import { ProviderUiHeader, ProviderUiPage } from '../components/provider/ui'
import type { ProviderMessagingSettings } from '../components/messages/useProviderMessagingSettings'
import {
  providerMessagingSettingsPath,
  useProviderMessagingSettings,
} from '../components/messages/useProviderMessagingSettings'
import '../components/provider/messages/provider-messaging-settings.css'

const MAX_QUICK_REPLIES = 6
const MAX_WELCOME = 1000
const MAX_REPLY = 120

const WELCOME_TEMPLATES = [
  'Thanks for reaching out! Share your travel dates and questions — a team member will reply shortly.',
  'Welcome! We typically reply within a few hours. Let us know how we can help with your booking.',
  'Hi there — thanks for your message. Tell us your dates, group size, and any special requests.',
] as const

const QUICK_REPLY_STARTER = [
  'Thanks for reaching out — how can I help?',
  'Your booking is confirmed.',
  'Could you share your arrival date?',
] as const

const BOOKING_CONFIRMED_TEMPLATE =
  'Great news — your booking is confirmed! We look forward to hosting you. Reply here if you have any questions.'

function SaveBanner({ saved, error }: { saved: boolean; error: string | null }) {
  if (error) return <p className="prov-msg-settings__banner prov-msg-settings__banner--err" role="alert">{error}</p>
  if (saved) return <p className="prov-msg-settings__banner prov-msg-settings__banner--ok" role="status">Saved.</p>
  return null
}

export function ProviderMessagingSettingsPage() {
  const { profile } = useAuth()
  const { activeBusiness } = useOutletContext<ProviderOutletContext>()
  const { canManageSettings } = useBusinessAccess(activeBusiness?.id)
  const isProvider = profile?.user_type === 'service_provider'
  const canAccess = isProvider || canManageSettings
  const businessId = activeBusiness?.id ?? null

  const { data, isLoading, refetch } = useProviderMessagingSettings({
    businessId,
    canManageSettings,
    enabled: canAccess,
  })
  const [autoWelcomeEnabled, setAutoWelcomeEnabled] = useState(false)
  const [autoWelcomeBody, setAutoWelcomeBody] = useState('')
  const [bookingConfirmedEnabled, setBookingConfirmedEnabled] = useState(false)
  const [bookingConfirmedBody, setBookingConfirmedBody] = useState('')
  const [quickRepliesEnabled, setQuickRepliesEnabled] = useState(false)
  const [quickReplies, setQuickReplies] = useState<string[]>([''])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!data) return
    setAutoWelcomeEnabled(data.auto_welcome_enabled)
    setAutoWelcomeBody(data.auto_welcome_body)
    setBookingConfirmedEnabled(data.booking_confirmed_enabled)
    setBookingConfirmedBody(data.booking_confirmed_body)
    setQuickRepliesEnabled(data.quick_replies_enabled)
    setQuickReplies(data.quick_replies.length > 0 ? data.quick_replies : [''])
  }, [data])

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError(null)
    const trimmedWelcome = autoWelcomeBody.trim()
    const trimmedBookingConfirmed = bookingConfirmedBody.trim()
    const cleanedReplies = quickReplies.map((row) => row.trim()).filter(Boolean).slice(0, MAX_QUICK_REPLIES)
    if (autoWelcomeEnabled && !trimmedWelcome) {
      setError('Add a welcome message or turn automated welcome off.')
      setSaving(false)
      return
    }
    if (bookingConfirmedEnabled && !trimmedBookingConfirmed) {
      setError('Add a booking confirmed message or turn booking automation off.')
      setSaving(false)
      return
    }
    if (quickRepliesEnabled && cleanedReplies.length === 0) {
      setError('Add at least one quick reply shortcut or turn the feature off.')
      setSaving(false)
      return
    }
    try {
      const payload: Partial<ProviderMessagingSettings> = {
        auto_welcome_enabled: autoWelcomeEnabled,
        auto_welcome_body: trimmedWelcome,
        booking_confirmed_enabled: bookingConfirmedEnabled,
        booking_confirmed_body: trimmedBookingConfirmed,
        quick_replies_enabled: quickRepliesEnabled,
        quick_replies: cleanedReplies,
      }
      await apiFetch<ProviderMessagingSettings>(providerMessagingSettingsPath(businessId), {
        method: 'PATCH',
        body: JSON.stringify(payload),
      })
      setSaved(true)
      void refetch()
    } catch (err) {
      setError(friendlyApiMessage(err, 'Could not save messaging settings.'))
    } finally {
      setSaving(false)
    }
  }

  function updateQuickReply(index: number, value: string) {
    setQuickReplies((rows) => rows.map((row, i) => (i === index ? value.slice(0, MAX_REPLY) : row)))
  }

  function addQuickReply() {
    setQuickReplies((rows) => (rows.length >= MAX_QUICK_REPLIES ? rows : [...rows, '']))
  }

  function removeQuickReply(index: number) {
    setQuickReplies((rows) => {
      const next = rows.filter((_, i) => i !== index)
      return next.length > 0 ? next : ['']
    })
  }

  return (
    <ProviderUiPage>
      <ProviderUiHeader
        title="Messaging automation"
        subtitle={
          activeBusiness
            ? `Settings for ${activeBusiness.business_name}. Each business can have its own welcome and shortcuts.`
            : 'Send an automated welcome when a guest starts a chat, and optional reply shortcuts for your inbox.'
        }
      />

      <p className="prov-msg-settings__back">
        <Link to="/provider/messages" className="prov-msg-settings__back-link">
          <ArrowLeft size={16} strokeWidth={2.25} aria-hidden />
          Back to guest inbox
        </Link>
      </p>

      {!canAccess ? (
        <p className="prov-msg-settings__notice" role="status">
          Your role can view the guest inbox but not edit messaging automation. Ask a manager or business owner.
        </p>
      ) : null}

      {canAccess && data?.managed_for_owner ? (
        <p className="prov-msg-settings__notice" role="status">
          Editing messaging automation for{' '}
          <strong>{data.business_name ?? activeBusiness?.business_name ?? 'this business'}</strong>
          {data.owner_username ? <> (owner @{data.owner_username})</> : null}.
        </p>
      ) : null}

      {canAccess && data?.inherits_account_default ? (
        <p className="prov-msg-settings__notice" role="status">
          Showing your account-wide defaults for{' '}
          <strong>{data.business_name ?? activeBusiness?.business_name ?? 'this business'}</strong>.
          Save here to customize this business separately.
        </p>
      ) : null}

      {canAccess && isLoading ? <p className="prov-msg-settings__loading">Loading…</p> : null}

      {canAccess && !isLoading ? (
        <section className="prov-msg-settings">
          <div className="prov-msg-settings__card">
            <div className="prov-msg-settings__toggle-row">
              <div>
                <h2>Automated welcome</h2>
                <p>Sent once when a traveller opens a new chat with you. You can edit the message anytime.</p>
              </div>
              <label className="prov-msg-settings__sw" aria-label="Enable automated welcome">
                <input
                  type="checkbox"
                  checked={autoWelcomeEnabled}
                  onChange={(event) => setAutoWelcomeEnabled(event.target.checked)}
                />
                <span className="prov-msg-settings__sw-track" aria-hidden />
              </label>
            </div>
            <label className="prov-msg-settings__field">
              <span>Welcome message</span>
              <textarea
                value={autoWelcomeBody}
                onChange={(event) => setAutoWelcomeBody(event.target.value.slice(0, MAX_WELCOME))}
                rows={5}
                disabled={!autoWelcomeEnabled}
                placeholder="Thanks for reaching out! Share your dates and questions — we'll reply as soon as we can."
              />
              <small>{autoWelcomeBody.length}/{MAX_WELCOME}</small>
            </label>
            {autoWelcomeEnabled ? (
              <div className="prov-msg-settings__templates" role="group" aria-label="Welcome message templates">
                <p>Starter templates — edit after applying:</p>
                <div className="prov-msg-settings__template-row">
                  {WELCOME_TEMPLATES.map((template, index) => (
                    <button
                      key={index}
                      type="button"
                      className="prov-msg-settings__template-btn"
                      title={template}
                      onClick={() => setAutoWelcomeBody(template.slice(0, MAX_WELCOME))}
                    >
                      Template {index + 1}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="prov-msg-settings__card">
            <div className="prov-msg-settings__toggle-row">
              <div>
                <h2>Booking confirmed message</h2>
                <p>Sent automatically in the guest&apos;s message thread when you confirm a booking.</p>
              </div>
              <label className="prov-msg-settings__sw" aria-label="Enable booking confirmed message">
                <input
                  type="checkbox"
                  checked={bookingConfirmedEnabled}
                  onChange={(event) => setBookingConfirmedEnabled(event.target.checked)}
                />
                <span className="prov-msg-settings__sw-track" aria-hidden />
              </label>
            </div>
            <label className="prov-msg-settings__field">
              <span>Confirmation message</span>
              <textarea
                value={bookingConfirmedBody}
                onChange={(event) => setBookingConfirmedBody(event.target.value.slice(0, MAX_WELCOME))}
                rows={4}
                disabled={!bookingConfirmedEnabled}
                placeholder="Great news — your booking is confirmed! Reply here if you have any questions."
              />
              <small>{bookingConfirmedBody.length}/{MAX_WELCOME}</small>
            </label>
            {bookingConfirmedEnabled ? (
              <button
                type="button"
                className="prov-msg-settings__starter-pack"
                onClick={() => setBookingConfirmedBody(BOOKING_CONFIRMED_TEMPLATE.slice(0, MAX_WELCOME))}
              >
                Use starter message
              </button>
            ) : null}
          </div>

          <div className="prov-msg-settings__card">
            <div className="prov-msg-settings__toggle-row">
              <div>
                <h2>Quick reply shortcuts</h2>
                <p>Optional chips above your composer in the guest inbox — only you see these.</p>
              </div>
              <label className="prov-msg-settings__sw" aria-label="Enable quick reply shortcuts">
                <input
                  type="checkbox"
                  checked={quickRepliesEnabled}
                  onChange={(event) => setQuickRepliesEnabled(event.target.checked)}
                />
                <span className="prov-msg-settings__sw-track" aria-hidden />
              </label>
            </div>
            <ul className="prov-msg-settings__replies">
              {quickReplies.map((row, index) => (
                <li key={index}>
                  <input
                    type="text"
                    value={row}
                    onChange={(event) => updateQuickReply(index, event.target.value)}
                    disabled={!quickRepliesEnabled}
                    placeholder={`Shortcut ${index + 1}`}
                    maxLength={MAX_REPLY}
                  />
                  <button
                    type="button"
                    className="prov-msg-settings__icon-btn"
                    onClick={() => removeQuickReply(index)}
                    disabled={!quickRepliesEnabled}
                    aria-label={`Remove shortcut ${index + 1}`}
                  >
                    <Trash2 size={16} strokeWidth={2.25} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
            {quickReplies.length < MAX_QUICK_REPLIES ? (
              <button
                type="button"
                className="prov-msg-settings__add"
                onClick={addQuickReply}
                disabled={!quickRepliesEnabled}
              >
                <Plus size={16} strokeWidth={2.25} aria-hidden />
                Add shortcut
              </button>
            ) : null}
            {quickRepliesEnabled ? (
              <button
                type="button"
                className="prov-msg-settings__starter-pack"
                onClick={() => setQuickReplies([...QUICK_REPLY_STARTER])}
              >
                Use starter shortcuts
              </button>
            ) : null}
          </div>

          <SaveBanner saved={saved} error={error} />
          <button type="button" className="btn btn-primary prov-msg-settings__save" disabled={saving} onClick={() => void handleSave()}>
            {saving ? 'Saving…' : 'Save messaging settings'}
          </button>
        </section>
      ) : null}
    </ProviderUiPage>
  )
}
