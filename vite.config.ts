import { readFileSync } from 'node:fs'
import basicSsl from '@vitejs/plugin-basic-ssl'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

/** The live site's `/*` headers, so the preview runs under the same rules. */
function siteHeaders(): Record<string, string> {
  const block = readFileSync('public/_headers', 'utf8').split('\n\n')[0]
  return Object.fromEntries(
    block
      .split('\n')
      .slice(1)
      .map((line) => {
        const at = line.indexOf(':')
        return [line.slice(0, at).trim(), line.slice(at + 1).trim()]
      })
      .filter(([name]) => name),
  )
}

// https://vite.dev/config/
export default defineConfig({
  preview: { headers: siteHeaders() },
  // Dev only: a self-signed https certificate, so another device on the
  // Wi-Fi (the iPad) gets a secure context (crypto, IndexedDB features).
  // The end-to-end tests (E2E=1) use plain http on localhost.
  plugins: [
    react(),
    tailwindcss(),
    ...(process.env.E2E ? [] : [basicSsl()]),
    // Offline: the built app is kept on the device. A new version waits for
    // the user's OK (src/app/updates.ts); the manifest is in public/.
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,wasm,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: 'index.html',
        clientsClaim: true,
      },
    }),
  ],
})
