import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import basicSsl from '@vitejs/plugin-basic-ssl'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { buildSkillZip, SKILL_ZIP_NAME } from './scripts/skillZip.ts'

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

/**
 * Whether this build is a REQUIRED update (a storage change or a data fix):
 * the full-screen update flow is used instead of the normal pill. Set by the
 * words "[required-update]" in the last commit message, or REQUIRED_UPDATE=1.
 */
function isRequiredUpdate(): boolean {
  if (process.env.REQUIRED_UPDATE === '1') return true
  try {
    return execSync('git log -1 --format=%B')
      .toString()
      .includes('[required-update]')
  } catch {
    return false
  }
}
const REQUIRED = isRequiredUpdate()

/** Writes version.json, which the live site checks read. */
const versionStamp = (): Plugin => ({
  name: 'version-stamp',
  apply: 'build',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: 'version.json',
      source: JSON.stringify({ commit: COMMIT, required: REQUIRED }),
    })
  },
})

/** precache.json: the files of this build and their sizes, so the update pill can count the download. */
const precacheList = (): Plugin => ({
  name: 'precache-list',
  apply: 'build',
  generateBundle(_o, bundle) {
    const files = Object.values(bundle)
      .filter((f) => /.(js|css|html|svg|png|wasm|woff2)$/.test(f.fileName))
      .map((f) => ({
        u: '/' + f.fileName,
        s: f.type === 'chunk' ? Buffer.byteLength(f.code) : f.source.length,
      }))
    this.emitFile({
      type: 'asset',
      fileName: 'precache.json',
      source: JSON.stringify({ commit: COMMIT, files }),
    })
  },
})

/** The Claude Skill zip, built from claude-skill/learning-notes (build and dev). */
const claudeSkillZip = (): Plugin => ({
  name: 'claude-skill-zip',
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: SKILL_ZIP_NAME,
      source: buildSkillZip(),
    })
  },
  configureServer(server) {
    server.middlewares.use(`/${SKILL_ZIP_NAME}`, (_req, res) => {
      res.setHeader('Content-Type', 'application/zip')
      res.end(Buffer.from(buildSkillZip()))
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
    precacheList(),
    claudeSkillZip(),
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
        navigateFallbackDenylist: [
          /^\/pencil-test(\.html)?$/,
          /^\/privacy(\.html)?$/,
        ],
        clientsClaim: true,
      },
    }),
  ],
})
