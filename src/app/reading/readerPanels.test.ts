// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ribbonCss } from './bookmarkRibbons'
import { currentHeadingId, treeRows } from './contentsTree'
import { findRanges, matchOffsets } from './findInPage'
import {
  PARAGRAPH_GAP_MS,
  ReadAloud,
  SENTENCE_GAP_MS,
  type SpeechText,
} from './readAloud'
import { rankVoices, voiceRank } from './voices'

const H = (id: string, level: number) => ({ id, text: id, level })

describe('contents tree', () => {
  const headings = [H('a', 1), H('a1', 2), H('a1x', 3), H('a2', 2), H('b', 1)]

  it('marks the rows that have branches', () => {
    expect(
      treeRows(headings, new Set()).map((r) => [r.heading.id, r.hasChildren]),
    ).toEqual([
      ['a', true],
      ['a1', true],
      ['a1x', false],
      ['a2', false],
      ['b', false],
    ])
  })

  it('folding hides everything below, down to the next heading of its level', () => {
    expect(treeRows(headings, new Set(['a'])).map((r) => r.heading.id)).toEqual(
      ['a', 'b'],
    )
    expect(
      treeRows(headings, new Set(['a1'])).map((r) => r.heading.id),
    ).toEqual(['a', 'a1', 'a2', 'b'])
  })

  it('the heading being read is the last one above the reading line', () => {
    const tops = new Map([
      ['a', -400],
      ['a1', -50],
      ['a1x', 300],
    ])
    expect(currentHeadingId(headings, tops, 100)).toBe('a1')
    expect(currentHeadingId(headings, new Map(), 100)).toBeNull()
  })
})

describe('find on the page', () => {
  it('finds every match, ignoring case and accents', () => {
    expect(matchOffsets('Café cafe CAFÉ', 'cafe')).toEqual([
      [0, 4],
      [5, 9],
      [10, 14],
    ])
    expect(matchOffsets('abc', '  ')).toEqual([])
  })

  it('makes a range for each match in the text nodes', () => {
    const root = document.createElement('div')
    root.innerHTML = '<p>The cell wall</p><p>A cell and a CELL.</p>'
    const found = findRanges(root, 'cell')
    expect(found).toHaveLength(3)
    expect(found.map((r) => r.toString())).toEqual(['cell', 'cell', 'CELL'])
  })
})

describe('bookmark ribbons', () => {
  it('writes one ribbon rule per bookmarked block and a drop for the new one', () => {
    const css = ribbonCss(['b1', 'b2'], 'b2')
    expect(css).toContain('.bn-block-outer[data-id="b1"]::before')
    expect(css).toContain('.bn-block-outer[data-id="b2"]::before')
    expect(css).toContain('ln-ribbon-drop')
    expect(ribbonCss([])).toBe('')
  })

  it('never writes an id that could break out of the selector', () => {
    expect(ribbonCss(['ok', '"] { x: y } [a="'])).not.toContain('x: y')
  })
})

describe('voices', () => {
  it('ranks Premium, then Enhanced, then on-device, then the rest', () => {
    const list = [
      { name: 'Zed' },
      { name: 'Local', localService: true },
      { name: 'Daniel (Enhanced)', localService: true },
      { name: 'Ava (Premium)', localService: true },
    ]
    expect(rankVoices(list).map((v) => v.name)).toEqual([
      'Ava (Premium)',
      'Daniel (Enhanced)',
      'Local',
      'Zed',
    ])
    expect(voiceRank({ name: 'x' })).toBe(0)
  })
})

class FakeUtterance {
  rate = 1
  voice: unknown = null
  lang = ''
  onstart: (() => void) | null = null
  onend: (() => void) | null = null
  onboundary: ((e: { name: string; charIndex: number }) => void) | null = null
  onerror: ((e: { error: string }) => void) | null = null
  text: string
  constructor(text: string) {
    this.text = text
  }
}

describe('read aloud pace and skipping', () => {
  let spoken: FakeUtterance[] = []
  beforeEach(() => {
    vi.useFakeTimers()
    spoken = []
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        speak: (u: FakeUtterance) => spoken.push(u),
        cancel: () => {},
        pause: () => {},
        resume: () => {},
        getVoices: () => [],
        speaking: false,
        paused: false,
      },
    })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  const source = (text: string): SpeechText => ({
    text,
    markWord: () => {},
    markSentence: () => {},
    clearMarks: () => {},
  })
  const opts = { rate: 1, voiceURI: '', pauses: true }

  it('waits 0.25 s after a sentence and 0.6 s after a paragraph', () => {
    const r = new ReadAloud(source('One. Two.\nThree.'), opts)
    r.start()
    expect(spoken.map((u) => u.text)).toEqual(['One.'])
    spoken[0].onend?.()
    vi.advanceTimersByTime(SENTENCE_GAP_MS - 1)
    expect(spoken).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(spoken.map((u) => u.text)).toEqual(['One.', 'Two.'])
    spoken[1].onend?.()
    vi.advanceTimersByTime(PARAGRAPH_GAP_MS - 1)
    expect(spoken).toHaveLength(2)
    vi.advanceTimersByTime(1)
    expect(spoken.map((u) => u.text)).toEqual(['One.', 'Two.', 'Three.'])
  })

  it('a late end event of a skipped sentence is ignored (no repeated words)', () => {
    const r = new ReadAloud(source('One. Two. Three.'), opts)
    r.start()
    const first = spoken[0]
    r.skip(1) // forward: Two. now
    expect(spoken.map((u) => u.text)).toEqual(['One.', 'Two.'])
    first.onend?.() // the old piece reports its end late
    vi.advanceTimersByTime(2000)
    expect(spoken.map((u) => u.text)).toEqual(['One.', 'Two.'])
  })

  it('back goes one sentence back, forward past the end finishes', () => {
    const finished = vi.fn()
    const r = new ReadAloud(source('One. Two.'), opts, { finished })
    r.start()
    r.skip(1)
    expect(r.progress).toEqual({ index: 1, total: 2 })
    r.skip(-1)
    expect(spoken.at(-1)?.text).toBe('One.')
    r.skip(5)
    expect(finished).toHaveBeenCalled()
    expect(r.state).toBe('idle')
  })

  it('seek jumps to the sentence that holds an offset', () => {
    const r = new ReadAloud(source('One. Two. Three.'), opts)
    r.start()
    r.seek(11)
    expect(spoken.at(-1)?.text).toBe('Three.')
  })

  it('pause stops the next piece from starting', () => {
    const r = new ReadAloud(source('One. Two.'), opts)
    r.start()
    spoken[0].onend?.()
    r.pause()
    vi.advanceTimersByTime(2000)
    expect(spoken).toHaveLength(1)
  })
})
