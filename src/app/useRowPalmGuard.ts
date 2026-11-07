import { useEffect } from 'react'
import { touchUi } from './touchUi'

/** Touch devices only: sidebar buttons ignore a palm while the Pencil is down. */
export function useRowPalmGuard(): void {
  useEffect(() => {
    if (!touchUi()) return
    let off: (() => void) | undefined
    let gone = false
    void import('./rowPalmGuard').then((m) => {
      if (!gone) off = m.installRowPalmGuard()
    })
    return () => {
      gone = true
      off?.()
    }
  }, [])
}
