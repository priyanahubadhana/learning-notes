import { readFileSync } from 'node:fs'
import { generateKeyBetween } from 'fractional-indexing'
import { describe, expect, it } from 'vitest'
import { denoSpec } from '../../scripts/sync-connector-spec.mjs'
import * as app from '../sync/crypto'
import { stableId as appStableId } from '../core/ids'
import { fromWire as appFromWire, toWire } from '../sync/wire'
import { inlineRuns as appInlineRuns } from '../editor/textBlocks'
import { blocksToMarkdown as mcpMarkdown } from '../../mcp/src/markdown'
import * as srv from '../../supabase/functions/_shared/e2e'
import { fromWire as srvFromWire } from '../../supabase/functions/_shared/wire'
import { blocksToMarkdown as srvMarkdown } from '../../supabase/functions/_shared/markdown'
import {
  inlineRuns as srvInlineRuns,
  orderAfter,
  orderKey,
} from '../../supabase/functions/_shared/notesWrite'

/**
 * The online connector (Deno) keeps SMALL COPIES of app code it cannot import.
 * These tests make sure the copies behave exactly like the originals, so a
 * record sealed by the server opens in the app and the reverse.
 */

const raw = (n = 32) => crypto.getRandomValues(new Uint8Array(n))

describe('parity: server crypto vs app crypto', () => {
  it('a record sealed by the server opens in the app', async () => {
    const bytes = raw()
    const appKey = await app.masterFromRaw('0123456789abcdef', bytes)
    const srvKey = await srv.masterFromRaw('0123456789abcdef', bytes)
    const env = {
      f: 1,
      h: '000000000000001-000000-claude-remote',
      d: 'claude-remote',
      r: { id: 'p1', title: 'Köln — 日本語', n: 3 },
    }
    const sealed = await srv.sealRecord(srvKey, 'pages', 'p1', 1, env)
    const back = await app.openRecord(
      appKey,
      app.remoteId('pages', 'p1'),
      1,
      sealed,
    )
    expect(back).toEqual({ table: 'pages', id: 'p1', value: env })
  })
  it('a record sealed by the app opens on the server', async () => {
    const bytes = raw()
    const appKey = await app.masterFromRaw('0123456789abcdef', bytes)
    const srvKey = await srv.masterFromRaw('0123456789abcdef', bytes)
    const sealed = await app.sealRecord(appKey, 'blocks', 'b9', 4, {
      r: toWire({ id: 'b9', x: new Uint8Array([1, 2, 3]) }),
    })
    const back = await srv.openRecord(
      srvKey,
      srv.remoteId('blocks', 'b9'),
      4,
      sealed,
    )
    expect(back.table).toBe('blocks')
    expect(back.id).toBe('b9')
  })
  it('a swapped id, a wrong revision and another key are refused', async () => {
    const bytes = raw()
    const k = await srv.masterFromRaw('0123456789abcdef', bytes)
    const sealed = await srv.sealRecord(k, 'pages', 'p1', 2, { r: {} })
    await expect(
      srv.openRecord(k, srv.remoteId('pages', 'p2'), 2, sealed),
    ).rejects.toThrow()
    await expect(
      srv.openRecord(k, srv.remoteId('pages', 'p1'), 3, sealed),
    ).rejects.toThrow()
    const other = await srv.masterFromRaw('fedcba9876543210', bytes)
    await expect(
      srv.openRecord(other, srv.remoteId('pages', 'p1'), 2, sealed),
    ).rejects.toThrow()
  })
  it('ids and wire decoding match the app', () => {
    for (const name of ['a', 'rec:pages:x', 'card:abc/main', 'ünï'])
      expect(srv.stableId(name)).toBe(appStableId(name))
    expect(srv.remoteId('cards', 'zz')).toBe(app.remoteId('cards', 'zz'))
    const wire = toWire({
      a: new Uint8Array([9, 8, 7]),
      b: { c: new Float32Array([1.5, 2.5]) },
      d: 'x',
    })
    const mine = srvFromWire(wire) as Record<string, unknown>
    const theirs = appFromWire(wire) as Record<string, unknown>
    expect(mine).toEqual(theirs)
    expect(mine.a).toBeInstanceOf(Uint8Array)
  })
})

describe('parity: escrow wrapping', () => {
  const secret = 'x'.repeat(40)
  it('wraps and unwraps the master key', async () => {
    const bytes = raw()
    const wrapped = await srv.wrapMasterKey(
      secret,
      'user-1',
      'aaaaaaaaaaaaaaaa',
      bytes,
    )
    expect(wrapped).not.toContain(Buffer.from(bytes).toString('base64'))
    const key = await srv.unwrapMasterKey(
      secret,
      'user-1',
      'aaaaaaaaaaaaaaaa',
      wrapped,
    )
    // It really is the same key: it opens what the app sealed with these bytes.
    const appKey = await app.masterFromRaw('aaaaaaaaaaaaaaaa', bytes)
    const sealed = await app.sealRecord(appKey, 'pages', 'p', 1, { ok: 1 })
    const back = await srv.openRecord(
      key,
      app.remoteId('pages', 'p'),
      1,
      sealed,
    )
    expect(back.value).toEqual({ ok: 1 })
  })
  it('does not open for another user, secret, key id or short secret', async () => {
    const wrapped = await srv.wrapMasterKey(
      secret,
      'user-1',
      'aaaaaaaaaaaaaaaa',
      raw(),
    )
    await expect(
      srv.unwrapMasterKey(secret, 'user-2', 'aaaaaaaaaaaaaaaa', wrapped),
    ).rejects.toThrow()
    await expect(
      srv.unwrapMasterKey(
        'y'.repeat(40),
        'user-1',
        'aaaaaaaaaaaaaaaa',
        wrapped,
      ),
    ).rejects.toThrow()
    await expect(
      srv.unwrapMasterKey(secret, 'user-1', 'bbbbbbbbbbbbbbbb', wrapped),
    ).rejects.toThrow()
    await expect(
      srv.wrapMasterKey('short', 'user-1', 'aaaaaaaaaaaaaaaa', raw()),
    ).rejects.toThrow()
    await expect(
      srv.wrapMasterKey(secret, 'user-1', 'aaaaaaaaaaaaaaaa', raw(31)),
    ).rejects.toThrow()
  })
})

describe('parity: copies of app and connector code', () => {
  it('the Deno spec copy is up to date with src/connector/spec.ts', () => {
    const src = readFileSync('src/connector/spec.ts', 'utf8')
    const copy = readFileSync('supabase/functions/_shared/spec.ts', 'utf8')
    expect(copy.replace(/\r\n/g, '\n')).toBe(
      denoSpec(src.replace(/\r\n/g, '\n')),
    )
  })
  it('the server Markdown equals the local connector Markdown', () => {
    const run = (text: string, styles = {}) => ({ type: 'text', text, styles })
    const blocks = [
      {
        id: 'a',
        pageId: 'p',
        parentId: null,
        type: 'heading',
        order: 'a0',
        content: { level: 2, text: [run('Title')] },
      },
      {
        id: 'b',
        pageId: 'p',
        parentId: null,
        type: 'paragraph',
        order: 'a1',
        content: {
          text: [
            run('Hi ', {}),
            run('bold', { bold: true }),
            { type: 'link', href: 'https://x.y', content: [run('link')] },
          ],
        },
      },
      {
        id: 'c',
        pageId: 'p',
        parentId: null,
        type: 'bulletListItem',
        order: 'a2',
        content: { text: [run('one')] },
      },
      {
        id: 'd',
        pageId: 'p',
        parentId: 'c',
        type: 'numberedListItem',
        order: 'a0',
        content: { text: [run('nested')] },
      },
      {
        id: 'e',
        pageId: 'p',
        parentId: null,
        type: 'checkListItem',
        order: 'a3',
        content: { checked: true, text: [run('done')] },
      },
      {
        id: 'f',
        pageId: 'p',
        parentId: null,
        type: 'codeBlock',
        order: 'a4',
        content: { language: 'python', text: [run('print(1)')] },
      },
      {
        id: 'g',
        pageId: 'p',
        parentId: null,
        type: 'table',
        order: 'a5',
        content: {
          text: {
            type: 'tableContent',
            rows: [
              { cells: [[run('a')], [run('b|c')]] },
              { cells: [[run('1')], [run('2')]] },
            ],
          },
        },
      },
      {
        id: 'h',
        pageId: 'p',
        parentId: null,
        type: 'card',
        order: 'a6',
        content: { text: [run('Q?')] },
      },
      {
        id: 'i',
        pageId: 'p',
        parentId: null,
        type: 'math',
        order: 'a7',
        content: { latex: 'x^2' },
      },
      {
        id: 'j',
        pageId: 'p',
        parentId: null,
        type: 'callout',
        order: 'a8',
        content: { emoji: '💡', text: [run('tip')] },
      },
      {
        id: 'k',
        pageId: 'p',
        parentId: null,
        type: 'divider',
        order: 'a9',
        content: {},
      },
    ]
    expect(srvMarkdown(blocks as never)).toBe(mcpMarkdown(blocks as never))
    expect(srvMarkdown(blocks as never)).toContain('# ')
  })
  it('inline Markdown becomes the same rich text as in the app', () => {
    for (const s of [
      'plain',
      'a **bold** and *it* and `code`',
      '[ok](https://example.com/x) and [bad](http://x.y)',
      '__also bold__ text',
      '2 * 3 * 4',
      '',
    ])
      expect(srvInlineRuns(s)).toEqual(appInlineRuns(s))
  })
})

describe('order keys', () => {
  it('are valid for the app library and increase', () => {
    let prev = ''
    for (const i of [0, 1, 61, 62, 63, 3905, 3906, 3907, 20000]) {
      const k = orderKey(i)
      expect(() => generateKeyBetween(k, null)).not.toThrow()
      expect(k > prev).toBe(true)
      prev = k
    }
  })
  it('orderAfter sorts after the last key and stays valid', () => {
    let last: string | null = null
    for (let i = 0; i < 20; i++) {
      const k = orderAfter(last)
      expect(() => generateKeyBetween(k, null)).not.toThrow()
      if (last) expect(k > last).toBe(true)
      last = k
    }
  })
})

describe('parity: slice 6-7 copies', () => {
  it('fracindex makes the same keys as the library (random pairs)', async () => {
    const { generateKeyBetween: mine, orderBetween } =
      await import('../../supabase/functions/_shared/fracindex')
    const { orderBetween: appBetween } = await import('../core/order')
    // Build a long list by random inserts, once with each; every step must match.
    let seed = 7
    const rnd = (n: number) => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      return seed % n
    }
    const list: string[] = []
    for (let i = 0; i < 3000; i++) {
      const at = rnd(list.length + 1)
      const a = list[at - 1] ?? null
      const b = list[at] ?? null
      const lib = generateKeyBetween(a, b)
      expect(mine(a, b)).toBe(lib)
      list.splice(at, 0, lib)
    }
    // Our suffixed keys are valid for the app's library and fall between.
    for (let i = 0; i < 500; i++) {
      const at = rnd(list.length + 1)
      const a = list[at - 1] ?? null
      const b = list[at] ?? null
      const k = orderBetween(a, b)
      expect(a === null || a < k).toBe(true)
      expect(b === null || k < b).toBe(true)
      expect(() => generateKeyBetween(k, null)).not.toThrow()
      const k2 = appBetween(a, b)
      expect(a === null || a < k2).toBe(true)
    }
    // Odd neighbours never throw.
    expect(() => orderBetween('a1', 'a1')).not.toThrow()
    expect(() => orderBetween('a2', 'a1')).not.toThrow()
    expect(() => orderBetween('!!', null)).not.toThrow()
  })

  it('the outline becomes the same tree as the app builds', async () => {
    const { outlineToMap } =
      await import('../../supabase/functions/_shared/mindmap')
    const { fromOutline } = await import('../editor/mindMap/model')
    const shape = (m: {
      root: string
      nodes: { id: string; text: string; parent: string | null }[]
    }) => {
      const at = new Map(m.nodes.map((n, i) => [n.id, i]))
      return m.nodes.map((n) => [
        n.text,
        n.parent === null ? -1 : at.get(n.parent),
      ])
    }
    const outlines = [
      '',
      'Only one',
      'Plants\n  Trees\n    Oak\n  Herbs',
      '- a\n- b\n  - c\n- d',
      '1. one\n2. two\n   - deep\n3. three',
      'x\n\n\n  y\n\t\tz',
      '  indented\n  same\n    child',
    ]
    for (const o of outlines) {
      let n = 0
      const mine = outlineToMap(o, 'Centre', () => `n${n++}`)
      expect(shape(mine), JSON.stringify(o)).toEqual(
        shape(fromOutline(o, 'Centre')),
      )
    }
  })
})
