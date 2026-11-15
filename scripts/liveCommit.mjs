import { execFileSync } from 'node:child_process'

// Docs-only pushes to main do not deploy (ci.yml `paths-ignore`), so the live
// site is allowed to be older than main's head by such commits. Keep this in
// step with that list.
export function isDocsOnly(file) {
  return file.startsWith('docs/') || file.endsWith('.md')
}

/**
 * The commit that should be live: the newest one that changed anything the
 * deploy builds.
 * @param {{ sha: string, files: string[] }[]} commits newest first
 * @returns {string | null}
 */
export function pickAppCommit(commits) {
  return commits.find((c) => c.files.some((f) => !isDocsOnly(f)))?.sha ?? null
}

/** Reads main's recent history from git (-m: merge commits show their changes). */
export function readCommits(ref = 'HEAD', count = 300) {
  const out = execFileSync(
    'git',
    [
      'log',
      '-m',
      '--first-parent',
      '--name-only',
      '--format=%x00%H',
      `-n${count}`,
      ref,
    ],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  )
  return out
    .split('\0')
    .slice(1)
    .map((block) => {
      const [sha, ...files] = block.split('\n').filter(Boolean)
      return { sha, files }
    })
}
