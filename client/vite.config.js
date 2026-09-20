import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { IDENTITIES, manifestFor } from './app-identity.js'

// Stamps the right name / colours / icons into index.html and the web-app manifest
// for the build being made (VITE_APP_MODE = admin | teacher | web).
function appIdentity(appMode) {
  const identity = IDENTITIES[appMode] || IDENTITIES.web
  const manifest = JSON.stringify(manifestFor(identity), null, 2)
  return {
    name: 'app-identity',
    transformIndexHtml(html) {
      return html
        .replaceAll('__APP_TITLE__', identity.title)
        .replaceAll('__APP_SHORT__', identity.short)
        .replaceAll('__APP_DESCRIPTION__', identity.description)
        .replaceAll('__APP_THEME__', identity.theme)
        .replaceAll('__APP_ICON__', identity.icon)
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'manifest.webmanifest', source: manifest })
    },
    configureServer(server) {
      server.middlewares.use('/manifest.webmanifest', (req, res) => {
        res.setHeader('Content-Type', 'application/manifest+json')
        res.end(manifest)
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    plugins: [react(), appIdentity(env.VITE_APP_MODE || 'web')],
    server: {
      host: true, // listen on the LAN too, not just localhost
      allowedHosts: true, // accept requests via a tunnel hostname (e.g. trycloudflare.com)
      proxy: {
        '/api': { target: 'http://localhost:4000', changeOrigin: true },
        '/uploads': { target: 'http://localhost:4000', changeOrigin: true },
      },
    },
  }
})
