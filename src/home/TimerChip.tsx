import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { runTask } from '../app/errors'
import type { LearningNotesDB } from '../core/db'
import { listProjects } from '../core/taskService'
import { t } from '../i18n/t'
import {
  clock,
  elapsedMs,
  fromCycleList,
  phaseAt,
  STILL_WORKING_MS,
} from './timer'
import { keepWorking, stopAt, stopTimer } from './timerService'
import { useNow, useRunning } from './useTimer'

/** "14:30" from a UTC time, for the time field. */
const timeValue = (at: number): string => {
  const d = new Date(at)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** The UTC time for "HH:MM" on the day of `near`. */
const timeOnDayOf = (near: number, value: string): number => {
  const [h, m] = value.split(':').map(Number)
  const d = new Date(near)
  d.setHours(h || 0, m || 0, 0, 0)
  return d.getTime()
}

/**
 * The running chip (F2), on every screen beside the now-playing pill: the
 * project and the time (the Focus countdown in Focus mode). After 2 hours
 * it asks "Still working?": Keep, or Stop at a time you choose.
 */
export function TimerChip({
  db,
  onOpenHome,
}: {
  db: LearningNotesDB
  onOpenHome: () => void
}) {
  const running = useRunning(db)
  const now = useNow(!!running)
  const projects = useLiveQuery(() => listProjects(db), [db])
  const [choosing, setChoosing] = useState(false)
  const [stopTime, setStopTime] = useState('')
  if (!running) return null

  const elapsed = elapsedMs(running.startedAt, now)
  const phase =
    running.mode === 'focus'
      ? phaseAt(elapsed, fromCycleList(running.cycle))
      : undefined
  const project = projects?.find((p) => p.id === running.projectId)
  const asked = running.ackedAt ?? running.startedAt
  const stillWorking = now - asked >= STILL_WORKING_MS
  const btn =
    'min-h-11 rounded-full px-3 text-sm hover:bg-hover focus-visible:outline-2'

  return (
    <div
      data-chrome
      data-testid="timer-chip"
      role="region"
      aria-label={t('home.timer.chip')}
      className="fixed end-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-[44] flex max-w-[min(24rem,calc(100vw-1.5rem))] flex-col gap-1 rounded-2xl border border-line bg-bg py-0.5 ps-3 pe-1 text-ink shadow-[0_6px_20px_rgba(0,0,0,0.16)] phone:bottom-[calc(env(safe-area-inset-bottom)+4.25rem)]"
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          data-chrome
          onClick={onOpenHome}
          className="min-h-11 min-w-0 flex-1 truncate text-start text-sm"
        >
          <span className="tabular-nums">
            {clock(phase ? phase.remainingMs : elapsed)}
          </span>
          <span className="text-muted">
            {' · '}
            {phase
              ? t(`home.phase.${phase.phase}`, { round: phase.round })
              : (project?.name ?? t('home.project.none'))}
          </span>
        </button>
        <button
          type="button"
          data-chrome
          aria-label={t('home.timer.stop')}
          title={t('home.timer.stop')}
          onClick={() => runTask(stopTimer(db))}
          className="grid size-11 place-items-center rounded-full hover:bg-hover"
        >
          ⏹
        </button>
      </div>
      {stillWorking && (
        <div
          data-testid="still-working"
          role="group"
          aria-label={t('home.still.title')}
          className="pe-2 pb-2 text-sm"
        >
          <p className="mb-1">{t('home.still.title')}</p>
          {choosing ? (
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (!stopTime) return
                runTask(stopAt(db, running.id, timeOnDayOf(now, stopTime)))
              }}
            >
              <label className="sr-only" htmlFor="still-stop-time">
                {t('home.still.stopAt')}
              </label>
              <input
                id="still-stop-time"
                type="time"
                value={stopTime}
                onChange={(e) => setStopTime(e.target.value)}
                className="min-h-11 rounded-lg border-2 border-ink-soft bg-bg px-2"
              />
              <button type="submit" className={`${btn} border border-line`}>
                {t('home.still.stop')}
              </button>
            </form>
          ) : (
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                data-chrome
                className={`${btn} border border-line`}
                onClick={() => runTask(keepWorking(db, running.id))}
              >
                {t('home.still.keep')}
              </button>
              <button
                type="button"
                data-chrome
                className={`${btn} border border-line`}
                onClick={() => {
                  setStopTime(timeValue(asked))
                  setChoosing(true)
                }}
              >
                {t('home.still.stopAt')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
