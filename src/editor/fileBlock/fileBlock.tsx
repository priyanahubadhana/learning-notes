import { createReactBlockSpec } from '@blocknote/react'
import { FileView, type FileHostApi, type FileProps } from './FileView'

/**
 * The `file` block (G2): a file attached to the page. Props: `url` (the
 * reference "lnfile:<id>", empty until a file is chosen), `name`, `size`
 * (bytes) and `caption`. No inline text. See files/.
 */
export const createFileBlock = createReactBlockSpec(
  {
    type: 'file',
    propSchema: {
      url: { default: '' },
      name: { default: '' },
      size: { default: 0 },
      caption: { default: '' },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => (
      <FileView
        block={block as unknown as { props: FileProps }}
        editor={editor as unknown as FileHostApi}
      />
    ),
  },
)
