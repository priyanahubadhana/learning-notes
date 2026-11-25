// Used by .github/workflows/ci.yml (job `proven`) on main.
//
// Looks for a finished CI run whose FULL test set was green on the same app
// code as this commit. If there is one, the full set is not run a second time
// before the deploy: the same code is tested in full once, not twice.
//
// "The same app code" means: no file differs outside docs/, rules/,
// .claude/, .github/ and the *.md files at the top of the repo. None of
// these is built into the published app. (Markdown elsewhere can be: the
// claude-skill folder is zipped into the site, so it counts as code. One
// browser test reads a docs file, e2e/selectionBarButtons.spec.ts; the unit
// tests that read docs files run in `checks` in every run.)
//
// Only runs of main and build/next can count: both change only through
// reviewed merges, so their own copy of ci.yml (which is not compared, as it
// lies in .github/) cannot be a weakened one from a side branch.
//
// Safe side: any doubt (an error, a missing commit, a job that did not pass,
// too few test jobs) gives "no such run", and the full set runs as before.
//
// Prints `run=<id>` to $GITHUB_OUTPUT (empty when none) and a line to the log.
import { execFileSync } from 'node:child_process'
import { appendFileSync } from 'node:fs'

const repo = process.env.GITHUB_REPOSITORY
const token = process.env.GH_TOKEN
const ownRun = String(process.env.GITHUB_RUN_ID ?? '')
// How many test jobs a full run has (the matrix sizes in ci.yml).
const need = {
  'e2e (': Number(process.env.E2E_SHARDS),
  'pencil-webkit (': Number(process.env.IPAD_SHARDS),
}
const LOOK_BACK = 60
const TRUSTED_BRANCHES = ['main', 'build/next']
const NOT_CODE = [
  ':(exclude)docs',
  ':(exclude)rules',
  ':(exclude).claude',
  ':(exclude).github',
  ':(exclude,glob)*.md',
]

const out = (run, why) => {
  console.log(run ? `Proven: run ${run} (${why})` : `No proven run: ${why}`)
  if (process.env.GITHUB_OUTPUT)
    appendFileSync(process.env.GITHUB_OUTPUT, `run=${run}\n`)
  if (process.env.GITHUB_STEP_SUMMARY)
    appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      run
        ? `The full test set already passed on this app code in run [${run}](https://github.com/${repo}/actions/runs/${run}) (${why}). It is not run a second time.\n`
        : `No earlier green full run on this app code (${why}). The full test set runs now.\n`,
    )
}

const api = async (path) => {
  const res = await fetch(`https://api.github.com/repos/${repo}/${path}`, {
    headers: {
      authorization: `Bearer ${token}`,
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
    },
  })
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`)
  return res.json()
}

const git = (...args) =>
  execFileSync('git', args, { encoding: 'utf8', stdio: 'pipe' })

/** True when the commit has the same app code as HEAD. */
function sameCode(sha) {
  try {
    git('fetch', '--no-tags', '--depth=1', '--quiet', 'origin', sha)
    git('diff', '--quiet', sha, 'HEAD', '--', '.', ...NOT_CODE)
    return true
  } catch {
    // A difference (exit 1) or a commit that is gone: not the same code.
    return false
  }
}

/** True when every test job of the full set ran and passed in that run. */
async function fullSetGreen(runId) {
  const jobs = []
  for (let page = 1; page <= 3; page++) {
    const got = await api(
      `actions/runs/${runId}/jobs?filter=latest&per_page=100&page=${page}`,
    )
    jobs.push(...got.jobs)
    if (got.jobs.length < 100) break
  }
  for (const [prefix, count] of Object.entries(need)) {
    const mine = jobs.filter((j) => j.name.startsWith(prefix))
    if (mine.length < count) return false
    if (mine.some((j) => j.conclusion !== 'success')) return false
  }
  return true
}

async function main() {
  if (!repo || !token) return out('', 'no repository or token')
  if (!(need['e2e ('] > 0) || !(need['pencil-webkit ('] > 0))
    return out('', 'the shard counts are not set')
  const { workflow_runs: runs } = await api(
    `actions/workflows/ci.yml/runs?status=success&per_page=${LOOK_BACK}`,
  )
  // A nightly run tests another branch than its own commit, and a pull
  // request run tests a merge and only the fast set: neither can count.
  const able = runs.filter(
    (r) =>
      String(r.id) !== ownRun &&
      (r.event === 'push' || r.event === 'workflow_dispatch') &&
      TRUSTED_BRANCHES.includes(r.head_branch),
  )
  const seen = new Map()
  for (const r of able) {
    if (!seen.has(r.head_sha)) seen.set(r.head_sha, sameCode(r.head_sha))
    if (!seen.get(r.head_sha)) continue
    if (await fullSetGreen(r.id))
      return out(String(r.id), `commit ${r.head_sha.slice(0, 8)}`)
  }
  out('', `looked at ${able.length} green runs`)
}

main().catch((e) => out('', `the check itself failed: ${e.message}`))
