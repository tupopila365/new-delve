import AboutDelvePage from './company/AboutDelvePage'
import BecomeProviderPage from './company/BecomeProviderPage'
import ContactDelvePage from './company/ContactDelvePage'
import InvestorsPage from './company/InvestorsPage'

export type CompanyRoute = 'About' | 'Investors' | 'Contact' | 'Become a provider'

type Props = {
  route: CompanyRoute
  onNavigate: (route: string) => void
}

export default function CompanyPage({ route, onNavigate }: Props) {
  if (route === 'About') {
    return <AboutDelvePage onNavigate={onNavigate} />
  }

  if (route === 'Investors') {
    return <InvestorsPage onNavigate={onNavigate} />
  }

  if (route === 'Contact') {
    return <ContactDelvePage onNavigate={onNavigate} />
  }

  return <BecomeProviderPage onNavigate={onNavigate} />
}

export const COMPANY_ROUTES = new Set<string>([
  'About',
  'Investors',
  'Contact',
  'Become a provider',
])
