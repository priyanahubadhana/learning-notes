import type { LearningNotesDB } from '../core/db'
import type { JobStore } from '../aitools/jobs/jobStore'
import { DexieNotesPort } from '../aitools/jobs/dexieNotesPort'
import { JobRunner } from '../aitools/jobs/runner'
import type { AiJob } from '../aitools/jobs/jobTypes'
import { PasteFiller } from './pasteFiller'

/**
 * Wraps any job store and tells the Build screen whenever a job is saved or
 * removed. The app uses the Dexie-backed store (jobs survive a reload); tests
 * may pass the memory one.
 */
export class ObservableJobStore implements JobStore {
  private readonly inner: JobStore
  constructor(inner: JobStore) {
    this.inner = inner
  }
  private readonly subs = new Set<() => void>()
  subscribe(cb: () => void): () => void {
    this.subs.add(cb)
    return () => {
      this.subs.delete(cb)
    }
  }
  get(id: string) {
    return this.inner.get(id)
  }
  list() {
    return this.inner.list()
  }
  async put(job: AiJob) {
    await this.inner.put(job)
    for (const f of [...this.subs]) f()
  }
  async delete(id: string) {
    await this.inner.delete(id)
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
export function getEngine(
  db: LearningNotesDB,
  inner?: JobStore,
): Promise<Engine> {
  let engine = engines.get(db)
  if (!engine) {
    engine = (async () => {
      const workspace = await db.workspaces.toCollection().first()
      // The screen only exists behind the flag ai.framework, so the table
      // code is loaded here, on first use, and never for anyone else.
      const { DexieJobStore } = inner
        ? { DexieJobStore: null }
        : await import('../aitools/jobs/dexieJobStore')
      const store = new ObservableJobStore(inner ?? new DexieJobStore!(db))
      const filler = new PasteFiller()
      const runner = new JobRunner({
        store,
        port: new DexieNotesPort(db),
        filler,
        workspaceId: workspace?.id ?? 'local',
        fillTimeoutMs: WAIT_FOR_PASTE_MS,
      })
      // AF-9: a job left running or applying by a reload or crash is settled
      // by the runner (resumes from the first step not done; an applying job
      // is checked, never applied twice). In the background, so opening the
      // screen is not held up; a failure here must not break the screen.
      void runner.recover().catch(() => undefined)
      return { store, runner, filler }
    })()
    engines.set(db, engine)
  }
  return engine
}
