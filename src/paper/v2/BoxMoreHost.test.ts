// @vitest-environment jsdom
import { act, createElement as h } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from '../../core/db'
import { createTestDb } from '../../core/testing'
import { getOrCreateDefaultWorkspace } from '../../core/workspaceService'
import { createNotebook } from '../../notebooks/notebookService'
import { createPage } from '../../pages/pageService'
import { $, cleanDom, mount } from '../../design/parts/testHelpers'
import { updateBox } from '../boxService'
import BoxMoreHost from './BoxMoreHost'

let db: LearningNotesDB
let pageId: string
const BOX = { id: 'b1', x: 16, y: 10, w: 90 }

beforeEach(async () => {
  // jsdom has no hit testing; the list only uses it to find a bottom bar.
  if (!document.elementFromPoint) document.elementFromPoint = () => null
  db = createTestDb()
  const ws = (await getOrCreateDefaultWorkspace(db)).id
  const nb = await createNotebook(db, ws, 'N')
  pageId = (await createPage(db, nb.id)).id
  await db.pages.update(pageId, { boxes: [BOX] })
})
afterEach(async () => {
  cleanDom()
  await db.delete()
})

/** Lets Dexie's live query see the write and React draw it. */
const settle = async (until: () => boolean) => {
  for (let i = 0; i < 50 && !until(); i++)
    await act(() => new Promise<void>((r) => setTimeout(r, 0)))
}

describe('BoxMoreHost', () => {
  // SB-B76 (CI run 46041556992): the ⋯ list opened from a box drawn a moment
  // before the lock reached it kept saying "Lock in place" while the box was
  // locked, and its row would have locked it again instead of unlocking.
  it('the Lock row follows the box as it is now, not as it was when the list opened', async () => {
    mount(
      h(BoxMoreHost, {
        db,
        pageId,
        box: BOX,
        at: new DOMRect(0, 0, 1, 1),
        canEdit: true,
        getGrid: () => ({ rows: [] }) as never,
        onClose: () => {},
        onDuplicate: () => {},
        onDelete: () => {},
        onLock: () => {},
      }),
    )
    const lock = () => $('[data-box-more="lock"]')
    expect(lock()?.textContent).toContain('Lock in place')
    await act(() => updateBox(db, pageId, BOX.id, { locked: true }))
    await settle(() => !!lock()?.textContent?.includes('Unlock'))
    expect(lock()?.textContent).toContain('Unlock')
  })
})
