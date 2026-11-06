/**
 * Lock the screen direction while reading (C5). The browser may allow it
 * (some Android browsers, in full screen) or refuse it (iPad, always while
 * the app shares the screen). Never throws: the answer says what happened so
 * the reader can explain the iPad's Control Centre rotation lock.
 */

export type OrientChoice = 'off' | 'portrait' | 'landscape'
export const ORIENT_CHOICES = ['off', 'portrait', 'landscape'] as const
export const isOrient = (v: unknown): v is OrientChoice =>
  (ORIENT_CHOICES as readonly unknown[]).includes(v)

export type LockResult = 'locked' | 'unlocked' | 'unsupported' | 'refused'

interface LockableScreen {
  orientation?: {
    lock?: (o: string) => Promise<void>
    unlock?: () => void
  }
}

export async function applyOrientation(
  choice: OrientChoice,
  scr: LockableScreen = screen as unknown as LockableScreen,
): Promise<LockResult> {
  const o = scr.orientation
  if (choice === 'off') {
    try {
      o?.unlock?.()
    } catch {
      // Nothing was locked.
    }
    return 'unlocked'
  }
  if (!o || typeof o.lock !== 'function') return 'unsupported'
  try {
    await o.lock(choice)
    return 'locked'
  } catch {
    return 'refused'
  }
}
