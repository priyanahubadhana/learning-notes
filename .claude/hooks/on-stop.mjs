// Stop / SubagentStop:
// 1. Mirror to "gdrive notes" when a mirrored file changed since the last stop (debounced).
// 2. Lint + type-check, only when .ts/.tsx files changed. Blocks the stop once on errors in
//    the changed files, never twice in a row (stop_hook_active), so it cannot loop.
import { execSync, spawnSync } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import { input } from './lib.mjs'

const d = input()
const cwd = d.cwd || process.cwd()
const MAIN = 'C:\\Users\\pc\\Downloads\\learning-notes'
const DST = 'C:\\Users\\pc\\Downloads\\gdrive notes'
const flag = MAIN + '\\node_modules\\.cache\\mirror-pending'

if (existsSync(flag)) {
  rmSync(flag, { force: true })
  const q = ['/NJH', '/NJS', '/NDL', '/NP']
  const rc = (args) =>
    spawnSync('robocopy', [...args, ...q], { stdio: 'ignore', timeout: 15000 })
      .status ?? 16
  const codes = [
    rc([MAIN, DST, 'CLAUDE.md', 'README.md', 'package.json']),
    rc([
      MAIN + '\\docs',
      DST + '\\docs',
      '/MIR',
      '/XF',
      'ARCHIVE.md',
      '/XD',
      'prototypes',
    ]),
    rc([MAIN + '\\rules', DST + '\\rules', '/MIR']),
    rc([
      MAIN + '\\src',
      DST + '\\src',
      '/MIR',
      '/XD',
      'node_modules',
      'dist',
      'test-results',
    ]),
  ]
  if (codes.some((c) => c >= 8))
    console.error(
      `Mirror to gdrive notes FAILED (robocopy codes ${codes.join(',')}). Report it.`,
    )
}

if (d.stop_hook_active) process.exit(0)
const sh = (c) => {
  try {
    return execSync(c, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
  } catch {
    return ''
  }
}
const changed = [
  ...new Set(
    (
      sh('git diff --name-only HEAD') +
      '\n' +
      sh('git ls-files --others --exclude-standard')
    ).split('\n'),
  ),
].filter((f) => /\.(ts|tsx)$/.test(f) && existsSync(cwd + '/' + f))
if (
  !changed.length ||
  !existsSync(cwd + '/tsconfig.app.json') ||
  !existsSync(cwd + '/node_modules/.bin')
)
  process.exit(0)

const out = []
const lint = spawnSync(
  'npx',
  ['eslint', '--no-warn-ignored', ...changed.slice(0, 50)],
  {
    cwd,
    encoding: 'utf8',
    shell: true,
    timeout: 15000,
  },
)
if (lint.status) out.push('eslint:\n' + (lint.stdout || '').slice(-1500))
const tsc = spawnSync(
  'npx',
  [
    'tsc',
    '--noEmit',
    '-p',
    'tsconfig.app.json',
    '--incremental',
    '--tsBuildInfoFile',
    'node_modules/.cache/hook-tsc.tsbuildinfo',
  ],
  { cwd, encoding: 'utf8', shell: true, timeout: 25000 },
)
if (tsc.status) {
  const errs = (tsc.stdout || '')
    .split('\n')
    .filter((l) => changed.some((f) => l.replace(/\\/g, '/').startsWith(f)))
  if (errs.length)
    out.push('tsc (changed files):\n' + errs.slice(0, 20).join('\n'))
}
if (out.length) {
  console.error(
    'Quick check found problems in changed files; fix them before finishing:\n' +
      out.join('\n'),
  )
  process.exit(2)
}
