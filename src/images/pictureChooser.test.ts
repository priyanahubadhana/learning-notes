import { describe, expect, it } from 'vitest'
import { firstImageFile, readClipboardPicture } from './pictureChooserStore'

const item = (types: string[], blob: Blob) => ({
  types,
  getType: async () => blob,
})

describe('picture chooser helpers', () => {
  it('reads a picture from the clipboard', async () => {
    const png = new Blob(['x'], { type: 'image/png' })
    const file = await readClipboardPicture({
      read: async () => [item(['text/plain', 'image/png'], png)] as never,
    })
    expect(file?.type).toBe('image/png')
  })
  it('gives null when there is no picture, no support or a refusal', async () => {
    expect(
      await readClipboardPicture({
        read: async () => [item(['text/plain'], new Blob())] as never,
      }),
    ).toBeNull()
    expect(await readClipboardPicture(undefined)).toBeNull()
    expect(
      await readClipboardPicture({
        read: async () => {
          throw new Error('NotAllowed')
        },
      }),
    ).toBeNull()
  })
  it('finds the first picture file in a paste', () => {
    const a = new File(['a'], 'a.txt', { type: 'text/plain' })
    const b = new File(['b'], 'b.png', { type: 'image/png' })
    expect(firstImageFile([a, b])).toBe(b)
    expect(firstImageFile([a])).toBeNull()
    expect(firstImageFile(null)).toBeNull()
  })
})
