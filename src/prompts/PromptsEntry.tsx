import { lazy, Suspense, useState } from 'react'
import type { LearningNotesDB } from '../core/db'
import type { Page } from '../core/types'
import { t } from '../i18n/t'

const PromptsDialog = lazy(() => import('./PromptsDialog'))

/**
 * The "Prompts" button. It is the only part of the prompt library that is
 * not lazy (a button and a lazy import); the dialog, the library database,
 * the seeds and the skills load when it is pressed.
 */
export function PromptsEntry({
  db,
  workspaceId,
  page,
  onChanged,
}: {
  db: LearningNotesDB
  workspaceId: string
  /** The page the words come from (none in the Library: paste or PDF). */
  page?: Page
  onChanged?: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        data-testid="ai-prompts"
        onClick={() => setOpen(true)}
        className="min-h-11 rounded-lg border border-line px-3 text-sm hover:bg-hover"
      >
        ✦ {t('prompts.open')}
      </button>
      {open && (
        <Suspense fallback={null}>
          <PromptsDialog
            db={db}
            workspaceId={workspaceId}
            page={page}
            onChanged={onChanged}
            onClose={() => setOpen(false)}
          />
        </Suspense>
      )}
    </>
  )
}
