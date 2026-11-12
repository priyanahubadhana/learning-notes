import type { LearningNotesDB } from '../../core/db'
import type { JobStore } from './jobStore'
import type { AiJob } from './jobTypes'

/**
 * Jobs kept in the device-local `aiJobs` table (Dexie v24), so a job and the
 * Activity list survive a reload. `updatedAt` is saved beside the job so the
 * table can be indexed by it. Never synced, never in a backup file.
 */
export class DexieJobStore implements JobStore {
  constructor(private readonly db: LearningNotesDB) {}

  async get(id: string): Promise<AiJob | undefined> {
    const row = await this.db.aiJobs.get(id)
    return row ? toJob(row) : undefined
  }

  async put(job: AiJob): Promise<void> {
    const row = structuredClone(job)
    await this.db.aiJobs.put({
      ...row,
      updatedAt: row.timings.updatedAt ?? Date.now(),
    })
  }

  async list(): Promise<AiJob[]> {
    const rows = await this.db.aiJobs.toArray()
    return rows
      .map(toJob)
      .sort((a, b) => a.timings.createdAt - b.timings.createdAt)
  }

  async delete(id: string): Promise<void> {
    await this.db.aiJobs.delete(id)
  }
}

/** The job without the extra index field. */
function toJob(row: AiJob & { updatedAt: number }): AiJob {
  const { updatedAt: _index, ...job } = structuredClone(row)
  void _index
  return job
}
