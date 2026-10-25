import type { LearningNotesDB } from './db'
import { isLive, newRecordFields } from './records'
import type { Workspace } from './types'

/**
 * Returns the default workspace, creating it on first run.
 * (One workspace per device for now; multiple workspaces can come later.)
 */
export async function getOrCreateDefaultWorkspace(
  db: LearningNotesDB,
): Promise<Workspace> {
  return db.transaction('rw', db.workspaces, async () => {
    const existing = (await db.workspaces.toArray())
      .filter(isLive)
      .sort((a, b) => a.createdAt - b.createdAt)[0]
    if (existing) return existing

    const workspace: Workspace = { ...newRecordFields(), name: 'My Workspace' }
    await db.workspaces.add(workspace)
    return workspace
  })
}
