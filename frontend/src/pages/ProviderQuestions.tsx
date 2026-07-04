import { useOutletContext } from 'react-router-dom'
import type { ProviderOutletContext } from '../components/ProviderLayout'
import { ProviderListingQuestionsPanel } from '../components/provider/ProviderListingQuestionsPanel'
import { ProviderUiHeader, ProviderUiPage } from '../components/provider/ui'

export function ProviderQuestions() {
  const { canManageListings } = useOutletContext<ProviderOutletContext>()

  return (
    <ProviderUiPage>
      <ProviderUiHeader
        title="Listing questions"
        subtitle="Answer travellers asking about your stays, food venues, guides, transport, and events."
      />
      <ProviderListingQuestionsPanel canAnswer={canManageListings} />
    </ProviderUiPage>
  )
}
