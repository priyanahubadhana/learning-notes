import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import type { LearningNotesDB } from '../core/db'
import type { PlanBlock, Project } from '../core/homeTypes'
import { isLive } from '../core/records'
import { t } from '../i18n/t'
import { timeLabel } from './timeLabel'
import { getPlan } from './planService'
import { dayTimeline, hoursPerProject, rangeDays, type Span } from './reports'
import { hoursLabel } from './timer'
import { useNow } from './useTimer'

const NO_PLAN: PlanBlock[] = []
const DAY_FROM = 5 * 60
const DAY_TO = 24 * 60

/** One column of the day timeline: blocks placed by their time. */
function Column({
  spans,
  label,
  testId,
}: {
  spans: readonly Span[]
  label: string
  testId: string
}) {
  const total = DAY_TO - DAY_FROM
  return (
    <div className="min-w-0 flex-1">
      <h5 className="mb-1 text-xs font-semibold text-muted">{label}</h5>
      <div
        data-testid={testId}
        className="relative h-72 rounded-lg border border-line"
        role="list"
        aria-label={label}
      >
        {spans.map((s, i) => {
          const from = Math.max(s.startMin, DAY_FROM)
          const to = Math.min(s.endMin, DAY_TO)
          if (to <= from) return null
          return (
            <div
              key={i}
              role="listitem"
              className="absolute inset-x-1 overflow-hidden rounded-md border border-accent bg-hover px-1 text-xs"
              style={{
                top: `${((from - DAY_FROM) / total) * 100}%`,
                height: `${Math.max(2, ((to - from) / total) * 100)}%`,
              }}
            >
              {timeLabel(s.startMin)}–{timeLabel(s.endMin)} {s.label ?? ''}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Reports (F2): hours per project for today or this week (bars), and the
 * day timeline with the plan and the tracked time side by side. Only time
 * you tracked is counted; there are no streaks or scores.
 */
export function ReportsTab({
  db,
  today,
  projects,
}: {
  db: LearningNotesDB
  today: string
  projects: readonly Project[]
}) {
  const [range, setRange] = useState<'today' | 'week'>('today')
  const now = useNow(false)
  const entries = useLiveQuery(
    async () => (await db.timeEntries.toArray()).filter(isLive),
    [db],
  )
  const plan = useLiveQuery(() => getPlan(db, today), [db, today])
  const days = rangeDays(range, today)
  const rows = useMemo(
    () => (entries ? hoursPerProject(entries, days.from, days.to, now) : []),
    [entries, days.from, days.to, now],
  )
  const line = useMemo(
    () => dayTimeline(plan?.blocks ?? NO_PLAN, entries ?? [], today, now),
    [plan, entries, today, now],
  )
  const max = Math.max(1, ...rows.map((r) => r.ms))
  const total = rows.reduce((n, r) => n + r.ms, 0)
  const name = (id: string | null) =>
    id
      ? (projects.find((p) => p.id === id)?.name ?? '—')
      : t('home.project.none')

  return (
    <div className="flex flex-col gap-6" data-testid="reports-tab">
      <div
        role="radiogroup"
        aria-label={t('home.reports.range')}
        className="flex gap-1.5"
      >
        {(['today', 'week'] as const).map((r) => (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={range === r}
            onClick={() => setRange(r)}
            className="min-h-11 rounded-lg border border-line px-4 text-sm aria-checked:border-accent aria-checked:text-accent"
          >
            {t(r === 'today' ? 'home.reports.today' : 'home.reports.week')}
          </button>
        ))}
      </div>

      <section aria-label={t('home.reports.hours')}>
        <h3 className="mb-2 text-sm font-semibold">
          {t('home.reports.hours')}
          <span
            className="ms-2 font-normal text-muted"
            data-testid="report-total"
          >
            {hoursLabel(total)}
          </span>
        </h3>
        {rows.length === 0 ? (
          <p className="text-sm text-muted">{t('home.reports.none')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((r) => (
              <li key={r.projectId ?? 'none'} data-testid="report-row">
                <div className="flex justify-between text-sm">
                  <span className="break-words">{name(r.projectId)}</span>
                  <span className="tabular-nums">{hoursLabel(r.ms)}</span>
                </div>
                <div
                  className="h-3 rounded-full bg-hover"
                  role="img"
                  aria-label={`${name(r.projectId)} ${hoursLabel(r.ms)}`}
                >
                  <div
                    className="h-3 rounded-full bg-accent"
                    style={{ width: `${(r.ms / max) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label={t('home.reports.timeline')}>
        <h3 className="mb-2 text-sm font-semibold">
          {t('home.reports.timeline')}
          <span className="ms-2 font-normal text-muted">
            {t('home.reports.overlap', { minutes: line.overlapMin })}
          </span>
        </h3>
        <div className="flex gap-3">
          <Column
            spans={line.planned}
            label={t('home.reports.planned')}
            testId="timeline-planned"
          />
          <Column
            spans={line.actual}
            label={t('home.reports.actual')}
            testId="timeline-actual"
          />
        </div>
      </section>
      <p className="text-xs text-muted">{t('home.reports.note')}</p>
    </div>
  )
}
