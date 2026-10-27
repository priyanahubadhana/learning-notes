/** Picture bytes as text for files (base64), and back. */

export function toBase64(data: ArrayBuffer): string {
  const bytes = new Uint8Array(data)
  let out = ''
  // In pieces: one huge String.fromCharCode call would overflow the stack.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    out += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(out)
}

export function fromBase64(text: string): ArrayBuffer {
  const binary = atob(text)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}
