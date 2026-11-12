import { lazy, Suspense } from 'react'

/**
 * The "Parts" gallery (SP-12): one lazy chunk per section, so nothing here is
 * in the first-load bundle. Sections render in this order.
 */
const SECTIONS = [
  lazy(() => import('./TokensSection')),
  lazy(() => import('./CardSection')),
  lazy(() => import('./TabsSection')),
  lazy(() => import('./ClearSection')),
  lazy(() => import('./TagsSection')),
  lazy(() => import('./DragSection')),
  lazy(() => import('./ArrangeSection')),
  lazy(() => import('./EmptySection')),
  lazy(() => import('./ObjBarSection')),
  lazy(() => import('./RangeSection')),
  lazy(() => import('./MenusSection')),
  lazy(() => import('./FeedbackSection')),
  lazy(() => import('./ShellSection')),
]

export default function Gallery() {
  return (
    <div data-testid="gal-parts">
      {SECTIONS.map((S, i) => (
        <Suspense key={i} fallback={null}>
          <S />
        </Suspense>
      ))}
    </div>
  )
}
