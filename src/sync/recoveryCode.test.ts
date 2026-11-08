import { describe, expect, it } from 'vitest'
import { memoryConnectors } from './connectors'
import { SyncCryptoError, openRecord, remoteId, sealRecord } from './crypto'
import { createKey, replaceRecoveryCode, unlockKey } from './setup'

const FAST = { memoryKiB: 19 * 1024, iterations: 2, parallelism: 1 }
const PASS = 'river candle mango tiger'

async function setUp() {
  const conn = memoryConnectors()
  const made = await createKey(conn, PASS, FAST)
  return { conn, made }
}

describe('make a new recovery code (fix #1 B)', () => {
  it('opens with the passphrase and the new code, not the old code; same key', async () => {
    const { conn, made } = await setUp()
    // A note locked before the change must still open after it.
    const sealed = await sealRecord(made.master, 'blocks', 'b1', 1, {
      text: 'hi',
    })
    const out = await replaceRecoveryCode(conn, PASS, made.master.keyId)
    expect(out.oldRemoved).toBe(true)
    expect(out.recoveryCode).not.toBe(made.recoveryCode)

    const withPass = await unlockKey(conn, PASS)
    const withNew = await unlockKey(conn, out.recoveryCode)
    expect(withPass.keyId).toBe(made.master.keyId)
    expect(withNew.keyId).toBe(made.master.keyId)
    for (const m of [withPass, withNew]) {
      const opened = await openRecord(m, remoteId('blocks', 'b1'), 1, sealed)
      expect(opened.value).toEqual({ text: 'hi' })
    }
    await expect(unlockKey(conn, made.recoveryCode)).rejects.toThrow(
      SyncCryptoError,
    )
    // One passphrase copy and one code copy remain.
    expect(Object.keys(conn.state.bundles).length).toBe(2)
  })

  it('refuses a wrong passphrase and changes nothing', async () => {
    const { conn, made } = await setUp()
    const before = JSON.stringify(conn.state.bundles)
    await expect(
      replaceRecoveryCode(conn, 'not the passphrase', made.master.keyId),
    ).rejects.toThrow(SyncCryptoError)
    expect(JSON.stringify(conn.state.bundles)).toBe(before)
    await unlockKey(conn, made.recoveryCode)
  })

  it('a failed store leaves the old code working', async () => {
    const { conn, made } = await setUp()
    const before = JSON.stringify(conn.state.bundles)
    conn.records.putKeyBundle = async () => {
      throw new Error('offline')
    }
    await expect(
      replaceRecoveryCode(conn, PASS, made.master.keyId),
    ).rejects.toThrow()
    expect(JSON.stringify(conn.state.bundles)).toBe(before)
    await unlockKey(conn, made.recoveryCode)
    await unlockKey(conn, PASS)
  })

  it('a copy that did not really arrive is not trusted: old code stays', async () => {
    const { conn, made } = await setUp()
    conn.records.putKeyBundle = async () => undefined // says yes, stores nothing
    await expect(
      replaceRecoveryCode(conn, PASS, made.master.keyId),
    ).rejects.toThrow()
    await unlockKey(conn, made.recoveryCode)
  })

  it('a failed removal keeps both codes working and says so', async () => {
    const { conn, made } = await setUp()
    conn.records.deleteKeyBundle = async () => {
      throw new Error('denied')
    }
    const out = await replaceRecoveryCode(conn, PASS, made.master.keyId)
    expect(out.oldRemoved).toBe(false)
    await unlockKey(conn, made.recoveryCode)
    await unlockKey(conn, out.recoveryCode)
    await unlockKey(conn, PASS)
  })

  it('can be done twice in a row', async () => {
    const { conn, made } = await setUp()
    const one = await replaceRecoveryCode(conn, PASS, made.master.keyId)
    const two = await replaceRecoveryCode(conn, PASS, made.master.keyId)
    await unlockKey(conn, two.recoveryCode)
    await expect(unlockKey(conn, one.recoveryCode)).rejects.toThrow()
    await expect(unlockKey(conn, made.recoveryCode)).rejects.toThrow()
  })
})
