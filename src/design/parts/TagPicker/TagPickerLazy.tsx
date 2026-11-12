import { lazy, Suspense } from 'react'
import type { TagPickerProps } from './TagPicker'

const TagPickerInner = lazy(() => import('./TagPicker'))

/** The Tag picker, loaded the first time it opens (keeps the start-up small). */
export function TagPickerLazy(props: TagPickerProps) {
  return (
    <Suspense fallback={null}>
      <TagPickerInner {...props} />
    </Suspense>
  )
}
