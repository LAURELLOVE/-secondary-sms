import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import './index.css'
import './theme.css'
import './mobile.css'
import App from './App.jsx'
import { initNative } from './native'
import { APP_MODE } from './appMode'

document.documentElement.dataset.theme = APP_MODE === 'teacher' ? 'teacher' : 'admin'
initNative()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)

// Installable app: register the service worker in production builds only, so it never interferes with dev hot-reload.
// (The Android app bundles its own files, so it skips this.)
if ('serviceWorker' in navigator && import.meta.env.PROD && !window.Capacitor?.isNativePlatform?.()) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
