import type { LearningNotesDB } from './db'
import { addDays, dayKeyOf } from './homeDays'
import type { Project, Quadrant, Task } from './homeTypes'
import { byOrder, orderAtIndex } from './order'
import { getLive, isLive, newRecordFields } from './records'
import { dayStartHour } from '../settings/builtinSettings'
import { getSetting } from '../settings/settingsService'

/**
 * All reads and writes of Home tasks and projects (F1). Soft deletes only;
 * nothing here removes a task. A task is never moved by the app on its own:
 * only the person (a drag, a menu, a tick) changes its box or its day.
 */

/** The Home day "today", using the "Day starts at" setting. */
export async function todayKey(
  db: LearningNotesDB,
  now: number = Date.now(),
): Promise<string> {
  return dayKeyOf(now, await getSetting(db, dayStartHour))
}

export interface NewTask {
  title: string
  plannedDay?: string
  quadrant?: Quadrant
  projectId?: string
  listName?: string
  sourceBlockId?: string
  sourcePageId?: string
  estimateMin?: number
}

/** Done tasks older than this many days load only on "Show older". */
export const RECENT_DONE_DAYS = 60

/**
 * Live tasks, by box order. Without `doneSince` that is every task. With it,
 * open and dropped tasks plus the tasks done on or after that day, read by
 * the `status` and `doneDay` indexes, so years of finished tasks are not
 * loaded with the Home screen.
 */
export async function listTasks(
  db: LearningNotesDB,
  opts: { doneSince?: string } = {},
): Promise<Task[]> {
  if (opts.doneSince === undefined) {
    return (await db.tasks.toArray()).filter(isLive).sort(byOrder)
  }
  const since = opts.doneSince
  const [active, recentDone] = await Promise.all([
    db.tasks.where('status').anyOf('open', 'dropped').toArray(),
    db.tasks
      .where('doneDay')
      .aboveOrEqual(since)
      .filter((t) => t.status === 'done')
      .toArray(),
  ])
  return [...active, ...recentDone].filter(isLive).sort(byOrder)
}

/** Adds a task to the inbox (or straight into a box when told). */
export async function addTask(
  db: LearningNotesDB,
  input: NewTask,
): Promise<Task> {
  const title = input.title.trim()
  if (!title) throw new Error('A task needs a title')
  const quadrant = input.quadrant ?? 0
  return db.transaction('rw', db.tasks, async () => {
    const same = (await db.tasks.where('quadrant').equals(quadrant).toArray())
      .filter((t) => isLive(t) && t.status === 'open')
      .sort(byOrder)
    const task: Task = {
      ...newRecordFields(),
      title: title.slice(0, 500),
      status: 'open',
      quadrant,
      order: orderAtIndex(
        same.map((t) => t.order),
        same.length,
      ),
      carried: [],
      ...(input.plannedDay ? { plannedDay: input.plannedDay } : {}),
      ...(input.projectId ? { projectId: input.projectId } : {}),
      ...(input.listName ? { listName: input.listName } : {}),
      ...(input.sourceBlockId ? { sourceBlockId: input.sourceBlockId } : {}),
      ...(input.sourcePageId ? { sourcePageId: input.sourcePageId } : {}),
      ...(input.estimateMin ? { estimateMin: input.estimateMin } : {}),
    }
    await db.tasks.add(task)
    return task
  })
}

export async function renameTask(
  db: LearningNotesDB,
  id: string,
  title: string,
): Promise<void> {
  const clean = title.trim()
  if (!clean) return
  await getLive(db.tasks, id)
  await db.tasks.update(id, {
    title: clean.slice(0, 500),
    updatedAt: Date.now(),
  })
}

/** Puts a task into a box (0 = back to the inbox), at `index` (default end). */
export async function moveToQuadrant(
  db: LearningNotesDB,
  id: string,
  quadrant: Quadrant,
  index: number = Number.MAX_SAFE_INTEGER,
): Promise<void> {
  await db.transaction('rw', db.tasks, async () => {
    await getLive(db.tasks, id)
    const siblings = (
      await db.tasks.where('quadrant').equals(quadrant).toArray()
    )
      .filter((t) => isLive(t) && t.status === 'open' && t.id !== id)
      .sort(byOrder)
    await db.tasks.update(id, {
      quadrant,
      order: orderAtIndex(
        siblings.map((t) => t.order),
        index,
      ),
      updatedAt: Date.now(),
    })
  })
}

/** Ticks a task: it moves to Completed, on the day it was done. */
export async function completeTask(
  db: LearningNotesDB,
  id: string,
  now: number = Date.now(),
): Promise<void> {
  const day = await todayKey(db, now)
  await getLive(db.tasks, id)
  await db.tasks.update(id, {
    status: 'done',
    doneAt: now,
    doneDay: day,
    updatedAt: now,
  })
}

/** Unticks a task: back to open, in the same box. */
export async function reopenTask(
  db: LearningNotesDB,
  id: string,
  now: number = Date.now(),
): Promise<void> {
  await getLive(db.tasks, id)
  await db.tasks.update(id, {
    status: 'open',
    doneAt: undefined,
    doneDay: undefined,
    updatedAt: now,
  })
}

/**
 * Carries an unfinished task to another day ("Tomorrow", "Pick a day"). The
 * history keeps every step, so "carried 3×" can be shown quietly.
 */
export async function carryTask(
  db: LearningNotesDB,
  id: string,
  toDay: string,
  now: number = Date.now(),
): Promise<void> {
  const today = await todayKey(db, now)
  const task = await getLive(db.tasks, id)
  const from = task.plannedDay ?? today
  if (from === toDay) return
  await db.tasks.update(id, {
    plannedDay: toDay,
    carried: [...task.carried, { from, to: toDay, at: now }],
    updatedAt: now,
  })
}

export const carryToTomorrow = async (
  db: LearningNotesDB,
  id: string,
  now: number = Date.now(),
): Promise<void> => carryTask(db, id, addDays(await todayKey(db, now), 1), now)

/** "Move to list…": a plain list name; empty clears it. */
export async function moveToList(
  db: LearningNotesDB,
  id: string,
  listName: string,
): Promise<void> {
  await getLive(db.tasks, id)
  await db.tasks.update(id, {
    listName: listName.trim().slice(0, 100) || undefined,
    updatedAt: Date.now(),
  })
}

export async function setTaskProject(
  db: LearningNotesDB,
  id: string,
  projectId: string | undefined,
): Promise<void> {
  await getLive(db.tasks, id)
  await db.tasks.update(id, { projectId, updatedAt: Date.now() })
}

/** Soft delete (Undo restores it). Never used by the app on its own. */
export async function deleteTask(
  db: LearningNotesDB,
  id: string,
): Promise<void> {
  const now = Date.now()
  await db.tasks.update(id, { deletedAt: now, updatedAt: now })
}

export async function restoreTask(
  db: LearningNotesDB,
  id: string,
): Promise<void> {
  await db.tasks.update(id, { deletedAt: null, updatedAt: Date.now() })
}

// ---- Projects ----

// Projects stay whole: a person has a handful, never thousands.
export async function listProjects(db: LearningNotesDB): Promise<Project[]> {
  return (await db.projects.toArray()).filter(isLive).sort(byOrder)
}

export async function addProject(
  db: LearningNotesDB,
  name: string,
  colour?: string,
): Promise<Project> {
  const clean = name.trim().slice(0, 100)
  if (!clean) throw new Error('A project needs a name')
  const all = await listProjects(db)
  const project: Project = {
    ...newRecordFields(),
    name: clean,
    order: orderAtIndex(
      all.map((p) => p.order),
      all.length,
    ),
    ...(colour ? { colour } : {}),
  }
  await db.projects.add(project)
  return project
}

export async function renameProject(
  db: LearningNotesDB,
  id: string,
  name: string,
): Promise<void> {
  const clean = name.trim().slice(0, 100)
  if (!clean) return
  await getLive(db.projects, id)
  await db.projects.update(id, { name: clean, updatedAt: Date.now() })
}

export async function deleteProject(
  db: LearningNotesDB,
  id: string,
): Promise<void> {
  const now = Date.now()
  await db.projects.update(id, { deletedAt: now, updatedAt: now })
}

// ---- Tasks from notes ----

/**
 * The task linked to a checklist line, or a new one. Ticking either side
 * ticks both (see `syncTasksFromBlocks` and app/taskLink.ts).
 */
export async function taskFromBlock(
  db: LearningNotesDB,
  input: {
    title: string
    blockId: string
    pageId: string
    checked: boolean
  },
): Promise<{ task: Task; created: boolean }> {
  const found = (
    await db.tasks.where('sourceBlockId').equals(input.blockId).toArray()
  ).find(isLive)
  if (found) return { task: found, created: false }
  const day = await todayKey(db)
  const task = await addTask(db, {
    title: input.title,
    plannedDay: day,
    sourceBlockId: input.blockId,
    sourcePageId: input.pageId,
  })
  if (input.checked) await completeTask(db, task.id)
  return { task: (await db.tasks.get(task.id)) ?? task, created: true }
}

/**
 * A checklist line was saved: if a task is linked to it and the tick
 * differs, the task follows. Runs inside `saveBlockChanges`' transaction
 * (needs `tasks` and `settings` in it). Returns how many tasks changed.
 */
export async function syncTasksFromBlocks(
  db: LearningNotesDB,
  blocks: readonly { id: string; type: string; content: unknown }[],
  now: number = Date.now(),
): Promise<number> {
  const lines = blocks.filter((b) => b.type === 'checkListItem')
  if (lines.length === 0) return 0
  let changed = 0
  let day: string | null = null
  for (const line of lines) {
    const checked =
      (line.content as { checked?: unknown } | null)?.checked === true
    const linked = (
      await db.tasks.where('sourceBlockId').equals(line.id).toArray()
    ).filter(isLive)
    for (const task of linked) {
      if ((task.status === 'done') === checked) continue
      day ??= await todayKey(db, now)
      await db.tasks.update(
        task.id,
        checked
          ? { status: 'done', doneAt: now, doneDay: day, updatedAt: now }
          : {
              status: 'open',
              doneAt: undefined,
              doneDay: undefined,
              updatedAt: now,
            },
      )
      changed++
    }
  }
  return changed
}

// ---- Views (pure) ----

export interface TaskBuckets {
  inbox: Task[]
  /** Open tasks in boxes 1 to 4. */
  matrix: Record<1 | 2 | 3 | 4, Task[]>
  /** Done tasks, newest first. */
  completed: Task[]
}

export function bucketTasks(tasks: readonly Task[]): TaskBuckets {
  const matrix: TaskBuckets['matrix'] = { 1: [], 2: [], 3: [], 4: [] }
  const inbox: Task[] = []
  const completed: Task[] = []
  for (const task of [...tasks].sort(byOrder)) {
    if (task.status === 'done') completed.push(task)
    else if (task.quadrant === 0) inbox.push(task)
    else matrix[task.quadrant].push(task)
  }
  completed.sort((a, b) => (b.doneAt ?? 0) - (a.doneAt ?? 0))
  return { inbox, matrix, completed }
}

/** Open tasks planned after `today`, grouped by day, soonest first. */
export function upcomingByDay(
  tasks: readonly Task[],
  today: string,
): { day: string; tasks: Task[] }[] {
  const days = new Map<string, Task[]>()
  for (const task of tasks) {
    if (task.status !== 'open' || !task.plannedDay) continue
    if (task.plannedDay <= today) continue
    const list = days.get(task.plannedDay) ?? []
    list.push(task)
    days.set(task.plannedDay, list)
  }
  return [...days.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([day, list]) => ({ day, tasks: list }))
}

/** What happened on `day`, for the journal page's read-only Day record. */
export function dayRecord(
  tasks: readonly Task[],
  day: string,
): { done: Task[]; carried: Task[]; open: Task[] } {
  return {
    done: tasks.filter((t) => t.status === 'done' && t.doneDay === day),
    carried: tasks.filter(
      (t) => t.status === 'open' && t.carried.some((c) => c.from === day),
    ),
    open: tasks.filter((t) => t.status === 'open' && t.plannedDay === day),
  }
}

/** How many times a task was carried to another day. */
export const carriedTimes = (task: Task): number => task.carried.length

/** The quiet "carried 3×" label shows from the third carry on. */
export const showsCarried = (task: Task): boolean => carriedTimes(task) >= 3

// ---- Top 3 (F2) ----

export const TOP3_MAX = 3

/** The Top 3 of a day, in their box order (steady while you tick). */
export function top3Of(tasks: readonly Task[], day: string): Task[] {
  return tasks.filter((t) => t.top3Day === day).sort(byOrder)
}

/**
 * Makes a task one of the day's Top 3 (or takes it out). Returns false when
 * three are already chosen: the app never swaps one for you.
 */
export async function setTop3(
  db: LearningNotesDB,
  id: string,
  day: string,
  on: boolean,
): Promise<boolean> {
  return db.transaction('rw', db.tasks, async () => {
    const task = await getLive(db.tasks, id)
    if (!on) {
      if (task.top3Day === day) {
        await db.tasks.update(id, { top3Day: undefined, updatedAt: Date.now() })
      }
      return true
    }
    const chosen = (
      await db.tasks.where('top3Day').equals(day).toArray()
    ).filter((t) => isLive(t) && t.id !== id)
    if (chosen.length >= TOP3_MAX) return false
    await db.tasks.update(id, { top3Day: day, updatedAt: Date.now() })
    return true
  })
}

/**
 * How each Top 3 task stands on `day`: done (a tick), still to do today, or
 * missed once the day is over (a red cross).
 */
export function top3Marks(
  tasks: readonly Task[],
  day: string,
  today: string,
): { task: Task; mark: 'done' | 'todo' | 'missed' }[] {
  return top3Of(tasks, day).map((task) => ({
    task,
    mark: task.status === 'done' ? 'done' : day < today ? 'missed' : 'todo',
  }))
}
