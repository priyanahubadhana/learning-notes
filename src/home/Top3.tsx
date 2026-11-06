import { IconButton } from '../app/ui'
import { useContext, useState } from 'react'
import { AppUiContext } from '../app/appUi'
import { runTask } from '../app/errors'
import { setLinkedBlockChecked } from '../app/taskLink'
import type { LearningNotesDB } from '../core/db'
import type { Task } from '../core/homeTypes'
import { addDays } from '../core/homeDays'
import {
  completeTask,
  reopenTask,
  setTop3,
  TOP3_MAX,
  top3Marks,
} from '../core/taskService'
import { t } from '../i18n/t'

/**
 * Top 3 for today (F2): up to three tasks you pick yourself, a "2 of 3"
 * counter, and yesterday's three with a tick or a red cross once the day is
 * over. No streaks, no guilt text.
 */
export function Top3({
  db,
  tasks,
  today,
}: {
  db: LearningNotesDB
  tasks: readonly Task[]
  today: string
}) {
  const { toast } = useContext(AppUiContext)
  const [picking, setPicking] = useState(false)
  const marks = top3Marks(tasks, today, today)
  const yesterday = top3Marks(tasks, addDays(today, -1), today)
  const doneCount = marks.filter((m) => m.mark === 'done').length
  const candidates = tasks.filter((x) => x.status === 'open' && !x.top3Day)

  const tick = (task: Task) => {
    const finish = task.status !== 'done'
    runTask(
      (finish ? completeTask(db, task.id) : reopenTask(db, task.id)).then(() =>
        setLinkedBlockChecked(db, task, finish),
      ),
    )
  }
  const choose = (id: string) => {
    setPicking(false)
    runTask(
      setTop3(db, id, today, true).then((ok) => {
        if (!ok) toast(t('home.top3.full'))
      }),
    )
  }

  return (
    <section
      aria-label={t('home.top3')}
      data-testid="top3"
      className="rounded-xl border border-line p-3"
    >
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">{t('home.top3')}</h3>
        <span
          data-testid="top3-count"
          className="text-sm text-muted tabular-nums"
        >
          {t('home.top3.count', { done: doneCount, total: TOP3_MAX })}
        </span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {marks.map(({ task }) => (
          <li
            key={task.id}
            data-testid="top3-row"
            className="flex min-h-11 items-center gap-1 rounded-lg border border-line ps-1"
          >
            <IconButton
              tip="home.tick"
              bare
              tipClassName="inline-flex shrink-0"
              type="button"
              role="checkbox"
              aria-checked={task.status === 'done'}
              aria-label={t(
                task.status === 'done' ? 'home.task.untick' : 'home.task.tick',
                { title: task.title },
              )}
              onClick={() => tick(task)}
              className="grid size-11 shrink-0 place-items-center"
            >
              <span
                aria-hidden
                className={`grid size-5 place-items-center rounded-md border-2 text-xs ${
                  task.status === 'done'
                    ? 'border-accent bg-accent text-white'
                    : 'border-ink-soft'
                }`}
              >
                {task.status === 'done' ? '✓' : ''}
              </span>
            </IconButton>
            <span
              className={`min-w-0 flex-1 text-sm break-words ${
                task.status === 'done' ? 'text-muted line-through' : ''
              }`}
            >
              {task.title}
            </span>
            <IconButton
              tip="home.remove"
              bare
              tipClassName="inline-flex shrink-0"
              type="button"
              aria-label={t('home.top3.remove', { title: task.title })}
              onClick={() => runTask(setTop3(db, task.id, today, false))}
              className="grid size-11 place-items-center rounded-lg text-ink-soft hover:bg-hover"
            >
              ×
            </IconButton>
          </li>
        ))}
      </ul>
      {marks.length < TOP3_MAX &&
        (picking ? (
          <div className="mt-2" role="group" aria-label={t('home.top3.pick')}>
            {candidates.length === 0 ? (
              <p className="text-sm text-muted">{t('home.top3.noTasks')}</p>
            ) : (
              <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto">
                {candidates.map((task) => (
                  <li key={task.id}>
                    <button
                      type="button"
                      onClick={() => choose(task.id)}
                      className="min-h-11 w-full rounded-lg border border-line px-3 text-start text-sm hover:bg-hover"
                    >
                      {task.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => setPicking(false)}
              className="mt-1 min-h-11 px-2 text-sm text-ink-soft"
            >
              {t('dialog.cancel')}
            </button>
          </div>
        ) : (
          <button
            type="button"
            data-testid="top3-add"
            onClick={() => setPicking(true)}
            className="mt-2 min-h-11 w-full rounded-lg border border-dashed border-ink-soft text-sm"
          >
            {t('home.top3.add')}
          </button>
        ))}
      {yesterday.length > 0 && (
        <div className="mt-3 border-t border-line pt-2">
          <h4 className="mb-1 text-xs font-semibold text-muted">
            {t('home.top3.yesterday')}
          </h4>
          <ul data-testid="top3-yesterday" className="flex flex-col gap-0.5">
            {yesterday.map(({ task, mark }) => (
              <li key={task.id} className="flex items-center gap-2 text-sm">
                <span
                  aria-label={t(
                    mark === 'done' ? 'home.top3.done' : 'home.top3.missed',
                  )}
                  className={mark === 'done' ? 'text-accent' : 'text-danger'}
                >
                  {mark === 'done' ? '✓' : '✕'}
                </span>
                <span className="break-words">{task.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
