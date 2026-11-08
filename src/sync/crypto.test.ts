import { describe, expect, it } from 'vitest'
import {
  SyncCryptoError,
  bundleWithPassphrase,
  bundleWithRecovery,
  createMasterKey,
  isKeyBundle,
  newRecoveryCode,
  openFile,
  openRecord,
  parseRecoveryCode,
  passphraseKey,
  passphraseProblem,
  remoteId,
  sealFile,
  sealRecord,
  unlockBundle,
} from './crypto'

/** Smallest settings a bundle may use, so tests stay quick. */
const FAST = { memoryKiB: 19 * 1024, iterations: 2, parallelism: 1 }
const hex = (b: Uint8Array) =>
  [...b].map((x) => x.toString(16).padStart(2, '0')).join('')

describe('sync encryption (L5)', () => {
  it('matches the reference Argon2id vector', async () => {
    // The argon2 reference tool's example (argon2id, t=2, 64 MiB, p=1).
    const out = await passphraseKey(
      'password',
      new TextEncoder().encode('somesalt'),
      { memoryKiB: 65536, iterations: 2, parallelism: 1 },
    )
    expect(hex(out)).toBe(
      '09316115d5cf24ed5a15a31a3ba326e5cf32edc24702987c02b6566f61913cf7',
    )
  })

  it('locks and opens the master key with a passphrase', async () => {
    const master = await createMasterKey()
    const bundle = await bundleWithPassphrase(
      master,
      'correct horse battery',
      FAST,
    )
    expect(isKeyBundle(bundle)).toBe(true)
    expect(JSON.stringify(bundle)).not.toContain('correct')
    const opened = await unlockBundle(bundle, 'correct horse battery')
    expect(hex(opened.raw!)).toBe(hex(master.raw!))
    await expect(unlockBundle(bundle, 'wrong horse battery')).rejects.toThrow(
      SyncCryptoError,
    )
  })

  it('refuses a short passphrase and a tampered bundle', async () => {
    const master = await createMasterKey()
    await expect(bundleWithPassphrase(master, 'short', FAST)).rejects.toThrow()
    const bundle = await bundleWithPassphrase(master, 'a long passphrase', FAST)
    expect(isKeyBundle({ ...bundle, argon: { ...FAST, memoryKiB: 8 } })).toBe(
      false,
    )
    await expect(
      unlockBundle({ ...bundle, method: 'recovery' }, 'a long passphrase'),
    ).rejects.toThrow()
  })

  it('recovery code: 128 random bits, forgiving to type, opens the key', async () => {
    const code = newRecoveryCode()
    expect(code).toMatch(/^([0-9A-Z]{4}-){6}[0-9A-Z]{2}$/)
    expect(parseRecoveryCode(code)).toHaveLength(16)
    expect(hex(parseRecoveryCode(code.toLowerCase().replace(/-/g, ' ')))).toBe(
      hex(parseRecoveryCode(code)),
    )
    expect(() => parseRecoveryCode('ABCD')).toThrow(SyncCryptoError)
    const master = await createMasterKey()
    const bundle = await bundleWithRecovery(master, code)
    const opened = await unlockBundle(bundle, code)
    expect(hex(opened.raw!)).toBe(hex(master.raw!))
    await expect(unlockBundle(bundle, newRecoveryCode())).rejects.toThrow()
  })

  it('binds a record to its table, id and revision', async () => {
    const master = await createMasterKey()
    const sealed = await sealRecord(master, 'blocks', 'b1', 3, { text: 'hi' })
    // Real property: the plaintext bytes are not in the ciphertext (a 2-letter
    // string can appear in random base64 by chance, so check the decoded bytes
    // for a long unique marker instead).
    const marker = 'unique-marker-plaintext-7f3a9c'
    const marked = await sealRecord(master, 'blocks', 'b1', 3, { text: marker })
    const raw = atob(marked.data)
    expect(raw).not.toContain(marker)
    expect(marked.data).not.toContain(btoa(marker).slice(0, 16))
    const rid = remoteId('blocks', 'b1')
    expect(rid).not.toContain('b1')
    expect(await openRecord(master, rid, 3, sealed)).toEqual({
      table: 'blocks',
      id: 'b1',
      value: { text: 'hi' },
    })
    await expect(
      openRecord(master, remoteId('blocks', 'b2'), 3, sealed),
    ).rejects.toThrow()
    await expect(
      openRecord(master, remoteId('pages', 'b1'), 3, sealed),
    ).rejects.toThrow()
    await expect(openRecord(master, rid, 2, sealed)).rejects.toThrow()
    const other = await createMasterKey()
    await expect(openRecord(other, rid, 3, sealed)).rejects.toThrow()
    // Same value twice: different bytes (fresh IV).
    const again = await sealRecord(master, 'blocks', 'b1', 3, { text: 'hi' })
    expect(again.data).not.toBe(sealed.data)
  })

  it('locks files with their name bound in', async () => {
    const master = await createMasterKey()
    const bytes = new Uint8Array([1, 2, 3, 4])
    const sealed = await sealFile(master, 'img-1', bytes)
    expect([...(await openFile(master, 'img-1', sealed))]).toEqual([1, 2, 3, 4])
    await expect(openFile(master, 'img-2', sealed)).rejects.toThrow()
  })

  it('rates passphrases', () => {
    expect(passphraseProblem('abc')).toBe('short')
    expect(passphraseProblem('aaaaaaaaaaaaa')).toBe('simple')
    expect(passphraseProblem('river candle mango tiger')).toBeNull()
  })
})
