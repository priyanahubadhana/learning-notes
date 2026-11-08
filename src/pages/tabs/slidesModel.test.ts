import { strToU8, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { pptxSlides } from './slidesModel'

const rel = (img: string) =>
  strToU8(
    `<Relationships><Relationship Id="rId1" Type="x/image" Target="../media/${img}"/></Relationships>`,
  )

describe('pptxSlides', () => {
  it('gives each slide picture in slide order', () => {
    const zip = zipSync({
      'ppt/slides/_rels/slide10.xml.rels': rel('c.png'),
      'ppt/slides/_rels/slide2.xml.rels': rel('b.jpg'),
      'ppt/slides/_rels/slide1.xml.rels': rel('a.png'),
      'ppt/media/a.png': new Uint8Array([1]),
      'ppt/media/b.jpg': new Uint8Array([2]),
      'ppt/media/c.png': new Uint8Array([3]),
      'ppt/slides/slide1.xml': strToU8('<x/>'),
    })
    const slides = pptxSlides(zip)
    expect(slides.map((s) => s.name)).toEqual(['a.png', 'b.jpg', 'c.png'])
    expect(slides[1].mime).toBe('image/jpeg')
  })
  it('skips slides with no picture and non-picture media', () => {
    const zip = zipSync({
      'ppt/slides/_rels/slide1.xml.rels': rel('v.mp4'),
      'ppt/media/v.mp4': new Uint8Array([1]),
    })
    expect(pptxSlides(zip)).toEqual([])
  })
})
