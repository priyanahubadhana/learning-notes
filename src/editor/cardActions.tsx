import { insertOrUpdateBlockForSlashMenu } from '@blocknote/core'
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

/** "/" menu item: a new, empty Card with an empty answer line. */
export function cardSlashItem(editor: Editor): DefaultReactSuggestionItem {
  return {
    title: t('card.slash.title'),
    subtext: t('card.slash.subtext'),
    aliases: ['card', 'flashcard', 'question', 'recall', 'anki'],
    group: t('card.slash.group'),
    icon: <span aria-hidden>🃏</span>,
    onItemClick: () => {
      const card = insertOrUpdateBlockForSlashMenu(editor, {
        type: CARD_BLOCK_TYPE,
      })
      editor.updateBlock(card, { children: [{ type: 'paragraph' }] })
      editor.setTextCursorPosition(card.id, 'start')
    },
  }
}
