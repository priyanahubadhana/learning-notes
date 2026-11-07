import { lazy, Suspense } from 'react'

// The whole pad (its controls, fonts and apply code) loads only when opened.
const WritePad = lazy(() => import('./WritePad'))

export function WritePadLazy() {
  return (
    <Suspense fallback={null}>
      <WritePad />
    </Suspense>
  )
}
