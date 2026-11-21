import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import type { JobStore } from '../../src/aitools/jobs/jobStore'
import type { AiJob } from '../../src/aitools/jobs/jobTypes'
import { configDir } from './config'

/** The newest jobs kept on this PC (so undo_job still works after a restart). */
const KEEP = 100

/**
 * Jobs this connection ran, in ~/.learning-notes-mcp/jobs.json. They hold the
 * plan and the records of the job (what Claude wrote), so the file stays on
 * this PC and is never sent anywhere. A broken file starts an empty list.
 */
export class FileJobStore implements JobStore {
  private readonly file: string
  private jobs: Map<string, AiJob> | null = null
  constructor(dir = configDir()) {
    this.file = join(dir, 'jobs.json')
  }

  private load(): Map<string, AiJob> {
    if (this.jobs) return this.jobs
    const map = new Map<string, AiJob>()
    try {
      if (existsSync(this.file)) {
        const raw = JSON.parse(readFileSync(this.file, 'utf8')) as unknown
        if (Array.isArray(raw))
          for (const j of raw)
            if (
              j &&
              typeof j === 'object' &&
              typeof (j as AiJob).id === 'string'
            )
              map.set((j as AiJob).id, j as AiJob)
      }
    } catch {
      /* start empty */
    }
    return (this.jobs = map)
  }

  private flush(): void {
    const all = [...this.load().values()]
      .sort((a, b) => a.timings.createdAt - b.timings.createdAt)
      .slice(-KEEP)
    this.jobs = new Map(all.map((j) => [j.id, j]))
    mkdirSync(join(this.file, '..'), { recursive: true })
    const tmp = `${this.file}.tmp`
    writeFileSync(tmp, JSON.stringify(all), { mode: 0o600 })
    renameSync(tmp, this.file)
  }

  async get(id: string) {
    const j = this.load().get(id)
    return j ? structuredClone(j) : undefined
  }
  async put(job: AiJob) {
    this.load().set(job.id, structuredClone(job))
    this.flush()
  }
  async list() {
    return [...this.load().values()].map((j) => structuredClone(j))
  }
  async delete(id: string) {
    this.load().delete(id)
    this.flush()
  }
}
