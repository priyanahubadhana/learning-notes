// U0a: two real production builds served from one origin, swapped at run time.
import { execSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { createServer, type Server } from 'node:http'
import { extname, join, normalize } from 'node:path'

const ROOT = join(process.cwd(), '.u0a')
export const COMMIT_A = 'a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0'
export const COMMIT_B = 'b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1b1'
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Builds A and B once per run (workers share the build through a lock folder). */
export async function ensureBuilds(): Promise<void> {
  const run = String(process.ppid)
  const marker = join(ROOT, `ready-${run}`)
  mkdirSync(ROOT, { recursive: true })
  if (process.env.U0A_REUSE && existsSync(join(ROOT, 'b', 'version.json')))
    return
  try {
    mkdirSync(join(ROOT, `lock-${run}`))
  } catch {
    for (let i = 0; i < 900 && !existsSync(marker); i++) await sleep(500)
    return
  }
  for (const [dir, sha] of [
    ['a', COMMIT_A],
    ['b', COMMIT_B],
  ]) {
    execSync(`npx vite build --outDir .u0a/${dir} --emptyOutDir`, {
      stdio: 'ignore',
      env: { ...process.env, GITHUB_SHA: sha, E2E: '1' },
    })
  }
  writeFileSync(marker, 'ok')
}

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
  '.webmanifest': 'application/manifest+json',
}

/** The `/*` block of public/_headers (the live site's rules) and the per-path ones. */
function siteRules() {
  const blocks = readFileSync('public/_headers', 'utf8').split('\n\n')
  const parse = (b: string) =>
    Object.fromEntries(
      b
        .split('\n')
        .slice(1)
        .map((l) => [
          l.slice(0, l.indexOf(':')).trim(),
          l.slice(l.indexOf(':') + 1).trim(),
        ])
        .filter(([n]) => n),
    )
  const per: Record<string, Record<string, string>> = {}
  for (const b of blocks.slice(1)) per[b.split('\n')[0].trim()] = parse(b)
  return { all: parse(blocks[0]), per }
}

export interface Hit {
  t: number
  dir: string
  path: string
  status: number
}

export interface Site {
  url: string
  hits: Hit[]
  /** Which build answers from now on. */
  serve(dir: 'a' | 'b'): void
  /** Each file under /assets/ answers this many ms late (a slow line). */
  slow(ms: number): void
  /** Answers /version.json with this instead of the build's (null: the build's). Works through the service worker, which page.route does not on WebKit. */
  versionJson(json: unknown | null): void
  current(): 'a' | 'b'
  close(): Promise<void>
}

/** Serves .u0a/<current> like Cloudflare Pages does (headers from public/_headers). */
export async function startSite(port: number): Promise<Site> {
  let dir: 'a' | 'b' = 'a'
  let lag = 0
  let versionOverride: unknown | null = null
  const hits: Hit[] = []
  const { all, per } = siteRules()
  const server: Server = createServer(async (req, res) => {
    const path = decodeURIComponent((req.url ?? '/').split('?')[0])
    const base = join(ROOT, dir)
    let file = join(base, normalize(path))
    if (!file.startsWith(base)) file = join(base, 'index.html')
    let status = 200
    if (!existsSync(file) || statSync(file).isDirectory()) {
      // Pages answers a missing file with the app page (SPA) only for pages.
      if (path === '/' || !extname(path)) file = join(base, 'index.html')
      else status = 404
    }
    const headers: Record<string, string> = { ...all }
    if (path.startsWith('/assets/')) Object.assign(headers, per['/assets/*'])
    else if (per[path]) Object.assign(headers, per[path])
    else if (file.endsWith('index.html'))
      headers['Cache-Control'] = 'public, max-age=0, must-revalidate'
    hits.push({ t: Date.now(), dir, path, status })
    if (path === '/version.json' && versionOverride) {
      headers['Content-Type'] = 'application/json'
      res.writeHead(200, headers)
      return void res.end(JSON.stringify(versionOverride))
    }
    if (lag && path.startsWith('/assets/'))
      await new Promise((r) => setTimeout(r, lag))
    if (status === 404) {
      res.writeHead(404, headers)
      return void res.end('Not found')
    }
    headers['Content-Type'] = TYPES[extname(file)] ?? 'application/octet-stream'
    res.writeHead(200, headers)
    res.end(readFileSync(file))
  })
  await new Promise<void>((r) => server.listen(port, r))
  return {
    url: `http://localhost:${port}`,
    hits,
    serve: (d) => (dir = d),
    slow: (ms) => (lag = ms),
    versionJson: (j) => (versionOverride = j),
    current: () => dir,
    close: () => new Promise((r) => server.close(() => r())),
  }
}
