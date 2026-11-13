// Push guard: run by .githooks/pre-push. Blocks a push unless quick local
// checks pass on the files the push changes. It only RUNS existing commands;
// it never changes tests, retries or timeouts. CI stays the judge.
import { spawnSync, execFileSync } from 'node:child_process'
import { appendFileSync, existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const cwd = process.cwd()
const ZERO = /^0+$/
const MAX_SPECS = 6
const SMOKE = 'e2e/foundationInput.spec.ts'

const git = (...a) => {
  try {
    return execFileSync('git', a, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 64e6,
    }).trim()
  } catch {
    return ''
  }
}
const commonDir = resolve(cwd, git('rev-parse', '--git-common-dir') || '.git')
const log = (file, line) => {
  try {
    appendFileSync(resolve(commonDir, file), line + '\n')
  } catch {
    /* logging never blocks a push */
  }
}
const stamp = () => new Date().toISOString()
const q = (f) => `"${f}"`

let stdin = ''
try {
  stdin = readFileSync(0, 'utf8')
} catch {
  /* no stdin */
}
const lines = stdin
  .split(/\r?\n/)
  .map((l) => l.trim().split(/\s+/))
  .filter((p) => p.length === 4)
if (!lines.length) process.exit(0)

const t0 = Date.now()

function changedFiles(localSha, remoteSha) {
  let base = ''
  // Remote tip known locally: diff from it. New branch: from the merge-base.
  if (
    !ZERO.test(remoteSha) &&
    git('rev-parse', '--verify', '--quiet', remoteSha + '^{commit}')
  )
    base = remoteSha
  if (!base)
    base =
      git('merge-base', localSha, 'origin/build/next') ||
      git('merge-base', localSha, 'origin/main')
  const out = base
    ? git('diff', '--name-only', '--diff-filter=d', base, localSha)
    : git('show', '--name-only', '--diff-filter=d', '--format=', localSha)
  return out
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((f) => f && existsSync(resolve(cwd, f)))
}

function run(name, cmd) {
  const s = Date.now()
  process.stdout.write(`push guard: ${name} ... `)
  const r = spawnSync(cmd, {
    cwd,
    shell: true,
    encoding: 'utf8',
    maxBuffer: 256e6,
  })
  const secs = ((Date.now() - s) / 1000).toFixed(1)
  if (r.status === 0) {
    console.log(`ok (${secs}s)`)
    return
  }
  console.log(`FAILED (${secs}s)`)
  const out = `${r.stdout || ''}${r.stderr || ''}${r.error ? String(r.error) : ''}`
  const tail = out.trimEnd().split(/\r?\n/).slice(-40).join('\n')
  console.error(`\n==============================================`)
  console.error(`PUSH BLOCKED by the push guard: ${name}`)
  console.error(`==============================================`)
  console.error(tail)
  console.error(`\nRe-run it with:\n  ${cmd}\n`)
  console.error('Fix the cause and push again. Do not use --no-verify.')
  throw new Error(name)
}

// Windows limits a command line to ~8k characters: pass files in chunks.
function runEach(name, base, list) {
  for (let i = 0; i < list.length; i += 40)
    run(
      name,
      `${base} ${list
        .slice(i, i + 40)
        .map(q)
        .join(' ')}`,
    )
}
const TEXT = /.(ts|tsx|js|mjs|cjs|jsx|json|md|css|html|ya?ml)$/i

for (const [, localSha, remoteRef, remoteSha] of lines) {
  if (ZERO.test(localSha)) continue // branch delete
  const branch = remoteRef.replace(/^refs\/heads\//, '')
  const short = localSha.slice(0, 8)

  const msg = git('log', '-1', '--format=%B', localSha)
  const skip = msg.match(/^push-guard-skip:\s*(.+)$/m)
  if (skip && skip[1].trim().split(/\s+/).length >= 5) {
    const reason = skip[1].trim()
    console.error('\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!')
    console.error(`PUSH GUARD SKIPPED for ${branch} (${short})`)
    console.error(`Reason: ${reason}`)
    console.error('Checks did NOT run. This is logged; CI is the judge.')
    console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n')
    log('push-guard-skips.log', `${stamp()}\t${branch}\t${localSha}\t${reason}`)
    log('push-guard.log', `${stamp()}\tSKIP\t${branch}\t${localSha}\t${cwd}`)
    continue
  }

  if (!existsSync(resolve(cwd, 'node_modules'))) {
    console.error(`PUSH BLOCKED by the push guard: no node_modules in ${cwd}`)
    console.error('Run npm ci here, then push again. Do not use --no-verify.')
    log(
      'push-guard.log',
      `${stamp()}\tBLOCK\t${branch}\t${localSha}\tno node_modules\t${cwd}`,
    )
    process.exit(1)
  }

  const files = changedFiles(localSha, remoteSha)
  const full = branch === 'build/next' || branch.startsWith('slice/')
  console.log(
    `push guard: ${branch} (${short}), ${files.length} changed file(s), ${full ? 'code' : 'basic'} checks`,
  )
  try {
    runEach(
      'prettier',
      'npx prettier --check --ignore-unknown',
      files.filter((f) => TEXT.test(f)),
    )
    run('check:links', 'npm run check:links')
    if (full) {
      const lint = files.filter((f) => /\.(ts|tsx|js|mjs)$/.test(f))
      runEach('eslint', 'npx eslint --quiet', lint)
      run('tsc', 'npx tsc -b')
      run('check:ratchet', 'npm run check:ratchet')
      const src = files.filter((f) => /^src\/.*\.(ts|tsx|js|mjs)$/.test(f))
      runEach(
        'vitest related',
        'npx vitest related --run --passWithNoTests',
        src,
      )
      let specs = files.filter((f) => /^e2e\/.*\.spec\.ts$/.test(f))
      if (
        branch === 'build/next' &&
        existsSync(resolve(cwd, SMOKE)) &&
        !specs.includes(SMOKE)
      )
        specs.unshift(SMOKE)
      if (specs.length > MAX_SPECS) {
        console.log(
          `push guard: ${specs.length} e2e specs touched; running the first ${MAX_SPECS}, the other ${specs.length - MAX_SPECS} are left to CI:`,
        )
        console.log('  ' + specs.slice(MAX_SPECS).join('\n  '))
        specs = specs.slice(0, MAX_SPECS)
      }
      if (specs.length)
        run(
          'playwright (chromium)',
          `npx playwright test --project=chromium ${specs.map(q).join(' ')}`,
        )
    }
  } catch (e) {
    log(
      'push-guard.log',
      `${stamp()}\tBLOCK\t${branch}\t${localSha}\t${e.message}\t${cwd}`,
    )
    process.exit(1)
  }
  log('push-guard.log', `${stamp()}\tPASS\t${branch}\t${localSha}\t${cwd}`)
}
console.log(`push guard: done in ${((Date.now() - t0) / 1000).toFixed(1)}s`)
