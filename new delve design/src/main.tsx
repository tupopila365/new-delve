import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context'
import UpdateAvailableBanner from './components/UpdateAvailableBanner'
import { GoogleMapsProvider } from './components/maps'
import './index.css'

const basename = import.meta.env.BASE_URL?.replace(/\/$/, '') || ''

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename || undefined}>
      <AuthProvider>
        <GoogleMapsProvider>
          <App />
          <UpdateAvailableBanner />
        </GoogleMapsProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
