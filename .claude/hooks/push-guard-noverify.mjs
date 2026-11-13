// PreToolUse (Bash): block ways around the push guard.
import { input } from './lib.mjs'

const cmd = String(input().tool_input?.command || '')
if (!/hookspath|no-verify/i.test(cmd)) process.exit(0)
// Setting it to the guard's own folder (the install step) is allowed.
const install =
  /^git config core\.hooksPath "C:\/Users\/pc\/Downloads\/learning-notes\/\.githooks"$/i
const bad =
  (/\bgit\b[^|;&]*\bpush\b/.test(cmd) && /--no-verify\b/.test(cmd)) ||
  /-c\s+core\.hooksPath=/i.test(cmd) ||
  (/\bgit\b[^|;&]*\bconfig\b[^|;&]*core\.hooksPath/i.test(cmd) &&
    !install.test(cmd.trim()) &&
    !/\bconfig\s+--get\s+core\.hooksPath\s*$/i.test(cmd.trim()))
if (!bad) process.exit(0)
process.stderr.write(
  'Blocked: this would bypass the push guard. Fix what it reports. If an exception is approved, put a line "push-guard-skip: <approved reason, at least 5 words>" in the tip commit message instead.\n',
)
process.exit(2)
