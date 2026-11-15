import { t } from '../i18n/t'

/** "2.1 of 3.4 MB" (KB under 1 MB) for the download line. */
export function sizeText(loaded: number, total: number): string {
  const mb = total >= 1_000_000
  const div = mb ? 1_000_000 : 1000
  const fmt = (n: number) => (n / div).toFixed(mb ? 1 : 0)
  return t(mb ? 'update.v2.sizeMb' : 'update.v2.sizeKb', {
    a: fmt(loaded),
    b: fmt(total),
  })
}

/** "about 10 seconds left", "about 2 minutes left" from a step in seconds. */
export function timeLeftText(sec: number): string {
  if (sec < 60) return t('update.v2.leftSeconds', { n: sec })
  if (sec < 3600) {
    const n = Math.round(sec / 60)
    return n === 1
      ? t('update.v2.leftMinute')
      : t('update.v2.leftMinutes', { n })
  }
  const n = Math.round(sec / 3600)
  return n === 1 ? t('update.v2.leftHour') : t('update.v2.leftHours', { n })
}
