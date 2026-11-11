import { describe, expect, it } from 'vitest'
import schema from './spec.schema.json'
import {
  BLOCK_FIELDS,
  BLOCK_TYPES,
  COLUMN_TYPES,
  LIMITS,
  TAB_COLOURS,
  describeErrors,
  validateSpec,
  validateSpecText,
} from './spec'
import { blockTypes } from '../blocks/builtinBlockTypes'
import { listColumnTypes } from '../databases/columnTypes'
import { TAG_COLORS } from '../tags/tagTools'

const good = () => ({
  version: 'ln-spec/1',
  title: 'Photosynthesis',
  summary: 'How plants make food.',
  style: { colour: '#1D7A50', view: 'tabs', sheet: 'A4' },
  pages: [
    {
      title: 'Overview',
      tabColour: '#2e9e6b',
      blocks: [
        { type: 'heading', level: 1, text: 'Overview' },
        { type: 'paragraph', text: 'Plants turn **light** into sugar.' },
        {
          type: 'bulletListItem',
          text: 'Light reactions',
          children: [{ type: 'bulletListItem', text: 'In the thylakoid' }],
        },
        { type: 'checkListItem', text: 'Revise', checked: false },
        { type: 'codeBlock', text: 'print(1)\nprint(2)', language: 'python' },
        {
          type: 'table',
          rows: [
            ['a', 'b'],
            ['c', 'd'],
          ],
        },
        { type: 'callout', text: 'Key idea', emoji: '💡' },
        {
          type: 'card',
          text: 'What is chlorophyll?',
          children: [{ type: 'paragraph', text: 'A pigment.' }],
        },
        { type: 'mindMap', outline: '- Plants\n  - Light' },
        { type: 'math', latex: '6CO_2 + 6H_2O' },
        { type: 'embed', url: 'https://example.com/a', caption: 'Source' },
        { type: 'pageLink', page: 'details' },
        { type: 'database', database: 'terms' },
        { type: 'divider' },
      ],
    },
    { title: 'Details', blocks: [{ type: 'paragraph', text: 'More.' }] },
  ],
  cards: [
    { kind: 'qa', q: 'Q?', a: 'A.', page: 'Overview' },
    { kind: 'cloze', text: 'Plants use {{light}}.' },
  ],
  databases: [
    {
      key: 'terms',
      title: 'Terms',
      columns: [
        { name: 'Level', type: 'choice', options: ['Easy', 'Hard'] },
        { name: 'Tags', type: 'choices', options: ['a', 'b'] },
        { name: 'Score', type: 'number' },
        { name: 'Done', type: 'checkbox' },
        { name: 'Due', type: 'date' },
        { name: 'Link', type: 'url' },
        { name: 'Note', type: 'text' },
      ],
      rows: [
        {
          title: 'ATP',
          values: {
            Level: 'Easy',
            Tags: ['a'],
            Score: 3,
            Done: true,
            Due: '2026-11-30',
            Link: 'https://x.org',
            Note: 'n',
          },
        },
      ],
    },
  ],
})
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any
const bad = (mutate: (s: Any) => void) => {
  const s: Any = good()
  mutate(s)
  return validateSpec(s)
}
const failsAt = (r: ReturnType<typeof validateSpec>, path: string) =>
  !r.ok && r.errors.some((e) => e.path === path)

describe('spec: valid input', () => {
  it('accepts a full spec and counts it', () => {
    const r = validateSpec(good())
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.counts.pages).toBe(2)
      expect(r.counts.cards).toBe(3) // 1 card block + 2 listed
      expect(r.counts.databases).toBe(1)
    }
  })
  it('accepts a minimal spec and text input', () => {
    const min = {
      version: 'ln-spec/1',
      title: 'T',
      pages: [{ title: 'P', blocks: [] }],
    }
    expect(validateSpec(min).ok).toBe(true)
    expect(validateSpecText(JSON.stringify(min)).ok).toBe(true)
  })
})

describe('spec: clear errors', () => {
  it('points at the exact path', () => {
    expect(
      failsAt(
        bad((s) => (s.pages[0].blocks[0].level = 4)),
        '/pages/0/blocks/0/level',
      ),
    ).toBe(true)
    expect(
      failsAt(
        bad((s) => (s.version = 'x')),
        '/version',
      ),
    ).toBe(true)
    expect(
      failsAt(
        bad((s) => delete s.title),
        '/title',
      ),
    ).toBe(true)
    expect(
      failsAt(
        bad((s) => (s.pages[0].blocks[1].bogus = 1)),
        '/pages/0/blocks/1/bogus',
      ),
    ).toBe(true)
    expect(
      failsAt(
        bad((s) => (s.extra = 1)),
        '/extra',
      ),
    ).toBe(true)
  })
  it('refuses unknown block types, and fields that do not belong to a type', () => {
    expect(bad((s) => (s.pages[0].blocks[0].type = 'image')).ok).toBe(false)
    expect(bad((s) => (s.pages[0].blocks[1].level = 1)).ok).toBe(false)
    // a divider cannot nest
    expect(bad((s) => (s.pages[0].blocks[13].children = [])).ok).toBe(false)
  })
  it('refuses non-https links and bad urls', () => {
    for (const url of [
      'http://a.com',
      'javascript:alert(1)',
      'data:text/html,x',
      'https://',
      'https://a b.com',
      'ftp://a.com',
    ])
      expect(bad((s) => (s.pages[0].blocks[10].url = url)).ok, url).toBe(false)
  })
  it('checks cross references', () => {
    expect(
      failsAt(
        bad((s) => (s.pages[0].blocks[11].page = 'nope')),
        '/pages/0/blocks/11/page',
      ),
    ).toBe(true)
    expect(
      failsAt(
        bad((s) => (s.pages[0].blocks[12].database = 'nope')),
        '/pages/0/blocks/12/database',
      ),
    ).toBe(true)
    expect(
      failsAt(
        bad((s) => (s.cards[0].page = 'nope')),
        '/cards/0/page',
      ),
    ).toBe(true)
  })
  it('checks cards, tables and cells', () => {
    expect(bad((s) => (s.cards[1].text = 'no blank here')).ok).toBe(false)
    expect(
      bad((s) => (s.pages[0].blocks[5].rows = [['a'], ['b', 'c']])).ok,
    ).toBe(false)
    expect(
      bad((s) => (s.databases[0].rows[0].values.Level = 'Medium')).ok,
    ).toBe(false)
    expect(
      bad((s) => (s.databases[0].rows[0].values.Due = '2026-02-31')).ok,
    ).toBe(false)
    expect(bad((s) => (s.databases[0].rows[0].values.Score = 'x')).ok).toBe(
      false,
    )
    expect(bad((s) => (s.databases[0].rows[0].values.Nope = 'x')).ok).toBe(
      false,
    )
    expect(bad((s) => (s.databases[0].columns[0].options = undefined)).ok).toBe(
      false,
    )
    expect(bad((s) => (s.databases[0].columns[2].options = ['a'])).ok).toBe(
      false,
    )
  })
  it('refuses duplicates and bad styles', () => {
    expect(bad((s) => (s.pages[1].title = ' overview ')).ok).toBe(false)
    expect(bad((s) => s.databases.push(s.databases[0])).ok).toBe(false)
    expect(bad((s) => (s.style.colour = 'blue')).ok).toBe(false)
    expect(bad((s) => (s.pages[0].tabColour = '#000000')).ok).toBe(false)
  })
  it('refuses control characters', () => {
    expect(bad((s) => (s.title = 'a\u0000b')).ok).toBe(false)
    expect(bad((s) => (s.pages[0].title = 'a\nb')).ok).toBe(false)
  })
  it('describes errors as plain lines', () => {
    const r = bad((s) => (s.version = 'x'))
    expect(r.ok).toBe(false)
    if (!r.ok)
      expect(describeErrors(r.errors)).toContain(
        '/version: Must be "ln-spec/1"',
      )
  })
})

describe('spec: limits', () => {
  const pages = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ title: `P${i}`, blocks: [] }))
  const spec = (p: unknown[]) => ({
    version: 'ln-spec/1',
    title: 'T',
    pages: p,
  })
  it('50 pages ok, 51 not', () => {
    expect(validateSpec(spec(pages(50))).ok).toBe(true)
    expect(validateSpec(spec(pages(51))).ok).toBe(false)
  })
  it('200 blocks per page ok, 201 not (nested blocks count)', () => {
    const blocks = (n: number) =>
      Array.from({ length: n }, () => ({ type: 'divider' }))
    expect(validateSpec(spec([{ title: 'A', blocks: blocks(200) }])).ok).toBe(
      true,
    )
    expect(validateSpec(spec([{ title: 'A', blocks: blocks(201) }])).ok).toBe(
      false,
    )
    const nested = Array.from({ length: 101 }, () => ({
      type: 'bulletListItem',
      text: 'x',
      children: [{ type: 'bulletListItem', text: 'y' }],
    }))
    expect(validateSpec(spec([{ title: 'A', blocks: nested }])).ok).toBe(false)
  })
  it('500 cards ok, 501 not (blocks and list together)', () => {
    const cards = (n: number) =>
      Array.from({ length: n }, () => ({ kind: 'qa', q: 'q', a: 'a' }))
    const base = (n: number) => ({ ...spec(pages(1)), cards: cards(n) })
    expect(validateSpec(base(500)).ok).toBe(true)
    expect(validateSpec(base(501)).ok).toBe(false)
    const cb = Array.from({ length: 250 }, () => ({ type: 'card', text: 'q' }))
    const mix = { ...spec([{ title: 'A', blocks: cb }]), cards: cards(251) }
    expect(validateSpec(mix).ok).toBe(false)
  })
  it('256 KB: a spec just over is refused, with a size message', () => {
    const big = spec([
      {
        title: 'A',
        blocks: Array.from({ length: 15 }, () => ({
          type: 'paragraph',
          text: 'x'.repeat(19000),
        })),
      },
    ])
    const r = validateSpec(big)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors[0].message).toContain('256 KB')
    expect(validateSpecText(' '.repeat(LIMITS.maxBytes + 1)).ok).toBe(false)
  })
  it('counts bytes, not characters', () => {
    const t = '€'.repeat(19000) // 3 bytes each
    const blocks = Array.from({ length: 6 }, () => ({
      type: 'paragraph',
      text: t,
    }))
    expect(validateSpec(spec([{ title: 'A', blocks }])).ok).toBe(false)
  })
})

describe('spec: hostile input never throws', () => {
  it('rejects non-objects, loops, prototype tricks', () => {
    for (const v of [
      null,
      undefined,
      1,
      'x',
      [],
      () => 1,
      Symbol('s'),
      NaN,
      new Date(),
      new Map(),
    ]) {
      expect(() => validateSpec(v)).not.toThrow()
      expect(validateSpec(v).ok).toBe(false)
    }
    const loop: Any = { version: 'ln-spec/1', title: 'T', pages: [] }
    loop.pages.push(loop)
    expect(validateSpec(loop).ok).toBe(false)
    expect(
      validateSpecText(
        '{"__proto__":{"x":1},"version":"ln-spec/1","title":"T","pages":[{"title":"P","blocks":[]}]}',
      ).ok,
    ).toBe(false)
    expect(validateSpecText('{bad').ok).toBe(false)
    expect(validateSpecText(5 as unknown as string).ok).toBe(false)
  })
  it('rejects absurd depth and caps the error report', () => {
    let deep: Any = 'x'
    for (let i = 0; i < 5000; i++) deep = [deep]
    expect(
      validateSpec({ version: 'ln-spec/1', title: 'T', pages: deep }).ok,
    ).toBe(false)
    const r = validateSpec({
      version: 'ln-spec/1',
      title: 'T',
      pages: [
        {
          title: 'A',
          blocks: Array.from({ length: 200 }, () => ({ type: 'nope' })),
        },
      ],
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.length).toBeLessThanOrEqual(LIMITS.maxErrors)
  })

  // Fuzz: random mutations of a valid spec. The validator must never throw, and
  // anything it accepts must satisfy the hard invariants.
  it('fuzz: 3000 random mutations', () => {
    let seed = 12345
    const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32
    const pick = <T>(a: T[]): T => a[Math.floor(rnd() * a.length)]
    const junk: unknown[] = [
      null,
      0,
      -1,
      Infinity,
      '',
      'x'.repeat(30000),
      [],
      {},
      true,
      'https://a.b',
      '{{x}}',
      '\u0000',
      [[]],
      { type: 'divider' },
      '__proto__',
      2.5,
      'javascript:1',
    ]
    const paths = (
      o: Any,
      p: (string | number)[] = [],
      out: (string | number)[][] = [],
    ) => {
      out.push(p)
      if (o && typeof o === 'object')
        for (const k of Object.keys(o)) paths(o[k], [...p, k], out)
      return out
    }
    for (let i = 0; i < 3000; i++) {
      const s: Any = good()
      for (let m = 0; m < 1 + Math.floor(rnd() * 3); m++) {
        const all = paths(s).filter((p) => p.length > 0)
        const p = pick(all)
        let parent = s
        for (const k of p.slice(0, -1)) parent = parent[k]
        const last = p[p.length - 1]
        const op = rnd()
        if (op < 0.6) parent[last] = pick(junk)
        else if (op < 0.8) delete parent[last]
        else parent[`k${Math.floor(rnd() * 5)}`] = pick(junk)
      }
      let r: ReturnType<typeof validateSpec> | undefined
      expect(() => (r = validateSpec(s))).not.toThrow()
      if (r?.ok) {
        const spec = r.spec
        expect(spec.pages.length).toBeLessThanOrEqual(LIMITS.maxPages)
        expect(r.counts.cards).toBeLessThanOrEqual(LIMITS.maxCards)
        expect(JSON.stringify(spec).length).toBeLessThanOrEqual(LIMITS.maxBytes)
        for (const p of spec.pages)
          expect(p.blocks.length).toBeLessThanOrEqual(LIMITS.maxBlocksPerPage)
      }
    }
  })
})

describe('spec: stays in step with the app and the JSON Schema', () => {
  it('every block type is a registered app block type', () => {
    for (const t of BLOCK_TYPES) expect(blockTypes.has(t), t).toBe(true)
    expect(Object.keys(BLOCK_FIELDS).sort()).toEqual([...BLOCK_TYPES].sort())
  })
  it('every column type is a registered app column type', () => {
    const known = listColumnTypes().map((c) => c.type)
    for (const t of COLUMN_TYPES) expect(known, t).toContain(t)
  })
  it('tab colours are the app tag colours', () => {
    expect([...TAB_COLOURS]).toEqual([...TAG_COLORS])
  })
  it('the JSON Schema matches the validator', () => {
    const s = schema as Any
    expect(s.$schema).toBe('https://json-schema.org/draft/2020-12/schema')
    expect(s.properties.pages.maxItems).toBe(LIMITS.maxPages)
    expect(s.properties.cards.maxItems).toBe(LIMITS.maxCards)
    expect(s.properties.pages.items.properties.blocks.maxItems).toBe(
      LIMITS.maxBlocksPerPage,
    )
    expect(s.properties.databases.maxItems).toBe(LIMITS.maxDatabases)
    const blockSchema = s.properties.pages.items.properties.blocks.items
    expect([...blockSchema.properties.type.enum].sort()).toEqual(
      [...BLOCK_TYPES].sort(),
    )
    const colType =
      s.properties.databases.items.properties.columns.items.properties.type.enum
    expect([...colType]).toEqual([...COLUMN_TYPES])
    expect([...s.properties.pages.items.properties.tabColour.enum]).toEqual([
      ...TAB_COLOURS,
    ])
    const declared = Object.keys(blockSchema.properties)
    for (const fields of Object.values(BLOCK_FIELDS))
      for (const f of fields) expect(declared).toContain(f)
    expect(s.description).toContain('256 KB')
  })
})
