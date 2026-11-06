import { isStorageProtected } from '../core/storage'
import { ARGON, passphraseKey, randomBytes } from './crypto'

/**
 * L2 device check: how long the passphrase lock takes here (the iPad is
 * the slow one), whether Web Crypto's AES-GCM works, and whether the
 * browser promised to keep the data. Nothing leaves the device.
 */
export async function checkDevice(): Promise<{
  argonMs: number
  webCrypto: boolean
  persisted: boolean
}> {
  let webCrypto: boolean
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      randomBytes(32) as BufferSource,
      { name: 'AES-GCM' },
      false,
      ['encrypt', 'decrypt'],
    )
    const iv = randomBytes(12)
    const ct = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      new Uint8Array([1, 2, 3]),
    )
    const back = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      ct,
    )
    webCrypto = new Uint8Array(back)[2] === 3
  } catch {
    webCrypto = false
  }
  const start = performance.now()
  await passphraseKey('device check passphrase', randomBytes(16), ARGON)
  const argonMs = Math.round(performance.now() - start)
  return { argonMs, webCrypto, persisted: await isStorageProtected() }
}
