import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import type { LearningNotesDB } from '../../core/db'
import { displayName, sampleName } from '../../i18n/defaultNames'
import { t } from '../../i18n/t'
import { listNotebooks } from '../../notebooks/notebookService'
import { SummaryView } from './SummaryView'

/** The whole-app Summary (Phase M): every notebook's lines, or one notebook's. */
export function AppSummary({
  db,
  workspaceId,
  onOpenPage,
}: {
  db: LearningNotesDB
  workspaceId: string
  onOpenPage: (pageId: string) => void
}) {
  const [picked, setPicked] = useState('')
  const notebooks = useLiveQuery(
    () => listNotebooks(db, workspaceId),
    [db, workspaceId],
  )
  // A notebook deleted meanwhile no longer narrows the list.
  const notebookId = notebooks?.find((n) => n.id === picked)?.id ?? null
  return (
    <div>
      <label className="mb-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">{t('summary.filter')}</span>
        <select
          value={notebookId ?? ''}
          onChange={(e) => setPicked(e.target.value)}
          className="min-h-11 rounded-lg border border-line bg-bg px-3"
        >
          <option value="">{t('summary.filterAll')}</option>
          {(notebooks ?? []).map((n) => (
            <option key={n.id} value={n.id}>
              {displayName(sampleName(n)) || t('review.untitled')}
            </option>
          ))}
        </select>
      </label>
      <SummaryView
        db={db}
        scope={{ kind: 'app', notebookId }}
        onOpenPage={onOpenPage}
      />
    </div>
  )
}
