import { useLiveQuery } from 'dexie-react-hooks'
import type { LearningNotesDB } from '../core/db'
import { isLive } from '../core/records'
import { t } from '../i18n/t'
import { fold, searchWords } from './searchText'

/** At most this many task rows show. */
const MAX_ROWS = 50

/**
 * The Tasks chip of the one Search (F1): finds Home tasks by the words in
 * their title. Tasks are few compared with notes, so the titles are matched
 * in memory; there is no search index for them.
 */
export function TaskResults({
  db,
  text,
  onOpen,
}: {
  db: LearningNotesDB
  text: string
  onOpen: () => void
}) {
  const words = searchWords(text)
  const hits = useLiveQuery(async () => {
    if (words.length === 0) return []
    const all = (await db.tasks.toArray()).filter(isLive)
    return all
      .filter((task) => {
        const title = fold(task.title)
        return words.every((w) => title.includes(w))
      })
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_ROWS)
  }, [db, words.join(' ')])
  if (words.length === 0) {
    return (
      <p className="px-4 py-7 text-center text-sm text-muted">
        {t('search.tasks.hint')}
      </p>
    )
  }
  if (!hits || hits.length === 0) {
    return (
      <p className="px-4 py-7 text-center text-sm text-muted">
        {t('panel.none')}
      </p>
    )
  }
  return (
    <ul aria-label={t('search.type.task')} data-testid="task-results">
      {hits.map((task) => (
        <li key={task.id}>
          <button
            type="button"
            onClick={onOpen}
            className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-3 text-start text-sm hover:bg-hover"
          >
            <span className="min-w-0 break-words">{task.title}</span>
            <span className="shrink-0 text-xs text-muted">
              {t(
                task.status === 'done'
                  ? 'home.record.done'
                  : 'home.record.open',
              )}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}
