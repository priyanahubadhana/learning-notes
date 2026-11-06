import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import basicSsl from '@vitejs/plugin-basic-ssl'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
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

/** The commit being built: the app shows it, and version.json publishes it. */
function currentCommit(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA
  try {
    return execSync('git rev-parse HEAD').toString().trim()
  } catch {
    return 'unknown'
  }
}
const COMMIT = currentCommit()

/** Writes version.json, which the live site checks read. */
const versionStamp = (): Plugin => ({
  name: 'version-stamp',
  apply: 'build',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'version.json',
      source: JSON.stringify({ commit: COMMIT }),
    })
  },
})

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_COMMIT__: JSON.stringify(COMMIT),
    __APP_BUILT__: JSON.stringify(new Date().toISOString()),
  },
  preview: { headers: siteHeaders() },
  // Dev only: a self-signed https certificate, so another device on the
  // Wi-Fi (the iPad) gets a secure context (crypto, IndexedDB features).
  // The end-to-end tests (E2E=1) use plain http on localhost.
  plugins: [
    react(),
    tailwindcss(),
    versionStamp(),
    ...(process.env.E2E ? [] : [basicSsl()]),
    // Offline: the built app is kept on the device. A new version waits for
    // the user's OK (src/app/updates.ts); the manifest is in public/.
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,wasm,woff2}'],
        // The Pencil test page is a throwaway: always fetched fresh, never kept offline.
        globIgnores: ['404.html', 'pencil-test.*'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/pencil-test(\.html)?$/],
        clientsClaim: true,
      },
    }),
  ],
})
