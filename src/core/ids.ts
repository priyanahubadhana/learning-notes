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
