import { useLiveQuery } from 'dexie-react-hooks'
import type { LearningNotesDB } from '../core/db'
import type { Block } from '../core/types'
import { t } from '../i18n/t'
import { clearClash, excerptOf } from '../sync/clash'
import { recordToEditorBlock } from './mapping'
import { editorBlockTypes, type AppSchema } from './schema'

/**
 * "Changed on two devices" (R6-13): one calm bar for each block whose text
 * was changed on two devices at the same moment. The other version is kept
 * on the block (`clash`); the choice clears it, and so it clears on every
 * device. Loaded only when sync is on.
 */

type Editor = AppSchema['BlockNoteEditor']

const button =
  'min-h-9 rounded-md px-2.5 text-sm font-medium text-accent hover:bg-hover'

export default function ClashBars({
  db,
  editor,
  pageId,
}: {
  db: LearningNotesDB
  editor: Editor
  pageId: string
}) {
  const clashed = useLiveQuery(
    () =>
      db.blocks
        .where('pageId')
        .equals(pageId)
        .filter((b) => !!b.clash && b.deletedAt === null)
        .toArray(),
    [db, pageId],
  )
  if (!clashed || clashed.length === 0) return null

  const chooseOther = async (b: Block) => {
    const other = { ...b, type: b.clash!.type, content: b.clash!.content }
    await clearClash(db, b.id)
    if (editor.getBlock(b.id) && editorBlockTypes.has(other.type)) {
      // An editor change, so Undo takes it back; the autosaver writes it.
      editor.updateBlock(b.id, recordToEditorBlock(other))
    }
  }
  const keepBoth = async (b: Block) => {
    const other = { ...b, type: b.clash!.type, content: b.clash!.content }
    await clearClash(db, b.id)
    if (editor.getBlock(b.id) && editorBlockTypes.has(other.type)) {
      const { id: _id, ...partial } = recordToEditorBlock(other) as {
        id?: string
      }
      void _id
      editor.insertBlocks([partial as never], b.id, 'after')
    }
  }

  return (
    <div className="mb-2 flex flex-col gap-2">
      {clashed.map((b) => (
        <div
          key={b.id}
          role="group"
          aria-label={t('clash.title')}
          data-testid="clash-bar"
          data-block={b.id}
          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-soft px-3 py-2 text-sm"
        >
          <div className="min-w-0 flex-1">
            <div className="font-medium">{t('clash.title')}</div>
            <div className="truncate text-muted">
              {t('clash.other', { text: excerptOf(b.clash!.content) })}
            </div>
          </div>
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              className={button}
              onClick={() => void clearClash(db, b.id)}
            >
              {t('clash.keepMine')}
            </button>
            <button
              type="button"
              className={button}
              onClick={() => void chooseOther(b)}
            >
              {t('clash.useOther')}
            </button>
            <button
              type="button"
              className={button}
              onClick={() => void keepBoth(b)}
            >
              {t('clash.keepBoth')}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
