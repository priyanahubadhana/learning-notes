import { execFileSync } from 'node:child_process'

// What ships to the live site: the app source, its static files, the page,
// the build settings and the locked dependencies. Docs, tests, scripts,
// workflows and the package.json scripts do not change the shipped app.
export function isShipped(file) {
  return (
    file.startsWith('src/') ||
    file.startsWith('public/') ||
    file === 'index.html' ||
    file === 'package-lock.json' ||
    /^vite.config.[^/]+$/.test(file)
  )
}

/**
 * The commit that should be live: the newest one that changed what ships.
 * @param {{ sha: string, files: string[] }[]} commits newest first
 * @returns {string | null}
 */
export function pickAppCommit(commits) {
  return commits.find((c) => c.files.some(isShipped))?.sha ?? null
}

/** Reads main's recent history from git (-m: merge commits show their changes). */
export function readCommits(ref = 'HEAD', count = 3000) {
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
