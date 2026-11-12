import { lazy, Suspense, useCallback, useEffect, useState } from 'react'

/**
 * The "Parts" gallery (SP-12): one lazy chunk per section, so nothing here is
 * in the first-load bundle. Sections render in this order.
 */
const SECTIONS = [
  lazy(() => import('./TokensSection')),
  lazy(() => import('./CardSection')),
  lazy(() => import('./TabsSection')),
  lazy(() => import('./ClearSection')),
  // (a part that loads its own chunk is fetched with its section, so the page
  // does not grow after the section appears)
  lazy(() =>
    Promise.all([
      import('./TagsSection'),
      import('../parts/TagPicker/TagPicker'),
    ]).then(([m]) => m),
  ),
  lazy(() => import('./DragSection')),
  lazy(() => import('./ArrangeSection')),
  lazy(() => import('./EmptySection')),
  lazy(() => import('./ObjBarSection')),
<<<<<<< HEAD
  lazy(() =>
    Promise.all([
      import('./RangeSection'),
      import('../parts/TimeRangeBuilder'),
    ]).then(([m]) => m),
  ),
  lazy(() => import('./MenusSection')),
  lazy(() => import('./FeedbackSection')),
=======
  lazy(() => import('./RangeSection')),
  lazy(() => import('./ShellSection')),
>>>>>>> origin/build/next
]

/** Tells the gallery that its section is on the page (it renders nothing). */
function Seen({ index, mark }: { index: number; mark(i: number): void }) {
  useEffect(() => mark(index), [index, mark])
  return null
}

export default function Gallery() {
  const [seen, setSeen] = useState<ReadonlySet<number>>(new Set())
  const mark = useCallback(
    (i: number) => setSeen((old) => (old.has(i) ? old : new Set(old).add(i))),
    [],
  )
  return (
    // data-ready: every section has arrived, so nothing above can still push
    // the page down (the tests wait for this instead of guessing).
    <div
      data-testid="gal-parts"
      data-ready={seen.size >= SECTIONS.length ? 'true' : undefined}
    >
      {SECTIONS.map((S, i) => (
        <Suspense key={i} fallback={null}>
          <S />
          <Seen index={i} mark={mark} />
        </Suspense>
      ))}
    </div>
  )
}
