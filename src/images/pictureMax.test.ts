import { describe, expect, it } from 'vitest'
import { maxPictureWidth } from './pictureMax'

describe('maxPictureWidth', () => {
  it('is the column width for a wide picture', () => {
    expect(maxPictureWidth(0.5, 600, 1000)).toBe(600)
  })
  it('is limited by the sheet height for a tall picture', () => {
    // 2:1 tall picture, 1000 px writable height: at most 500 px wide
    expect(maxPictureWidth(2, 600, 1000)).toBe(500)
  })
  it('ignores the height when the page is not in sheets', () => {
    expect(maxPictureWidth(5, 600, Infinity)).toBe(600)
  })
})
