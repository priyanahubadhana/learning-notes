import { useState } from 'react'
import { AnchoredMenu } from '../app/tools/AnchoredMenu'
import type { AnchoredMenuState } from '../app/tools/useAnchoredMenu'
import type { Project, Quadrant, Task } from '../core/homeTypes'
import { t, type MessageKey } from '../i18n/t'

export interface TaskActions {
  moveTo: (task: Task, quadrant: Quadrant) => void
  tomorrow: (task: Task) => void
  pickDay: (task: Task, day: string) => void
  moveToList: (task: Task, list: string) => void
  setProject: (task: Task, projectId: string | undefined) => void
  remove: (task: Task) => void
  openSource?: (task: Task) => void
  /** Make (or stop being) one of today's Top 3. */
  top3?: (task: Task) => void
}

const BOXES: { q: Quadrant; key: MessageKey }[] = [
  { q: 1, key: 'home.box.do' },
  { q: 2, key: 'home.box.schedule' },
  { q: 3, key: 'home.box.delegate' },
  { q: 4, key: 'home.box.drop' },
  { q: 0, key: 'home.inbox' },
]

const ITEM =
  'flex min-h-11 w-full items-center rounded-lg px-3 text-start text-sm hover:bg-hover'
const FIELD =
  'min-h-11 w-full rounded-lg border-2 border-ink-soft bg-bg px-3 text-sm'

/**
 * The "…" menu of a task (F1). It is also the keyboard and VoiceOver way to
 * fill the matrix, so nothing needs a drag: Move to Do / Schedule / Delegate
 * / Drop, Tomorrow, Pick a day, Move to list, Project.
 */
export function TaskMenu({
  menu,
  task,
  projects,
  today,
  actions,
}: {
  menu: AnchoredMenuState
  task: Task
  projects: readonly Project[]
  today: string
  actions: TaskActions
}) {
  const [mode, setMode] = useState<'main' | 'day' | 'list' | 'project'>('main')
  const [day, setDay] = useState(task.plannedDay ?? today)
  const [list, setList] = useState(task.listName ?? '')
  const done = (run: () => void) => () => {
    run()
    menu.close()
    setMode('main')
  }
  const open = task.status === 'open'
  return (
    <AnchoredMenu menu={menu} label={t('home.task.menu')} width={250}>
      {mode === 'main' && (
        <>
          {open &&
            BOXES.filter((b) => b.q !== task.quadrant).map((b) => (
              <button
                key={b.q}
                type="button"
                role="menuitem"
                className={ITEM}
                onClick={done(() => actions.moveTo(task, b.q))}
              >
                {t('home.moveTo', { box: t(b.key) })}
              </button>
            ))}
          {open && actions.top3 && (
            <button
              type="button"
              role="menuitem"
              className={ITEM}
              onClick={done(() => actions.top3?.(task))}
            >
              {t(task.top3Day === today ? 'home.top3.leave' : 'home.top3.make')}
            </button>
          )}
          {open && (
            <>
              <button
                type="button"
                role="menuitem"
                className={ITEM}
                onClick={done(() => actions.tomorrow(task))}
              >
                {t('home.carry.tomorrow')}
              </button>
              <button
                type="button"
                role="menuitem"
                className={ITEM}
                onClick={() => setMode('day')}
              >
                {t('home.carry.pick')}
              </button>
            </>
          )}
          <button
            type="button"
            role="menuitem"
            className={ITEM}
            onClick={() => setMode('list')}
          >
            {t('home.moveToList')}
          </button>
          <button
            type="button"
            role="menuitem"
            className={ITEM}
            onClick={() => setMode('project')}
          >
            {t('home.project.set')}
          </button>
          {task.sourcePageId && actions.openSource && (
            <button
              type="button"
              role="menuitem"
              className={ITEM}
              onClick={done(() => actions.openSource?.(task))}
            >
              {t('home.openNote')}
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            className={`${ITEM} text-danger`}
            onClick={done(() => actions.remove(task))}
          >
            {t('home.task.delete')}
          </button>
        </>
      )}
      {mode === 'day' && (
        <form
          className="flex flex-col gap-2 p-1.5"
          onSubmit={(e) => {
            e.preventDefault()
            if (day) done(() => actions.pickDay(task, day))()
          }}
        >
          <label className="text-sm" htmlFor={`day-${task.id}`}>
            {t('home.carry.pick')}
          </label>
          <input
            id={`day-${task.id}`}
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className={FIELD}
          />
          <button
            type="submit"
            className={`${ITEM} justify-center border border-line`}
          >
            {t('dialog.save')}
          </button>
        </form>
      )}
      {mode === 'list' && (
        <form
          className="flex flex-col gap-2 p-1.5"
          onSubmit={(e) => {
            e.preventDefault()
            done(() => actions.moveToList(task, list))()
          }}
        >
          <label className="text-sm" htmlFor={`list-${task.id}`}>
            {t('home.moveToList')}
          </label>
          <input
            id={`list-${task.id}`}
            value={list}
            maxLength={100}
            placeholder={t('home.list.placeholder')}
            onChange={(e) => setList(e.target.value)}
            className={FIELD}
          />
          <button
            type="submit"
            className={`${ITEM} justify-center border border-line`}
          >
            {t('dialog.save')}
          </button>
        </form>
      )}
      {mode === 'project' && (
        <>
          <button
            type="button"
            role="menuitem"
            className={ITEM}
            onClick={done(() => actions.setProject(task, undefined))}
          >
            {t('home.project.none')}
          </button>
          {projects.map((p) => (
            <button
              key={p.id}
              type="button"
              role="menuitemradio"
              aria-checked={task.projectId === p.id}
              className={ITEM}
              onClick={done(() => actions.setProject(task, p.id))}
            >
              {task.projectId === p.id ? '✓ ' : ''}
              {p.name}
            </button>
          ))}
        </>
      )}
    </AnchoredMenu>
  )
}
