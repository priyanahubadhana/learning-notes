import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { listBlocks } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import type { Annotation } from '../core/types'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { createNotebook } from '../notebooks/notebookService'
import { createPage } from '../pages/pageService'
import { createAnnotation } from '../reader/annotations/annotationService'
import {
  cardInputFor,
  cardText,
  clozeRuns,
  keyTerms,
  makeCardsFromAnnotations,
  undoMakeCards,
} from './cardFromAnnotation'
import { maskedText } from './cardService'
import {
  EMPTY_DAILY,
  isDailyState,
  pickDaily,
  type DailyState,
} from './highlightReview'
import { addVocabulary, vocabContext, vocabWord } from './vocabulary'

describe('choosing what to hide', () => {
  it('picks the longest meaningful word, two for a long sentence', () => {
    expect(keyTerms('The mitochondria is the powerhouse of the cell')).toEqual([
      'mitochondria',
    ])
    const long =
      'Photosynthesis converts sunlight into chemical energy inside the chloroplasts of every green leaf in spring'
    expect(keyTerms(long)).toEqual(['Photosynthesis', 'chloroplasts'])
    expect(keyTerms('It is a cat')).toEqual([])
  })

  it('makes a cloze with a blank per term, once each', () => {
    const runs = clozeRuns('Energy moves; energy is never lost, only changed.')!
    const blanks = runs.filter((r) => (r.styles as { blank?: string }).blank)
    expect(blanks).toHaveLength(1)
    expect(runs.map((r) => r.text).join('')).toBe(
      'Energy moves; energy is never lost, only changed.',
    )
    expect(clozeRuns('a b c')).toBeNull()
  })

  it('cuts a very long quote to a sentence or two', () => {
    const long = 'First sentence is here. ' + 'word '.repeat(100)
    expect(cardText(long).length).toBeLessThanOrEqual(301)
  })

  it('a highlight with a note is a Q/A card (note = question, quote = answer)', () => {
    const input = cardInputFor({
      quote: { exact: 'The answer text', prefix: '', suffix: '' },
      note: 'What is it?',
    })!
    expect(input.type).toBe('card')
    expect(JSON.stringify(input.content)).toContain('What is it?')
    expect(JSON.stringify(input.children)).toContain('The answer text')
    expect(cardInputFor({ quote: undefined, note: 'x' })).toBeNull()
  })
})

describe('making cards from highlights', () => {
  let db: LearningNotesDB
  let book: string
  let notebook: string
  beforeEach(async () => {
    db = createTestDb()
    await db.open()
    const ws = (await getOrCreateDefaultWorkspace(db)).id
    notebook = (await createNotebook(db, ws, 'Books')).id
    book = (await createPage(db, notebook, null, 'Book')).id
  })
  afterEach(() => db.close())

  const highlight = (exact: string, note?: string) =>
    createAnnotation(db, {
      pageId: book,
      kind: 'highlight',
      colour: 'yellow',
      anchor: { type: 'pdf', page: 1, rects: [0, 0, 0.5, 0.1] },
      quote: { exact, prefix: '', suffix: '' },
      note,
      chapter: 'One',
    })

  it('a card is scheduled, linked to its highlight, and Undo takes it away', async () => {
    const a = await highlight('Mitochondria produce most of the cell energy.')
    const made = await makeCardsFromAnnotations(db, book, [a])
    expect(made.cardIds).toHaveLength(1)
    const card = (await db.cards.toArray())[0]
    expect(card.sourceAnnotationId).toBe(a.id)
    expect((await db.annotations.get(a.id))?.cardIds).toEqual([card.id])
    const block = (await listBlocks(db, book))[0]
    expect(maskedText(block.content.text, card.part)).toContain('…')

    // A highlight with a card is skipped the second time.
    const again = await makeCardsFromAnnotations(db, book, [
      (await db.annotations.get(a.id)) as Annotation,
    ])
    expect(again.blockIds).toHaveLength(0)

    await undoMakeCards(db, made)
    expect(await listBlocks(db, book)).toHaveLength(0)
    expect((await db.annotations.get(a.id))?.cardIds).toBeUndefined()
  })

  it('bulk: one Undo removes the whole batch', async () => {
    const list = [
      await highlight('Alpha particles carry positive charge.'),
      await highlight(
        'Neutrons have no electric charge at all.',
        'What about neutrons?',
      ),
    ]
    const made = await makeCardsFromAnnotations(db, book, list)
    expect(made.annotationIds).toHaveLength(2)
    expect((await db.cards.toArray()).every((c) => c.sourceAnnotationId)).toBe(
      true,
    )
    await undoMakeCards(db, made)
    expect(await listBlocks(db, book)).toHaveLength(0)
  })

  it('look up → vocabulary: one page, one card per word, made once', async () => {
    const q = {
      exact: 'ubiquitous',
      prefix: 'It was ',
      suffix: ' in the city.',
    }
    await addVocabulary(db, notebook, 'ubiquitous,', vocabContext(q))
    await addVocabulary(db, notebook, 'serene', 'A serene lake.')
    const pages = (await db.pages.toArray()).filter(
      (p) => p.title === 'Vocabulary',
    )
    expect(pages).toHaveLength(1)
    const blocks = await listBlocks(db, pages[0].id)
    expect(blocks.filter((b) => b.type === 'card')).toHaveLength(2)
    expect(await db.cards.count()).toBe(2)
    expect(vocabWord(' “serene”. ')).toBe('serene')
  })
})

describe('the daily highlight review', () => {
  const all = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ id: `h${i}`, createdAt: i }))

  it('shows the five oldest unseen, the same five all day', () => {
    const day1 = pickDaily(all(12), EMPTY_DAILY, '2026-11-06')
    expect(day1.ids).toEqual(['h0', 'h1', 'h2', 'h3', 'h4'])
    expect(pickDaily(all(12), day1, '2026-11-06').ids).toEqual(day1.ids)
  })

  it('never repeats until all have been seen', () => {
    let state: DailyState = EMPTY_DAILY
    const shown: string[] = []
    for (const day of ['2026-11-06', '2026-11-07']) {
      state = pickDaily(all(12), state, day)
      shown.push(...state.ids)
    }
    expect(new Set(shown).size).toBe(10)
    // Day 3: two are left, then the round restarts with the oldest.
    state = pickDaily(all(12), state, '2026-11-08')
    expect(state.ids).toEqual(['h10', 'h11', 'h0', 'h1', 'h2'])
    expect(new Set(state.ids).size).toBe(5)
  })

  it('works with fewer than five, and with none', () => {
    const s = pickDaily(all(3), EMPTY_DAILY, 'd1')
    expect(s.ids).toHaveLength(3)
    expect(pickDaily(all(3), s, 'd2').ids).toHaveLength(3)
    expect(pickDaily([], EMPTY_DAILY, 'd1').ids).toEqual([])
  })

  it('drops highlights that were deleted and validates stored state', () => {
    const s = pickDaily(all(6), EMPTY_DAILY, 'd1')
    expect(pickDaily(all(2), s, 'd1').ids).toEqual(['h0', 'h1'])
    expect(isDailyState(s)).toBe(true)
    expect(isDailyState({ day: 1 })).toBe(false)
  })
})
