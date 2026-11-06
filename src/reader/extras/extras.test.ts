// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { applyOrientation } from './orientation'
import { liquidBlocks, type TextPiece } from './liquid'
import {
  DEFAULT_WPM,
  SpeedTracker,
  formatMinutes,
  minutesFor,
  readingWpm,
  recordSpeed,
} from './timeLeft'
import { hitsIn, searchPdf, type SearchableDoc } from '../pdf/pdfSearch'

beforeEach(() => localStorage.clear())

describe('time left', () => {
  it('uses 220 words a minute until speed is measured, then a rolling average', () => {
    expect(readingWpm()).toBe(DEFAULT_WPM)
    recordSpeed(300)
    expect(readingWpm()).toBe(300)
    recordSpeed(200) // second sample: halfway
    expect(readingWpm()).toBe(250)
    recordSpeed(5000) // skimming or a jump is ignored
    recordSpeed(Number.NaN)
    expect(readingWpm()).toBe(250)
  })

  it('works out minutes and writes them out', () => {
    expect(minutesFor(2200, 220)).toBe(10)
    expect(minutesFor(5, 220)).toBe(1)
    expect(minutesFor(0, 220)).toBe(0)
    expect(formatMinutes(0)).toBe('Done')
    expect(formatMinutes(12)).toBe('12 min')
    expect(formatMinutes(60)).toBe('1 h')
    expect(formatMinutes(80)).toBe('1 h 20 min')
  })

  it('measures steady reading and ignores jumps and pauses', () => {
    const tracker = new SpeedTracker(100_000)
    expect(tracker.update(0.1, 0)).toBeNull() // first position: nothing to compare
    // 0.2% of 100,000 words = 200 words in one minute = 200 wpm.
    expect(tracker.update(0.102, 60_000)).toBeCloseTo(200, 0)
    expect(tracker.update(0.5, 70_000)).toBeNull() // a jump
    expect(tracker.update(0.502, 70_500)).toBeNull() // too quick to measure
    expect(tracker.update(0.504, 600_000)).toBeNull() // a long pause
    expect(tracker.update(0.503, 620_000)).toBeNull() // going back
  })
})

describe('orientation lock', () => {
  it('says what happened and never throws', async () => {
    const calls: string[] = []
    const ok = {
      orientation: {
        lock: async (o: string) => void calls.push(o),
        unlock: () => void calls.push('unlock'),
      },
    }
    expect(await applyOrientation('landscape', ok)).toBe('locked')
    expect(await applyOrientation('off', ok)).toBe('unlocked')
    expect(calls).toEqual(['landscape', 'unlock'])
    expect(await applyOrientation('portrait', {})).toBe('unsupported')
    const refuses = {
      orientation: {
        lock: async () => {
          throw new Error('NotSupportedError')
        },
      },
    }
    expect(await applyOrientation('portrait', refuses)).toBe('refused')
  })
})

const piece = (str: string, x: number, y: number, h = 10): TextPiece => ({
  str,
  transform: [h, 0, 0, h, x, y],
  height: h,
})

describe('liquid mode grouping', () => {
  it('finds a heading, joins lines into paragraphs and mends hyphens', () => {
    const blocks = liquidBlocks([
      piece('Valves', 50, 700, 20),
      piece('Blood flows through the', 50, 660),
      piece('heart in one direc-', 50, 648),
      piece('tion only.', 50, 636),
      // A bigger gap starts a new paragraph.
      piece('The aortic valve', 50, 600),
      piece('opens first.', 50, 588),
    ])
    expect(blocks).toEqual([
      { kind: 'heading', text: 'Valves' },
      {
        kind: 'paragraph',
        text: 'Blood flows through the heart in one direction only.',
      },
      { kind: 'paragraph', text: 'The aortic valve opens first.' },
    ])
  })

  it('puts pieces of one line together in left-to-right order, and gives nothing for no text', () => {
    expect(
      liquidBlocks([piece('world', 100, 500), piece('Hello', 50, 500.2)]),
    ).toEqual([{ kind: 'paragraph', text: 'Hello world' }])
    expect(liquidBlocks([])).toEqual([])
    expect(liquidBlocks([piece('   ', 1, 1)])).toEqual([])
  })
})

describe('Find in a PDF', () => {
  const pages = ['The Heart pumps blood', 'No match here', 'heart heart HEART']
  const doc: SearchableDoc = {
    numPages: pages.length,
    getPage: async (n) => ({
      getTextContent: async () => ({ items: [{ str: pages[n - 1] }] }),
    }),
  }

  it('finds every place, ignoring case, with a little text around it', () => {
    const hits = hitsIn('The Heart pumps blood', 'heart', 1)
    expect(hits).toEqual([
      { page: 1, before: 'The ', match: 'Heart', after: ' pumps blood' },
    ])
    expect(hitsIn('x', '', 1)).toEqual([])
  })

  it('searches the pages in order and stops when a newer search takes over', async () => {
    let seen: number[] = []
    await searchPdf(doc, 'heart', () => false, (hits) => {
      seen = hits.map((h) => h.page)
    })
    expect(seen).toEqual([1, 3, 3, 3])
    let result = 'untouched'
    await searchPdf(doc, 'heart', () => true, () => {
      result = 'called'
    })
    expect(result).toBe('untouched')
    // One letter is too short to search for.
    let few = -1
    await searchPdf(doc, 'h', () => false, (hits) => {
      few = hits.length
    })
    expect(few).toBe(0)
  })
})
