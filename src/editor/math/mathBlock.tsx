import { createReactBlockSpec } from '@blocknote/react'
import type { MathEditorApi } from './MathHost'
import { MathLazy } from './MathLazy'

/**
 * The maths block (N1): one formula, stored as LaTeX text in the `latex`
 * prop. Tap it to open the maths editor (palette + LaTeX box). It has no
 * inline content.
 */
export const createMathBlock = createReactBlockSpec(
  {
    type: 'math',
    propSchema: { latex: { default: '' } },
    content: 'none',
  },
  {
    render: ({ block, editor }) => (
      <MathLazy block={block} editor={editor as unknown as MathEditorApi} />
    ),
  },
)
