// Make one exact version for the three read-only auditors (docs/qa/README.md).
//   node scripts/qa-checkpoint.mjs <label> [--no-push]
// Tags main as qa/<yyyy-mm-dd>-<label>, pushes the tag, puts three DETACHED worktrees
// (ln-qa-codex, ln-qa-cursor, ln-qa-antigravity) on that tag, creates the reports
// folder outside the repo with one empty report per engine, and writes the
// checkpoint line into docs/STATE.md. Run from the main copy only.
import { execFileSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
} from 'node:fs'
import { join, resolve, dirname } from 'node:path'

const label = (process.argv[2] || '').trim()
if (!/^[a-z0-9][a-z0-9-]{0,40}$/i.test(label)) {
  console.error(
    'usage: node scripts/qa-checkpoint.mjs <label> [--no-push]   (label: letters, digits, dashes)',
  )
  process.exit(1)
}
const noPush = process.argv.includes('--no-push')
const root = resolve(
  dirname(new URL(import.meta.url).pathname.replace(/^\/([a-z]:)/i, '$1')),
  '..',
)
const git = (...a) =>
  execFileSync('git', a, { cwd: root, encoding: 'utf8' }).trim()

const branch = git('rev-parse', '--abbrev-ref', 'HEAD')
if (branch !== 'main') {
  console.error(`run this from the main copy on main (now on ${branch})`)
  process.exit(1)
}
if (git('status', '--porcelain', '--', 'src', 'e2e', 'docs/features').length) {
  console.error(
    'uncommitted changes in src/, e2e/ or docs/features/: commit first so the tag is exact',
  )
  process.exit(1)
}

const date = new Date().toISOString().slice(0, 10)
const tag = `qa/${date}-${label}`
const head = git('rev-parse', '--short', 'HEAD')
if (git('tag', '-l', tag)) {
  console.error(`tag ${tag} exists; pick another label`)
  process.exit(1)
}
git('tag', '-a', tag, '-m', `QA checkpoint ${label} (${head})`)
if (!noPush) git('push', 'origin', tag)

const downloads = resolve(root, '..')
const engines = ['codex', 'cursor', 'antigravity']
for (const e of engines) {
  const wt = join(downloads, `ln-qa-${e}`)
  if (existsSync(wt)) {
    execFileSync('git', ['checkout', '--detach', '-q', tag], {
      cwd: wt,
      stdio: 'inherit',
    })
  } else {
    git('worktree', 'add', '--detach', wt, tag)
  }
}

const reports = join(downloads, 'learning-notes-qa', tag.replace('/', '-'))
mkdirSync(reports, { recursive: true })
const tpl = readFileSync(join(root, 'docs/qa/REPORT-TEMPLATE.md'), 'utf8')
for (const e of engines) {
  const f = join(reports, `${e}.md`)
  if (!existsSync(f))
    writeFileSync(
      f,
      tpl.replace('<engine>', e).replace('<checkpoint tag>', tag),
    )
}
copyFileSync(
  join(root, 'docs/qa/CONSOLIDATION-TEMPLATE.md'),
  join(reports, 'MERGED-SHEET.md'),
)

const state = join(root, 'docs/STATE.md')
let s = readFileSync(state, 'utf8')
const line = `- **${tag}** (${head}, ${date}): worktrees ln-qa-codex, ln-qa-cursor, ln-qa-antigravity; reports in learning-notes-qa/${tag.replace('/', '-')}/; merged sheet: pending`
if (!s.includes('## QA checkpoints'))
  s = s.replace(/\n## Now\n/, `\n## QA checkpoints\n\n${line}\n\n## Now\n`)
else s = s.replace('## QA checkpoints\n', `## QA checkpoints\n\n${line}`)
writeFileSync(state, s)

console.log(`checkpoint ${tag} at ${head}`)
for (const e of engines) console.log(`  ${e}: ${join(downloads, `ln-qa-${e}`)}`)
console.log(`  reports: ${reports}`)
console.log(noPush ? '  tag not pushed (--no-push)' : '  tag pushed')
console.log('next: commit docs/STATE.md; fill docs/qa/BRIEFS.md for the owner')
