import { useMemo } from 'react'
import { usePref } from '../app/usePref'
import type { LearningNotesDB } from '../core/db'
import { dayRecord } from '../core/taskService'
import { t, type MessageKey } from '../i18n/t'
import { dayMonthLabel } from './dayLabel'
import { TasksTab } from './TasksTab'
import { useTasks, useToday } from './useHomeData'

const TABS = ['today', 'tasks'] as const
type Tab = (typeof TABS)[number]
const isTab = (v: unknown): v is Tab => TABS.includes(v as Tab)

/** What Home needs from the rest of the app (passed in, no feature links). */
export interface HomeDeps {
  openToday: () => void
  openPage: (pageId: string) => void
}

/**
 * Home (Phase F): the day cockpit. Tabs: Today (the day at a glance) and
 * Tasks (inbox, matrix, upcoming, completed, projects). More tabs arrive
 * with the timer, plan, routines and reports.
 */
export function HomeScreen({
  db,
  deps,
}: {
  db: LearningNotesDB
  deps: HomeDeps
}) {
  const [tab, setTab] = usePref<Tab>('home.tab', isTab, 'today')
  const today = useToday(db)
  const { tasks, projects } = useTasks(db)
  const record = useMemo(
    () => (tasks && today ? dayRecord(tasks, today) : null),
    [tasks, today],
  )
  if (!today || !tasks || !projects) return null

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
      <div role="tablist" className="mb-4 flex gap-1.5">
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
      {tab === 'today' && record && (
        <div className="flex flex-col gap-4" data-testid="home-today">
          <button
            type="button"
            onClick={deps.openToday}
            className="min-h-11 rounded-lg border border-line px-3 text-start text-sm hover:border-accent"
          >
            ☀ {t('space.home.today', { date: dayMonthLabel(today) })}
          </button>
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
          <ul className="flex flex-col gap-1">
            {record.open.map((task) => (
              <li key={task.id} className="px-1 text-sm">
                {task.title}
              </li>
            ))}
          </ul>
        </div>
      )}
      {tab === 'tasks' && (
        <TasksTab
          db={db}
          today={today}
          tasks={tasks}
          projects={projects}
          onOpenPage={deps.openPage}
        />
      )}
    </section>
  )
}
