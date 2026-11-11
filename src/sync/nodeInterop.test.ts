import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  bundleWithPassphrase,
  createMasterKey,
  masterFromRaw,
  openRecord,
  remoteId,
  sealRecord,
  unlockBundle,
} from './crypto'
import { formatHlc, parseHlc, tick } from './hlc'
import { fromWire, toWire } from './wire'

/**
 * The Claude connector (mcp/) runs this same code in Node 20 and reads what
 * the app wrote. These tests open a record with Node's own `node:crypto`
 * (not our code), and the reverse, so a change to the record format that
 * would break the connector fails here first.
 */

const aad = (keyId: string, serverId: string, rev: number) =>
  Buffer.from(`ln-rec|v1|${keyId}|${serverId}|${rev}`)

describe('Node and browser code agree (Claude connector)', () => {
  it('Node opens a record the app code sealed', async () => {
    const master = await createMasterKey()
    const env = {
      f: 1,
      h: formatHlc({ ms: 5, n: 0, deviceId: 'd' }),
      r: toWire({ id: 'a', title: 'Hi', bytes: new Uint8Array([1, 2]) }),
    }
    const sealed = await sealRecord(master, 'pages', 'a', 3, env)
    const bytes = Buffer.from(sealed.data, 'base64')
    const d = createDecipheriv(
      'aes-256-gcm',
      Buffer.from(master.raw!),
      bytes.subarray(0, 12),
    )
    d.setAAD(aad(master.keyId, remoteId('pages', 'a'), 3))
    d.setAuthTag(bytes.subarray(bytes.length - 16))
    const plain = JSON.parse(
      Buffer.concat([
        d.update(bytes.subarray(12, bytes.length - 16)),
        d.final(),
      ]).toString('utf8'),
    )
    expect(plain.t).toBe('pages')
    expect(plain.i).toBe('a')
    expect(fromWire(plain.v.r)).toEqual({
      id: 'a',
      title: 'Hi',
      bytes: new Uint8Array([1, 2]),
    })
  })

  it('the app code opens a record Node sealed', async () => {
    const master = await createMasterKey()
    const serverId = remoteId('cards', 'c1')
    const iv = randomBytes(12)
    const c = createCipheriv('aes-256-gcm', Buffer.from(master.raw!), iv)
    c.setAAD(aad(master.keyId, serverId, 7))
    const ct = Buffer.concat([
      c.update(
        JSON.stringify({
          t: 'cards',
          i: 'c1',
          v: { f: 1, h: 'x', r: { id: 'c1' } },
        }),
        'utf8',
      ),
      c.final(),
    ])
    const data = Buffer.concat([iv, ct, c.getAuthTag()]).toString('base64')
    const out = await openRecord(master, serverId, 7, {
      keyId: master.keyId,
      data,
    })
    expect(out.table).toBe('cards')
    expect(out.id).toBe('c1')
  })

  it('a key stored as raw bytes opens the same records (the connector keychain path)', async () => {
    const master = await createMasterKey()
    const sealed = await sealRecord(master, 'blocks', 'b', 1, { n: 1 })
    const again = await masterFromRaw(master.keyId, master.raw!)
    const out = await openRecord(again, remoteId('blocks', 'b'), 1, sealed)
    expect(out.value).toEqual({ n: 1 })
  })

  it('a passphrase bundle made by the app unlocks to the same key', async () => {
    const master = await createMasterKey()
    const bundle = await bundleWithPassphrase(master, 'correct horse battery', {
      memoryKiB: 19 * 1024,
      iterations: 2,
      parallelism: 1,
    })
    const opened = await unlockBundle(
      JSON.parse(JSON.stringify(bundle)),
      'correct horse battery',
    )
    expect(Buffer.from(opened.raw!).equals(Buffer.from(master.raw!))).toBe(true)
  })

  it('clock strings keep their shape', () => {
    const t = tick({ ms: 10, n: 0, deviceId: 'dev' }, 10)
    expect(parseHlc(formatHlc(t))).toEqual(t)
  })

  it('the shared files import only portable code (no DOM, no Dexie, no React)', () => {
    const allowed = new Set(['hash-wasm', '../core/base64', '../core/ids'])
    for (const file of ['crypto.ts', 'hlc.ts', 'wire.ts']) {
      const src = readFileSync(new URL(`./${file}`, import.meta.url), 'utf8')
      const imports = [...src.matchAll(/from '([^']+)'/g)].map((m) => m[1])
      for (const i of imports)
        expect(allowed.has(i), `${file} imports ${i}`).toBe(true)
    }
    for (const file of ['../core/base64.ts', '../core/ids.ts']) {
      const src = readFileSync(new URL(`./${file}`, import.meta.url), 'utf8')
      expect(src).not.toMatch(/from '/)
    }
  })
})
