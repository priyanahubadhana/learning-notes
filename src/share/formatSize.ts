/** "148 MB", "6.2 MB", "310 KB": a file size for people. */
export function formatSize(bytes: number): string {
  const mb = bytes / 1_000_000
  const unit = mb >= 1 ? 'megabyte' : 'kilobyte'
  return new Intl.NumberFormat(undefined, {
    style: 'unit',
    unit,
    unitDisplay: 'short',
    maximumFractionDigits: mb >= 100 ? 0 : 1,
  }).format(mb >= 1 ? mb : Math.max(1, Math.round(bytes / 1000)))
}
