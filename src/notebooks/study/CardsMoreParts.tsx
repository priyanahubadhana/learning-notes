import { lazy, Suspense, useContext, useEffect, useRef } from 'react'
import { AppUiContext } from '../../app/appUi'
import { downloadFile } from '../../app/download'
import { runTask } from '../../app/errors'
import type { LearningNotesDB } from '../../core/db'
import { t } from '../../i18n/t'

const MemoryHelpers = lazy(() =>
  import('../../memory/MemoryHelpers').then((m) => ({
    default: m.MemoryHelpers,
  })),
)

/**
 * What the Cards "⋯" menu opens (slice 15): the Anki file picker, Anki
 * export (ST29) and the Memory helpers dialog (ST26). Anki code loads only
 * when used.
 */
export default function CardsMoreParts({
  db,
  notebookId,
  anki,
  pick,
  exportTick,
  helpers,
  onCloseHelpers,
}: {
  db: LearningNotesDB
  notebookId: string | null
  anki: boolean
  /** Counts up each time "Import from Anki" is chosen. */
  pick: number
  /** Counts up each time "Save for Anki" is chosen. */
  exportTick: number
  helpers: boolean
  onCloseHelpers: () => void
}) {
  const { toast } = useContext(AppUiContext)
  const picker = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (pick > 0) picker.current?.click()
  }, [pick])
  useEffect(() => {
    if (exportTick === 0) return
    runTask(
      (async () => {
        const id =
          notebookId ??
          (await db.notebooks.filter((n) => !n.kind).first())?.id ??
          null
        if (!id) return
        const { exportApkg } = await import('../../anki/exportApkg')
        const result = await exportApkg(db, id)
        downloadFile(
          result.fileName,
          new Blob([result.file as BlobPart], {
            type: 'application/octet-stream',
          }),
        )
        toast(
          t('data.anki.exported', {
            cards: result.cards,
            name: result.fileName,
          }),
        )
      })(),
    )
  }, [exportTick, db, notebookId, toast])

  const importFile = async (file: File) => {
    const [{ readApkg }, { importAnki }] = await Promise.all([
      import('../../anki/readApkg'),
      import('../../anki/importApkg'),
    ])
    const collection = await readApkg(new Uint8Array(await file.arrayBuffer()))
    const workspaceId = (await db.notebooks.filter((n) => !n.kind).first())
      ?.workspaceId
    if (!workspaceId) return
    const summary = await importAnki(
      db,
      workspaceId,
      collection,
      file.name.replace(/\.apkg$/i, ''),
    )
    toast(
      t('data.anki.done', {
        cards: summary.cards,
        name: summary.notebookTitle,
      }),
    )
  }
  return (
    <>
      {anki && (
        <input
          ref={picker}
          type="file"
          accept=".apkg"
          hidden
          aria-label={t('data.anki.hint')}
          data-testid="anki-file"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) runTask(importFile(file))
          }}
        />
      )}
      {helpers && (
        <Suspense fallback={null}>
          <MemoryHelpers db={db} pageId={null} onClose={onCloseHelpers} />
        </Suspense>
      )}
    </>
  )
}
