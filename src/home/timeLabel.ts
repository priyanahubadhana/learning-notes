const pad = (n: number) => String(n).padStart(2, '0')

/** "09:30" from minutes after midnight. */
export const timeLabel = (min: number): string =>
  `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`

/** True when the local time is at or after "HH:MM". */
export function afterTime(now: number, hhmm: string): boolean {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(now)
  return d.getHours() * 60 + d.getMinutes() >= h * 60 + m
}
