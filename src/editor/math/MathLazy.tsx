import { lazy, Suspense } from 'react'
import type { MathEditorApi } from './MathHost'

// The formula drawing library (KaTeX) comes with this chunk, so pages
// without a formula never download it.
const MathHost = lazy(() => import('./MathHost'))

/** The maths block's body: loads the formula chunk when first shown. */
export function MathLazy({
  block,
  editor,
}: {
  block: { props: { latex: string } }
  editor: MathEditorApi
}) {
  return (
    <Suspense fallback={<div className="min-h-10 w-full" />}>
      <MathHost block={block} editor={editor} />
    </Suspense>
  )
}
