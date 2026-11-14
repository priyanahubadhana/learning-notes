// CI failure sorter (read-only, no AI): node scripts/ci-sort.mjs [--branch b] [--run id]
import { execFileSync } from 'node:child_process'
import { buildReport, parseFailedLog, testKey } from './ci-sort-lib.mjs'

const args = process.argv.slice(2)
const opt = (n) => {
  const i = args.indexOf(n)
  return i >= 0 ? args[i + 1] : undefined
}
const gh = (...a) =>
  execFileSync('gh', a, {
    encoding: 'utf8',
    maxBuffer: 256e6,
    stdio: ['ignore', 'pipe', 'ignore'],
  })
const tryGh = (...a) => {
  try {
    return gh(...a)
  } catch {
    return ''
  }
}
const json = (...a) => {
  const t = tryGh(...a)
  return t ? JSON.parse(t) : null
}

const branch = opt('--branch') || 'build/next'
let runId = opt('--run')
const FIELDS = 'databaseId,conclusion,headSha,headBranch'
if (!runId) {
  const l = json(
    'run',
    'list',
    '--branch',
    branch,
    '--status',
    'failure',
    '--limit',
    '1',
    '--json',
    FIELDS,
  )
  if (!l?.length) {
    console.log(`No failed run found on ${branch}.`)
    process.exit(0)
  }
  runId = String(l[0].databaseId)
}
const run = json('run', 'view', runId, '--json', FIELDS)
if (!run) {
  console.error(`Cannot read run ${runId} (is gh signed in?).`)
  process.exit(1)
}
const runBranch = run.headBranch || branch
const parsed = parseFailedLog(tryGh('run', 'view', runId, '--log-failed'))

// The last 5 finished runs before this one.
const finished =
  json(
    'run',
    'list',
    '--branch',
    runBranch,
    '--status',
    'completed',
    '--limit',
    '40',
    '--json',
    FIELDS,
  ) || []
const before = finished.filter((r) => r.databaseId < run.databaseId)
const history = before.slice(0, 5).map((r) => {
  if (r.conclusion !== 'failure') return new Set()
  const p = parseFailedLog(
    tryGh('run', 'view', String(r.databaseId), '--log-failed'),
  )
  return new Set(p.failed.map(testKey))
})

// Files changed since the last green run on the branch.
let changedFiles = []
const green = before.find((r) => r.conclusion === 'success')
if (green) {
  const repo = JSON.parse(
    tryGh('repo', 'view', '--json', 'nameWithOwner') || '{}',
  )
  if (repo.nameWithOwner) {
    const out = tryGh(
      'api',
      `repos/${repo.nameWithOwner}/compare/${green.headSha}...${run.headSha}`,
      '--jq',
      '.files[].filename',
    )
    changedFiles = out.split(/\r?\n/).filter(Boolean)
  }
}
console.log(buildReport({ parsed, history, changedFiles }).join('\n'))
