import type { LearningNotesDB } from '../core/db'
import { MemoryJobStore } from '../aitools/jobs/jobStore'
import { DexieNotesPort } from '../aitools/jobs/dexieNotesPort'
import { JobRunner } from '../aitools/jobs/runner'
import type { AiJob } from '../aitools/jobs/jobTypes'
import { PasteFiller } from './pasteFiller'

/**
 * Jobs for the Build screen live in memory for now (the `aiJobs` table
 * arrives later), so this store tells the screen whenever a job is saved.
 */
export class ObservableJobStore extends MemoryJobStore {
  private readonly subs = new Set<() => void>()
  subscribe(cb: () => void): () => void {
    this.subs.add(cb)
    return () => {
      this.subs.delete(cb)
    }
  }
  override async put(job: AiJob) {
    await super.put(job)
    for (const f of [...this.subs]) f()
  }
  override async delete(id: string) {
    await super.delete(id)
    for (const f of [...this.subs]) f()
  }
}

export interface Engine {
  store: ObservableJobStore
  runner: JobRunner
  filler: PasteFiller
}

/** A person pasting an answer may take hours; the step waits that long. */
const WAIT_FOR_PASTE_MS = 12 * 60 * 60 * 1000

const engines = new WeakMap<LearningNotesDB, Promise<Engine>>()

/** One engine per database, made on first use and kept while the app is open. */
export function getEngine(db: LearningNotesDB): Promise<Engine> {
  let engine = engines.get(db)
  if (!engine) {
    engine = (async () => {
      const workspace = await db.workspaces.toCollection().first()
      const store = new ObservableJobStore()
      const filler = new PasteFiller()
      const runner = new JobRunner({
        store,
        port: new DexieNotesPort(db),
        filler,
        workspaceId: workspace?.id ?? 'local',
        fillTimeoutMs: WAIT_FOR_PASTE_MS,
      })
      return { store, runner, filler }
    })()
    engines.set(db, engine)
  }
  return engine
}
