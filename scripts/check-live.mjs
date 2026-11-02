// Checks the live site after a publish, and daily (.github/workflows/).
// Usage: node scripts/check-live.mjs <commit>
// Fails if the live site is not exactly that commit, or lost its protection.
import { liveProblems } from './liveChecks.mjs'

const SITE = 'https://learning-notes-app.pages.dev'
const TRIES = 12
const WAIT_MS = 15_000

const commit = process.argv[2]
if (!commit) {
  console.error('Usage: node scripts/check-live.mjs <commit>')
  process.exit(2)
}

async function readSite() {
  const fresh = { cache: 'no-store' }
  const [version, home, worker, missing] = await Promise.all(
    ['/version.json', '/', '/sw.js', '/assets/does-not-exist.js'].map((path) =>
      fetch(`${SITE}${path}?check=${Date.now()}`, fresh),
    ),
  )
  return {
    version: {
      status: version.status,
      json: version.ok ? await version.json().catch(() => null) : null,
    },
    home: {
      status: home.status,
      csp: home.headers.get('content-security-policy'),
    },
    worker: {
      status: worker.status,
      cacheControl: worker.headers.get('cache-control'),
    },
    missing: { status: missing.status },
  }
}

// A new version can take a moment to reach every Cloudflare location.
let problems = []
for (let i = 1; i <= TRIES; i++) {
  try {
    problems = liveProblems(commit, await readSite())
  } catch (error) {
    problems = [`The site could not be read: ${error}`]
  }
  if (problems.length === 0) {
    console.log(`Live site OK: ${commit}`)
    process.exit(0)
  }
  console.log(`Try ${i} of ${TRIES}: ${problems.join(' ')}`)
  if (i < TRIES) await new Promise((resolve) => setTimeout(resolve, WAIT_MS))
}
console.error(`Live site check failed:\n- ${problems.join('\n- ')}`)
process.exit(1)
