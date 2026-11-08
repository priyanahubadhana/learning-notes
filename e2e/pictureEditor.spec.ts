import { expect, test, type Page } from '@playwright/test'
import { deflateSync } from 'node:zlib'

/** A solid-colour PNG of any size (no image library needed). */
function png(width: number, height: number): Buffer {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    return c >>> 0
  })
  const crc = (buf: Buffer) => {
    let c = 0xffffffff
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type), data])
    const sum = Buffer.alloc(4)
    sum.writeUInt32BE(crc(body))
    return Buffer.concat([len, body, sum])
  }
  const head = Buffer.alloc(13)
  head.writeUInt32BE(width, 0)
  head.writeUInt32BE(height, 4)
  head[8] = 8
  head[9] = 2 // RGB
  const row = Buffer.alloc(1 + width * 3)
  for (let x = 0; x < width; x++) {
    row[1 + x * 3] = 200
    row[2 + x * 3] = 60
    row[3 + x * 3] = 60
  }
  const raw = Buffer.concat(Array.from({ length: height }, () => row))
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', head),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

async function addPicture(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Create notebook' }).click()
  await page.locator('.bn-editor').click()
  await page.keyboard.type('/image')
  await page.keyboard.press('Enter')
  await page.getByTestId('picture-input-photos').setInputFiles({
    name: 'wide.png',
    mimeType: 'image/png',
    buffer: png(400, 200),
  })
  await expect(page.locator('.bn-editor img').first()).toHaveAttribute(
    'src',
    /^blob:/,
  )
  // The page settles (save, layout) before the side menu can follow the pointer.
  await page.waitForTimeout(1000)
}

/** Opens the picture editor from the block menu. */
async function openEditor(page: Page) {
  await page
    .locator('.bn-block-content[data-content-type="image"]')
    .first()
    .hover()
  // The side menu follows the pointer a moment later.
  await page.waitForTimeout(500)
  await page.locator('.bn-side-menu [draggable="true"]').first().click()
  await page.getByRole('menuitem', { name: 'Edit picture' }).click()
  return page.getByRole('dialog', { name: 'Edit picture' })
}

const natural = (page: Page, n: number) =>
  page
    .locator('.bn-editor img')
    .nth(n)
    .evaluate((el: HTMLImageElement) => [el.naturalWidth, el.naturalHeight])

test('crop to a square: the picture changes, survives a reload and Restore brings the original back', async ({
  page,
}) => {
  await addPicture(page)
  const sheet = await openEditor(page)
  await expect(sheet).toBeVisible()
  await sheet.getByRole('button', { name: '1:1' }).click()
  await sheet.getByRole('button', { name: 'Save', exact: true }).click()
  await expect
    .poll(async () => (await natural(page, 0)).join('x'))
    .toBe('200x200')
  await page.waitForTimeout(900)
  await page.reload()
  await expect
    .poll(async () => (await natural(page, 0)).join('x'))
    .toBe('200x200')

  const again = await openEditor(page)
  await again.getByRole('button', { name: 'Restore original' }).click()
  await expect
    .poll(async () => (await natural(page, 0)).join('x'))
    .toBe('400x200')
})

test('turn right and cut out make a second picture beside the first', async ({
  page,
}) => {
  await addPicture(page)
  const sheet = await openEditor(page)
  await sheet.getByRole('button', { name: 'Turn right' }).click()
  await sheet.getByRole('button', { name: 'Cut out as new picture' }).click()
  await expect(page.locator('.bn-editor img')).toHaveCount(2)
  await expect
    .poll(async () => (await natural(page, 0)).join('x'))
    .toBe('400x200')
  await expect
    .poll(async () => (await natural(page, 1)).join('x'))
    .toBe('200x400')
})

test('a corner can be dragged and Cancel changes nothing', async ({ page }) => {
  await addPicture(page)
  const sheet = await openEditor(page)
  const handle = sheet.getByRole('slider', {
    name: 'Crop corner, bottom right',
  })
  const box = (await handle.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x - 80, box.y - 40, { steps: 5 })
  await page.mouse.up()
  const crop = (await sheet.getByTestId('crop-box').boundingBox())!
  const stage = (await sheet.locator('canvas').boundingBox())!
  expect(crop.width).toBeLessThan(stage.width - 40)
  await sheet.getByRole('button', { name: 'Cancel' }).click()
  await expect(sheet).toBeHidden()
  expect((await natural(page, 0)).join('x')).toBe('400x200')
})

test('Draw on picture picks the Pen with the arrow shape ready', async ({
  page,
}) => {
  await addPicture(page)
  await page
    .locator('.bn-block-content[data-content-type="image"]')
    .first()
    .hover()
  await page.waitForTimeout(500)
  await page.locator('.bn-side-menu [draggable="true"]').first().click()
  await page.getByRole('menuitem', { name: 'Draw on picture (arrow)' }).click()
  await expect
    .poll(() =>
      page.evaluate(() => {
        const raw = localStorage.getItem('learning-notes:ink.pen')
        return raw ? (JSON.parse(raw) as { drawAs?: string }).drawAs : null
      }),
    )
    .toBe('arrow')
})
