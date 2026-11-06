/**
 * Creates a new record id: a random UUID (v4) generated on this device.
 *
 * Ids never come from a server, so records can be created offline and
 * synced later without clashes. Uses the built-in Web Crypto API
 * (available in browsers on localhost/HTTPS and in Node).
 */
export function createId(): string {
  return crypto.randomUUID()
}

/**
 * A fixed id made from a name (sync, L1). Records that every device makes
 * on its own (the workspace, the Journal notebook, a day's page, the card of
 * a block) get the same id everywhere, so a first sync merges them instead
 * of making doubles. Shaped like a UUID (version 8, "custom"), built from two
 * 64-bit FNV-1a hashes: quick and synchronous. Not for security: matching only.
 */
export function stableId(name: string): string {
  const bytes = new TextEncoder().encode(name)
  const hash = (seed: bigint) => {
    let h = seed
    for (const byte of bytes) {
      h ^= BigInt(byte)
      h = (h * 0x100000001b3n) & 0xffffffffffffffffn
    }
    return h.toString(16).padStart(16, '0')
  }
  const hex = hash(0xcbf29ce484222325n) + hash(0x84222325cbf29ce4n)
  const variant = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16)
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    '8' + hex.slice(13, 16),
    variant + hex.slice(17, 20),
    hex.slice(20, 32),
  ].join('-')
}
