import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState, type FormEvent } from 'react'
import { runTask } from '../app/errors'
import type { LearningNotesDB } from '../core/db'
import { addDays } from '../core/homeDays'
import type { Project, Task } from '../core/homeTypes'
import { t } from '../i18n/t'
import { shortDayLabel } from './dayLabel'
import { timeLabel } from './timeLabel'
import {
  addBlock,
  changeBlock,
  getPlan,
  removeBlock,
  SNAP_MIN,
} from './planService'
import { useTaskDrag } from './useTaskDrag'

const FIRST_HOUR = 5
const LAST_HOUR = 23
const HOURS = Array.from(
  { length: LAST_HOUR - FIRST_HOUR + 1 },
  (_, i) => FIRST_HOUR + i,
)

const pad = (n: number) => String(n).padStart(2, '0')

/** Start times offered by the "Add at" list: every 30 minutes. */
const SLOT_OPTIONS = Array.from(
  { length: (LAST_HOUR - FIRST_HOUR + 1) * 2 },
  (_, i) => FIRST_HOUR * 60 + i * 30,
)

/**
 * Plan (F2): today's timeline. Drag a task onto an hour, or use "Add at"
 * (no drag needed), or add a free block. Blocks snap to 15 minutes and can
 * be shifted or lengthened with the buttons. What you really tracked is in
 * Reports, beside this plan.
 */
export function PlanTab({
  db,
  today,
  tasks,
  projects,
}: {
  db: LearningNotesDB
  today: string
  tasks: readonly Task[]
  projects: readonly Project[]
}) {
  const [day, setDay] = useState(today)
  const plan = useLiveQuery(() => getPlan(db, day), [db, day])
  const blocks = useMemo(() => plan?.blocks ?? [], [plan])
  const [title, setTitle] = useState('')
  const [start, setStart] = useState(9 * 60)
  const [length, setLength] = useState(30)

  const planned = new Set(blocks.map((b) => b.taskId).filter(Boolean))
  const free = tasks.filter((x) => x.status === 'open' && !planned.has(x.id))

  const planTask = (task: Task, startMin: number) =>
    runTask(
      addBlock(db, day, {
        startMin,
        durationMin: task.estimateMin ?? 30,
        taskId: task.id,
        title: task.title,
        projectId: task.projectId,
      }),
    )

  const { drag, handlers } = useTaskDrag((id, target) => {
    const task = tasks.find((x) => x.id === id)
    const m = /^slot:(\d+)$/.exec(target)
    if (task && m) planTask(task, Number(m[1]) * 60)
  })
  const dragged = drag ? tasks.find((x) => x.id === drag.id) : undefined

  const addFree = (e: FormEvent) => {
    e.preventDefault()
    const clean = title.trim()
    if (!clean) return
    setTitle('')
    runTask(
      addBlock(db, day, { startMin: start, durationMin: length, title: clean }),
    )
  }
  const projectName = (id?: string) => projects.find((p) => p.id === id)?.name

  return (
    <div className="flex flex-col gap-4" data-testid="plan-tab">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label={t('home.plan.prev')}
          onClick={() => setDay(addDays(day, -1))}
          className="grid size-11 place-items-center rounded-lg border border-line"
        >
          ‹
        </button>
        <h3 className="text-sm font-semibold" data-testid="plan-day">
          {day === today ? t('home.today') : shortDayLabel(day)}
        </h3>
        <button
          type="button"
          aria-label={t('home.plan.next')}
          onClick={() => setDay(addDays(day, 1))}
          className="grid size-11 place-items-center rounded-lg border border-line"
        >
          ›
        </button>
      </div>

      <section aria-label={t('home.plan.tasks')}>
        <h4 className="mb-1 text-sm font-semibold">{t('home.plan.tasks')}</h4>
        <p className="mb-2 text-xs text-muted">{t('home.plan.how')}</p>
        {free.length === 0 ? (
          <p className="text-sm text-muted">{t('home.plan.noTasks')}</p>
        ) : (
          <ul className="flex max-h-60 flex-col gap-1.5 overflow-y-auto">
            {free.map((task) => (
              <li
                key={task.id}
                data-testid="plan-task"
                className="flex min-h-11 items-center gap-1 rounded-lg border border-line ps-3"
              >
                <div
                  {...handlers(task.id)}
                  className="min-w-0 flex-1 cursor-grab py-1.5 text-sm break-words select-none"
                  style={{ touchAction: 'pan-y' }}
                >
                  {task.title}
                </div>
                <label className="sr-only" htmlFor={`add-at-${task.id}`}>
                  {t('home.plan.addAt', { title: task.title })}
                </label>
                <select
                  id={`add-at-${task.id}`}
                  value=""
                  onChange={(e) => {
                    if (e.target.value) planTask(task, Number(e.target.value))
                  }}
                  className="min-h-11 max-w-28 rounded-lg border border-line bg-bg px-1 text-sm"
                >
                  <option value="">{t('home.plan.addAtShort')}</option>
                  {SLOT_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {timeLabel(m)}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label={t('home.plan.timeline')}>
        <h4 className="mb-2 text-sm font-semibold">
          {t('home.plan.timeline')}
        </h4>
        <div className="flex flex-col">
          {HOURS.map((hour) => {
            const here = blocks.filter(
              (b) => Math.floor(b.startMin / 60) === hour,
            )
            return (
              <div
                key={hour}
                data-drop={`slot:${hour}`}
                data-testid={`slot-${hour}`}
                className={`flex min-h-11 gap-2 border-t border-line py-1 ${
                  drag?.over === `slot:${hour}` ? 'bg-hover' : ''
                }`}
              >
                <span className="w-12 shrink-0 pt-1 text-xs text-muted tabular-nums">
                  {pad(hour)}:00
                </span>
                <ul className="flex min-w-0 flex-1 flex-col gap-1">
                  {here.map((b) => (
                    <li
                      key={b.id}
                      data-testid="plan-block"
                      className="rounded-lg border border-accent bg-bg p-2 text-sm"
                    >
                      <div className="break-words">{b.title}</div>
                      <div className="text-xs text-muted">
                        {timeLabel(b.startMin)}–
                        {timeLabel(b.startMin + b.durationMin)}
                        {projectName(b.projectId)
                          ? ` · ${projectName(b.projectId)}`
                          : ''}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {(
                          [
                            [
                              'home.plan.earlier',
                              { startMin: b.startMin - SNAP_MIN },
                            ],
                            [
                              'home.plan.later',
                              { startMin: b.startMin + SNAP_MIN },
                            ],
                            [
                              'home.plan.shorter',
                              { durationMin: b.durationMin - SNAP_MIN },
                            ],
                            [
                              'home.plan.longer',
                              { durationMin: b.durationMin + SNAP_MIN },
                            ],
                          ] as const
                        ).map(([key, patch]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() =>
                              runTask(changeBlock(db, day, b.id, patch))
                            }
                            className="min-h-11 rounded-lg border border-line px-2 text-xs"
                          >
                            {t(key)}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => runTask(removeBlock(db, day, b.id))}
                          className="min-h-11 rounded-lg border border-line px-2 text-xs text-danger"
                        >
                          {t('home.plan.remove')}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </section>

      <form
        onSubmit={addFree}
        aria-label={t('home.plan.free')}
        className="flex flex-wrap items-end gap-2"
      >
        <label className="flex min-w-40 flex-1 flex-col gap-1 text-xs">
          {t('home.plan.free')}
          <input
            data-testid="plan-free-title"
            value={title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('home.plan.freePlaceholder')}
            className="min-h-11 rounded-lg border-2 border-ink-soft bg-bg px-3 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          {t('home.plan.at')}
          <select
            value={start}
            onChange={(e) => setStart(Number(e.target.value))}
            className="min-h-11 rounded-lg border border-line bg-bg px-2 text-sm"
          >
            {SLOT_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {timeLabel(m)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs">
          {t('home.plan.minutes')}
          <select
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            className="min-h-11 rounded-lg border border-line bg-bg px-2 text-sm"
          >
            {[15, 30, 45, 60, 90, 120].map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-white"
        >
          {t('home.add')}
        </button>
      </form>

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
