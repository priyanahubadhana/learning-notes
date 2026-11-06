import type { LearningNotesDB } from './db'
import { stableId } from './ids'
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

    // Fixed id (sync L1): every device's first workspace is the same one.
    const id = stableId('workspace:default')
    const fields = (await db.workspaces.get(id))
      ? newRecordFields()
      : { ...newRecordFields(), id }
    const workspace: Workspace = { ...fields, name: 'My Workspace' }
    await db.workspaces.add(workspace)
    return workspace
  })
}
