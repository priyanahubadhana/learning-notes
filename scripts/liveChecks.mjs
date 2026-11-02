/**
 * What must be true of the live site. Separate from check-live.mjs so the
 * rules can be tested without the network.
 *
 * @param {string} commit the commit that should be live
 * @param {{
 *   version: { status: number, json: { commit?: string } | null },
 *   home: { status: number, csp: string | null },
 *   worker: { status: number, cacheControl: string | null },
 *   missing: { status: number },
 * }} site what the site answered
 * @returns {string[]} what is wrong (empty = all good)
 */
export function liveProblems(commit, site) {
  const problems = []
  if (site.version.json?.commit !== commit) {
    problems.push(
      `version.json says ${site.version.json?.commit ?? 'nothing'}, expected ${commit}. ` +
        'Something other than GitHub may have published the site.',
    )
  }
  if (site.home.status !== 200) problems.push('The home page is not answering.')
  if (!site.home.csp?.includes("default-src 'self'")) {
    problems.push('The security policy (CSP) is missing.')
  }
  if (!site.worker.cacheControl?.includes('no-cache')) {
    problems.push('sw.js is not set to no-cache, so updates could get stuck.')
  }
  if (site.missing.status !== 404) {
    problems.push(
      `A missing file answers ${site.missing.status}, not 404. Check public/404.html.`,
    )
  }
  return problems
}
