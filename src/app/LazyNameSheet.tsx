import { lazy, Suspense, type ComponentProps } from 'react'

/**
 * The "Name it" sheet and the touch row menus load only when needed, so the
 * first screen stays small (CI size check).
 */
const Sheet = lazy(() =>
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
