// PreToolUse (Bash): scan added lines for secrets before `git commit` or `git push`.
import { execSync } from 'node:child_process'
import { input } from './lib.mjs'

const d = input()
const cmd = String(d.tool_input?.command || '')
const isCommit = /\bgit\b[^|;&]*\bcommit\b/.test(cmd)
const isPush = /\bgit\b[^|;&]*\bpush\b/.test(cmd)
if (!isCommit && !isPush) process.exit(0)

const cwd = d.cwd || process.cwd()
const sh = (c) => {
  try {
    return execSync(c, {
      cwd,
      encoding: 'utf8',
      maxBuffer: 64e6,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
  } catch {
    return ''
  }
}

let diff = ''
if (isCommit)
  diff += sh(
    /\s-a\b|--all\b|\s-am\b/.test(cmd)
      ? 'git diff HEAD -U0'
      : 'git diff --cached -U0',
  )
if (isPush) diff += sh('git diff @{u}..HEAD -U0')

const pats = [
  [/AKIA[0-9A-Z]{16}/, 'AWS key'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key'],
  [/\bgh[pousr]_[A-Za-z0-9]{36,}/, 'GitHub token'],
  [/\bsk-(ant-|proj-)?[A-Za-z0-9_-]{24,}/, 'API secret key'],
  [/\bAIza[0-9A-Za-z_-]{35}/, 'Google API key'],
  [/\bxox[abpr]-[A-Za-z0-9-]{10,}/, 'Slack token'],
  [
    /service_role[^\n]{0,40}eyJ[A-Za-z0-9_-]{20,}/i,
    'Supabase service_role key',
  ],
  [
    /\b(client_secret|api_secret|secret_key|password)\s*[:=]\s*['"][^'"\s]{12,}['"]/i,
    'hard-coded secret',
  ],
]

const hits = []
for (const line of diff.split('\n')) {
  if (!line.startsWith('+') || line.startsWith('+++')) continue
  for (const [re, name] of pats)
    if (re.test(line)) hits.push(`${name} in an added line`)
}
if (isCommit) {
  for (const f of sh('git diff --cached --name-only').split('\n')) {
    if (/(^|\/)\.env(\.|$)/.test(f) && !/\.example$/.test(f))
      hits.push(`.env file staged: ${f}`)
  }
}

if (hits.length) {
  console.error(
    'Blocked by the secret scan (never put secrets in code):\n' +
      [...new Set(hits)].slice(0, 10).join('\n') +
      '\nRemove the secret (keep it in an env var outside git) and try again.',
  )
  process.exit(2)
}
