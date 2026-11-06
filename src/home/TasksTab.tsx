import { IconButton } from '../app/ui'
import { useContext, useMemo, useState, type FormEvent } from 'react'
import { AppUiContext } from '../app/appUi'
import { runTask } from '../app/errors'
import { setLinkedBlockChecked } from '../app/taskLink'
import type { LearningNotesDB } from '../core/db'
import type { Project, Quadrant, Task } from '../core/homeTypes'
import {
  addProject,
  addTask,
  bucketTasks,
  carryTask,
  carryToTomorrow,
  completeTask,
  deleteProject,
  deleteTask,
  moveToList,
  moveToQuadrant,
  reopenTask,
  restoreTask,
  setTaskProject,
  setTop3,
  upcomingByDay,
} from '../core/taskService'
import { t, type MessageKey } from '../i18n/t'
import { shortDayLabel } from './dayLabel'
import { parseQuickAdd } from './quickAdd'
import { TaskRow } from './TaskRow'
import type { TaskActions } from './TaskMenu'
import { useTaskDrag } from './useTaskDrag'

const BOXES: { q: 1 | 2 | 3 | 4; key: MessageKey; hint: MessageKey }[] = [
  { q: 1, key: 'home.box.do', hint: 'home.box.do.hint' },
  { q: 2, key: 'home.box.schedule', hint: 'home.box.schedule.hint' },
  { q: 3, key: 'home.box.delegate', hint: 'home.box.delegate.hint' },
  { q: 4, key: 'home.box.drop', hint: 'home.box.drop.hint' },
]

/**
 * Tasks (F1): the Inbox with one-line quick add, the four-box matrix (filled
 * only by you: drag, or a task's "…" menu), Upcoming by day, Completed by
 * day, and Projects. Nothing is ever sorted or deleted by the app itself.
 */
export function TasksTab({
  db,
  today,
  tasks,
  projects,
  onOpenPage,
  onShowOlder,
}: {
  db: LearningNotesDB
  today: string
  tasks: readonly Task[]
  projects: readonly Project[]
  onOpenPage: (pageId: string) => void
  /** Loads done tasks older than 60 days (absent once they are all loaded). */
  onShowOlder?: () => void
}) {
  const { toast } = useContext(AppUiContext)
  const [text, setText] = useState('')
  const [projectFilter, setProjectFilter] = useState<string | null>(null)
  const [newProject, setNewProject] = useState('')
  const shown = useMemo(
    () =>
      projectFilter
        ? tasks.filter((x) => x.projectId === projectFilter)
        : tasks,
    [tasks, projectFilter],
  )
  const buckets = useMemo(() => bucketTasks(shown), [shown])
  const upcoming = useMemo(() => upcomingByDay(shown, today), [shown, today])

  const actions: TaskActions = {
    moveTo: (task, q) => runTask(moveToQuadrant(db, task.id, q)),
    tomorrow: (task) => runTask(carryToTomorrow(db, task.id)),
    pickDay: (task, day) => runTask(carryTask(db, task.id, day)),
    moveToList: (task, list) => runTask(moveToList(db, task.id, list)),
    setProject: (task, id) => runTask(setTaskProject(db, task.id, id)),
    remove: (task) => {
      runTask(deleteTask(db, task.id))
      toast(t('home.task.deleted'), {
        label: t('reading.undo'),
        onSelect: () => runTask(restoreTask(db, task.id)),
      })
    },
    openSource: (task) => task.sourcePageId && onOpenPage(task.sourcePageId),
    top3: (task) =>
      runTask(
        setTop3(db, task.id, today, task.top3Day !== today).then((ok) => {
          if (!ok) toast(t('home.top3.full'))
        }),
      ),
  }
  const tick = (task: Task) => {
    const finish = task.status !== 'done'
    runTask(
      (finish ? completeTask(db, task.id) : reopenTask(db, task.id)).then(() =>
        setLinkedBlockChecked(db, task, finish),
      ),
    )
  }

  const { drag, handlers } = useTaskDrag((id, target) => {
    const q = Number(target)
    if (q >= 0 && q <= 4) runTask(moveToQuadrant(db, id, q as Quadrant))
  })
  const dragged = drag ? tasks.find((x) => x.id === drag.id) : undefined

  const add = (e: FormEvent) => {
    e.preventDefault()
    const parsed = parseQuickAdd(text, today)
    if (!parsed.title) return
    setText('')
    runTask(
      addTask(db, {
        title: parsed.title,
        plannedDay: parsed.plannedDay,
        projectId: projectFilter ?? undefined,
      }),
    )
  }

  const row = (task: Task, showDay = true) => (
    <TaskRow
      key={task.id}
      task={task}
      projects={projects}
      today={today}
      actions={actions}
      onTick={tick}
      dragProps={task.status === 'open' ? handlers(task.id) : undefined}
      showDay={showDay}
    />
  )
  const dropClass = (q: Quadrant) =>
    drag?.over === String(q)
      ? 'outline-2 outline-accent'
      : drag
        ? 'outline-2 outline-dashed outline-line'
        : ''

  // Completed, grouped by the day they were done.
  const completedDays = useMemo(() => {
    const groups = new Map<string, Task[]>()
    for (const task of buckets.completed) {
      const day = task.doneDay ?? '—'
      groups.set(day, [...(groups.get(day) ?? []), task])
    }
    return [...groups.entries()]
  }, [buckets.completed])

  return (
    <div className="flex flex-col gap-6" data-testid="tasks-tab">
      {projects.length > 0 && (
        <div
          role="group"
          aria-label={t('home.projects')}
          className="flex flex-wrap gap-1.5"
        >
          <button
            type="button"
            aria-pressed={projectFilter === null}
            onClick={() => setProjectFilter(null)}
            className="min-h-11 rounded-full border border-line px-3 text-sm aria-pressed:border-accent aria-pressed:text-accent"
          >
            {t('home.project.all')}
          </button>
          {projects.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={projectFilter === p.id}
              onClick={() =>
                setProjectFilter(projectFilter === p.id ? null : p.id)
              }
              className="min-h-11 rounded-full border border-line px-3 text-sm aria-pressed:border-accent aria-pressed:text-accent"
            >
              {p.name}
            </button>
          ))}
        </div>
      )}

      <section
        aria-label={t('home.inbox')}
        data-drop="0"
        className={`rounded-xl p-1 ${dropClass(0)}`}
      >
        <h3 className="mb-2 text-sm font-semibold">{t('home.inbox')}</h3>
        <form onSubmit={add} className="mb-2 flex gap-2">
          <input
            data-testid="quick-add"
            aria-label={t('home.quickAdd')}
            placeholder={t('home.quickAdd.placeholder')}
            value={text}
            maxLength={500}
            onChange={(e) => setText(e.target.value)}
            className="min-h-11 min-w-0 flex-1 rounded-lg border-2 border-ink-soft bg-bg px-3 text-sm"
          />
          <button
            type="submit"
            className="min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-white"
          >
            {t('home.add')}
          </button>
        </form>
        {buckets.inbox.length === 0 ? (
          <p className="px-1 text-sm text-muted">{t('home.inbox.empty')}</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {buckets.inbox.map((x) => row(x))}
          </ul>
        )}
      </section>

      <section aria-label={t('home.matrix')}>
        <h3 className="mb-1 text-sm font-semibold">{t('home.matrix')}</h3>
        <p className="mb-2 text-xs text-muted">{t('home.matrix.how')}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {BOXES.map((b) => (
            <section
              key={b.q}
              data-drop={b.q}
              data-testid={`box-${b.q}`}
              aria-label={t(b.key)}
              className={`min-h-28 rounded-xl border border-line p-2 ${dropClass(b.q)}`}
            >
              <h4 className="text-sm font-semibold">{t(b.key)}</h4>
              <p className="mb-1.5 text-xs text-muted">{t(b.hint)}</p>
              <ul className="flex flex-col gap-1.5">
                {buckets.matrix[b.q].map((x) => row(x))}
              </ul>
            </section>
          ))}
        </div>
      </section>

      <section aria-label={t('home.upcoming')}>
        <h3 className="mb-2 text-sm font-semibold">{t('home.upcoming')}</h3>
        {upcoming.length === 0 ? (
          <p className="px-1 text-sm text-muted">{t('home.upcoming.empty')}</p>
        ) : (
          upcoming.map((d) => (
            <div key={d.day} className="mb-3">
              <h4 className="mb-1 text-xs font-semibold text-muted">
                {shortDayLabel(d.day)}
              </h4>
              <ul className="flex flex-col gap-1.5">
                {d.tasks.map((x) => row(x, false))}
              </ul>
            </div>
          ))
        )}
      </section>

      <section aria-label={t('home.completed')}>
        <h3 className="mb-2 text-sm font-semibold">{t('home.completed')}</h3>
        {completedDays.length === 0 ? (
          <p className="px-1 text-sm text-muted">{t('home.completed.empty')}</p>
        ) : (
          completedDays.map(([day, list]) => (
            <div key={day} className="mb-3">
              <h4 className="mb-1 text-xs font-semibold text-muted">
                {day === today ? t('home.today') : shortDayLabel(day)}
              </h4>
              <ul className="flex flex-col gap-1.5">
                {list.map((x) => row(x, false))}
              </ul>
            </div>
          ))
        )}
        {onShowOlder && (
          <button
            type="button"
            data-testid="completed-older"
            onClick={onShowOlder}
            className="min-h-11 rounded-lg border border-line px-4 text-sm hover:bg-hover"
          >
            {t('home.completed.older')}
          </button>
        )}
      </section>

      <section aria-label={t('home.projects')}>
        <h3 className="mb-2 text-sm font-semibold">{t('home.projects')}</h3>
        <ul className="mb-2 flex flex-col gap-1.5">
          {projects.map((p) => (
            <li
              key={p.id}
              className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-line px-3 text-sm"
            >
              <span className="min-w-0 break-words">{p.name}</span>
              <span className="flex items-center gap-2">
                <span className="text-xs text-muted tabular-nums">
                  {t('home.project.open', {
                    count: tasks.filter(
                      (x) => x.projectId === p.id && x.status === 'open',
                    ).length,
                  })}
                </span>
                <IconButton
                  tip="home.remove"
                  bare
                  tipClassName="inline-flex shrink-0"
                  type="button"
                  aria-label={t('home.project.delete', { name: p.name })}
                  onClick={() => runTask(deleteProject(db, p.id))}
                  className="grid size-11 place-items-center rounded-lg text-ink-soft hover:bg-hover"
                >
                  ×
                </IconButton>
              </span>
            </li>
          ))}
        </ul>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!newProject.trim()) return
            const name = newProject
            setNewProject('')
            runTask(addProject(db, name))
          }}
          className="flex gap-2"
        >
          <input
            data-testid="new-project"
            aria-label={t('home.project.new')}
            placeholder={t('home.project.new')}
            value={newProject}
            maxLength={100}
            onChange={(e) => setNewProject(e.target.value)}
            className="min-h-11 min-w-0 flex-1 rounded-lg border-2 border-ink-soft bg-bg px-3 text-sm"
          />
          <button
            type="submit"
            className="min-h-11 rounded-lg border border-line px-4 text-sm"
          >
            {t('home.add')}
          </button>
        </form>
      </section>

      {drag && dragged && (
        <div
          aria-hidden
          data-chrome
          className="pointer-events-none fixed z-50 max-w-[60vw] rounded-lg border border-accent bg-bg px-3 py-2 text-sm shadow-lg"
          style={{ left: drag.x + 12, top: drag.y + 12 }}
        >
          {dragged.title}
        </div>
      )}
    </div>
  )
}
