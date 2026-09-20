import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import './index.css'
import './theme.css'
import './mobile.css'
import App from './App.jsx'
import { initNative } from './native'
import { APP_MODE, BASE_PATH } from './appMode'

// GitHub Pages: pages-site/404.html sends a reloaded deep link here as ?__p=/students - restore the real address.
const restoredPath = new URLSearchParams(window.location.search).get('__p')
if (restoredPath) window.history.replaceState(null, '', BASE_PATH + restoredPath)

document.documentElement.dataset.theme = APP_MODE === 'teacher' ? 'teacher' : 'admin'
initNative()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename={BASE_PATH}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)

// Installable app: register the service worker in production builds only, so it never interferes with dev hot-reload.
// (The Android app bundles its own files, so it skips this.)
if ('serviceWorker' in navigator && import.meta.env.PROD && !window.Capacitor?.isNativePlatform?.()) {
  window.addEventListener('load', () => navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {}));
}
