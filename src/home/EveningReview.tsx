import { IconButton } from '../app/ui'
import { useContext, useState, type FormEvent } from 'react'
import { AppUiContext } from '../app/appUi'
import { runTask } from '../app/errors'
import { usePref } from '../app/usePref'
import type { LearningNotesDB } from '../core/db'
import type { Task } from '../core/homeTypes'
import {
  carryTask,
  carryToTomorrow,
  completeTask,
  reopenTask,
} from '../core/taskService'
import { t } from '../i18n/t'
import { setLinkedBlockChecked } from '../app/taskLink'
import { afterTime } from './timeLabel'
import { useNow } from './useTimer'

const PROMPTS = [
  'home.evening.p1',
  'home.evening.p2',
  'home.evening.p3',
] as const

const isTime = (v: unknown): v is string =>
  typeof v === 'string' && /^\d{2}:\d{2}$/.test(v)

/**
 * The evening review (F3), offered after a time you choose: what is done and
 * not done, a choice for each unfinished task (Tomorrow, Pick a day, or
 * leave it), and up to three journal prompts that are written into today's
 * journal page. Nothing is decided for you.
 */
export function EveningReview({
  db,
  tasks,
  today,
  appendJournal,
}: {
  db: LearningNotesDB
  tasks: readonly Task[]
  today: string
  appendJournal: (entries: { heading: string; text: string }[]) => Promise<void>
}) {
  const { toast } = useContext(AppUiContext)
  const now = useNow(false)
  const [at, setAt] = usePref<string>('home.eveningAt', isTime, '20:00')
  const [open, setOpen] = useState(false)
  const [answers, setAnswers] = useState<string[]>(['', '', ''])
  const [days, setDays] = useState<Record<string, string>>({})
  const ready = afterTime(now, at)

  const planned = tasks.filter((x) => x.plannedDay === today)
  const done = planned.filter((x) => x.status === 'done')
  const left = planned.filter((x) => x.status === 'open')

  const save = (e: FormEvent) => {
    e.preventDefault()
    const entries = PROMPTS.map((key, i) => ({
      heading: t(key),
      text: answers[i],
    })).filter((x) => x.text.trim())
    if (entries.length === 0) return
    runTask(
      appendJournal(entries).then(() => {
        setAnswers(['', '', ''])
        toast(t('home.evening.saved'))
      }),
    )
  }
  const tick = (task: Task) => {
    const finish = task.status !== 'done'
    runTask(
      (finish ? completeTask(db, task.id) : reopenTask(db, task.id)).then(() =>
        setLinkedBlockChecked(db, task, finish),
      ),
    )
  }

  return (
    <section
      aria-label={t('home.evening.title')}
      data-testid="evening-review"
      className="rounded-xl border border-line p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{t('home.evening.title')}</h3>
        <label className="flex items-center gap-2 text-xs text-muted">
          {t('home.evening.after')}
          <input
            type="time"
            data-testid="evening-time"
            value={at}
            onChange={(e) => isTime(e.target.value) && setAt(e.target.value)}
            className="min-h-11 rounded-lg border-2 border-ink-soft bg-bg px-2 text-sm text-ink"
          />
        </label>
      </div>
      {!ready && !open ? (
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted">
            {t('home.evening.later', { time: at })}
          </p>
          <button
            type="button"
            data-testid="evening-start"
            onClick={() => setOpen(true)}
            className="min-h-11 rounded-lg border border-line px-3 text-sm"
          >
            {t('home.evening.startNow')}
          </button>
        </div>
      ) : (
        <div className="mt-2 flex flex-col gap-3" data-testid="evening-body">
          <p className="text-sm">
            {t('home.evening.summary', {
              done: done.length,
              left: left.length,
            })}
          </p>
          {left.length > 0 && (
            <ul
              className="flex flex-col gap-1.5"
              aria-label={t('home.evening.left')}
            >
              {left.map((task) => (
                <li
                  key={task.id}
                  data-testid="evening-task"
                  className="flex flex-wrap items-center gap-1 rounded-lg border border-line ps-1"
                >
                  <IconButton
                    tip="home.tick"
                    bare
                    tipClassName="inline-flex shrink-0"
                    type="button"
                    role="checkbox"
                    aria-checked={false}
                    aria-label={t('home.task.tick', { title: task.title })}
                    onClick={() => tick(task)}
                    className="grid size-11 shrink-0 place-items-center"
                  >
                    <span
                      aria-hidden
                      className="size-5 rounded-md border-2 border-ink-soft"
                    />
                  </IconButton>
                  <span className="min-w-0 flex-1 py-2 text-sm break-words">
                    {task.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => runTask(carryToTomorrow(db, task.id))}
                    className="min-h-11 rounded-lg border border-line px-3 text-sm"
                  >
                    {t('home.carry.tomorrow')}
                  </button>
                  <input
                    type="date"
                    aria-label={t('home.carry.pick')}
                    value={days[task.id] ?? ''}
                    min={today}
                    onChange={(e) => {
                      const day = e.target.value
                      setDays({ ...days, [task.id]: day })
                      if (day) runTask(carryTask(db, task.id, day))
                    }}
                    className="min-h-11 rounded-lg border border-line bg-bg px-2 text-sm"
                  />
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={save} className="flex flex-col gap-2">
            <p className="text-xs text-muted">
              {t('home.evening.promptsHint')}
            </p>
            {PROMPTS.map((key, i) => (
              <label key={key} className="flex flex-col gap-1 text-sm">
                {t(key)}
                <textarea
                  data-testid={`evening-answer-${i}`}
                  rows={2}
                  value={answers[i]}
                  maxLength={2000}
                  onChange={(e) =>
                    setAnswers(
                      answers.map((a, j) => (j === i ? e.target.value : a)),
                    )
                  }
                  className="rounded-lg border-2 border-ink-soft bg-bg p-2 text-sm"
                />
              </label>
            ))}
            <button
              type="submit"
              data-testid="evening-save"
              className="min-h-11 self-start rounded-lg bg-accent px-4 text-sm font-medium text-white"
            >
              {t('home.evening.save')}
            </button>
          </form>
        </div>
      )}
    </section>
  )
}
