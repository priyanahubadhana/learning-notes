import { useEffect, useState } from 'react'
import { onPrefChangedExternally, readPref, writePref } from './uiPrefs'

/** Like useState, but remembered on this device (see uiPrefs.ts). */
export function usePref<T>(
  key: string,
  isValid: (value: unknown) => value is T,
  fallback: T,
  /** Used instead of the remembered value at the start, when given. */
  initial?: () => T | undefined,
) {
  const [value, setValue] = useState(
    () => initial?.() ?? readPref(key, isValid, fallback),
  )
  useEffect(() => writePref(key, value), [key, value])
  // A value that sync brought from another device (settings that follow you).
  useEffect(
    () =>
      onPrefChangedExternally((k, v) => {
        if (k === key && isValid(v)) setValue(v)
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  )
  return [value, setValue] as const
}
