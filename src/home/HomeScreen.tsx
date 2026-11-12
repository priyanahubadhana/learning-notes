import { useLiveQuery } from 'dexie-react-hooks'
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { usePref } from '../app/usePref'
import type { LearningNotesDB } from '../core/db'
import { addDays } from '../core/homeDays'
import { isLive } from '../core/records'
import { dayRecord } from '../core/taskService'
import { t, type MessageKey } from '../i18n/t'
import { buildBriefing } from './briefing'
import { BriefingCard } from './BriefingCard'
import { dayMonthLabel } from './dayLabel'
import { DueTile } from './DueTile'
import { EveningReview } from './EveningReview'
import { listChecks, listHabits, readDayStart } from './habitService'
import { PlanTab } from './PlanTab'
import { ReportsTab } from './ReportsTab'
import { Routines } from './Routines'
import { TasksTab } from './TasksTab'
import { TimerCard } from './TimerCard'
import { Top3 } from './Top3'
import { useTasks, useToday } from './useHomeData'
import { Icon } from '../app/tools/icons'
import { useFlag } from '../app/flags'

// Home v2 (flag home.v2) loads only when the flag is on: with it off the
// first load stays as today (no drag part, no event router).
const HomeBoard = lazy(() =>
  import('./board/HomeBoard').then((m) => ({ default: m.HomeBoard })),
)

const TABS = ['today', 'tasks', 'plan', 'routines', 'reports'] as const
type Tab = (typeof TABS)[number]
const isTab = (v: unknown): v is Tab => TABS.includes(v as Tab)

/** What Home needs from the rest of the app (passed in, no feature links). */
export interface HomeDeps {
  openToday: () => void
  openPage: (pageId: string) => void
  /** How many recall cards are due now (for the Briefing). */
  countCardsDue: () => Promise<number>
  /** Opens the review of all cards. */
  openReview: () => void
  /** Writes notes into today's journal page (the evening review). */
  appendJournal: (entries: { heading: string; text: string }[]) => Promise<void>
}

/**
 * Home (Phase F): the day cockpit. Tabs: Today (Briefing, evening review,
 * Top 3, timer), Tasks (inbox, matrix, upcoming, completed, projects), Plan
 * (the day's timeline), Routines (habits and affirmations) and Reports.
 */
export function HomeScreen({
  db,
  deps,
}: {
  db: LearningNotesDB
  deps: HomeDeps
}) {
  const v2 = useFlag('home.v2')
  const [tab, setTab] = usePref<Tab>('home.tab', isTab, 'today')
  const today = useToday(db)
  const [allDone, setAllDone] = useState(false)
  const { tasks, projects } = useTasks(db, today, allDone)
  const habits = useLiveQuery(() => listHabits(db), [db])
  const dayStart = useLiveQuery(() => readDayStart(db), [db])
  const checks = useLiveQuery(
    async () => (today ? listChecks(db, addDays(today, -7), today) : []),
    [db, today],
  )
  const [cardsDue, setCardsDue] = useState(0)
  const countRef = useRef(deps.countCardsDue)
  useEffect(() => {
    countRef.current = deps.countCardsDue
  })
  useEffect(() => {
    let cancelled = false
    void countRef.current().then((n) => {
      if (!cancelled) setCardsDue(n)
    })
    return () => {
      cancelled = true
    }
  }, [tab, today])

  const record = useMemo(
    () => (tasks && today ? dayRecord(tasks, today) : null),
    [tasks, today],
  )
  const briefing = useMemo(
    () =>
      tasks && habits && checks && today && dayStart !== undefined
        ? buildBriefing({
            today,
            tasks,
            habits: habits.filter(isLive),
            checks,
            cardsDue,
            dayStart,
          })
        : null,
    [tasks, habits, checks, today, dayStart, cardsDue],
  )
  if (!today || !tasks || !projects || !habits || dayStart === undefined) {
    return null
  }

  return (
    <section
      aria-label={t('space.home')}
      data-testid="home-screen"
      className="mx-auto w-full max-w-3xl px-4 py-5"
    >
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold">{t('space.home')}</h2>
        <p className="text-sm text-muted">{dayMonthLabel(today)}</p>
      </header>
      <div role="tablist" className="mb-4 flex flex-wrap gap-1.5">
        {TABS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`min-h-11 rounded-lg px-4 text-sm ${
              tab === id
                ? 'bg-hover font-semibold text-accent'
                : 'text-ink-soft hover:bg-hover'
            }`}
          >
            {t(`home.tab.${id}` as MessageKey)}
          </button>
        ))}
      </div>
      {tab === 'today' && record && v2 && (
        <div className="flex flex-col gap-4" data-testid="home-today">
          <Suspense fallback={null}>
            <HomeBoard
              data={{
                db,
                today,
                tasks,
                projects,
                briefing,
                cardsDue,
                record,
                openReview: deps.openReview,
              }}
            />
          </Suspense>
          <button
            type="button"
            onClick={deps.openToday}
            className="min-h-11 rounded-lg border border-line px-3 text-start text-sm hover:border-accent"
          >
            <Icon name="sun" size={16} className="me-1 inline" />
            {t('space.home.today', { date: dayMonthLabel(today) })}
          </button>
          <EveningReview
            db={db}
            tasks={tasks}
            today={today}
            appendJournal={deps.appendJournal}
          />
        </div>
      )}
      {tab === 'today' && record && !v2 && (
        <div className="flex flex-col gap-4" data-testid="home-today">
          <DueTile count={cardsDue} onStart={deps.openReview} />
          {briefing && (
            <BriefingCard briefing={briefing} onOpenCards={deps.openReview} />
          )}
          <button
            type="button"
            onClick={deps.openToday}
            className="min-h-11 rounded-lg border border-line px-3 text-start text-sm hover:border-accent"
          >
            <Icon name="sun" size={16} className="me-1 inline" />
            {t('space.home.today', { date: dayMonthLabel(today) })}
          </button>
          <Top3 db={db} tasks={tasks} today={today} />
          <TimerCard db={db} projects={projects} />
          <EveningReview
            db={db}
            tasks={tasks}
            today={today}
            appendJournal={deps.appendJournal}
          />
          <div className="grid grid-cols-3 gap-2 text-center">
            {(
              [
                ['home.record.open', record.open.length],
                ['home.record.done', record.done.length],
                ['home.record.carried', record.carried.length],
              ] as const
            ).map(([key, n]) => (
              <div key={key} className="rounded-xl border border-line p-3">
                <div className="text-2xl font-semibold tabular-nums">{n}</div>
                <div className="text-xs text-muted">{t(key)}</div>
              </div>
            ))}
          </div>
          {record.open.length === 0 && record.done.length === 0 && (
            <p className="text-sm text-muted">{t('home.today.empty')}</p>
          )}
        </div>
      )}
      {tab === 'tasks' && (
        <TasksTab
          db={db}
          today={today}
          tasks={tasks}
          projects={projects}
          onOpenPage={deps.openPage}
          onShowOlder={allDone ? undefined : () => setAllDone(true)}
        />
      )}
      {tab === 'plan' && (
        <PlanTab db={db} today={today} tasks={tasks} projects={projects} />
      )}
      {tab === 'routines' && (
        <Routines db={db} today={today} dayStart={dayStart} habits={habits} />
      )}
      {tab === 'reports' && (
        <ReportsTab db={db} today={today} projects={projects} />
      )}
    </section>
  )
}
