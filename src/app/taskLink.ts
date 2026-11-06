import type { LearningNotesDB } from '../core/db'
import type { Task } from '../core/homeTypes'
import { isLive } from '../core/records'
import { taskFromBlock } from '../core/taskService'
import { t } from '../i18n/t'
import { patchStashedBlock } from '../editor/pendingStash'
import { currentRunner } from './tools/toolRuntime'

/**
 * Tasks from notes (F1): a checklist line and a Home task that follow each
 * other. Home ticks the line through `setLinkedBlockChecked`; the other way
 * round is `syncTasksFromBlocks` (core/taskService.ts), which runs when the
 * editor saves the line.
 */

type Inline = { text?: string; content?: unknown }

const plain = (content: unknown): string =>
  Array.isArray(content)
    ? (content as Inline[])
        .map((c) => c.text ?? (c.content ? plain(c.content) : ''))
        .join('')
        .trim()
    : ''

/** "→ Home": makes (or finds) the task for the checklist line at the cursor. */
export async function sendCursorLineToHome(db: LearningNotesDB): Promise<void> {
  const { editor, app } = currentRunner()
  const toast = app?.toast ?? (() => {})
  const pageId = app?.currentPageId() ?? null
  if (!editor || !pageId) return
  const block = editor.getTextCursorPosition().block as unknown as {
    id: string
    type: string
    content: unknown
    props: { checked?: boolean }
  }
  const title = plain(block.content)
  if (block.type !== 'checkListItem' || !title) {
    toast(t('home.toHome.notChecklist'))
    return
  }
  const { created } = await taskFromBlock(db, {
    title,
    blockId: block.id,
    pageId,
    checked: block.props.checked === true,
  })
  toast(t(created ? 'home.toHome.done' : 'home.toHome.exists'))
}

/**
 * Home ticked (or unticked) a linked task: the checklist line follows. If
 * that page is open here, the editor makes the change (the editor owns the
 * page while it is open); otherwise the block record is written.
 */
export async function setLinkedBlockChecked(
  db: LearningNotesDB,
  task: Task,
  checked: boolean,
): Promise<void> {
  if (!task.sourceBlockId || !task.sourcePageId) return
  const { editor, app } = currentRunner()
  if (editor && app?.currentPageId() === task.sourcePageId) {
    const block = editor.getBlock(task.sourceBlockId)
    if (block) {
      editor.updateBlock(block, { props: { checked } } as never)
      return
    }
  }
  const row = await db.blocks.get(task.sourceBlockId)
  if (!row || !isLive(row)) return
  // Unsaved copies kept for this page must not bring the old tick back.
  patchStashedBlock(task.sourcePageId, row.id, { checked })
  if ((row.content as { checked?: unknown }).checked === checked) return
  await db.blocks.update(row.id, {
    content: { ...row.content, checked },
    updatedAt: Date.now(),
  })
}
