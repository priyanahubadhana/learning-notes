import { Suspense, type ComponentProps } from 'react'
import { lazyNow } from './lazyNow'

/**
 * The "Name it" sheet and the touch row menus load only when needed, so the
 * first screen stays small (CI size check).
 */
const Sheet = lazyNow(() =>
  import('./NameSheet').then((m) => ({ default: m.NameSheet })),
)
const NotebookMenu = lazyNow(() => import('../notebooks/NotebookRowMenu'))
const PageMenu = lazyNow(() => import('../pages/PageRowMenu'))

export function LazyNameSheet(props: ComponentProps<typeof Sheet>) {
  return (
    <Suspense fallback={null}>
      <Sheet {...props} />
    </Suspense>
  )
}

export function LazyNotebookMenu(props: ComponentProps<typeof NotebookMenu>) {
  return (
    <Suspense fallback={null}>
      <NotebookMenu {...props} />
    </Suspense>
  )
}

export function LazyPageMenu(props: ComponentProps<typeof PageMenu>) {
  return (
    <Suspense fallback={null}>
      <PageMenu {...props} />
    </Suspense>
  )
}

/** Fetches the sheet's and the row menus' code ahead of the first tap (R13). */
export const nameParts = [Sheet.preload, NotebookMenu.preload, PageMenu.preload]
