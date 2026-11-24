import { Suspense, lazy, useState } from 'react'
import type { LearningNotesDB } from '../core/db'
import { t } from '../i18n/t'

const AiBuild = lazy(() => import('./AiBuild'))

/**
 * Settings › AI, flag `ai.framework` only: a card that opens the Build
 * screen. The screen itself is loaded when first opened, so it adds nothing
 * to the first download.
 */
export function BuildEntry({ db }: { db: LearningNotesDB }) {
  const [open, setOpen] = useState(false)
  if (open)
    return (
      <Suspense fallback={null}>
        <AiBuild db={db} onClose={() => setOpen(false)} />
      </Suspense>
    )
  return (
    <div
      className="flex flex-col gap-2 rounded-lg border border-line p-3"
      data-testid="aifw-entry"
    >
      <h3 className="text-sm font-semibold">{t('aifw.entry.title')}</h3>
      <p className="text-sm text-muted">{t('aifw.entry.hint')}</p>
      <button
        type="button"
        data-testid="aifw-open"
        className="inline-flex min-h-11 items-center self-start rounded-lg border border-line px-3 text-sm hover:bg-hover"
        onClick={() => setOpen(true)}
      >
        {t('aifw.entry.open')}
      </button>
    </div>
  )
}
