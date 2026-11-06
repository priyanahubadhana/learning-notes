import { createReactBlockSpec } from '@blocknote/react'
import { EmbedView, type EmbedHostApi, type EmbedProps } from './EmbedView'

/**
 * The `embed` block (G2a). Props: `url` (empty until the user adds one),
 * `provider` ('youtube' or 'link'), `videoId`, `start` (seconds) and
 * `caption` (the name shown on the card; also searchable). No inline text.
 */
export const createEmbedBlock = createReactBlockSpec(
  {
    type: 'embed',
    propSchema: {
      url: { default: '' },
      provider: { default: 'link' },
      videoId: { default: '' },
      start: { default: 0 },
      caption: { default: '' },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => (
      <EmbedView
        block={block as unknown as { props: EmbedProps }}
        editor={editor as unknown as EmbedHostApi}
      />
    ),
  },
)
