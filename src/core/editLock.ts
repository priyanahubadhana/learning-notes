import type { LearningNotesDB } from './db'
import { descendantIds } from './records'
import { isReadOnlyGate } from './readOnlyGate'
import type { Notebook, Page } from './types'

/**
 * Edit lock (queue 3c): a switch that makes a page, or a whole notebook,
 * read-only. No passcode: one tap unlocks. It is NOT the privacy lock
 * (`locked`, which hides content behind a PIN) and not "Allow AI while
 * locked"; it is the optional flag `editLocked: true` on the page or
 * notebook record, so it needs no database upgrade and syncs with the row.
 */

export class EditLockedError extends Error {
  constructor() {
    super('This page is locked for editing. Unlock it to change it.')
    this.name = 'EditLockedError'
  }
}

/** Refused because this device is not signed in (account gate, Q3a). */
export class SignInRequiredError extends EditLockedError {
  constructor() {
    super()
    this.name = 'SignInRequiredError'
    this.message = 'Sign in to keep editing and sync your notes.'
  }
}

/** Throws `SignInRequiredError` while the account gate is on. */
export function assertSignedIn(): void {
  if (isReadOnlyGate()) throw new SignInRequiredError()
}

/**
 * Which flag locks a page: the account gate (this device is not signed in:
 * everything is read-only), its own, its notebook's, or none.
 */
export function editLockSource(
  page: Pick<Page, 'editLocked'> | undefined,
  notebook: Pick<Notebook, 'editLocked'> | undefined,
): 'page' | 'notebook' | 'account' | null {
  if (isReadOnlyGate()) return 'account'
  if (page?.editLocked) return 'page'
  if (notebook?.editLocked) return 'notebook'
  return null
}

/** Turns the edit lock of a page or a notebook on or off. */
export async function setEditLocked(
  db: LearningNotesDB,
  kind: 'page' | 'notebook',
  id: string,
  on: boolean,
): Promise<void> {
  const changes = {
    editLocked: on ? (true as const) : undefined,
    updatedAt: Date.now(),
  }
  if (kind === 'page') await db.pages.update(id, changes)
  else await db.notebooks.update(id, changes)
}

/** Why a page cannot be edited right now (null = it can). */
export async function pageEditLock(
  db: LearningNotesDB,
  pageId: string,
): Promise<'page' | 'notebook' | 'account' | null> {
  const page = await db.pages.get(pageId)
  if (!page) return null
  return editLockSource(page, await db.notebooks.get(page.notebookId))
}

/** Throws `EditLockedError` when the page or its notebook is edit-locked. */
export async function assertPageEditable(
  db: LearningNotesDB,
  pageId: string,
): Promise<void> {
  if (await pageEditLock(db, pageId)) throw new EditLockedError()
}

/** True when deleting this page (or a sub-page of it) would break an edit lock. */
export async function pageDeleteBlocked(
  db: LearningNotesDB,
  pageId: string,
): Promise<boolean> {
  if (isReadOnlyGate()) return true
  const page = await db.pages.get(pageId)
  if (!page) return false
  if ((await db.notebooks.get(page.notebookId))?.editLocked) return true
  const pages = (
    await db.pages.where('notebookId').equals(page.notebookId).toArray()
  ).filter((p) => p.deletedAt === null)
  const ids = new Set([pageId, ...descendantIds(pages, pageId)])
  return pages.some((p) => ids.has(p.id) && p.editLocked)
}

/** True when deleting this notebook would break an edit lock (its own or a page's). */
export async function notebookDeleteBlocked(
  db: LearningNotesDB,
  notebookId: string,
): Promise<boolean> {
  if (isReadOnlyGate()) return true
  if ((await db.notebooks.get(notebookId))?.editLocked) return true
  return (await db.pages.where('notebookId').equals(notebookId).toArray()).some(
    (p) => p.deletedAt === null && p.editLocked,
  )
}
