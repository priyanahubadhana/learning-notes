// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { pageAction } from './helpers.ts'
import { expectStrokes, inkNote, line, stroke, textBox } from './inkHelpers.ts'

/**
 * PDF and print laid out as paper: the sheets at real size, the page's
 * background, the boxes at their places and the ink in place. The print
 * window itself cannot be seen, so the test reads the document handed to it.
 */

test.use({ viewport: { width: 1024, height: 1000 }, hasTouch: true })

test('Paper layout: sheets, boxes at their places and ink in place', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const real = URL.createObjectURL.bind(URL)
    const w = window as unknown as { __html: Blob[] }
    w.__html = []
    URL.createObjectURL = (o: Blob | MediaSource) => {
      if (o instanceof Blob && o.type === 'text/html') w.__html.push(o)
      return real(o)
    }
  })
  await inkNote(page, 'Pen')
  const box = await textBox(page)
  await stroke(page, line([box.x + 10, box.y + 4], [box.x + 200, box.y + 4]))
  await expectStrokes(page, 1)
  await page.waitForTimeout(700) // autosave
  // A second box on the page's second sheet.
  await page.evaluate(async () => {
    const open = indexedDB.open('learning-notes')
    const db: IDBDatabase = await new Promise((res) => {
      open.onsuccess = () => res(open.result)
    })
    const all = (store: string) =>
      new Promise<Record<string, unknown>[]>((res) => {
        const r = db.transaction(store).objectStore(store).getAll()
        r.onsuccess = () => res(r.result as Record<string, unknown>[])
      })
    const [notePage] = (await all('pages')).filter((p) => p.title === 'First')
    const block = (await all('blocks')).find((b) =>
      JSON.stringify(b).includes('nucleus'),
    )
    const side = JSON.parse(
      JSON.stringify({ ...block, id: 'side-block', boxId: 'side', order: 'b' })
        .split('The nucleus holds the DNA')
        .join('Side box text'),
    )
    await new Promise<void>((res) => {
      const tx = db.transaction(['pages', 'blocks'], 'readwrite')
      tx.objectStore('pages').put({
        ...notePage,
        boxes: [{ id: 'side', x: 100, y: 350, w: 90 }],
      })
      tx.objectStore('blocks').put(side)
      tx.oncomplete = () => res()
    })
    db.close()
  })
  await page.reload()
  // The far box makes its editor when it comes near the screen.
  await page.locator('[data-paper-box="side"]').scrollIntoViewIfNeeded()
  await expect(page.locator('[data-paper-box="side"]')).toContainText(
    'Side box text',
  )

  await pageAction(page, 'Export')
  const dialog = page.getByRole('dialog', { name: 'Export' })
  page.on('console', (m) => console.log('PAGE', m.type(), m.text()))
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message))
  await dialog.getByTestId('export-paper').click()
  await expect(dialog.getByTestId('export-ready')).toContainText('.pdf')
  await dialog.getByTestId('export-print').click()
  const html = await page.evaluate(async () => {
    const w = window as unknown as { __html: Blob[] }
    return w.__html[w.__html.length - 1].text()
  })
  expect(html).toContain('@page{size:210mm 297mm;margin:0}')
  expect(html.match(/data-sheet="/g)?.length).toBe(2)
  // The text of both boxes, the second on the second sheet at its place.
  expect(html).toContain('The nucleus holds the DNA')
  const sheet2 = html.slice(html.indexOf('data-sheet="2"'))
  expect(sheet2).toContain('Side box text')
  expect(sheet2).toContain('left:100mm;top:53mm;width:90mm')
  // The stroke is drawn in place as a picture in the main box.
  expect(html).toMatch(/class="inkimg"[^>]*src="data:image\/png;base64,/)
})
