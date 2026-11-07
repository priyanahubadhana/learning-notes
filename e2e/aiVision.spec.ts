// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { readFile } from 'node:fs/promises'
import { expect, test, type Page, type Route } from '@playwright/test'
import { strFromU8, unzipSync } from 'fflate'
import { cornerAction } from './helpers.ts'
import { expectStrokes, inkNote, line, stroke, textBox } from './inkHelpers.ts'
import { openNote, option, tool } from './mainBarHelpers.ts'

/**
 * Phase P: pictures to text with a mocked Anthropic. Lasso › Convert to text
 * (Insert below, Replace the ink, Undo), the Write pad's AI engine (pressure
 * to weight), and the key never leaving this device's localStorage.
 */

test.use({ viewport: { width: 1024, height: 1000 }, hasTouch: true })

const KEY = 'sk-ant-test-vision-1234567890'

/** AI on, a key, privacy seen: before the app starts. */
async function aiPrefs(page: Page) {
  await page.addInitScript((key) => {
    localStorage.setItem('learning-notes:ai.enabled', 'true')
    localStorage.setItem('learning-notes:ai.privacyOk', 'true')
    localStorage.setItem('learning-notes:ai.key.anthropic', key)
  }, KEY)
}

/** Settings › AI › Allow AI in Biology, then back to the page. */
async function allowBiology(page: Page) {
  const back = page.url()
  await page.goto('/#/settings/ai')
  const sw = page.getByRole('switch', { name: 'Allow AI in Biology' })
  await sw.focus()
  await page.keyboard.press('Space')
  await expect(sw).toBeChecked()
  await page.goto(back)
  await expect(page.locator('.bn-editor')).toContainText('nucleus')
}

/** Answers every call with `text`; records the request bodies. */
function mockClaude(page: Page, text: string) {
  const bodies: string[] = []
  void page.route('https://api.anthropic.com/v1/messages', (route: Route) => {
    bodies.push(route.request().postData() ?? '')
    return route.fulfill({
      json: {
        content: [{ type: 'text', text }],
        usage: { input_tokens: 400, output_tokens: 6 },
      },
    })
  })
  return bodies
}

async function inkSelected(page: Page) {
  await page.waitForTimeout(800)
  const box = await textBox(page)
  const y = box.y + 150
  await stroke(page, line([box.x + 20, y], [box.x + 300, y]))
  await expectStrokes(page, 1)
  await tool(page, 'Lasso').click()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)
  const now = await textBox(page)
  const at = y + (now.y - box.y)
  const corners: [number, number][] = [
    [box.x + 6, at + 14],
    [box.x + 6, at - 14],
    [box.x + 314, at - 14],
    [box.x + 314, at + 14],
    [box.x + 8, at + 12],
  ]
  await stroke(
    page,
    corners.slice(1).flatMap((c, i) => line(corners[i], c, 10)),
  )
  await expect(page.locator('[data-ink-menu]')).toBeVisible()
}

test('Lasso › Convert to text: shows the picture, sends only it, Insert below adds the text, Undo removes it', async ({
  page,
}) => {
  await aiPrefs(page)
  const bodies = mockClaude(page, 'नमस्ते mitochondria')
  await inkNote(page, 'Pen')
  await allowBiology(page)
  await tool(page, 'Pen').click()
  await inkSelected(page)
  await page
    .locator('[data-ink-menu]')
    .getByRole('button', { name: 'Convert to text' })
    .click()
  const sheet = page.getByRole('dialog', { name: 'Convert to text' })
  await expect(sheet).toContainText('Only this picture')
  await sheet.getByTestId('ai-convert-send').click()
  await expect(sheet.getByTestId('ai-convert-text')).toHaveValue(
    'नमस्ते mitochondria',
  )
  // One picture, no page text.
  const sent = JSON.parse(bodies[0])
  expect(sent.model).toBe('claude-haiku-5-5')
  const content = sent.messages[0].content
  expect(content[0].type).toBe('image')
  expect(content[0].source.media_type).toBe('image/png')
  expect(JSON.stringify(sent)).not.toContain('nucleus')

  await sheet.getByTestId('ai-convert-insert').click()
  const editor = page.locator('.bn-editor')
  await expect(editor).toContainText('नमस्ते mitochondria')
  await page.getByRole('button', { name: 'Undo', exact: true }).first().click()
  await expect(editor).not.toContainText('mitochondria')
})

test('Convert to text: Replace the ink removes the strokes; maths goes into a formula', async ({
  page,
}) => {
  await aiPrefs(page)
  mockClaude(page, 'E = mc^2')
  await inkNote(page, 'Pen')
  await allowBiology(page)
  await tool(page, 'Pen').click()
  await inkSelected(page)
  await page
    .locator('[data-ink-menu]')
    .getByRole('button', { name: 'Convert to text' })
    .click()
  const sheet = page.getByRole('dialog', { name: 'Convert to text' })
  await sheet.getByTestId('ai-convert-maths').click()
  await expect(sheet.getByTestId('ai-convert-text')).toHaveValue('E = mc^2')
  await sheet.getByTestId('ai-convert-replace').click()
  await expectStrokes(page, 0)
  await expect(page.locator('[data-content-type="math"]')).toHaveCount(1)
})

test('Convert to text in a notebook without AI says so and sends nothing', async ({
  page,
}) => {
  await aiPrefs(page)
  const bodies = mockClaude(page, 'x')
  await inkNote(page, 'Pen')
  await inkSelected(page)
  await page
    .locator('[data-ink-menu]')
    .getByRole('button', { name: 'Convert to text' })
    .click()
  await page.getByTestId('ai-convert-send').click()
  await expect(page.getByText('AI is off for this notebook')).toBeVisible()
  expect(bodies).toHaveLength(0)
})

test('Write pad AI engine: write on the canvas, Read, words come back with pressure weights, Insert', async ({
  page,
}) => {
  await aiPrefs(page)
  const bodies = mockClaude(page, 'light firm')
  await openNote(page, 'touch', {
    'writePad.prefs': {
      font: 'kalam',
      weight: 'normal',
      size: 125,
      color: 'default',
      highlight: 'default',
      height: 600,
      zoom: 1.5,
    },
  })
  await allowBiology(page)
  await tool(page, 'Insert').click()
  await option(page, 'Write pad').click()
  const pad = page.locator('[data-write-pad]')
  await expect(pad).toBeVisible()
  await pad.getByRole('button', { name: 'AI', exact: true }).click()
  const canvas = pad.locator('[data-write-pad-canvas]')
  await expect(canvas).toBeVisible()
  const b = (await canvas.boundingBox())!
  // Two words: a light one, then a firm one (pen pressure).
  await canvas.evaluate((el, r) => {
    const fire = (type: string, x: number, y: number, pressure: number) =>
      el.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          pointerId: 7,
          pointerType: 'pen',
          clientX: r.x + x,
          clientY: r.y + y,
          pressure,
        }),
      )
    const word = (x0: number, p: number) => {
      fire('pointerdown', x0, 40, p)
      for (let i = 1; i <= 8; i++)
        fire('pointermove', x0 + i * 5, 40 + (i % 2) * 20, p)
      fire('pointerup', x0 + 40, 40, p)
    }
    word(20, 0.15)
    word(160, 0.95)
  }, b)
  await pad.getByTestId('write-pad-ai-read').click()
  const pieces = pad.locator('[data-write-pad-pieces] [data-weight]')
  await expect(pieces).toHaveCount(2)
  await expect(pieces.nth(1)).toHaveAttribute('data-weight', 'bold')
  expect(JSON.parse(bodies[0]).messages[0].content[0].type).toBe('image')
  await page.getByTestId('write-pad-insert').click()
  await expect(page.locator('.bn-editor')).toContainText('light firm')
})

test('the AI key stays in localStorage only: never in a backup', async ({
  page,
}) => {
  await aiPrefs(page)
  await inkNote(page, 'Pen')
  expect(
    await page.evaluate(() =>
      localStorage.getItem('learning-notes:ai.key.anthropic'),
    ),
  ).toBe(KEY)
  await cornerAction(page, 'Save & restore')
  const downloading = page.waitForEvent('download')
  await page
    .getByRole('main')
    .getByRole('button', { name: 'Save everything' })
    .click()
  const file = await downloading
  const zip = unzipSync(new Uint8Array(await readFile(await file.path())))
  for (const [name, bytes] of Object.entries(zip)) {
    expect(strFromU8(bytes, true), name).not.toContain(KEY)
    expect(strFromU8(bytes, true), name).not.toContain('ai.key')
  }
  // Nor in IndexedDB (what sync would read).
  const inDb = await page.evaluate(async (key) => {
    const names = (await indexedDB.databases()).map((d) => d.name!)
    for (const n of names) {
      const db = await new Promise<IDBDatabase>((ok, no) => {
        const r = indexedDB.open(n)
        r.onsuccess = () => ok(r.result)
        r.onerror = () => no(r.error)
      })
      for (const store of Array.from(db.objectStoreNames)) {
        const rows = await new Promise<unknown[]>((ok) => {
          const q = db.transaction(store).objectStore(store).getAll()
          q.onsuccess = () => ok(q.result)
          q.onerror = () => ok([])
        })
        if (JSON.stringify(rows).includes(key)) return store
      }
      db.close()
    }
    return null
  }, KEY)
  expect(inDb).toBeNull()
})
