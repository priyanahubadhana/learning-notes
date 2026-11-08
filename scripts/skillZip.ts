import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, posix } from 'node:path'
import { zipSync } from 'fflate'

/** Name of the file the app serves (Settings › AI › Use with Claude). */
export const SKILL_ZIP_NAME = 'learning-notes-skill.zip'

function walk(dir: string, prefix: string, out: Record<string, Uint8Array>) {
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, posix.join(prefix, name), out)
    else out[posix.join(prefix, name)] = new Uint8Array(readFileSync(full))
  }
  return out
}

/**
 * The Claude Skill as a zip: one folder `learning-notes/` holding SKILL.md
 * (what Claude's Settings › Capabilities › Skills upload expects). Fixed
 * dates, so the same files always give the same bytes.
 */
export function buildSkillZip(
  root = 'claude-skill/learning-notes',
): Uint8Array {
  const files = walk(root, 'learning-notes', {})
  return zipSync(files, { level: 9, mtime: new Date('2026-11-09T00:00:00Z') })
}
