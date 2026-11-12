// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import type { Page } from '../../core/types'
import {
  DEFAULT_PREFS,
  cleanPrefs,
  getPrefs,
  newCollectionId,
  reloadPrefs,
  restorePrefs,
  setPrefs,
  type LibraryPrefs,
} from './libraryPrefs'
import {
  DEFAULT_EXPORT,
  buildCsv,
  buildExport,
  buildMarkdown,
  csvCell,
  planExport,
  type ExportItem,
  type ExportOptions,
} from './exportBuilder'
import {
  activeFilters,
  continueReading,
  proRowMode,
  querySources,
  recentSources,
  shelfCounts,
  statusOf,
} from './shelves'

const page = (
  id: string,
  source: Partial<NonNullable<Page['source']>> = {},
  title = id,
): Page =>
  ({
    id,
    title,
    createdAt: 1,
    source: { kind: 'book', ...source },
  }) as unknown as Page

const P: LibraryPrefs = { ...DEFAULT_PREFS }
const pages = [
  page('a', { progress: 0.5, openedAt: 30, at: 'pdf:1:0' }, 'Alpha'),
  page('b', { progress: 1, openedAt: 20 }, 'Bravo'),
  page('c', {}, 'Charlie'),
  page('v', { kind: 'video', capturedAt: 40 }, 'Video'),
  page('d', { progress: 0.1, openedAt: 10, at: 'pdf:2:0' }, 'Delta'),
]

describe('shelves', () => {
  it('puts sources on shelves by progress, and your choice wins', () => {
    expect(statusOf(pages[0], {})).toBe('reading')
    expect(statusOf(pages[1], {})).toBe('finished')
    expect(statusOf(pages[2], {})).toBe('want')
    expect(statusOf(pages[1], { b: 'want' })).toBe('want')
  })
  it('counts shelves and collections', () => {
    const p = cleanPrefs({
      collections: [{ id: 'x', name: 'X' }],
      membership: { a: ['x'] },
    })
    const c = shelfCounts(pages, p)
    expect(c).toMatchObject({ all: 5, reading: 2, finished: 1, want: 2 })
    expect(c.collections.x).toBe(1)
  })
  it('filters by shelf, type, status, tag and search', () => {
    expect(
      querySources(pages, { ...P, shelf: 'finished' }).map((x) => x.id),
    ).toEqual(['b'])
    expect(
      querySources(pages, { ...P, type: 'videos' }).map((x) => x.id),
    ).toEqual(['v'])
    expect(
      querySources(pages, { ...P, status: 'want' }).map((x) => x.id),
    ).toContain('c')
    const tags = new Map([
      ['a', ['t1']],
      ['d', ['t1', 't2']],
    ])
    expect(
      querySources(pages, { ...P, tagIds: ['t1'] }, { tags })
        .map((x) => x.id)
        .sort(),
    ).toEqual(['a', 'd'])
    expect(
      querySources(
        pages,
        { ...P, tagIds: ['t1', 't2'], tagMatch: 'all' },
        { tags },
      ).map((x) => x.id),
    ).toEqual(['d'])
    expect(querySources(pages, P, { search: 'brav' }).map((x) => x.id)).toEqual(
      ['b'],
    )
  })
  it('sorts (newest activity first by default)', () => {
    expect(querySources(pages, P).map((x) => x.id)).toEqual([
      'v',
      'a',
      'b',
      'd',
      'c',
    ])
    expect(
      querySources(pages, { ...P, sort: 'title' }).map((x) => x.id)[0],
    ).toBe('a')
    expect(
      querySources(pages, { ...P, sort: 'progress' }).map((x) => x.id)[0],
    ).toBe('b')
  })
  it('lists active filters, Continue reading and Recent', () => {
    expect(activeFilters(P)).toEqual([])
    expect(activeFilters({ ...P, type: 'videos', tagIds: ['t'] })).toEqual([
      'type',
      'tags',
    ])
    expect(continueReading(pages, P).map((x) => x.id)).toEqual(['a', 'd'])
    expect(continueReading([pages[2]], P)).toEqual([])
    expect(recentSources(pages, 2).map((x) => x.id)).toEqual(['v', 'a'])
  })
  it('keeps the Professional row on one line at every width', () => {
    expect(proRowMode(1000)).toBe('full')
    expect(proRowMode(560)).toBe('icons')
    expect(proRowMode(360)).toBe('scroll')
  })
})

describe('prefs', () => {
  beforeEach(() => {
    localStorage.clear()
    reloadPrefs()
  })
  it('drops invalid saved values', () => {
    const c = cleanPrefs({
      shelf: 'c:gone',
      type: 'zzz',
      sort: 5,
      view: 'list',
    })
    expect(c.shelf).toBe('all')
    expect(c.type).toBe('all')
    expect(c.view).toBe('list')
  })
  it('remembers a change and Undo puts it back', () => {
    const before = setPrefs({ type: 'videos' })
    expect(getPrefs().type).toBe('videos')
    expect(
      JSON.parse(localStorage.getItem('learning-notes:library.v2')!).type,
    ).toBe('videos')
    restorePrefs(before)
    expect(getPrefs().type).toBe('all')
  })
  it('makes unique collection ids', () => {
    expect(
      newCollectionId('Psychology', [{ id: 'psychology', name: 'P' }]),
    ).toBe('psychology-2')
    expect(newCollectionId('!!!', [])).toBe('shelf')
  })
})

const items: ExportItem[] = [
  {
    bookId: 'a',
    book: 'Alpha',
    kind: 'highlight',
    quote: 'Line one\nline two',
    note: 'My note',
    colour: 'yellow',
    tags: ['habits'],
    key: true,
    place: 'p. 3',
  },
  {
    bookId: 'a',
    book: 'Alpha',
    kind: 'highlight',
    quote: 'Second',
    colour: 'blue',
  },
  { bookId: 'a', book: 'Alpha', kind: 'bookmark', place: 'p. 9' },
  {
    bookId: 'b',
    book: 'Bravo',
    kind: 'note',
    note: '= danger, "quoted"',
    inMyWords: 'mine',
  },
]
const texts = [{ bookId: 'a', book: 'Alpha', summary: 'Sum', recaps: ['r1'] }]
const opts = (o: Partial<ExportOptions> = {}): ExportOptions => ({
  ...DEFAULT_EXPORT,
  ...o,
  include: { ...DEFAULT_EXPORT.include, ...(o.include ?? {}) },
})

describe('export builder', () => {
  it('counts what the switches include', () => {
    expect(planExport(items, texts, opts()).count).toBe(5)
    expect(
      planExport(
        items,
        texts,
        opts({ include: { ...DEFAULT_EXPORT.include, highlights: false } }),
      ).items,
    ).toHaveLength(2)
    expect(
      planExport(
        items,
        texts,
        opts({
          include: {
            ...DEFAULT_EXPORT.include,
            bookmarks: false,
            summaries: false,
            recaps: false,
          },
        }),
      ).count,
    ).toBe(3)
    const none = Object.fromEntries(
      Object.keys(DEFAULT_EXPORT.include).map((k) => [k, false]),
    ) as ExportOptions['include']
    expect(planExport(items, texts, opts({ include: none })).count).toBe(0)
  })
  it('filters by key, colour and book', () => {
    expect(planExport(items, [], opts({ keyOnly: true })).items).toHaveLength(1)
    expect(
      planExport(items, [], opts({ colours: ['blue'] })).items,
    ).toHaveLength(1)
    expect(planExport(items, texts, opts({ bookIds: ['b'] })).count).toBe(1)
  })
  it('writes Markdown with only the chosen parts', () => {
    const o = opts()
    const md = buildMarkdown(planExport(items, texts, o), o)
    expect(md).toContain('# Alpha')
    expect(md).toContain('> Line one line two')
    expect(md).toContain('My note')
    expect(md).toContain('#habits')
    expect(md).toContain('## Summary')
    const o2 = opts({
      include: { ...DEFAULT_EXPORT.include, notes: false, tags: false },
    })
    const md2 = buildMarkdown(planExport(items, texts, o2), o2)
    expect(md2).not.toContain('My note')
    expect(md2).not.toContain('#habits')
  })
  it('escapes CSV and follows the switches for columns', () => {
    expect(csvCell('a,"b"')).toBe('"a,""b"""')
    expect(csvCell('=SUM(A1)')).toBe("'=SUM(A1)")
    const o = opts({
      format: 'csv',
      include: { ...DEFAULT_EXPORT.include, tags: false, notes: false },
    })
    const csv = buildExport(planExport(items, texts, o), o)
    const head = csv.split('\n')[0]
    expect(head).not.toContain('tags')
    expect(head).not.toContain('note')
    expect(head.startsWith('book,type,quote')).toBe(true)
    expect(
      buildCsv(planExport(items, [], opts()), opts()).split('\n')[0],
    ).toContain('tags')
  })
})
