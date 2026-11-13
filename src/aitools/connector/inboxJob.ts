import { stableId } from '../../core/ids'
import type { AiJob } from '../jobs/jobTypes'

/**
 * The Inbox `job` item: a whole staged plan (or a request to undo one) that
 * waits for the person. It rides in the synced `claudeInbox` table next to
 * the page-change items, as one extra field `job` (the older fields are
 * present but empty, so older screens never break).
 */

/** Why it waits: a step is not `direct`, it edits what exists, or Claude asked. */
export type InboxJobReason = 'risk' | 'edits' | 'asked'

export interface ClaudeInboxJob {
  /** Apply a staged job, or undo one that was already applied. */
  request: 'apply' | 'undo'
  reasons: InboxJobReason[]
  /** Which connection sent it, for the screen ("Claude (PC)"). */
  from: string
  job: AiJob
}

export const inboxJobId = (jobId: string, request: 'apply' | 'undo') =>
  stableId(`inbox-job/${request}/${jobId}`)

/** The claudeInbox record for a job (shape of ClaudeInboxItem). */
export function makeInboxJobItem(
  job: AiJob,
  request: 'apply' | 'undo',
  reasons: InboxJobReason[],
  from: string,
  now: number,
) {
  const entry: ClaudeInboxJob = {
    request,
    reasons,
    from,
    job: structuredClone(job),
  }
  return {
    id: inboxJobId(job.id, request),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    pageId: '',
    notebookId: '',
    pageTitle: job.plan.goal.slice(0, 120),
    baseRevision: '',
    reasons: [] as ('big' | 'cards' | 'conflict')[],
    status: 'pending' as const,
    batchId: job.id,
    ops: [] as never[],
    stats: { replaced: 0, added: 0, existing: 0 },
    job: entry,
  }
}
