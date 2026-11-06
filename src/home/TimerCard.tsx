import { useEffect, useRef, useState } from 'react'
import { usePref } from '../app/usePref'
import { isOneOfStrings } from './prefs'
import { lockIdle } from '../app/reading/wakeLock'
import { runTask } from '../app/errors'
import type { LearningNotesDB } from '../core/db'
import type { Project } from '../core/homeTypes'
import { t } from '../i18n/t'
import { beep } from './beep'
import { clock, elapsedMs, fromCycleList, phaseAt, type Cycle } from './timer'
import { startTimer, stopTimer } from './timerService'
import { readCycle, saveCycle, useNow, useRunning } from './useTimer'

const MODES = ['free', 'focus'] as const
type Mode = (typeof MODES)[number]

const FIELD = 'min-h-11 rounded-lg border-2 border-ink-soft bg-bg px-3 text-sm'

/**
 * The timer (F2): one big Start / Stop, a project to pick (time is tracked
 * by project only), and two modes. Free counts up. Focus runs 25 min focus
 * / 5 min break (long break after every 4th; lengths are editable). The time
 * shown is always now minus the start, so it survives a reload or sleep.
 */
export function TimerCard({
  db,
  projects,
}: {
  db: LearningNotesDB
  projects: readonly Project[]
}) {
  const running = useRunning(db)
  const now = useNow(!!running)
  const [mode, setMode] = usePref<Mode>(
    'home.timerMode',
    isOneOfStrings(MODES),
    'free',
  )
  const [projectId, setProjectId] = usePref<string>(
    'home.timerProject',
    (v): v is string => typeof v === 'string',
    '',
  )
  const [cycle, setCycle] = useState<Cycle>(readCycle)
  const known = projects.some((p) => p.id === projectId)
  const chosen = known ? projectId : ''

  const live = running ?? undefined
  const liveCycle = live?.cycle ? fromCycleList(live.cycle) : cycle
  const elapsed = live ? elapsedMs(live.startedAt, now) : 0
  const phase = live?.mode === 'focus' ? phaseAt(elapsed, liveCycle) : undefined

  // A sound when a phase ends, only while the app is open (no notifications).
  const lastPhase = useRef<string | null>(null)
  useEffect(() => {
    if (!live || !phase) {
      lastPhase.current = null
      return
    }
    const key = `${live.id}:${phase.round}:${phase.phase}`
    if (lastPhase.current !== null && lastPhase.current !== key) beep()
    lastPhase.current = key
  }, [live, phase])

  // The screen stays awake only while a Focus run is on screen.
  const focusing = live?.mode === 'focus'
  useEffect(() => lockIdle(!!focusing), [focusing])

  if (running === null) return null
  const toggle = () =>
    runTask(
      live
        ? stopTimer(db)
        : startTimer(db, {
            mode,
            projectId: chosen || undefined,
            cycle: mode === 'focus' ? cycle : undefined,
          }),
    )

  const edit = (key: keyof Cycle, value: string) => {
    const next = { ...cycle, [key]: Number(value) }
    setCycle(Number.isFinite(next[key]) ? next : cycle)
  }

  return (
    <section
      aria-label={t('home.timer')}
      data-testid="timer-card"
      className="rounded-xl border border-line p-3"
    >
      <h3 className="mb-2 text-sm font-semibold">{t('home.timer')}</h3>
      <div className="mb-3 text-center">
        <div
          data-testid="timer-clock"

          className="text-5xl font-semibold tabular-nums"
        >
          {live
            ? phase
              ? clock(phase.remainingMs)
              : clock(elapsed)
            : clock(0)}
        </div>
        <div className="mt-1 min-h-5 text-sm text-muted" aria-live="polite">
          {live && phase
            ? t(`home.phase.${phase.phase}`, { round: phase.round })
            : live
              ? t('home.timer.running')
              : t('home.timer.idle')}
        </div>
      </div>
      <button
        type="button"
        data-testid="timer-toggle"
        onClick={toggle}
        className={`mb-3 min-h-14 w-full rounded-xl text-lg font-semibold ${
          live ? 'border-2 border-ink-soft' : 'bg-accent text-white'
        }`}
      >
        {t(live ? 'home.timer.stop' : 'home.timer.start')}
      </button>
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="timer-project">
          {t('home.timer.project')}
        </label>
        <select
          id="timer-project"
          value={live ? (live.projectId ?? '') : chosen}
          disabled={!!live}
          onChange={(e) => setProjectId(e.target.value)}
          className={`${FIELD} min-w-0 flex-1`}
        >
          <option value="">{t('home.project.none')}</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <div
          role="radiogroup"
          aria-label={t('home.timer.mode')}
          className="flex gap-1"
        >
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={(live?.mode ?? mode) === m}
              disabled={!!live}
              onClick={() => setMode(m)}
              className="min-h-11 rounded-lg border border-line px-3 text-sm aria-checked:border-accent aria-checked:text-accent disabled:opacity-60"
            >
              {t(m === 'free' ? 'home.timer.free' : 'home.timer.focus')}
            </button>
          ))}
        </div>
      </div>
      {mode === 'focus' && !live && (
        <details className="mt-3 text-sm">
          <summary className="min-h-11 cursor-pointer py-2">
            {t('home.timer.lengths')}
          </summary>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(
              [
                ['focus', 'home.timer.len.focus'],
                ['short', 'home.timer.len.short'],
                ['long', 'home.timer.len.long'],
                ['every', 'home.timer.len.every'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex flex-col gap-1 text-xs">
                {t(label)}
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={cycle[key]}
                  onChange={(e) => edit(key, e.target.value)}
                  onBlur={() => setCycle(saveCycle(cycle))}
                  className={FIELD}
                />
              </label>
            ))}
          </div>
        </details>
      )}
    </section>
  )
}
