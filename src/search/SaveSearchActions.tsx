import { useContext, useState } from 'react'
import { AppUiContext } from '../app/appUi'
import { runTask } from '../app/errors'
import { NameDialog } from '../app/ui'
import type { LearningNotesDB } from '../core/db'
import type { SavedSearch } from '../core/types'
import { t } from '../i18n/t'
import {
  createSavedSearch,
  readSavedQuery,
  updateSavedSearchQuery,
} from './savedSearchService'
import type { SearchQuery } from './searchQuery'

/**
 * "☆ Save search" (asks for a name; it then appears in the sidebar) and,
 * for an open saved search that was changed, "Save changes".
 */
export function SaveSearchActions({
  db,
  query,
  saved,
  onSaved,
}: {
  db: LearningNotesDB
  query: SearchQuery
  saved: SavedSearch | undefined
  onSaved: (saved: SavedSearch) => void
}) {
  const ui = useContext(AppUiContext)
  const [naming, setNaming] = useState(false)
  const changed =
    saved !== undefined &&
    JSON.stringify(readSavedQuery(saved.query)) !== JSON.stringify(query)
  const button =
    'min-h-8 rounded-lg border border-line px-3 text-[13px] text-ink hover:bg-hover'

  return (
    <>
      {changed && (
        <button
          type="button"
          className={button}
          onClick={() =>
            runTask(
              (async () => {
                await updateSavedSearchQuery(db, saved.id, query)
                ui.toast(t('saved.updated', { name: saved.name }))
              })(),
            )
          }
        >
          {t('saved.update')}
        </button>
      )}
      <button type="button" className={button} onClick={() => setNaming(true)}>
        ☆ {t('saved.save')}
      </button>
      {naming && (
        <NameDialog
          title={t('saved.save')}
          label={t('saved.name')}
          initialValue={query.text.trim() || t('saved.defaultName')}
          confirmLabel={t('saved.saveConfirm')}
          onCancel={() => setNaming(false)}
          onConfirm={(name) => {
            setNaming(false)
            runTask(
              (async () => {
                const created = await createSavedSearch(
                  db,
                  name || t('saved.defaultName'),
                  query,
                )
                onSaved(created)
                ui.toast(t('saved.saved', { name: created.name }))
              })(),
            )
          }}
        />
      )}
    </>
  )
}
