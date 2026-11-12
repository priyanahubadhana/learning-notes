import { useSyncExternalStore } from 'react'
import { selection, type Selection } from './store'

/** Reads (a part of) the selection; re-renders only when that part changes (Object.is). */
export function useSelection<T = Selection>(
  selector: (s: Selection) => T = (s) => s as unknown as T,
): T {
  const get = () => selector(selection.getSnapshot())
  return useSyncExternalStore(selection.subscribe, get, get)
}
