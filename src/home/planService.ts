import type { LearningNotesDB } from '../core/db'
import type { DayPlan, PlanBlock } from '../core/homeTypes'
import { createId } from '../core/ids'
import { isLive, stableRecordFields } from '../core/records'

/**
 * The day plan (F2): blocks on a timeline, one plan per day. Two devices
 * making a plan for the same day get the same record id, so sync merges
 * them (the newer edit wins).
 */

const DAY_MINUTES = 24 * 60
export const SNAP_MIN = 15
const MIN_BLOCK = 15

export async function getPlan(
  db: LearningNotesDB,
  day: string,
): Promise<DayPlan | undefined> {
  return (await db.dayPlans.where('day').equals(day).toArray()).find(isLive)
}

async function savePlan(
  db: LearningNotesDB,
  day: string,
  change: (blocks: PlanBlock[]) => PlanBlock[],
): Promise<void> {
  await db.transaction('rw', db.dayPlans, async () => {
    const plan = await getPlan(db, day)
    const now = Date.now()
    const blocks = change(plan?.blocks ?? [])
      .slice(0, 200)
      .sort((a, b) => a.startMin - b.startMin)
    if (plan) {
      await db.dayPlans.update(plan.id, { blocks, updatedAt: now })
    } else {
      await db.dayPlans.add({
        ...(await stableRecordFields(db.dayPlans, `dayPlan:${day}`)),
        day,
        blocks,
      })
    }
  })
}

export const snap = (min: number): number =>
  Math.min(
    DAY_MINUTES - MIN_BLOCK,
    Math.max(0, Math.round(min / SNAP_MIN) * SNAP_MIN),
  )

export async function addBlock(
  db: LearningNotesDB,
  day: string,
  block: Omit<PlanBlock, 'id'>,
): Promise<void> {
  const startMin = snap(block.startMin)
  const durationMin = Math.max(
    MIN_BLOCK,
    Math.min(DAY_MINUTES - startMin, Math.round(block.durationMin)),
  )
  await savePlan(db, day, (blocks) => [
    ...blocks,
    { ...block, id: createId(), startMin, durationMin },
  ])
}

export async function changeBlock(
  db: LearningNotesDB,
  day: string,
  id: string,
  patch: Partial<Pick<PlanBlock, 'startMin' | 'durationMin'>>,
): Promise<void> {
  await savePlan(db, day, (blocks) =>
    blocks.map((b) => {
      if (b.id !== id) return b
      const startMin = snap(patch.startMin ?? b.startMin)
      const durationMin = Math.max(
        MIN_BLOCK,
        Math.min(DAY_MINUTES - startMin, patch.durationMin ?? b.durationMin),
      )
      return { ...b, startMin, durationMin }
    }),
  )
}

export async function removeBlock(
  db: LearningNotesDB,
  day: string,
  id: string,
): Promise<void> {
  await savePlan(db, day, (blocks) => blocks.filter((b) => b.id !== id))
}
