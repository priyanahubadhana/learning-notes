import { lazy, Suspense, type ComponentProps } from 'react'
import { lazyNow } from './lazyNow'

/**
 * The "Name it" sheet and the touch row menus load only when needed, so the
 * first screen stays small (CI size check).
 */
const Sheet = lazyNow(() =>
  import('./NameSheet').then((m) => ({ default: m.NameSheet })),
)
const NotebookMenu = lazy(() => import('../notebooks/NotebookRowMenu'))
const PageMenu = lazy(() => import('../pages/PageRowMenu'))

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

/**
 * Fetches the "Name it" sheet's code ahead of the first tap (R13). The row
 * menus stay as they were: nameSheet.spec "a palm right after the Pencil"
 * passes only because a row menu paints 300 ms late (its synthetic Pencil does
 * not arm the palm guard), so they wait until that test is made real.
 */
LazyNameSheet.preload = [Sheet.preload]
