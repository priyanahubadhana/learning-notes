import { downloadFile } from '../app/download'
import { db } from '../core/db'
import { recordBackupSaved } from './backupReminder'
import { bundleFile, exportWorkspaceBundle, workspaceFileName } from './bundle'

/**
 * Saves the "Save everything" file from the error screen. Loaded with the
 * app, not on demand: it must work when a screen's file cannot be fetched.
 */
export async function saveEverything(): Promise<void> {
  const bundle = await exportWorkspaceBundle(db)
  downloadFile(workspaceFileName(), bundleFile(bundle))
  await recordBackupSaved(db)
}
