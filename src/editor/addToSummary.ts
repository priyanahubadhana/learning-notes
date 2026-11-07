import type { LearningNotesDB } from '../core/db'
import { addBlockToSummary } from '../core/summaryService'
import { t } from '../i18n/t'
import { inlineText } from './clipboard'
import type { EditorBlock } from './mapping'
import type { AppSchema } from './schema'

type Editor = AppSchema['BlockNoteEditor']

/** Blocks the selection touches (or the one the cursor is in) that hold text. */
function targetBlocks(editor: Editor, only?: EditorBlock): EditorBlock[] {
  const picked = only
    ? [only]
    : (editor.getSelection()?.blocks ?? [editor.getTextCursorPosition().block])
  return picked.filter((b) => Array.isArray(b.content))
}

/**
 * "Add to Summary" (Phase M): links each note line into this page's Summary.
 * The Summary shows the line's live words, so editing the note updates it.
 * Returns the message to show.
 */
export async function addToSummary(
  editor: Editor,
  ctx: { db: LearningNotesDB; pageId: string },
  only?: EditorBlock,
): Promise<string> {
  let added = 0
  let exists = 0
  let full = false
  for (const block of targetBlocks(editor, only)) {
    const result = await addBlockToSummary(
      ctx.db,
      block.id,
      ctx.pageId,
      inlineText(block.content),
    )
    if (result.status === 'added') added++
    else if (result.status === 'exists') exists++
    else if (result.status === 'full') full = true
  }
  if (added > 0) return t('summary.added')
  if (full) return t('summary.full')
  if (exists > 0) return t('summary.exists')
  return t('summary.nothing')
}
