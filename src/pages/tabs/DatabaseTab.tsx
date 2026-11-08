import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { DatabaseView } from '../../databases/views/DatabaseView'
import { t } from '../../i18n/t'
import type { LearningNotesDB } from '../../core/db'
import type { Page } from '../../core/types'
import { DB_SCOPES, scopedDatabaseIds, type DbScope } from './databaseScope'

/**
 * The page's Database tab: the same database view as Quick access, filtered
 * to this page by default, with a choice to widen it to the page and its
 * sub-pages, or the whole notebook.
 */
export default function DatabaseTab({
  db,
  page,
  workspaceId,
  onOpenPage,
}: {
  db: LearningNotesDB
  page: Page
  workspaceId: string
  onOpenPage: (pageId: string) => void
}) {
  const [scope, setScope] = useState<DbScope>('page')
  const ids = useLiveQuery(
    () => scopedDatabaseIds(db, workspaceId, page, scope),
    [db, workspaceId, page.id, page.notebookId, scope],
  )
  const titles = useLiveQuery(
    async () =>
      new Map(
        (await db.databases.bulkGet(ids ?? []))
          .filter((d) => !!d)
          .map((d) => [d!.id, d!.title] as const),
      ),
    [db, ids],
  )
  return (
    <div className="grid gap-4" data-database-tab>
      <div
        role="group"
        aria-label={t('tabs.db.scope')}
        className="flex flex-wrap gap-1"
      >
        {DB_SCOPES.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={scope === s}
            data-db-scope={s}
            onClick={() => setScope(s)}
            className="min-h-9 any-pointer-coarse:min-h-11 rounded-full border border-line px-3 text-sm text-ink-soft hover:bg-hover aria-pressed:border-ink aria-pressed:font-semibold aria-pressed:text-ink"
          >
            {t(`tabs.db.${s}`)}
          </button>
        ))}
      </div>
      {ids && ids.length === 0 && (
        <p className="text-sm text-muted">{t('tabs.db.empty')}</p>
      )}
      {(ids ?? []).map((id) => (
        <details key={id} open className="rounded-xl border border-line p-3">
          <summary className="min-h-11 cursor-pointer py-2 text-[15px] font-semibold">
            {titles?.get(id) ?? ''}
          </summary>
          <DatabaseView
            db={db}
            databaseId={id}
            onOpenPage={onOpenPage}
            showTitle={false}
          />
        </details>
      ))}
    </div>
  )
}
