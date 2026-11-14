// Stop / SubagentStop:
// Mirror to "gdrive notes" when a mirrored file changed since the last stop (debounced).
// The lint + type check that also ran here was removed on 14 Nov 2026 (owner): the push
// guard runs the same checks before every push, so running them at every stop was a repeat.
import { spawnSync } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'

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
