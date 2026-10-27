import { describe, expect, it } from 'vitest'
import {
  DecryptError,
  decryptBytes,
  encryptBytes,
  isEncryptedFile,
  peekIsEncrypted,
} from './crypto'

const FAST = 100_000 // the least the reader accepts; keeps tests quick
const bytes = (s: string) => new TextEncoder().encode(s)
const text = (b: Uint8Array) => new TextDecoder().decode(b)

describe('password protection', () => {
  it('round trips, with a new salt and IV every time', async () => {
    const a = await encryptBytes(
      bytes('{"hello":"wörld ✓"}'),
      'pässword1',
      FAST,
    )
    const b = await encryptBytes(
      bytes('{"hello":"wörld ✓"}'),
      'pässword1',
      FAST,
    )
    expect(a).not.toEqual(b)
    expect(isEncryptedFile(a)).toBe(true)
    expect(text(await decryptBytes(a, 'pässword1'))).toBe('{"hello":"wörld ✓"}')
  })

  it('does not contain the plain text', async () => {
    const file = await encryptBytes(
      bytes('SECRET-NOTE-TEXT'),
      'password1',
      FAST,
    )
    expect(text(file)).not.toContain('SECRET')
  })

  it('refuses a wrong password', async () => {
    const file = await encryptBytes(bytes('data'), 'password1', FAST)
    await expect(decryptBytes(file, 'password2')).rejects.toBeInstanceOf(
      DecryptError,
    )
  })

  it('refuses a file that was changed (data, header or salt)', async () => {
    const file = await encryptBytes(bytes('some data here'), 'password1', FAST)
    for (const at of [file.length - 1, 14, 20, 40]) {
      const changed = file.slice()
      changed[at] ^= 1
      await expect(decryptBytes(changed, 'password1')).rejects.toBeInstanceOf(
        DecryptError,
      )
    }
  })

  it('refuses silly round counts and other files quickly', async () => {
    const file = await encryptBytes(bytes('x'), 'password1', FAST)
    const slow = file.slice()
    new DataView(slow.buffer).setUint32(8, 4_000_000_000)
    await expect(decryptBytes(slow, 'password1')).rejects.toBeInstanceOf(
      DecryptError,
    )
    await expect(decryptBytes(bytes('{"app":1}'), 'x')).rejects.toBeInstanceOf(
      DecryptError,
    )
  })

  it('peekIsEncrypted tells locked files from JSON', async () => {
    const file = await encryptBytes(bytes('x'), 'password1', FAST)
    expect(await peekIsEncrypted(new Blob([file as BlobPart]))).toBe(true)
    expect(await peekIsEncrypted(new Blob(['{"app":"learning-notes"}']))).toBe(
      false,
    )
  })

  it('handles a 20 MB file', async () => {
    const big = new Uint8Array(20_000_000).fill(7)
    const file = await encryptBytes(big, 'password1', FAST)
    expect((await decryptBytes(file, 'password1')).length).toBe(big.length)
  }, 30_000)
})
