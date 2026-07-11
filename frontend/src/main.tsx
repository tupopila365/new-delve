import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import App from './App.tsx'
import './index.css'
import './delvers.css'
import './home-stories-delvers-style.css'
import './user-profile-redesign.css'
import './user-profile-card-fix.css'
import './delve-black-background.css'
import './home-mobile-redesign.css'
import './components/provider/provider-dark.css'
import './components/provider/ui/provider-ui.css'
import './components/provider/messages/provider-messages.css'
import './components/provider/stays/stay-listing.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
