import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultProps,
  defaultStyleSpecs,
} from '@blocknote/core'
import { createReactBlockSpec, createReactStyleSpec } from '@blocknote/react'
import { t } from '../i18n/t'
import { CardListView } from '../recall/CardListView'
import { PageLinkView } from './PageLinkView'

/**
 * BlockNote editor schema: which block types the editor can show.
 * Limited to the Phase 1 block types (see blocks/builtinBlockTypes.ts).
 */

/** Callout: highlighted text with an emoji. Not built into BlockNote. */
const createCallout = createReactBlockSpec(
  {
    type: 'callout',
    propSchema: {
      textColor: defaultProps.textColor,
      emoji: { default: '💡' },
    },
    content: 'inline',
  },
  {
    render: ({ block, contentRef }) => (
      <div className="flex w-full gap-3 rounded-lg bg-soft px-4 py-3.5">
        <span contentEditable={false} className="select-none">
          {block.props.emoji}
        </span>
        <div className="flex-1" ref={contentRef} />
      </div>
    ),
  },
)

/** Page link: a link to another page, created from the slash menu. */
const createPageLink = createReactBlockSpec(
  {
    type: 'pageLink',
    propSchema: { pageId: { default: '' } },
    content: 'none',
  },
  {
    render: ({ block }) => <PageLinkView pageId={block.props.pageId} />,
  },
)

/**
 * Card: a recall card. Its text is the question; the blocks nested inside it
 * are the answer (styled in index.css). Scheduling lives in recall/.
 */
const createCard = createReactBlockSpec(
  { type: 'card', propSchema: {}, content: 'inline' },
  {
    render: ({ contentRef }) => (
      <div className="flex w-full items-baseline gap-2.5">
        <span
          contentEditable={false}
          className="recall-card-label select-none"
          aria-hidden
        >
          {t('card.question')}
        </span>
        <div className="flex-1 font-medium" ref={contentRef} />
      </div>
    ),
  },
)

/** Card list: a live, read-only list of the cards on the page. */
const createCardList = createReactBlockSpec(
  {
    type: 'cardList',
    propSchema: { includeSubpages: { default: false } },
    content: 'none',
  },
  {
    render: ({ block }) => (
      <CardListView includeSubpages={block.props.includeSubpages} />
    ),
  },
)

/**
 * Blank: words hidden in review (fill-in-the-blank). The style value is the
 * blank's id, which is also its card part (see editor/blankActions.ts).
 */
const blank = createReactStyleSpec(
  { type: 'blank', propSchema: 'string' },
  {
    render: ({ contentRef }) => (
      <span className="recall-blank" data-blank ref={contentRef} />
    ),
  },
)

const {
  paragraph,
  heading,
  bulletListItem,
  numberedListItem,
  checkListItem,
  quote,
  divider,
  codeBlock,
  image,
} = defaultBlockSpecs

export const schema = BlockNoteSchema.create({
  blockSpecs: {
    paragraph,
    heading,
    bulletListItem,
    numberedListItem,
    checkListItem,
    quote,
    divider,
    codeBlock,
    image,
    callout: createCallout(),
    pageLink: createPageLink(),
    card: createCard(),
    cardList: createCardList(),
  },
  styleSpecs: { ...defaultStyleSpecs, blank },
})

export type AppSchema = typeof schema

/** Block type names the editor can display; others stay hidden (and safe). */
export const editorBlockTypes: ReadonlySet<string> = new Set(
  Object.keys(schema.blockSchema),
)
