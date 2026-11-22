// PreToolUse for the auditor tools: block every change to the project (AGENTS.md).
// Edits of any file are blocked unless the file is in the reports folder outside the repo.
// Shell is blocked when it writes git state, installs packages (except `npm ci`),
// or deletes or writes files inside the project.
import { input } from './lib.mjs'

const d = input()
const t = d.tool_input || {}
const REPORTS = /learning-notes-qa/
const fail = (msg) => {
  console.error(
    `Blocked by the auditor guard: ${msg} This tool is read-only on this project (AGENTS.md). ` +
      'Describe the change in your report instead; the owner decides.',
  )
  process.exit(2)
}

if (
  /^(Edit|Write|MultiEdit|NotebookEdit|apply_patch)$/i.test(d.tool_name || '')
) {
  const p = String(t.file_path || t.path || '').replace(/\\/g, '/')
  if (!REPORTS.test(p)) fail('file edits are not allowed.')
  process.exit(0)
}

if (/^(Bash|shell)$/i.test(d.tool_name || '')) {
  const c = String(
    t.command || (Array.isArray(t.cmd) ? t.cmd.join(' ') : '') || '',
  )
  if (
    /\bgit\s+(commit|push|merge|tag|rebase|reset|checkout\s+-b|switch\s+-c|stash|cherry-pick|am|apply|rm|mv|add)\b/i.test(
      c,
    )
  )
    fail('this command changes git state.')
  if (/\bnpm\s+(install|i|add|update|uninstall|remove|link)\b/i.test(c))
    fail(
      'this command installs or changes packages (only `npm ci` is allowed).',
    )
  if (
    /(^|[\s;&|(])(rm|unlink|del|erase|rmdir|mv|move|Remove-Item|ri|Move-Item|Set-Content|Out-File|tee)\b/i.test(
      c,
    ) &&
    !REPORTS.test(c)
  )
    fail('this command writes or deletes files inside the project.')
  if (
    /(^|[^>])>{1,2}\s*[^&\s]/.test(c) &&
    !/\/dev\/null|\bNUL\b/.test(c) &&
    !REPORTS.test(c)
  )
    fail('this command redirects output into a file inside the project.')
  process.exit(0)
}
process.exit(0)
