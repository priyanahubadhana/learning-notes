import { useLiveQuery } from 'dexie-react-hooks'
import { lazy, Suspense, useState } from 'react'
import { db } from '../core/db'
import { t } from '../i18n/t'
import { getReadPrompt, setReadPrompt } from './readPrompt'

const PromptsDialog = lazy(() => import('../prompts/PromptsDialog'))

/**
 * "Use a saved prompt (optional)" for reading handwriting: the prompt
 * library as a picker. Shows the chosen prompt with Clear. The library
 * loads only when the picker opens.
 */
export function ReadPromptChoice({ pageId }: { pageId?: string }) {
  const [open, setOpen] = useState(false)
  const [chosen, setChosen] = useState(getReadPrompt)
  const workspaceId = useLiveQuery(async () => {
    const page = pageId ? await db.pages.get(pageId) : undefined
    const nb = page ? await db.notebooks.get(page.notebookId) : undefined
    return nb?.workspaceId ?? (await db.workspaces.toCollection().first())?.id
  }, [pageId])
  const btn =
    'min-h-11 rounded-lg border border-line px-3 text-sm hover:bg-hover'
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        data-testid="read-prompt-pick"
        disabled={!workspaceId}
        className={btn}
        onClick={() => setOpen(true)}
      >
        ✦{' '}
        {chosen
          ? t('ai.readPrompt.using', { name: chosen.name })
          : t('ai.readPrompt.pick')}
      </button>
      {chosen && (
        <button
          type="button"
          data-testid="read-prompt-clear"
          className={btn}
          onClick={() => {
            setReadPrompt(null)
            setChosen(null)
          }}
        >
          {t('ai.readPrompt.clear')}
        </button>
      )}
      {open && workspaceId && (
        <Suspense fallback={null}>
          <PromptsDialog
            db={db}
            workspaceId={workspaceId}
            onClose={() => setOpen(false)}
            onPick={(item) => {
              const next = { name: item.name, text: item.text }
              setReadPrompt(next)
              setChosen(getReadPrompt())
              setOpen(false)
            }}
          />
        </Suspense>
      )}
    </div>
  )
}
