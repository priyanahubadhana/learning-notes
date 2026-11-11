import { useCallback, useEffect, useState } from 'react'
import { accountAuth } from './syncService'

/**
 * Does this account have a Google sign-in? Drive backup (pictures, books,
 * recordings) is stored in the person's own Google Drive, so an account that
 * signs in only by email has to connect Google for it.
 * `null` = not known yet (loading, offline, or no way to ask): the screens
 * then show what they always showed, never a claim.
 */
export function useGoogleLinked(): {
  linked: boolean | null
  refresh: () => void
} {
  const [linked, setLinked] = useState<boolean | null>(null)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let live = true
    void (async () => {
      try {
        const m = await accountAuth().methods?.()
        if (live) setLinked(m ? !!m.google : null)
      } catch {
        if (live) setLinked(null)
      }
    })()
    return () => {
      live = false
    }
  }, [tick])
  const refresh = useCallback(() => setTick((n) => n + 1), [])
  return { linked, refresh }
}
