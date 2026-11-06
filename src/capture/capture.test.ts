/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { listBlocks } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import {
  htmlToBlocks,
  inlineRuns,
  markdownToBlocks,
} from '../editor/textBlocks'
import { listSources } from '../library/libraryService'
import { bookmarkletHref } from './bookmarklet'
import { CaptureError, captureKind, captureSource } from './captureService'
import { formatTime, parseStartTime, parseYoutube } from './youtube'

let db: LearningNotesDB
let ws: string
beforeEach(async () => {
  db = createTestDb()
  await db.open()
  ws = (await getOrCreateDefaultWorkspace(db)).id
})
afterEach(() => db.close())

describe('YouTube links', () => {
  it('reads the id and start time', () => {
    expect(
      parseYoutube('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=90s'),
    ).toEqual({
      videoId: 'dQw4w9WgXcQ',
      startSec: 90,
    })
    expect(parseYoutube('https://youtu.be/dQw4w9WgXcQ?t=1m5s')).toEqual({
      videoId: 'dQw4w9WgXcQ',
      startSec: 65,
    })
    expect(
      parseYoutube('https://www.youtube.com/shorts/dQw4w9WgXcQ')?.videoId,
    ).toBe('dQw4w9WgXcQ')
    expect(
      parseYoutube('https://www.youtube.com/embed/dQw4w9WgXcQ')?.startSec,
    ).toBe(0)
  })
  it('refuses other sites, http and bad ids', () => {
    expect(parseYoutube('https://example.com/watch?v=dQw4w9WgXcQ')).toBeNull()
    expect(
      parseYoutube('http://www.youtube.com/watch?v=dQw4w9WgXcQ'),
    ).toBeNull()
    expect(parseYoutube('https://www.youtube.com/watch?v=short')).toBeNull()
    expect(parseYoutube('not a url')).toBeNull()
  })
  it('parses and prints times', () => {
    expect(parseStartTime('1h2m3s')).toBe(3723)
    expect(parseStartTime('45')).toBe(45)
    expect(parseStartTime('x')).toBe(0)
    expect(formatTime(3723)).toBe('1:02:03')
    expect(formatTime(65)).toBe('1:05')
  })
})

describe('text to blocks', () => {
  it('reads headings, lists, paragraphs and inline marks', () => {
    const blocks = markdownToBlocks(
      '# Title\n\nFirst line\ncontinues here.\n\n- one\n  - nested\n- two\n1. step\n\nSee [site](https://example.com) and **bold**.',
    )
    expect(blocks.map((b) => b.type)).toEqual([
      'heading',
      'paragraph',
      'bulletListItem',
      'bulletListItem',
      'numberedListItem',
      'paragraph',
    ])
    expect(blocks[2].children).toHaveLength(1)
    expect(JSON.stringify(blocks[5].content)).toContain(
      '"href":"https://example.com"',
    )
    expect(inlineRuns('a **b** c')).toHaveLength(3)
  })
  it('keeps only https links', () => {
    const runs = inlineRuns('[x](https://a.com) [y](javascript:alert(1))')
    expect(
      runs.some((r) => r.type === 'link' && r.href === 'https://a.com'),
    ).toBe(true)
    expect(JSON.stringify(runs)).not.toContain('"href":"javascript')
  })
  it('turns HTML into blocks and nests lists', () => {
    const blocks = htmlToBlocks(
      '<h1>T</h1><p>Hello <b>world</b></p><ul><li>a<ul><li>b</li></ul></li></ul>',
    )
    expect(blocks.map((b) => b.type)).toEqual([
      'heading',
      'paragraph',
      'bulletListItem',
    ])
    expect(blocks[2].children).toHaveLength(1)
  })
})

describe('captureSource', () => {
  it('keeps a pasted transcript as a readable source page, URL included', async () => {
    const page = await captureSource(db, ws, {
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30',
      title: 'A talk',
      text: '0:00 Hello\n\n0:10 More words',
    })
    expect(page.source).toMatchObject({
      kind: 'video',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30',
      videoId: 'dQw4w9WgXcQ',
      startSec: 30,
    })
    expect(page.title).toBe('A talk')
    const nb = await db.notebooks.get(page.notebookId)
    expect(nb?.kind).toBe('sources')
    expect(await listBlocks(db, page.id)).toHaveLength(2)
    expect(await listSources(db, ws, 'videos')).toHaveLength(1)
  })
  it('uses one Sources notebook and names untitled text from its first line', async () => {
    const a = await captureSource(db, ws, { text: '# Big idea\nwords' })
    const b = await captureSource(db, ws, { url: 'https://example.com/post' })
    expect(a.title).toBe('Big idea')
    expect(b.title).toBe('example.com')
    expect(a.notebookId).toBe(b.notebookId)
    expect(a.source?.kind).toBe('paste')
    expect(b.source?.kind).toBe('article')
  })
  it('refuses non-https links, empty input and huge text, and fetches nothing', async () => {
    const calls: unknown[] = []
    const real = globalThis.fetch
    globalThis.fetch = ((...args: unknown[]) => {
      calls.push(args)
      return real(...(args as Parameters<typeof fetch>))
    }) as typeof fetch
    try {
      await expect(
        captureSource(db, ws, { url: 'http://example.com' }),
      ).rejects.toBeInstanceOf(CaptureError)
      await expect(captureSource(db, ws, {})).rejects.toBeInstanceOf(
        CaptureError,
      )
      await expect(
        captureSource(db, ws, { text: 'x'.repeat(2_000_001) }),
      ).rejects.toThrow(/too long/)
      await captureSource(db, ws, { text: 'ok' })
    } finally {
      globalThis.fetch = real
    }
    expect(calls).toHaveLength(0)
    expect(captureKind({ url: 'https://example.com' })).toBe('article')
  })
  it('cleans pasted HTML', async () => {
    const page = await captureSource(db, ws, {
      text: '<p>Safe</p><script>alert(1)</script><p onclick="x()">Two</p>',
    })
    const blocks = await listBlocks(db, page.id)
    expect(JSON.stringify(blocks.map((b) => b.content))).not.toMatch(
      /alert|onclick/,
    )
    expect(blocks).toHaveLength(2)
  })
})

describe('bookmarklet', () => {
  it('sends title, address and selection to the capture address', () => {
    const href = bookmarkletHref('https://app.example/#/page/1')
    expect(href.startsWith('javascript:')).toBe(true)
    expect(href).toContain('"https://app.example/#/capture"')
    expect(href).toContain('getSelection')
  })
})
