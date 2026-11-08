import type { LearningNotesDB } from '../core/db'
import type { Editor } from '../editor/barActions'
import { imageRef } from '../images/imageRef'
import { saveImage, type PreparedImage } from '../images/imageService'
import { CARD_BLOCK_TYPE } from '../recall/cardService'

/**
 * Make card from a Lasso selection (polish 2, item 12): the selected ink (or
 * picture) becomes the card's answer as a picture, and the question is what
 * the person types or writes in the Name it sheet. The picture is stored like
 * any other (images/), and the answer is an ordinary picture block inside the
 * Card block, the same as a picture answer made by hand (wave 3 E2).
 */

export interface PictureCard {
  imageId: string
  /** The Card block to insert (question as text, the picture as its answer). */
  block: {
    type: typeof CARD_BLOCK_TYPE
    content: string
    children: { type: 'image'; props: { url: string } }[]
  }
}

/** Stores the picture and describes the card; nothing touches the page yet. */
export async function pictureCard(
  db: LearningNotesDB,
  png: Blob,
  question: string,
  prepare?: (file: Blob) => Promise<PreparedImage>,
): Promise<PictureCard> {
  const saved = await saveImage(db, png, prepare)
  return {
    imageId: saved.id,
    block: {
      type: CARD_BLOCK_TYPE,
      content: question.trim(),
      children: [{ type: 'image', props: { url: imageRef(saved.id) } }],
    },
  }
}

/** Puts the card at the end of the page (an Undo takes it away in one step). */
export function insertPictureCard(editor: Editor, card: PictureCard): void {
  const last = editor.document[editor.document.length - 1]
  editor.insertBlocks([card.block as never], last, 'after')
}
