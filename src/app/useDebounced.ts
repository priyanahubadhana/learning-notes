import { useEffect, useState } from 'react'

/** `value`, updated only after it stops changing for `ms`. */
export function useDebounced<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value)
  const key = JSON.stringify(value)
  useEffect(() => {
    const id = setTimeout(() => setSettled(JSON.parse(key) as T), ms)
    return () => clearTimeout(id)
  }, [key, ms])
  return settled
}
