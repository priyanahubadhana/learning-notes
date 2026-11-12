/**
 * Job records and the state machine (docs/design/ai-tool-framework.md
 * section 7, AF-12). Plain data only: this is what the `aiJobs` table will
 * hold. Nothing here touches the notes.
 */

export type JobState =
  | 'draft'
  | 'validated'
  | 'queued'
  | 'running'
  | 'needs_attention'
  | 'waiting_offline'
  | 'preview'
  | 'applying'
  | 'applied'
  | 'undone'
  | 'failed'
  | 'cancelled'

export type StepState =
  | 'waiting'
  | 'running'
  | 'done'
  | 'failed'
  | 'skipped'
  | 'blocked'

export const JOB_STATES: readonly JobState[] = [
  'draft',
  'validated',
  'queued',
  'running',
  'needs_attention',
  'waiting_offline',
  'preview',
  'applying',
  'applied',
  'undone',
  'failed',
  'cancelled',
]

export const STEP_STATES: readonly StepState[] = [
  'waiting',
  'running',
  'done',
  'failed',
  'skipped',
  'blocked',
]

/** Every allowed move (section 7). `failed` and `cancelled` are final. */
export const TRANSITIONS: Readonly<Record<JobState, readonly JobState[]>> = {
  draft: ['validated', 'cancelled'],
  validated: ['queued', 'running', 'waiting_offline', 'cancelled'],
  queued: ['running', 'waiting_offline', 'cancelled'],
  running: [
    'preview',
    'needs_attention',
    'waiting_offline',
    'failed',
    'cancelled',
  ],
  needs_attention: ['running', 'cancelled'],
  waiting_offline: ['running', 'queued', 'cancelled'],
  // preview -> running: staging again after a page changed (restage).
  preview: ['applying', 'running', 'cancelled'],
  applying: ['applied', 'failed', 'preview'],
  applied: ['undone'],
  undone: ['applied'],
  failed: [],
  cancelled: [],
}

export const STEP_TRANSITIONS: Readonly<
  Record<StepState, readonly StepState[]>
> = {
  waiting: ['running', 'skipped', 'blocked'],
  running: ['done', 'failed', 'waiting', 'skipped'],
  done: ['waiting'],
  failed: ['waiting', 'skipped', 'blocked'],
  skipped: [],
  blocked: [],
}

export class TransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Not allowed: ${from} -> ${to}`)
    this.name = 'TransitionError'
  }
}

export function canTransition(from: JobState, to: JobState): boolean {
  return TRANSITIONS[from].includes(to)
}

/** Throws unless the move is drawn in section 7. */
export function assertTransition(from: JobState, to: JobState): void {
  if (!canTransition(from, to)) throw new TransitionError(from, to)
}

export function assertStepTransition(from: StepState, to: StepState): void {
  if (!STEP_TRANSITIONS[from].includes(to)) throw new TransitionError(from, to)
}

// ---- records ----

export type Rec = Record<string, unknown>

/** One record the job makes or changes, in the app's own shape. */
export interface StagedRecord {
  table: string
  id: string
  value: Rec
  /** Unset or 0 = a new record. Otherwise the revision (updatedAt) it was staged from. */
  baseRev?: number
  /** Edits only: the fields this job changes, with their values before it. */
  before?: Rec
}

export interface UndoEdit {
  table: string
  id: string
  /** Changed fields: value before the job. */
  before: Rec
  /** Changed fields: value the job set. */
  after: Rec
}

export interface UndoRecord {
  jobId: string
  created: { table: string; id: string }[]
  edited: UndoEdit[]
}

export interface ChangeSet {
  records: StagedRecord[]
  counts: Record<string, number>
}

export interface PlanStepDef {
  id: string
  tool: string
  toolVersion: number
  args: Rec
  placement?: { in?: string; tab?: string; position?: string }
  dependsOn?: string[]
  optional?: boolean
  enabled?: boolean
}

export interface JobPlan {
  version: number
  id: string
  goal: string
  origin: string
  destination: { kind: string; title?: string; id?: string }
  steps: PlanStepDef[]
  [key: string]: unknown
}

export interface JobStep {
  id: string
  tool: string
  state: StepState
  /** hash(job id, step id, tool id + version, resolved args); empty until resolved. */
  key: string
  outputs: Rec | null
  records: StagedRecord[]
  /** One plain line; set when the step failed or was skipped. */
  error: string | null
  /** Retries used since the last Retry press. */
  retries: number
}

export interface AiJob {
  id: string
  plan: JobPlan
  state: JobState
  steps: JobStep[]
  changeSet: ChangeSet | null
  undo: UndoRecord | null
  /** Plain line shown beside the state (why it paused, why it went back). */
  notice: string | null
  deviceId: string
  workspaceId: string
  timings: {
    createdAt: number
    startedAt?: number
    stagedAt?: number
    appliedAt?: number
    undoneAt?: number
    updatedAt: number
  }
}
