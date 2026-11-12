import type { AiJob } from './jobTypes'

/** Where jobs live. Slice 1 ships memory; the Dexie `aiJobs` table comes later. */
export interface JobStore {
  get(id: string): Promise<AiJob | undefined>
  /** Saves a whole job (a checkpoint). Stores a copy. */
  put(job: AiJob): Promise<void>
  list(): Promise<AiJob[]>
  delete(id: string): Promise<void>
}

const copy = (job: AiJob): AiJob => structuredClone(job)

export class MemoryJobStore implements JobStore {
  private readonly jobs = new Map<string, AiJob>()
  /** Fault injection: throws on the Nth put (1-based). */
  failOnPut: number | null = null
  puts = 0

  async get(id: string) {
    const job = this.jobs.get(id)
    return job ? copy(job) : undefined
  }
  async put(job: AiJob) {
    this.puts++
    if (this.failOnPut === this.puts) throw new Error('store write failed')
    this.jobs.set(job.id, copy(job))
  }
  async list() {
    return [...this.jobs.values()]
      .map(copy)
      .sort((a, b) => a.timings.createdAt - b.timings.createdAt)
  }
  async delete(id: string) {
    this.jobs.delete(id)
  }
}
