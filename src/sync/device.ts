import { createId } from '../core/ids'
import { formatHlc, parseHlc, receive, tick, type Clock } from './hlc'

/**
 * This device's sync identity and clock (L6). Kept in localStorage, not in
 * the notes database, so restoring a backup on another device never copies
 * the device id. `enabled` turns change tracking on (only once sync is set
 * up, so people who never sync pay nothing).
 */

const DEVICE = 'learning-notes:sync.deviceId'
const CLOCK = 'learning-notes:sync.clock'
const ENABLED = 'learning-notes:sync.enabled'

function read(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null
  } catch {
    return null
  }
}
function write(key: string, value: string | null) {
  try {
    if (value === null) globalThis.localStorage?.removeItem(key)
    else globalThis.localStorage?.setItem(key, value)
  } catch {
    // Storage blocked: values last for this page only.
  }
}

let deviceId = read(DEVICE)
let clock: Clock | null = null
let enabled = read(ENABLED) === '1'

export function getDeviceId(): string {
  if (!deviceId) {
    deviceId = createId().slice(0, 8)
    write(DEVICE, deviceId)
  }
  return deviceId
}

function current(): Clock {
  clock ??= parseHlc(read(CLOCK) ?? '') ?? {
    ms: 0,
    n: 0,
    deviceId: getDeviceId(),
  }
  return clock
}

/** A clock value for a change made now. */
export function nextHlc(now = Date.now()): string {
  clock = tick(current(), now)
  const s = formatHlc(clock)
  write(CLOCK, s)
  return s
}

/** Moves the clock past a value pulled from another device. */
export function seenHlc(remote: string, now = Date.now()): void {
  clock = receive(current(), remote, now)
  write(CLOCK, formatHlc(clock))
}

export const isTracking = () => enabled
export function setTracking(on: boolean): void {
  enabled = on
  write(ENABLED, on ? '1' : null)
}
