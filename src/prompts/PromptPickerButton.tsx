import { lazy, Suspense, useState } from 'react'
import type { LearningNotesDB } from '../core/db'
import { t } from '../i18n/t'

const PromptsDialog = lazy(() => import('./PromptsDialog'))

/**
 * "Use a saved prompt": the library as a picker for any place AI runs (Ask
 * this book fills its question box). The chosen prompt's text is handed to
 * `onPick`; nothing is sent from here.
 */
export function PromptPickerButton({
  db,
  workspaceId,
  onPick,
}: {
  db: LearningNotesDB
  workspaceId: string
  onPick: (text: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        data-testid="use-saved-prompt"
        onClick={() => setOpen(true)}
        className="min-h-11 self-start rounded-lg border border-line px-3 text-sm hover:bg-hover"
      >
        ✦ {t('prompts.useSaved')}
      </button>
      {open && (
        <Suspense fallback={null}>
          <PromptsDialog
            db={db}
            workspaceId={workspaceId}
            onClose={() => setOpen(false)}
            onPick={(item) => {
              onPick(item.text)
              setOpen(false)
            }}
          />
        </Suspense>
      )}
    </>
  )
}
