import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import type { LearningNotesDB } from '../core/db'
import type { Project, Task } from '../core/homeTypes'
import { listProjects, listTasks, todayKey } from '../core/taskService'

/** The Home day, re-read every minute so it changes at the day-start hour. */
export function useToday(db: LearningNotesDB): string | null {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 60_000)
    return () => clearInterval(timer)
  }, [])
  return useLiveQuery(() => todayKey(db), [db, tick]) ?? null
}

/** Live tasks and projects. */
export function useTasks(db: LearningNotesDB): {
  tasks: Task[] | undefined
  projects: Project[] | undefined
} {
  const tasks = useLiveQuery(() => listTasks(db), [db])
  const projects = useLiveQuery(() => listProjects(db), [db])
  return { tasks, projects }
}
