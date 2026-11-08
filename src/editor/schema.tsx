import {
  BlockNoteSchema,
  defaultBlockSpecs,
  defaultInlineContentSpecs,
  defaultProps,
  defaultStyleSpecs,
} from '@blocknote/core'
import {
  createReactBlockSpec,
  createReactInlineContentSpec,
  createReactStyleSpec,
} from '@blocknote/react'
import { t } from '../i18n/t'
import { DatabaseBlockView } from '../databases/DatabaseBlockView'
import { createEmbedBlock } from './embed/embedBlock'
import { createFileBlock } from './fileBlock/fileBlock'
import { createMindMapBlock } from './mindMap/mindMapBlock'
import { createMathBlock } from './math/mathBlock'
import { createDayRecordBlock } from './dayRecord/dayRecordBlock'
import { CardListView } from '../recall/CardListView'
import { NOTE_LINK, TAG } from './mapping'
import { NoteLinkView } from './NoteLinkView'
import { PageLinkView } from './PageLinkView'
import { TagView } from './TagView'
import { HandSpan } from './writePad/HandSpan'
import { HAND_STYLE } from './writePad/handStyle'

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
    // A pasted Notion callout (see clipboard.ts) arrives as this marked div.
    parse: (el) =>
      el.hasAttribute('data-ln-callout')
        ? { emoji: el.getAttribute('data-ln-callout') || '💡' }
        : undefined,
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

/** Database: a database shown inside the note, with this block's own view. */
const createDatabaseBlock = createReactBlockSpec(
  {
    type: 'database',
    propSchema: { databaseId: { default: '' } },
    content: 'none',
  },
  {
    render: ({ block }) => (
      <DatabaseBlockView
        databaseId={block.props.databaseId}
        blockId={block.id}
      />
    ),
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

/**
 * Mark: words marked for revision (Key point, Keyword, Must know, Formula).
 * The style value is the label id (see revise/reviseMarks.ts).
 */
const mark = createReactStyleSpec(
  { type: 'mark', propSchema: 'string' },
  {
    render: ({ value, contentRef }) => (
      <span className="recall-mark" data-mark={value} ref={contentRef} />
    ),
  },
)

/**
 * Hand: text that came from the Write pad. The value is "font.weight.size"
 * (see editor/writePad/handStyle.ts); colours use the normal text styles.
 */
const hand = createReactStyleSpec(
  { type: HAND_STYLE, propSchema: 'string' },
  {
    render: ({ value, contentRef }) => (
      <HandSpan value={value} contentRef={contentRef} />
    ),
  },
)

/**
 * Note link: a link inside text to a page, or a heading/card on it (typed
 * with "[["). Stores ids, so renames and moves never break it; shows the
 * current title. See editor/NoteLinkView.tsx and links/.
 */
const noteLink = createReactInlineContentSpec(
  {
    type: NOTE_LINK,
    propSchema: {
      pageId: { default: '' },
      blockId: { default: '' },
      label: { default: '' },
    },
    content: 'none',
  },
  {
    render: ({ inlineContent }) => <NoteLinkView {...inlineContent.props} />,
  },
)

/**
 * Tag: a tag inside text (typed with "#"); tags that block, or the Card it
 * is in. Stores the tag id, so renames show everywhere; see tags/.
 */
const tag = createReactInlineContentSpec(
  {
    type: TAG,
    propSchema: { tagId: { default: '' }, label: { default: '' } },
    content: 'none',
  },
  {
    render: ({ inlineContent }) => <TagView {...inlineContent.props} />,
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
  table,
  toggleListItem,
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
    table,
    toggleListItem,
    file: createFileBlock(),
    callout: createCallout(),
    pageLink: createPageLink(),
    card: createCard(),
    cardList: createCardList(),
    database: createDatabaseBlock(),
    mindMap: createMindMapBlock(),
    math: createMathBlock(),
    embed: createEmbedBlock(),
    dayRecord: createDayRecordBlock(),
  },
  inlineContentSpecs: { ...defaultInlineContentSpecs, noteLink, tag },
  styleSpecs: { ...defaultStyleSpecs, blank, mark, hand },
})

export type AppSchema = typeof schema

/** Block type names the editor can display; others stay hidden (and safe). */
export const editorBlockTypes: ReadonlySet<string> = new Set(
  Object.keys(schema.blockSchema),
)
