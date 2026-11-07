import { useSyncExternalStore } from 'react'
import { readPref, writePref } from '../uiPrefs'

/**
 * Tiny stores for the tool bar: one saved on this device (a preference) and
 * one that lives only while the app is open. Both tell React when they change.
 */

export interface Store<T> {
  get: () => T
  set: (value: T) => void
  subscribe: (listener: () => void) => () => void
  /** Reads the value in a component and re-draws when it changes. */
  useValue: () => T
  /** Tests only: forget the cached value (a saved one is read again). */
  clearCache: () => void
}

function make<T>(read: () => T, save: (value: T) => void): Store<T> {
  let value: { v: T } | undefined
  const listeners = new Set<() => void>()
  const get = () => (value ??= { v: read() }).v
  const subscribe = (listener: () => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }
  return {
    get,
    set: (next) => {
      value = { v: next }
      save(next)
      for (const listener of listeners) listener()
    },
    subscribe,
    useValue: () => useSyncExternalStore(subscribe, get),
    clearCache: () => {
      value = undefined
    },
  }
}

/** A value saved on this device (checked when read, like all preferences). */
export const prefStore = <T>(
  key: string,
  isValid: (value: unknown) => value is T,
  fallback: T,
): Store<T> =>
  make(
    () => readPref(key, isValid, fallback),
    (v) => writePref(key, v),
  )

/**
 * A value saved on this device that is cleaned when read instead of thrown
 * away (R7-10): ids this build does not know are dropped from what is shown,
 * the rest of a person's choices stay. clean() returns undefined for a value
 * that is not the right shape at all (then the fallback is used).
 */
export const cleanStore = <T>(
  key: string,
  clean: (value: unknown) => T | undefined,
  fallback: T,
): Store<T> =>
  make(
    () => {
      const raw = readPref<unknown>(
        key,
        (v): v is unknown => v !== undefined,
        undefined,
      )
      return (raw === undefined ? undefined : clean(raw)) ?? fallback
    },
    (v) => writePref(key, v),
  )

/** A value kept only while the app is open. */
export const memStore = <T>(initial: T): Store<T> =>
  make(
    () => initial,
    () => {},
  )
