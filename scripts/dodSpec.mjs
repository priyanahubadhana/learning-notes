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
