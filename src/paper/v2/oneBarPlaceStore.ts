import { memStore, prefStore } from '../../app/tools/store'
import { cleanBarPlace, type BarPlace } from './oneBarDockModel'

/**
 * Where the one bar stands when it was moved, docked or pinned (box bar part B).
 * A pinned or docked place is a device setting (it stays for every box, every
 * page, after a reload and after the app is closed, until unpinned); a place
 * that was only moved is remembered for that box while the app is open. Never
 * page data.
 */
export const barPin = prefStore<BarPlace | null>(
  'toolbar.boxBarPin',
  (v): v is BarPlace | null => v === null || cleanBarPlace(v) !== null,
  null,
)

export type MovedPlace = BarPlace & { boxId: string }
export const barMoved = memStore<MovedPlace | null>(null)

/** The place that applies to a box: the pinned one, else the one it was moved to. */
export function placeFor(
  pin: BarPlace | null,
  moved: MovedPlace | null,
  boxId: string | undefined,
): BarPlace | null {
  if (pin) return pin
  return moved && boxId !== undefined && moved.boxId === boxId ? moved : null
}

/** A drop: a dock on a side pins (a docked bar stays); a free drop only moves. */
export function dropBar(
  boxId: string,
  p: Pick<BarPlace, 'side' | 'left' | 'top'>,
): void {
  if (p.side !== 'free' || barPin.get()) {
    barMoved.set(null)
    barPin.set({ ...p, pinned: true })
  } else barMoved.set({ ...p, pinned: false, boxId })
}

/** The pin button: pin the place the bar is in, or let it go back beside the box. */
export function togglePin(place: BarPlace): void {
  barMoved.set(null)
  barPin.set(place.pinned ? null : { ...place, pinned: true })
}

/**
 * True while the pinned or docked bar has no room (a panel took its place, or
 * the page is too narrow): it folds, and the bar beside the box stands in. The
 * pin itself is kept and the bar goes back when the room comes back (#60).
 */
export const barFolded = memStore<boolean>(false)
