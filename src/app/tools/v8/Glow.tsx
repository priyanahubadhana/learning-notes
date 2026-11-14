import type { ReactNode } from 'react'
import { useChangeCount } from './changeCount'

/** Wraps one control: it glows once whenever `k` (its value) changes. */
export function Glow({
  k,
  children,
  className,
}: {
  k: string | number
  children: ReactNode
  className?: string
}) {
  const n = useChangeCount(k)
  return (
    <div className={`v8gl ${className ?? ''}`} data-glow={n || undefined}>
      {n ? <span key={n} className="pcard-glow" aria-hidden /> : null}
      {children}
    </div>
  )
}
