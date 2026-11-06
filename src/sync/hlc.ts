/**
 * Hybrid logical clock (L7): device time plus a counter plus the device id,
 * written as one string that sorts correctly as plain text. A device with a
 * fast clock cannot jump far ahead: remote times more than `MAX_AHEAD_MS`
 * past this device's time are not followed (bug 11 in RESEARCH.md).
 */

export const MAX_AHEAD_MS = 24 * 60 * 60 * 1000

export interface Clock {
  ms: number
  n: number
  deviceId: string
}

export const formatHlc = (c: Clock) =>
  `${c.ms.toString().padStart(15, '0')}-${c.n.toString().padStart(6, '0')}-${c.deviceId}`

export function parseHlc(s: string): Clock | null {
  const m = /^(\d{15})-(\d{6})-(.+)$/.exec(s)
  return m ? { ms: Number(m[1]), n: Number(m[2]), deviceId: m[3] } : null
}

/** The next time stamp for a local change. */
export function tick(c: Clock, now: number): Clock {
  return now > c.ms
    ? { ms: now, n: 0, deviceId: c.deviceId }
    : { ms: c.ms, n: c.n + 1, deviceId: c.deviceId }
}

/** Moves the clock past a time seen from another device (clamped). */
export function receive(c: Clock, remote: string, now: number): Clock {
  const r = parseHlc(remote)
  if (!r || r.ms > now + MAX_AHEAD_MS) return c
  if (r.ms > c.ms || (r.ms === c.ms && r.n > c.n))
    return { ms: r.ms, n: r.n, deviceId: c.deviceId }
  return c
}

/** True if `remote` is too far in the future to trust. */
export const isSuspect = (remote: string, now: number) => {
  const r = parseHlc(remote)
  return !r || r.ms > now + MAX_AHEAD_MS
}
