import type { DefaultReactSuggestionItem } from '@blocknote/react'
import { t } from '../i18n/t'
import { CARD_BLOCK_TYPE } from '../recall/cardService'
import type { EditorBlock } from './mapping'
import type { AppSchema } from './schema'

/**
 * Editor side of Card blocks: the conversion used by "Make card" and the
 * "/" menu item (the block menu itself is in CardMenu.tsx). A Card's question is its own text; the answer
 * is the blocks nested inside it, so answers can hold lists, images, etc.
 * Each conversion is one editor change, so Ctrl+Z undoes it in one step.
 */

type Editor = AppSchema['BlockNoteEditor']

/** Block types with text that can become a card's question. */
const CONVERTIBLE: ReadonlySet<string> = new Set([
  'paragraph',
  'heading',
  'bulletListItem',
  'numberedListItem',
  'checkListItem',
  'quote',
  'callout',
])

export const canMakeCard = (block: Pick<EditorBlock, 'type'>): boolean =>
  CONVERTIBLE.has(block.type)

/**
 * Turns a block into a Card: its text becomes the question, its nested
 * blocks (if any) the answer; otherwise an empty answer line is added and
 * gets the cursor. Returns false if the block cannot become a card.
 */
export function makeCard(editor: Editor, block: EditorBlock): boolean {
  if (!canMakeCard(block)) return false
  const hasAnswer = block.children.length > 0
  editor.updateBlock(block, {
    type: CARD_BLOCK_TYPE,
    props: {},
    children: hasAnswer ? block.children : [{ type: 'paragraph' }],
  })
  const card = editor.getBlock(block.id)
  const answer = card?.children[0]
  if (answer && !hasAnswer) editor.setTextCursorPosition(answer, 'start')
  editor.focus() // the block menu had focus; typing should go to the card
  return true
}

/** Where a card typed inside another card's answer goes. */
export type NestedCardPlace = 'inside' | 'nextLine'

/** The Card whose answer `block` is in (nearest one), if any. */
function enclosingCard(
  editor: Editor,
  block: EditorBlock,
): EditorBlock | undefined {
  let parent = editor.getParentBlock(block)
  while (parent) {
    if (parent.type === CARD_BLOCK_TYPE) return parent
    parent = editor.getParentBlock(parent)
  }
  return undefined
}

/** A new, empty Card at the cursor, with an empty answer line. */
async function insertCardHere(editor: Editor) {
  // Loaded only when a card is added, so the first download stays small.
  const { insertOrUpdateBlockForSlashMenu } = await import('@blocknote/core')
  const card = insertOrUpdateBlockForSlashMenu(editor, {
    type: CARD_BLOCK_TYPE,
  })
  editor.updateBlock(card, { children: [{ type: 'paragraph' }] })
  editor.setTextCursorPosition(card.id, 'start')
}

/**
 * A new, empty Card on the line right after `card` (not nested in it). The
 * empty line "/card" was typed on is removed.
 */
function insertCardAfter(editor: Editor, card: EditorBlock, from: string) {
  const [created] = editor.insertBlocks(
    [{ type: CARD_BLOCK_TYPE, children: [{ type: 'paragraph' }] }],
    card,
    'after',
  )
  const line = editor.getBlock(from)
  const empty =
    line?.type === 'paragraph' &&
    Array.isArray(line.content) &&
    line.content.length === 0 &&
    line.children.length === 0
  if (empty) editor.removeBlocks([line])
  editor.setTextCursorPosition(created, 'start')
}

/**
 * "/" menu item: a new, empty Card with an empty answer line. Inside a
 * card's answer, `placeNested` decides where it goes (null = cancel); it
 * answers at once when a setting decides, or later after asking.
 */
export function cardSlashItem(
  editor: Editor,
  placeNested?: () => NestedCardPlace | null | Promise<NestedCardPlace | null>,
): DefaultReactSuggestionItem {
  return {
    title: t('card.slash.title'),
    subtext: t('card.slash.subtext'),
    aliases: ['card', 'flashcard', 'question', 'recall', 'anki'],
    group: t('card.slash.group'),
    icon: <span aria-hidden>🃏</span>,
    onItemClick: () => {
      const current = editor.getTextCursorPosition().block
      const outer = placeNested && enclosingCard(editor, current)
      if (!outer) {
        void insertCardHere(editor)
        return
      }
      const place = (choice: NestedCardPlace | null) => {
        if (choice === 'inside') void insertCardHere(editor)
        else if (choice === 'nextLine')
          insertCardAfter(editor, outer, current.id)
      }
      const choice = placeNested()
      if (!(choice instanceof Promise)) {
        place(choice)
        return
      }
      void choice.then((answer) => {
        if (!editor.getBlock(current.id)) return // line gone meanwhile
        // The dialog took focus: return to the "/card" line first.
        editor.focus()
        editor.setTextCursorPosition(current.id, 'end')
        place(answer)
      })
    },
  }
}
