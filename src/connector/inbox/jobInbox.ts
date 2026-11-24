import type { LearningNotesDB } from '../../core/db'
import { isLive } from '../../core/records'
import type { JobStore } from '../../aitools/jobs/jobStore'
import type { JobRunner } from '../../aitools/jobs/runner'

/**
 * Inbox `job` items (AI framework slice 3): a whole staged plan Claude sent
 * (or a request to undo one). Accept runs the same executor the Build screen
 * uses: one all-or-nothing save, the whole job undone with one Undo. Reject
 * only closes the item. Nothing is ever deleted for good.
 */

export type JobDecision = 'ok' | 'changed' | 'failed' | 'done'

interface Deps {
  runner: JobRunner
  store: JobStore
}

const close = (
  db: LearningNotesDB,
  id: string,
  status: 'accepted' | 'rejected',
  now: number,
) => db.claudeInbox.update(id, { status, decidedAt: now, updatedAt: now })

/** Accepts a job item. Safe to press twice: a saved job is never saved again. */
export async function acceptJobItem(
  db: LearningNotesDB,
  id: string,
  deps: Deps,
  now = Date.now(),
): Promise<JobDecision> {
  const item = await db.claudeInbox.get(id)
  if (!item?.job || !isLive(item) || item.status !== 'pending') return 'done'
  const { job, request } = item.job
  const { runner, store } = deps
  const have = await store.get(job.id)

  if (request === 'undo') {
    // The job may only exist here as the copy Claude sent (the connector saved it).
    const mine = have ?? job
    if (!have) await store.put(mine)
    if (mine.state !== 'undone') {
      if (mine.state !== 'applied') return 'failed'
      try {
        await runner.undo(job.id)
      } catch {
        return 'failed'
      }
    }
    await close(db, id, 'accepted', now)
    return 'ok'
  }

  if (!have) await store.put(job)
  else if (have.state === 'applied' || have.state === 'undone') {
    await close(db, id, 'accepted', now)
    return 'ok'
  }
  const r = await runner.apply(job.id)
  if (r.outcome === 'applied' || r.outcome === 'already_applied') {
    await close(db, id, 'accepted', now)
    return 'ok'
  }
  return r.outcome === 'changed' ? 'changed' : 'failed'
}

/** Closes a job item without saving anything. */
export async function rejectJobItem(
  db: LearningNotesDB,
  id: string,
  now = Date.now(),
): Promise<void> {
  const item = await db.claudeInbox.get(id)
  if (!item?.job || !isLive(item) || item.status !== 'pending') return
  await close(db, id, 'rejected', now)
}
