import { useEffect, useState } from 'react'
import { readPref, writePref } from './uiPrefs'

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
  return [value, setValue] as const
}
