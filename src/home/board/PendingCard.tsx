import { runTask } from '../../app/errors'
import { setLinkedBlockChecked } from '../../app/taskLink'
import type { LearningNotesDB } from '../../core/db'
import type { Task } from '../../core/homeTypes'
import { completeTask } from '../../core/taskService'
import { t } from '../../i18n/t'
import { pendingItems } from './pendingItems'

/** Pending items: overdue and other open tasks; a tick finishes one. */
export function PendingCard({
  db,
  tasks,
  today,
}: {
  db: LearningNotesDB
  tasks: readonly Task[]
  today: string
}) {
  const { shown, total, overdue } = pendingItems(tasks, today)
  const finish = (task: Task) =>
    runTask(
      completeTask(db, task.id).then(() =>
        setLinkedBlockChecked(db, task, true),
      ),
    )
  return (
    <div data-testid="pending-card">
      <p className="mb-2 text-xs text-muted" data-testid="pending-title">
        {t('home.v2.pending.count', { count: total })}
      </p>
      {total === 0 ? (
        <p className="text-sm text-muted">{t('home.v2.pending.empty')}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {shown.map((task, i) => (
            <li key={task.id} className="flex items-center gap-2">
              <button
                type="button"
                role="checkbox"
                aria-checked={false}
                aria-label={t('home.task.tick', { title: task.title })}
                onClick={() => finish(task)}
                className="grid min-h-11 min-w-11 place-items-center"
              >
                <span
                  aria-hidden
                  className="size-5 rounded border-2 border-ink-soft"
                />
              </button>
              <span className="min-w-0 flex-1 truncate text-sm">
                {task.title}
              </span>
              {i < overdue && (
                <span className="text-xs text-danger">
                  {t('home.v2.pending.late')}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {total > shown.length && (
        <p className="mt-1 text-xs text-muted">
          {t('home.v2.pending.more', { count: total - shown.length })}
        </p>
      )}
    </div>
  )
}
