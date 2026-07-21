import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ApiError } from './api/client'
import { AuthProvider } from './auth/AuthContext'
import { CartProvider } from './hooks/useCart'
import { ErrorBoundary } from './components/ErrorBoundary'
import { PublishQueueProvider } from './components/PublishQueueContext'
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
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        if (error instanceof ApiError) {
          // Auth / missing / client errors — don't hammer the network or console.
          if ([0, 401, 403, 404].includes(error.status)) return false
          if (error.status >= 400 && error.status < 500) return false
        }
        return failureCount < 1
      },
    },
    mutations: {
      retry: false,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <CartProvider>
              <PublishQueueProvider>
                <App />
              </PublishQueueProvider>
            </CartProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
