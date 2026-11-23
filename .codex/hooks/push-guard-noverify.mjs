// PreToolUse (Bash): block ways around the push guard, and commands that delete or replace it.
// Read-only mentions pass: grep/cat of files, `git config --get`, `git config <key>` with no value.
import { input } from './lib.mjs'

const cmd = String(input().tool_input?.command || '')

// Setting the hooks path to the guard's own folder (the install step) is allowed.
const install =
  /^git config core\.hooksPath "C:\/Users\/pc\/Downloads\/learning-notes\/\.githooks"$/i
if (install.test(cmd.trim())) process.exit(0)

const GUARD = /\.githooks|push-guard\.mjs/i
// A command that writes to the guard: deletes, moves, copies, truncates, edits in place, or redirects into it.
const WRITE_CMD =
  /^(sudo\s+)?(rm|rmdir|unlink|del|erase|rd|ren|rename|mv|move|cp|copy|truncate|tee|remove-item|set-content|out-file|move-item|copy-item|git\s+(rm|mv))\b|^(sudo\s+)?(sed|perl)\b.*\s-i/i
const REDIRECT = />>?\s*[^\s]*(\.githooks|push-guard\.mjs)/i

// Split on ; & | and newlines so each command is judged on its own.
const blocked = cmd.split(/[;&|\n]+/).some((seg) => {
  const s = seg.trim()
  if (!s) return false

  if (GUARD.test(s) && (WRITE_CMD.test(s) || REDIRECT.test(s))) return true

  if (!/\bgit\b/.test(s)) return false

  // Pushing or committing with hooks skipped.
  if (/\b(push|commit)\b/.test(s)) {
    if (/--no-verify\b/.test(s)) return true
    if (/\bcommit\b/.test(s) && /\s-n(\s|$)/.test(s)) return true
  }

  // Forcing a hooks path on one command.
  if (/-c\s+core\.hooksPath=/i.test(s)) return true

  // Setting or removing the hooks path. Reads pass: --get, --list, or no value.
  const m = s.match(/\bconfig\b(.*)$/i)
  if (m && /core\.hooksPath/i.test(m[1])) {
    const rest = m[1]
    if (/--unset/i.test(rest)) return true
    if (/(^|\s)(--get|--get-all|--get-regexp|--list|-l)(\s|$)/.test(rest))
      return false
    const after = rest.replace(/^.*?core\.hooksPath/i, '')
    return after.trim() !== ''
  }
  return false
})

if (!blocked) process.exit(0)
process.stderr.write(
  'Blocked: this would bypass the push guard. Fix what it reports. If an exception is approved, put a line "push-guard-skip: <approved reason, at least 5 words>" in the tip commit message instead.\n',
)
process.exit(2)
