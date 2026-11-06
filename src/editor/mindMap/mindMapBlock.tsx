import { createReactBlockSpec } from '@blocknote/react'
import { MindMapHost, type Host } from './MindMapHost'

/**
 * The mind map block (G0b). Props: `data` (the tree as JSON text, see
 * model.ts; empty = a fresh map) and `theme`. It has no inline content.
 */
export const createMindMapBlock = createReactBlockSpec(
  {
    type: 'mindMap',
    propSchema: { data: { default: '' }, theme: { default: 'calm' } },
    content: 'none',
  },
  {
    render: ({ block, editor }) => (
      <MindMapHost block={block} editor={editor as unknown as Host} />
    ),
  },
)
