import { memStore, prefStore } from '../app/tools/store'
import { showHelp } from '../settings/builtinSettings'
import { readDeviceSetting } from '../settings/settingsService'

/**
 * First-use tips (polish 2, item 3): the first time a tool is used, a small
 * dismissible line says what to do ("Loop ink to select"). On a touch screen
 * hover tips do not exist, so this is how a new user learns. Each tip shows
 * once per device (the seen list is saved on the device); Settings › Show
 * help off hides them all. Texts are `firstUse.<id>` in enO.ts.
 */

export const FIRST_USE_IDS = [
  'lasso',
  'writePad',
  'layers',
  'paperBox',
] as const
export type FirstUseId = (typeof FIRST_USE_IDS)[number]

const isSeenList = (v: unknown): v is FirstUseId[] =>
  Array.isArray(v) &&
  v.length <= FIRST_USE_IDS.length &&
  v.every((x) => (FIRST_USE_IDS as readonly unknown[]).includes(x))

/** The tips already shown on this device. */
export const seenTips = prefStore<FirstUseId[]>('firstUse.seen', isSeenList, [])

/** The tip showing now (null = none). */
export const firstUseTip = memStore<FirstUseId | null>(null)

/** Shows the tip once; a later call for the same id does nothing. */
export function triggerFirstUse(id: FirstUseId): void {
  if (readDeviceSetting(showHelp) !== 'on') return
  const seen = seenTips.get()
  if (seen.includes(id)) return
  seenTips.set([...seen, id])
  firstUseTip.set(id)
}

export const dismissFirstUse = (): void => firstUseTip.set(null)
