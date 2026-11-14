// Pure decision for the push guard: which checks run for which branch and
// which changed files. No side effects, so it is unit-tested.
const CODE = /\.(ts|tsx|js|mjs|cjs|json)$/i
const LINT = /\.(ts|tsx|js|mjs)$/i
const SPEC = /^e2e\/.*\.spec\.ts$/

export const isFullBranch = (branch) =>
  branch === 'build/next' || branch.startsWith('slice/')

/** A file counts as docs when it is under docs/ or is a markdown file. */
export const isDocs = (f) => f.startsWith('docs/') || /\.md$/i.test(f)

export function planChecks(branch, files) {
  const full = isFullBranch(branch)
  const code = files.filter((f) => !isDocs(f) && CODE.test(f))
  const eslint = code.filter((f) => LINT.test(f))
  return {
    full,
    eslint: full ? files.filter((f) => LINT.test(f)) : eslint,
    tsc:
      full ||
      code.some((f) =>
        /\.(ts|tsx)$|(^|\/)(tsconfig[^/]*|package)\.json$/i.test(f),
      ),
    ratchet: full,
    vitestRelated: code,
    specs: full ? files.filter((f) => SPEC.test(f)) : [],
  }
}
