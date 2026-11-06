import type { BaseRecord, OrderKey } from './types'

/**
 * Records of the Home cockpit (Phase F, Dexie 19). Days are local
 * "YYYY-MM-DD" strings that roll over at the "Day starts at" hour; times are
 * UTC milliseconds. Every record keeps the sync rules (docs/features/sync.md):
 * soft deletes only, `updatedAt` on every write.
 */

/** 0 = inbox (not placed yet); 1 Do, 2 Schedule, 3 Delegate, 4 Drop. */
export type Quadrant = 0 | 1 | 2 | 3 | 4

export interface CarryStep {
  from: string
  to: string
  at: number
}

export interface Task extends BaseRecord {
  title: string
  /** 'dropped' is reserved; the Drop box keeps tasks open (never deleted). */
  status: 'open' | 'done' | 'dropped'
  quadrant: Quadrant
  order: OrderKey
  /** The day it is planned for (an unfinished task stays where it was). */
  plannedDay?: string
  doneAt?: number
  doneDay?: string
  /** The day this task is one of the Top 3 (F2). */
  top3Day?: string
  projectId?: string
  /** A plain list name ("Errands"); unset = no list. */
  listName?: string
  /** A checklist line this task is linked to (F1 "→ Home"). */
  sourceBlockId?: string
  sourcePageId?: string
  carried: CarryStep[]
  estimateMin?: number
  note?: string
}

export interface Project extends BaseRecord {
  name: string
  order: OrderKey
  colour?: string
}

/** One stretch of work on a project (F2). `endedAt` unset = running now. */
export interface TimeEntry extends BaseRecord {
  startedAt: number
  endedAt?: number
  /** The day it started on (day-start hour applied). */
  day: string
  projectId?: string
  mode: 'free' | 'focus'
  /** Focus mode: planned length of this stretch in minutes. */
  plannedMin?: number
  /** Focus mode: how many focus stretches ran in this run (1-based). */
  round?: number
}

/** A planned block on the day's timeline (F2). */
export interface PlanBlock {
  id: string
  /** Minutes after midnight (local). */
  startMin: number
  durationMin: number
  taskId?: string
  title?: string
  projectId?: string
}

export interface DayPlan extends BaseRecord {
  day: string
  blocks: PlanBlock[]
}

export interface Habit extends BaseRecord {
  name: string
  routine: 'morning' | 'night' | 'daily'
  order: OrderKey
  /** An affirmation: the page of bullet points read aloud (F3). */
  affirmationPageId?: string
  /** An affirmation recorded in your own voice (a `files` row). */
  fileId?: string
}

export interface HabitCheck extends BaseRecord {
  habitId: string
  day: string
  done: boolean
}

/** A recording kept for Home (an affirmation in your own voice). */
export interface HomeFile extends BaseRecord {
  kind: 'audio'
  type: string
  name: string
  durationMs: number
  data: ArrayBuffer
}
