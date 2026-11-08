import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { parseImageRef } from '../images/imageRef'
import { pictureCard } from './cardFromInk'

let db: LearningNotesDB
beforeEach(() => {
  db = createTestDb()
})
afterEach(() => db.delete())

describe('Make card from a Lasso selection', () => {
  it('stores the picture and builds a card whose answer is that picture', async () => {
    const png = new Blob([new Uint8Array([137, 80, 78, 71])], {
      type: 'image/png',
    })
    const card = await pictureCard(db, png, '  What is this formula?  ')
    expect(card.block.type).toBe('card')
    expect(card.block.content).toBe('What is this formula?')
    const answer = card.block.children[0]
    expect(answer.type).toBe('image')
    expect(parseImageRef(answer.props.url)).toBe(card.imageId)
    const stored = await db.images.get(card.imageId)
    expect(stored?.type).toBe('image/png')
    expect(stored?.data.byteLength).toBe(4)
  })

  it('refuses something that is not a picture', async () => {
    await expect(
      pictureCard(db, new Blob(['x'], { type: 'text/plain' }), 'Q?'),
    ).rejects.toThrow()
  })
})
