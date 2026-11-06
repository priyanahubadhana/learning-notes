import { useLiveQuery } from 'dexie-react-hooks'
import { useContext, useState } from 'react'
import { AppUiContext } from '../app/appUi'
import { runTask } from '../app/errors'
import type { LearningNotesDB } from '../core/db'
import type { Page } from '../core/types'
import { t } from '../i18n/t'
import { aiBatches, removeAiResult, restoreAiResult } from './importNotes'
import { NotesPanel } from './NotesPanel'
import { pageSourceInput } from './pageSource'
import { buildPrompt } from './promptBuilder'
import type { CaptureInput } from './captureService'

/**
 * Buttons on a source page's header (CR2): Copy prompt, Paste notes, and,
 * once an AI answer is on the page, the "Made with your AI · edited by you"
 * line with "Remove this AI result" (one Undo brings it back).
 */
export function PageAiActions({
  db,
  workspaceId,
  page,
  onChanged,
}: {
  db: LearningNotesDB
  workspaceId: string
  page: Page
  /** The page's blocks changed behind the editor: reload it. */
  onChanged: () => void
}) {
  const { toast } = useContext(AppUiContext)
  const batches = useLiveQuery(() => aiBatches(db, page.id), [db, page.id])
  const [open, setOpen] = useState<CaptureInput | null>(null)

  const copy = () =>
    runTask(
      (async () => {
        const input = await pageSourceInput(db, page)
        await navigator.clipboard.writeText(buildPrompt(input, ''))
        toast(t('capture.promptCopied'))
      })(),
    )

  const remove = () =>
    runTask(
      (async () => {
        const newest = batches?.[0]
        if (!newest) return
        const ids = await removeAiResult(db, page.id, newest.batchId)
        onChanged()
        toast(t('capture.removeAiDone'), {
          label: t('annot.undo'),
          onSelect: () =>
            void runTask(restoreAiResult(db, ids).then(onChanged)),
        })
      })(),
    )

  const btn =
    'min-h-11 rounded-lg border border-line px-3 text-sm hover:bg-hover'
  return (
    <>
      <button
        type="button"
        data-testid="page-copy-prompt"
        onClick={copy}
        className={btn}
      >
        {t('capture.copyPrompt')}
      </button>
      <button
        type="button"
        data-testid="page-paste-notes"
        onClick={() =>
          runTask(pageSourceInput(db, page).then((input) => setOpen(input)))
        }
        className={btn}
      >
        {t('capture.pasteNotes')}
      </button>
      {!!batches?.length && (
        <>
          <span
            data-testid="ai-badge"
            className="inline-flex min-h-11 items-center text-xs text-muted"
          >
            {t('capture.madeWithAi')}
          </span>
          <button
            type="button"
            data-testid="remove-ai"
            onClick={remove}
            className={btn}
          >
            {t('capture.removeAi')}
          </button>
        </>
      )}
      {open && (
        <div
          data-chrome
          role="dialog"
          aria-label={t('capture.pasteNotes')}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/30 p-3"
          onKeyDown={(e) => e.key === 'Escape' && setOpen(null)}
        >
          <div className="mt-8 w-full max-w-xl rounded-xl border border-line bg-bg p-4 shadow-xl">
            <NotesPanel
              db={db}
              workspaceId={workspaceId}
              input={open}
              pageId={page.id}
              onDone={() => {
                setOpen(null)
                onChanged()
              }}
            />
            <button
              type="button"
              onClick={() => setOpen(null)}
              className={`${btn} mt-3`}
            >
              {t('capture.close')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
