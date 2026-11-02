import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createBlock } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import {
  addColumn,
  addRow,
  createDatabase,
  setCell,
} from '../databases/databaseService'
import { normalizeUrl } from '../databases/columnTypes'
import { createNotebook } from '../notebooks/notebookService'
import { createPage } from '../pages/pageService'
import { bundleFile, exportNotebookBundle, readBundle } from '../share/bundle'
import { importBundle } from '../share/importBundle'
import { fromBase64, toBase64 } from '../core/base64'
import {
  IMAGE_SCHEME,
  imageIdsIn,
  imageRef,
  isImageType,
  parseImageRef,
  remapImageRefs,
} from './imageRef'
import { ImageError, saveImage } from './imageService'

let db: LearningNotesDB
let ws: string
const ID = '3f2b8c1e-9a4d-4e6b-8f10-2c7d5a9e1b34'

beforeEach(async () => {
  db = createTestDb()
  ws = (await getOrCreateDefaultWorkspace(db)).id
})
afterEach(async () => {
  await db.delete()
})

const png = () =>
  new File(
    [new Uint8Array([137, 80, 78, 71, 1, 2, 3, 250, 251, 252])],
    'a.png',
    {
      type: 'image/png',
    },
  )

describe('picture references', () => {
  it('round trip and reject lookalikes', () => {
    expect(imageRef(ID)).toBe(`${IMAGE_SCHEME}${ID}`)
    expect(parseImageRef(imageRef(ID))).toBe(ID)
    expect(parseImageRef(` ${imageRef(ID)} `)).toBe(ID)
    for (const bad of [
      'lnimg:../../x',
      'lnimg:',
      'https://a.org/x.png',
      `lnimg:${ID}x`,
      'javascript:1',
    ]) {
      expect(parseImageRef(bad)).toBeNull()
    }
  })

  it('finds and remaps references inside JSON', () => {
    const data = {
      text: [{ url: imageRef(ID) }, 'plain'],
      other: [imageRef(ID)],
    }
    expect([...imageIdsIn(data)]).toEqual([ID])
    const next = remapImageRefs(data, new Map([[ID, 'new']]))
    expect(JSON.stringify(next)).not.toContain(ID)
    expect(JSON.stringify(next)).toContain('lnimg:' + 'new')
  })

  it('accepts only safe picture types (no SVG)', () => {
    expect(isImageType('image/png')).toBe(true)
    expect(isImageType('image/svg+xml')).toBe(false)
    expect(isImageType('text/html')).toBe(false)
  })

  it('web-link cells accept a picture reference but not other schemes', () => {
    expect(normalizeUrl(imageRef(ID))).toBe(imageRef(ID))
    expect(normalizeUrl('lnimg:nope')).toBeNull()
    expect(normalizeUrl('javascript:alert(1)')).toBeNull()
  })

  it('base64 round trips a large buffer', () => {
    const big = new Uint8Array(300_000).map((_, i) => i % 251)
    const back = new Uint8Array(fromBase64(toBase64(big.buffer)))
    expect(back.length).toBe(big.length)
    expect(back[299_999]).toBe(big[299_999])
  })
})

describe('saveImage', () => {
  it('stores a picture and refuses wrong types and huge files', async () => {
    const image = await saveImage(db, png())
    expect((await db.images.get(image.id))?.type).toBe('image/png')
    await expect(
      saveImage(
        db,
        new File(['<svg onload=alert(1)>'], 'x.svg', { type: 'image/svg+xml' }),
      ),
    ).rejects.toBeInstanceOf(ImageError)
    const big = new File([new Uint8Array(1)], 'big.png', { type: 'image/png' })
    Object.defineProperty(big, 'size', { value: 26_000_000 })
    await expect(saveImage(db, big)).rejects.toBeInstanceOf(ImageError)
  })
})

describe('pictures in notebook files', () => {
  it('travel with a notebook and get new ids on import', async () => {
    const image = await saveImage(db, png())
    const nb = await createNotebook(db, ws, 'Pics')
    const page = await createPage(db, nb.id, null)
    await createBlock(db, {
      pageId: page.id,
      type: 'image',
      content: { url: imageRef(image.id), caption: '' },
    })
    const d = await createDatabase(db, ws, nb.id, 'Covers')
    const col = (await addColumn(db, d.id, { name: 'Cover', type: 'url' })).id
    const row = await addRow(db, d.id)
    await setCell(db, row.id, col, imageRef(image.id))

    const bundle = await exportNotebookBundle(db, nb.id)
    expect(bundle.images).toHaveLength(1)
    const back = readBundle(await bundleFile(bundle).text())
    expect(back.images[0].id).toBe(image.id)

    await importBundle(db, ws, back)
    const images = await db.images.toArray()
    expect(images).toHaveLength(2) // the original and the imported copy
    const copy = images.find((i) => i.id !== image.id)!
    expect(new Uint8Array(copy.data)).toEqual(new Uint8Array(image.data))
    const blocks = await db.blocks.toArray()
    const copied = blocks.filter(
      (b) => b.type === 'image' && b.content.url === imageRef(copy.id),
    )
    expect(copied).toHaveLength(1)
  })

  it('a damaged picture in a file is refused', async () => {
    const image = await saveImage(db, png())
    const nb = await createNotebook(db, ws, 'Pics')
    const page = await createPage(db, nb.id, null)
    await createBlock(db, {
      pageId: page.id,
      type: 'image',
      content: { url: imageRef(image.id) },
    })
    const bundle = await exportNotebookBundle(db, nb.id)
    bundle.images[0].type = 'image/svg+xml'
    expect(() => readBundle(JSON.stringify(bundle))).toThrow(/picture/)
  })
})
