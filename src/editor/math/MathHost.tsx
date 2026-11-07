import { lazy, Suspense, useState } from 'react'
import { MathView } from './MathView'

const MathEditor = lazy(() =>
  import('./MathEditor').then((m) => ({ default: m.MathEditor })),
)

/** Just what the host needs from the editor (keeps types simple). */
export interface MathEditorApi {
  isEditable: boolean
  updateBlock: (block: unknown, update: unknown) => unknown
}

/**
 * Connects a formula block to the editor: shows the formula, and opens the
 * maths editor on tap. The maths editor itself loads only when first opened.
 */
export default function MathHost({
  block,
  editor,
}: {
  block: { props: { latex: string } }
  editor: MathEditorApi
}) {
  const [open, setOpen] = useState(false)
  const editable = editor.isEditable
  return (
    <>
      <MathView
        latex={block.props.latex}
        onOpen={editable ? () => setOpen(true) : undefined}
      />
      {open && editable && (
        <Suspense fallback={null}>
          <MathEditor
            initial={block.props.latex}
            onCancel={() => setOpen(false)}
            onSave={(latex) => {
              setOpen(false)
              if (latex !== block.props.latex) {
                editor.updateBlock(block, { props: { latex } })
              }
            }}
          />
        </Suspense>
      )}
    </>
  )
}
