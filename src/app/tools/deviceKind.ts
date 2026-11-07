import { isDeviceMode, isIpadAsMac, type DeviceMode } from '../deviceMode'
import { prefStore } from './store'

/**
 * The device picker: "Phone", "iPad / tablet" or "Computer / laptop". It
 * only chooses one of the existing device modes (Computer, Touch, Pencil).
 */

export const DEVICE_KINDS = ['phone', 'tablet', 'computer'] as const
export type DeviceKind = (typeof DEVICE_KINDS)[number]
const isDeviceKind = (v: unknown): v is DeviceKind =>
  (DEVICE_KINDS as readonly unknown[]).includes(v)

const isFlag = (v: unknown): v is boolean => typeof v === 'boolean'

/** True once the picker was answered or dismissed on this device. */
export const devicePickerDone = prefStore<boolean>(
  'devicePicker.done',
  isFlag,
  false,
)

/** The kind last chosen in the picker (null = never chosen). */
export const chosenKind = prefStore<DeviceKind | null>(
  'devicePicker.kind',
  (v): v is DeviceKind | null => v === null || isDeviceKind(v),
  null,
)

/** The mode a choice sets. A phone is Touch; a tablet may use the Pencil. */
export function modeForKind(kind: DeviceKind, pencil: boolean): DeviceMode {
  if (kind === 'computer') return 'computer'
  return kind === 'tablet' && pencil ? 'pencil' : 'touch'
}

export interface DetectionFacts {
  mode: DeviceMode
  ipadAsMac: boolean
  coarsePointer: boolean
  /** The shorter side of the screen in CSS px. */
  shortSide: number
}

/** What the picker starts on: from detection, and from the mode in use. */
export function suggestKind(facts: DetectionFacts): {
  kind: DeviceKind
  pencil: boolean
} {
  if (facts.mode === 'pencil') return { kind: 'tablet', pencil: true }
  const touchScreen = facts.ipadAsMac || facts.coarsePointer
  if (touchScreen) {
    return { kind: facts.shortSide < 600 ? 'phone' : 'tablet', pencil: false }
  }
  // A touch mode on a device that does not look like one: a tablet.
  return { kind: facts.mode === 'touch' ? 'tablet' : 'computer', pencil: false }
}

/** Reads the facts from this browser. */
export function browserFacts(mode: unknown): DetectionFacts {
  return {
    mode: isDeviceMode(mode) ? mode : 'computer',
    ipadAsMac: isIpadAsMac(),
    coarsePointer:
      typeof window !== 'undefined' &&
      !!window.matchMedia?.('(pointer: coarse)').matches,
    shortSide:
      typeof window === 'undefined'
        ? 1024
        : Math.min(
            window.screen?.width || 1024,
            window.screen?.height || 1024,
            window.innerWidth,
            window.innerHeight,
          ),
  }
}
