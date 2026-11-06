/**
 * @vitest-environment jsdom
 */
import { strToU8, zipSync } from 'fflate'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { listBlocks } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { parseMindMap } from '../editor/mindMap/model'
import { captureSource } from './captureService'
import {
  aiBatches,
  importNotes,
  notesToBlocks,
  removeAiResult,
  restoreAiResult,
} from './importNotes'
import {
  NotesFormatError,
  clockToSeconds,
  clozeParts,
  parseNotes,
} from './notesFormat'
import {
  MAX_PRESETS,
  buildPrompt,
  isPresetList,
  withPreset,
} from './promptBuilder'
import { NotesZipError, imageTypeOf, readNotesZip } from './zipNotes'

const GEMINI = `# How to Sketch Faces

## Key points
* Start with a light oval
* Mark the **eye line** halfway down
* Add the nose and mouth last

## Steps
1. Draw the oval
2. Draw the guide lines
3. Shade

## Mind map
- Faces
  - Shape
    - Oval
  - Guides
    - Eye line

## Cards
Q: Where does the eye line sit?
A: Halfway down the oval.
Q: What goes in last?
A: The nose and the mouth.
Cloze: The {{eye line}} sits halfway down.

## Screenshots
[0:45] the oval guide
[12:34] the shading step`

const CLAUDE = `**How to Sketch Faces**

## 🔑 Key Points
- One idea

### Steps
1) First
2) Second

## Flashcards
**Q1:** What is it?
**A1:** A face.

Extra thoughts:
Some free text.

## Resources
- A book
`

describe('the notes format (ln-notes/1)', () => {
  it('parses a Gemini-style answer', () => {
    const n = parseNotes(GEMINI)
    expect(n.title).toBe('How to Sketch Faces')
    expect(n.keyPoints).toHaveLength(3)
    expect(n.steps).toEqual(['Draw the oval', 'Draw the guide lines', 'Shade'])
    expect(n.mindMap).toContain('Eye line')
    expect(n.cards).toEqual([
      {
        kind: 'qa',
        q: 'Where does the eye line sit?',
        a: 'Halfway down the oval.',
      },
      { kind: 'qa', q: 'What goes in last?', a: 'The nose and the mouth.' },
      { kind: 'cloze', text: 'The {{eye line}} sits halfway down.' },
    ])
    expect(n.screenshots).toEqual([
      { time: '0:45', seconds: 45, what: 'the oval guide' },
      { time: '12:34', seconds: 754, what: 'the shading step' },
    ])
  })

  it('is tolerant of a Claude-style answer: bold title, emoji headings, other sections', () => {
    const n = parseNotes(CLAUDE)
    expect(n.title).toBe('How to Sketch Faces')
    expect(n.keyPoints).toEqual(['One idea'])
    expect(n.steps).toEqual(['First', 'Second'])
    expect(n.cards).toEqual([{ kind: 'qa', q: 'What is it?', a: 'A face.' }])
    expect(n.rest.map((r) => r.heading)).toContain('Resources')
  })

  it('unwraps a code fence around the whole answer', () => {
    const n = parseNotes('```markdown\n## Key points\n- a\n```')
    expect(n.keyPoints).toEqual(['a'])
  })

  it('refuses text with nothing usable and text that is too big', () => {
    expect(() => parseNotes('')).toThrow(NotesFormatError)
    expect(() => parseNotes('   \n ')).toThrow(NotesFormatError)
    expect(() => parseNotes('x'.repeat(2_000_001))).toThrow(NotesFormatError)
  })

  it('keeps broken input as plain notes instead of failing', () => {
    const n = parseNotes('Just a few loose words about drawing.')
    expect(n.rest.length + n.keyPoints.length).toBeGreaterThan(0)
  })

  it('caps the cards at 500', () => {
    const many =
      '## Cards\n' +
      Array.from({ length: 600 }, (_, i) => `Q: q${i}?\nA: a`).join('\n')
    expect(parseNotes(many).cards).toHaveLength(500)
  })

  it('reads clock times and cloze markers', () => {
    expect(clockToSeconds('1:02:03')).toBe(3723)
    expect(clozeParts('a {{b}} c {{c1::d}}')).toEqual([
      { text: 'a ', blank: false },
      { text: 'b', blank: true },
      { text: ' c ', blank: false },
      { text: 'd', blank: true },
    ])
  })
})

describe('prompt and presets', () => {
  it('holds the link, the format and the extra instructions', () => {
    const p = buildPrompt(
      { url: 'https://youtu.be/dQw4w9WgXcQ', title: 'Faces' },
      'Name every tool icon',
    )
    expect(p).toContain('https://youtu.be/dQw4w9WgXcQ')
    expect(p).toContain('ln-notes/1')
    expect(p).toContain('## Mind map')
    expect(p).toContain('Name every tool icon')
  })
  it('puts a pasted transcript in and cuts a huge one', () => {
    const p = buildPrompt({ text: 'x'.repeat(200_000) }, '')
    expect(p.length).toBeLessThan(130_000 + 3000)
    expect(p).toContain('[cut here]')
  })
  it('keeps at most 20 presets and validates them', () => {
    let list: ReturnType<typeof withPreset> = []
    for (let i = 0; i < MAX_PRESETS; i++) {
      list = withPreset(list!, { id: String(i), name: `n${i}`, text: 'x' })
    }
    expect(list).toHaveLength(MAX_PRESETS)
    expect(withPreset(list!, { id: 'z', name: 'another', text: '' })).toBeNull()
    expect(
      withPreset(list!, { id: 'z', name: 'n3', text: 'new' }),
    ).toHaveLength(MAX_PRESETS)
    expect(isPresetList(list)).toBe(true)
    expect(isPresetList([{ id: 1 }])).toBe(false)
  })
})

describe('importing notes', () => {
  let db: LearningNotesDB
  let ws: string
  beforeEach(async () => {
    db = createTestDb()
    await db.open()
    ws = (await getOrCreateDefaultWorkspace(db)).id
  })
  afterEach(() => db.close())

  it('makes a page with headings, lists, a mind map, cards and screenshot slots, all marked AI', async () => {
    const res = await importNotes(db, ws, GEMINI)
    expect(res.cards).toBe(3)
    const blocks = await listBlocks(db, res.pageId)
    expect(
      blocks.every((b) => b.source === 'ai' && b.batchId === res.batchId),
    ).toBe(true)
    const types = blocks.map((b) => b.type)
    expect(types).toContain('mindMap')
    expect(types.filter((x) => x === 'heading')).toHaveLength(5)
    expect(types.filter((x) => x === 'card')).toHaveLength(2)
    const map = parseMindMap(
      (blocks.find((b) => b.type === 'mindMap')!.content as { data: string })
        .data,
    )
    expect(map.nodes.length).toBeGreaterThanOrEqual(5)
    const text = JSON.stringify(blocks.map((b) => b.content))
    expect(text).toContain('📷 0:45 the oval guide')
    // Three scheduled cards: two Card blocks and one blank.
    expect(await db.cards.count()).toBe(3)
    const page = await db.pages.get(res.pageId)
    expect(page?.title).toBe('How to Sketch Faces')
    expect(page?.source?.kind).toBe('paste')
  })

  it('adds to an existing source page and fills its empty title', async () => {
    const src = await captureSource(db, ws, { url: 'https://example.com/v' })
    const res = await importNotes(db, ws, GEMINI, { pageId: src.id })
    expect(res.pageId).toBe(src.id)
    const all = await db.pages.toArray()
    expect(all.filter((p) => p.source)).toHaveLength(1)
  })

  it('refuses nothing-text before writing anything', async () => {
    await expect(importNotes(db, ws, '')).rejects.toThrow(NotesFormatError)
    expect(await db.pages.count()).toBe(0)
  })

  it('puts a picture of a zip into a card answer and the page', () => {
    const blocks = notesToBlocks(
      parseNotes(
        '## Cards\nQ: What is this?\nA: A fox ![fox](images/fox.png)\n\n## Notes\n![caption](images/fox.png)',
      ),
      new Map([['fox.png', 'id-1']]),
    )
    const json = JSON.stringify(blocks)
    expect(json).toContain('lnimg:id-1')
    expect(json.match(/lnimg:id-1/g)).toHaveLength(2)
  })

  it('"Remove this AI result" takes the whole answer away and Undo brings it back', async () => {
    const first = await importNotes(db, ws, GEMINI)
    await importNotes(db, ws, '## Key points\n- more', { pageId: first.pageId })
    const batches = await aiBatches(db, first.pageId)
    expect(batches).toHaveLength(2)
    const removed = await removeAiResult(db, first.pageId, batches[0].batchId)
    expect(await aiBatches(db, first.pageId)).toHaveLength(1)
    await restoreAiResult(db, removed)
    expect(await aiBatches(db, first.pageId)).toHaveLength(2)
  })

  it('sends nothing anywhere', async () => {
    const real = globalThis.fetch
    let calls = 0
    globalThis.fetch = (() => {
      calls++
      return real('about:blank')
    }) as typeof fetch
    try {
      await importNotes(db, ws, GEMINI)
    } finally {
      globalThis.fetch = real
    }
    expect(calls).toBe(0)
  })
})

describe('notes zip', () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4])
  it('reads notes.md and images by their first bytes', () => {
    const zip = zipSync({
      'notes.md': strToU8('## Key points\n- a'),
      'images/one.png': png,
      'images/fake.png': strToU8('not an image'),
      'evil/../x.txt': strToU8('x'),
    })
    const r = readNotesZip(zip)
    expect(r.markdown).toContain('Key points')
    expect(r.images.map((i) => i.name)).toEqual(['one.png'])
    expect(imageTypeOf(png)).toBe('image/png')
  })
  it('refuses a zip with no notes.md or damaged bytes', () => {
    expect(() => readNotesZip(zipSync({ 'a.txt': strToU8('x') }))).toThrow(
      NotesZipError,
    )
    expect(() => readNotesZip(strToU8('not a zip at all'))).toThrow(
      NotesZipError,
    )
  })
})
