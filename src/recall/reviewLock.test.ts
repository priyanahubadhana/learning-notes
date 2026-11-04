import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from '../core/db'
import { saveLockConfig } from '../core/lock/lockConfig'
import { hashSecret } from '../core/lock/lockCrypto'
import { setLocked } from '../core/lock/lockService'
import { relockAll, unlock } from '../core/lock/lockState'
import { createTestDb } from '../core/testing'
import { CARD_BLOCK_TYPE, MAIN_PART, newCard } from './cardService'
import { getReviewQueue } from './reviewService'

const NOW = new Date(2026, 9, 26, 12).getTime()
const base = { createdAt: NOW - 86_400_000, updatedAt: NOW, deletedAt: null }
let db: LearningNotesDB

async function addCardOn(pageId: string, id: string) {
  await db.blocks.add({
    ...base,
    id,
    pageId,
    parentId: null,
    type: CARD_BLOCK_TYPE,
    content: { text: [{ type: 'text', text: 'Question?', styles: {} }] },
    order: 'a0',
  })
  await db.cards.add({
    ...newCard({ id, pageId }, 'nb1', MAIN_PART, base.createdAt),
    id: `c-${id}`,
  })
}

beforeEach(async () => {
  relockAll()
  db = createTestDb()
  await db.notebooks.add({
    ...base,
    id: 'nb1',
    workspaceId: 'w',
    title: 'N',
    order: 'a0',
  })
  for (const [id, order] of [
    ['p1', 'a0'],
    ['p2', 'a1'],
  ]) {
    await db.pages.add({
      ...base,
      id,
      notebookId: 'nb1',
      parentId: null,
      title: id,
      order,
    })
  }
  await addCardOn('p1', 'open')
  await addCardOn('p2', 'secret')
  await saveLockConfig(db, { pin: await hashSecret('1234', 1_000) })
})

afterEach(async () => {
  await db.delete()
})

describe('Review and the privacy lock', () => {
  it('cards of a locked page are left out of the queue', async () => {
    await setLocked(db, 'page', 'p2', true)
    const q = await getReviewQueue(db, { kind: 'all' }, NOW)
    expect(q.cards.map((c) => c.id)).toEqual(['c-open'])
  })

  it('they come back once the page is unlocked, and a notebook lock hides all', async () => {
    await setLocked(db, 'page', 'p2', true)
    unlock('p2')
    expect((await getReviewQueue(db, { kind: 'all' }, NOW)).cards).toHaveLength(
      2,
    )
    relockAll()
    await setLocked(db, 'notebook', 'nb1', true)
    expect((await getReviewQueue(db, { kind: 'all' }, NOW)).cards).toHaveLength(
      0,
    )
  })

  it('with no way to unlock set up, nothing is held back', async () => {
    await saveLockConfig(db, {})
    await setLocked(db, 'page', 'p2', true)
    expect((await getReviewQueue(db, { kind: 'all' }, NOW)).cards).toHaveLength(
      2,
    )
  })
})
