import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import type { LearningNotesDB } from '../core/db'
import type { Project, Task } from '../core/homeTypes'
import { addDays } from '../core/homeDays'
import {
  RECENT_DONE_DAYS,
  listProjects,
  listTasks,
  todayKey,
} from '../core/taskService'

/** The Home day, re-read every minute so it changes at the day-start hour. */
export function useToday(db: LearningNotesDB): string | null {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 60_000)
    return () => clearInterval(timer)
  }, [])
  return useLiveQuery(() => todayKey(db), [db, tick]) ?? null
}

/**
 * Live tasks and projects. Done tasks from the last 60 days load at first;
 * `allDone` (Completed › Show older) loads the rest.
 */
export function useTasks(
  db: LearningNotesDB,
  today: string | null,
  allDone = false,
): {
  tasks: Task[] | undefined
  projects: Project[] | undefined
} {
  const tasks = useLiveQuery(
    () =>
      today
        ? listTasks(db, {
            doneSince: allDone ? undefined : addDays(today, -RECENT_DONE_DAYS),
          })
        : undefined,
    [db, today, allDone],
  )
  const projects = useLiveQuery(() => listProjects(db), [db])
  return { tasks, projects }
}
