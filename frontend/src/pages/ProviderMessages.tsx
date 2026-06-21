import { useAuth } from '../auth/AuthContext'
import { ConversationInbox } from '../components/messages/ConversationInbox'
import { ProviderUiPage } from '../components/provider/ui'
import '../components/provider/messages/provider-messages.css'

export function ProviderMessages() {
  const { profile } = useAuth()
  if (!profile) return null

  return (
    <ProviderUiPage>
      <ConversationInbox context="provider" />
    </ProviderUiPage>
  )
}
