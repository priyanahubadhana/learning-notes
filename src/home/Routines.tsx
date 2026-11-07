import { EmptyState, IconButton } from '../app/ui'
import { useLiveQuery } from 'dexie-react-hooks'
import { useContext, useEffect, useRef, useState, type FormEvent } from 'react'
import { AppUiContext } from '../app/appUi'
import { runTask } from '../app/errors'
import { pageLines } from '../app/pageText'
import type { LearningNotesDB } from '../core/db'
import { addDays } from '../core/homeDays'
import type { Habit } from '../core/homeTypes'
import { isLive } from '../core/records'
import { recentPages } from '../core/recentPages'
import { t } from '../i18n/t'
import {
  canRecord,
  getAffirmationFile,
  readAffirmation,
  recordAffirmation,
  saveAffirmationFile,
  type AffirmationRecording,
} from './affirm'
import { shortDayLabel } from './dayLabel'
import {
  addHabit,
  deleteHabit,
  listChecks,
  restoreHabit,
  setCheck,
  strip,
  type DayState,
} from './habitService'

const ROUTINES = ['morning', 'night', 'daily'] as const

const FIELD = 'min-h-11 rounded-lg border-2 border-ink-soft bg-bg px-3 text-sm'

const STATE_LABEL: Record<DayState, string> = {
  done: 'home.habit.done',
  missed: 'home.habit.missed',
  open: 'home.habit.open',
  before: 'home.habit.before',
}

/** The 7 days of one habit: a tick, a red cross for a missed day, a dot. */
function Strip({
  habit,
  checks,
  today,
  dayStart,
}: {
  habit: Habit
  checks: Parameters<typeof strip>[1]
  today: string
  dayStart: number
}) {
  return (
    <ul className="flex gap-1" data-testid="habit-strip">
      {strip(habit, checks, today, dayStart).map(({ day, state }) => (
        <li
          key={day}
          data-state={state}
          aria-label={`${shortDayLabel(day)}: ${t(STATE_LABEL[state] as 'home.habit.done')}`}
          className={`grid size-6 place-items-center rounded-full text-xs ${
            state === 'done'
              ? 'bg-accent text-white'
              : state === 'missed'
                ? 'font-bold text-danger'
                : 'text-muted'
          }`}
        >
          {state === 'done' ? '✓' : state === 'missed' ? '✕' : '·'}
        </li>
      ))}
    </ul>
  )
}

/** Plays one affirmation: the page read aloud, or your own recording. */
function PlayButton({ db, habit }: { db: LearningNotesDB; habit: Habit }) {
  const { toast } = useContext(AppUiContext)
  const audio = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  useEffect(
    () => () => {
      audio.current?.pause()
    },
    [],
  )
  if (!habit.fileId && !habit.affirmationPageId) return null
  const play = async () => {
    if (playing) {
      audio.current?.pause()
      setPlaying(false)
      return
    }
    if (habit.fileId) {
      const file = await getAffirmationFile(db, habit.fileId)
      if (!file) return
      const url = URL.createObjectURL(
        new Blob([file.data], { type: file.type }),
      )
      const el = new Audio(url)
      audio.current = el
      el.onended = () => {
        setPlaying(false)
        URL.revokeObjectURL(url)
      }
      setPlaying(true)
      await el.play().catch(() => {
        setPlaying(false)
        toast(t('home.affirm.playFailed'))
      })
      return
    }
    const lines = await pageLines(db, habit.affirmationPageId!)
    const ok = readAffirmation(lines, {
      title: habit.name,
      pageId: habit.affirmationPageId!,
    })
    if (!ok) toast(t('home.affirm.noVoice'))
  }
  return (
    <IconButton
      tip="home.affirmPlay"
      bare
      tipClassName="inline-flex shrink-0"
      type="button"
      data-testid="affirm-play"
      aria-label={t(playing ? 'home.affirm.stop' : 'home.affirm.play', {
        name: habit.name,
      })}
      aria-pressed={playing}
      onClick={() => runTask(play())}
      className="grid size-11 shrink-0 place-items-center rounded-lg border border-line"
    >
      {playing ? '⏹' : '▶'}
    </IconButton>
  )
}

/** The form to add an affirmation: a name, a page of lines, or your voice. */
function AffirmationForm({ db }: { db: LearningNotesDB }) {
  const { toast } = useContext(AppUiContext)
  const pages = useLiveQuery(
    () => recentPages(db, (p) => isLive(p) && !p.databaseId && !p.locked, 300),
    [db],
  )
  const [name, setName] = useState('')
  const [pageId, setPageId] = useState('')
  const [rec, setRec] = useState<AffirmationRecording | null>(null)
  const [voice, setVoice] = useState<{
    data: ArrayBuffer
    type: string
    durationMs: number
  } | null>(null)

  const toggleRecord = async () => {
    if (rec) {
      const out = await rec.stop()
      setRec(null)
      setVoice({
        data: await out.blob.arrayBuffer(),
        type: out.type,
        durationMs: out.durationMs,
      })
      return
    }
    try {
      setVoice(null)
      setRec(await recordAffirmation())
    } catch (e) {
      toast(
        t(
          (e as Error).message === 'denied'
            ? 'audio.denied'
            : 'audio.unsupported',
        ),
      )
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const clean = name.trim()
    if (!clean || rec) return
    runTask(
      (async () => {
        const file = voice
          ? await saveAffirmationFile(db, { name: clean, ...voice })
          : undefined
        await addHabit(db, {
          name: clean,
          routine: 'morning',
          affirmationPageId: pageId || undefined,
          fileId: file?.id,
        })
        setName('')
        setPageId('')
        setVoice(null)
      })(),
    )
  }

  return (
    <form
      onSubmit={submit}
      aria-label={t('home.affirm.add')}
      className="flex flex-col gap-2 rounded-xl border border-line p-3"
    >
      <h4 className="text-sm font-semibold">{t('home.affirm.add')}</h4>
      <input
        data-testid="affirm-name"
        aria-label={t('home.affirm.name')}
        placeholder={t('home.affirm.name')}
        value={name}
        maxLength={200}
        onChange={(e) => setName(e.target.value)}
        className={FIELD}
      />
      <label className="flex flex-col gap-1 text-xs">
        {t('home.affirm.page')}
        <select
          data-testid="affirm-page"
          value={pageId}
          onChange={(e) => setPageId(e.target.value)}
          className={FIELD}
        >
          <option value="">{t('home.affirm.noPage')}</option>
          {(pages ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              {p.title || t('review.untitled')}
            </option>
          ))}
        </select>
      </label>
      <div className="flex flex-wrap items-center gap-2">
        {canRecord() && (
          <button
            type="button"
            data-testid="affirm-record"
            aria-pressed={!!rec}
            onClick={() => runTask(toggleRecord())}
            className="min-h-11 rounded-lg border border-line px-3 text-sm"
          >
            {rec ? t('home.affirm.recordStop') : t('home.affirm.record')}
          </button>
        )}
        {rec && (
          <span role="status" className="text-sm text-danger">
            ● {t('home.affirm.recording')}
          </span>
        )}
        {voice && !rec && (
          <span role="status" data-testid="affirm-recorded" className="text-sm">
            {t('home.affirm.recorded')}
          </span>
        )}
        <button
          type="submit"
          className="ms-auto min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-white"
        >
          {t('home.add')}
        </button>
      </div>
    </form>
  )
}

/**
 * Routines (F3): Morning, Night and Daily tick lists of habits with a
 * 7-day strip each (a missed day is a red cross), plus affirmations that
 * read a page of bullet points aloud or play your own voice. No reminders
 * and no notifications: the web cannot do them without a server.
 */
export function Routines({
  db,
  today,
  dayStart,
  habits,
}: {
  db: LearningNotesDB
  today: string
  dayStart: number
  habits: readonly Habit[]
}) {
  const { toast } = useContext(AppUiContext)
  const checks = useLiveQuery(
    () => listChecks(db, addDays(today, -7), today),
    [db, today],
  )
  const [names, setNames] = useState<Record<string, string>>({})
  if (!checks) return null

  const tick = (habit: Habit) => {
    const done = checks.some(
      (c) => c.habitId === habit.id && c.day === today && c.done,
    )
    runTask(setCheck(db, habit.id, today, !done))
  }

  return (
    <div className="flex flex-col gap-6" data-testid="routines-tab">
      {habits.filter(isLive).length === 0 && (
        <EmptyState
          testId="routines-empty"
          icon="🌅"
          text={t('empty.routines')}
          action={t('empty.routines.action')}
          onAction={() =>
            document
              .querySelector<HTMLInputElement>(
                '[data-testid="habit-name-morning"]',
              )
              ?.focus()
          }
        />
      )}
      {ROUTINES.map((routine) => {
        const own = habits.filter((h) => h.routine === routine)
        return (
          <section
            key={routine}
            aria-label={t(`home.routine.${routine}`)}
            data-testid={`routine-${routine}`}
          >
            <h3 className="mb-2 text-sm font-semibold">
              {t(`home.routine.${routine}`)}
            </h3>
            <ul className="mb-2 flex flex-col gap-1.5">
              {own.map((habit) => {
                const done = checks.some(
                  (c) => c.habitId === habit.id && c.day === today && c.done,
                )
                return (
                  <li
                    key={habit.id}
                    data-testid="habit-row"
                    className="flex flex-wrap items-center gap-1 rounded-lg border border-line ps-1 pe-1"
                  >
                    <IconButton
                      tip="home.tick"
                      bare
                      tipClassName="inline-flex shrink-0"
                      type="button"
                      role="checkbox"
                      aria-checked={done}
                      aria-label={t(
                        done ? 'home.task.untick' : 'home.task.tick',
                        { title: habit.name },
                      )}
                      onClick={() => tick(habit)}
                      className="grid size-11 shrink-0 place-items-center"
                    >
                      <span
                        aria-hidden
                        className={`grid size-5 place-items-center rounded-md border-2 text-xs ${
                          done
                            ? 'border-accent bg-accent text-white'
                            : 'border-ink-soft'
                        }`}
                      >
                        {done ? '✓' : ''}
                      </span>
                    </IconButton>
                    <span className="min-w-0 flex-1 py-2 text-sm break-words">
                      {habit.name}
                    </span>
                    <Strip
                      habit={habit}
                      checks={checks}
                      today={today}
                      dayStart={dayStart}
                    />
                    <PlayButton db={db} habit={habit} />
                    <IconButton
                      tip="home.remove"
                      bare
                      tipClassName="inline-flex shrink-0"
                      type="button"
                      aria-label={t('home.habit.delete', { name: habit.name })}
                      onClick={() => {
                        runTask(deleteHabit(db, habit.id))
                        toast(t('home.habit.deleted'), {
                          label: t('reading.undo'),
                          onSelect: () => runTask(restoreHabit(db, habit.id)),
                        })
                      }}
                      className="grid size-11 place-items-center rounded-lg text-ink-soft hover:bg-hover"
                    >
                      ×
                    </IconButton>
                  </li>
                )
              })}
            </ul>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                const name = names[routine]?.trim()
                if (!name) return
                setNames({ ...names, [routine]: '' })
                runTask(addHabit(db, { name, routine }))
              }}
              className="flex gap-2"
            >
              <input
                data-testid={`habit-name-${routine}`}
                aria-label={t('home.habit.new', {
                  routine: t(`home.routine.${routine}`),
                })}
                placeholder={t('home.habit.placeholder')}
                value={names[routine] ?? ''}
                maxLength={200}
                onChange={(e) =>
                  setNames({ ...names, [routine]: e.target.value })
                }
                className={`${FIELD} min-w-0 flex-1`}
              />
              <button
                type="submit"
                className="min-h-11 rounded-lg border border-line px-4 text-sm"
              >
                {t('home.add')}
              </button>
            </form>
          </section>
        )
      })}
      <AffirmationForm db={db} />
      <p className="text-xs text-muted">{t('home.routine.noReminders')}</p>
    </div>
  )
}
