const pad = (n: number) => String(n).padStart(2, '0')

/** "09:30" from minutes after midnight. */
export const timeLabel = (min: number): string =>
  `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`
