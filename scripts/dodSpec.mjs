// Counts the behaviour lines of a spec: "- When ..." bullets (also
// "- PM-01 When ..."), plus table rows that start with a spec ID such as
// | SP-40 |, | RV-B01 |, | SET-B12 |.
export function behaviourLineCount(text) {
  const bullets = (
    text.match(/^\s*[-*]\s+(?:[A-Z]{1,6}-[A-Z]?\d+\s+)?When\b/gm) ?? []
  ).length
  const rows = (text.match(/^\s*\|\s*[A-Z]{1,6}-[A-Z]?\d+[a-z]?\s*\|/gm) ?? [])
    .length
  return bullets + rows
}

/**
 * Does the flags source switch anything on by default? The one allowed form:
 * a list named PREVIEW_DEFAULT_ON that is used only as
 * `isPreviewHost() ? new Set(PREVIEW_DEFAULT_ON)` (the test host, never live).
 */
export function defaultsOn(source) {
  const gated =
    /(?<!!\s*)isPreviewHost\(\)\s*\?\s*new Set\(\s*PREVIEW_DEFAULT_ON\s*\)/g
  const declared = /export const PREVIEW_DEFAULT_ON[^=]*=\s*\[[^\]]*\]/
  let rest = source
  if (declared.test(rest) && gated.test(rest)) {
    rest = rest.replace(gated, '').replace(declared, '')
    // Any other use of the list is a default without the host check.
    rest = rest.replace(/PREVIEW_DEFAULT_ON/g, 'PREVIEW_DEFAULT_ON')
  }
  return /defaultOn|DEFAULT_ON|defaultValue:\s*true/.test(rest)
}
