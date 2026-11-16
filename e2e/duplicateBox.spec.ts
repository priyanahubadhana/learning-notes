// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { EXTRA, addBox, pick, rect, start } from './cBoxesHelpers.ts'

/**
 * C20: Duplicate box keeps everything (width, height, fill, border, padding,
 * lock) and is only placed 10 mm lower and to the right.
 */
test.use({ viewport: { width: 1336, height: 1100 }, hasTouch: true })

test('C20 a resized, coloured, locked box duplicates at the same size, 10 mm lower and right', async ({
  page,
}) => {
  await start(page, 'C20dup')
  await addBox(page, ['Copy me'])
  await page.waitForTimeout(800)
  // The stored box gets a width, a height, a look and a lock (as the dots and the card would).
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('learning-notes')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const db = open.result
          const tx = db.transaction('pages', 'readwrite')
          const store = tx.objectStore('pages')
          const all = store.getAll()
          all.onsuccess = () => {
            for (const p of all.result)
              if (p.title === 'C20dup')
                store.put({
                  ...p,
                  boxes: (p.boxes ?? []).map((b: { id: string }) =>
                    b.id === 'main'
                      ? b
                      : {
                          ...b,
                          w: 77,
                          h: 61,
                          locked: true,
                          colour: 'yellow',
                          pw: 60,
                          style: {
                            bg: 'lime',
                            border: 'blue',
                            borderW: 2,
                            radius: 8,
                            pad: 8,
                          },
                        },
                  ),
                  updatedAt: Date.now(),
                })
          }
          tx.oncomplete = () => {
            db.close()
            resolve()
          }
        }
      }),
  )
  await page.reload()
  await page.waitForTimeout(1200)
  const first = page.locator(EXTRA).first()
  await expect(first).toBeVisible()
  await pick(page, first)
  await page.getByRole('button', { name: 'Box actions' }).last().click()
  await page.getByText('Duplicate box').first().click()
  await expect(page.locator(EXTRA)).toHaveCount(2)
  const a = page.locator(EXTRA).nth(0)
  const b = page.locator(EXTRA).nth(1)
  const ra = await rect(a)
  // A box as wide as its text reports its width after it is drawn.
  await expect
    .poll(async () => Math.abs((await rect(b)).width - ra.width))
    .toBeLessThan(1)
  const rb = await rect(b)
  expect(Math.abs(rb.width - ra.width)).toBeLessThan(1)
  expect(Math.abs(rb.height - ra.height)).toBeLessThan(1)
  const mm = (await rect(page.locator('[data-paper-sheet="1"]'))).width / 210
  expect(Math.abs(rb.x - ra.x - 10 * mm)).toBeLessThan(3)
  // Rows stack: the copy sits right below the original (never on top of it).
  expect(rb.y).toBeGreaterThanOrEqual(ra.y + ra.height - 1)
  // The stored boxes: the same look, height, width and lock.
  const stored = await page.evaluate(
    () =>
      new Promise<Record<string, unknown>[]>((res) => {
        const o = indexedDB.open('learning-notes')
        o.onsuccess = () => {
          const r = o.result.transaction('pages').objectStore('pages').getAll()
          r.onsuccess = () =>
            res(
              r.result
                .filter((p) => p.title === 'C20dup')
                .flatMap((p) => p.boxes ?? []),
            )
        }
      }),
  )
  const [one, two] = stored.filter((x) => x.id !== 'main')
  // Every stored setting (look, colour, lock, height, phone width, any other field) is kept; only the place differs.
  const keep = (b: Record<string, unknown>) => {
    const { id, x, y, ...rest } = b
    ;(void id, x, y)
    return rest
  }
  expect(keep(two)).toEqual(keep(one))
  expect(Object.keys(keep(two))).toEqual(
    expect.arrayContaining(['w', 'h', 'style', 'locked', 'colour', 'pw']),
  )
})
