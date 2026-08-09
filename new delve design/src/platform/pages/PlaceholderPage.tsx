import { DelveAdminEmpty, DelveAdminPageHeader } from '../components'
import { Construction } from 'lucide-react'

type Props = {
  title: string
  subtitle: string
}

export function PlaceholderPage({ title, subtitle }: Props) {
  return (
    <div className="da-page">
      <DelveAdminPageHeader title={title} subtitle={subtitle} />
      <DelveAdminEmpty
        icon={<Construction size={24} strokeWidth={2} />}
        title="Coming next"
        message="This section will be built in the next phase. The dashboard and reusable components are ready."
      />
    </div>
  )
}
