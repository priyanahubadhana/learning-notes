// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { expectStrokes, inkNote, stroke, textBox, wave } from './inkHelpers.ts'
import { openNote, tool } from './mainBarHelpers.ts'
import { appSwitch, section, toolsReady } from './toolsHelpers.ts'

/**
 * Tools robustness, step 5: the health check. A bad state is forced through
 * a test hook, a health run is made, and the state is healed. The run also
 * happens by itself when the app comes back and after 30 s of quiet.
 */
test.use({ viewport: { width: 1024, height: 900 }, hasTouch: true })

type Hooks = {
  health: (reason?: string) => string[]
  stick: {
    selectGesture: () => Promise<void>
    penGuard: () => Promise<void>
    lock: () => void
    editable: (v: string) => void
  }
}
declare global {
  interface Window {
    __lnHooks?: Hooks
  }
}

const health = async (page: Page, reason = 'test') => {
  await toolsReady(page)
  return page.evaluate(
    (r) => (window.__lnTools as unknown as Hooks).health(r),
    reason,
  )
}
const stick = async (
  page: Page,
  what: 'selectGesture' | 'penGuard' | 'lock',
) => {
  await toolsReady(page)
  return page.evaluate(
    (w) => (window.__lnTools as unknown as Hooks).stick[w](),
    what,
  )
}

async function quietNote(page: Page) {
  await openNote(page, 'touch', { 'advanced.autoSwitch': 'off' })
  await expect(tool(page, 'Text')).toHaveAttribute('aria-pressed', 'true')
  // Let the last pointer event of the set-up be older than the health check's
  // "recent pointer" guard.
  await page.waitForTimeout(700)
}

const editable = (page: Page) =>
  page.evaluate(() =>
    document
      .querySelector('[data-page-content]')
      ?.getAttribute('contenteditable'),
  )

test('a stuck selection gesture flag is healed', async ({ page }) => {
  await quietNote(page)
  await stick(page, 'selectGesture')
  expect((await section(page, 'selectGesture')).active).toBe(true)
  const found = await health(page)
  expect(found.join()).toContain('selectGesture.active')
  expect((await section(page, 'selectGesture')).active).toBe(false)
  expect(await health(page)).toEqual([])
})

test('a stuck Pencil guard flag is healed', async ({ page }) => {
  await quietNote(page)
  await stick(page, 'penGuard')
  expect((await section(page, 'penGuard')).down).toBe(true)
  expect((await health(page)).join()).toContain('penGuard.down')
  expect((await section(page, 'penGuard')).down).toBe(false)
})

test('a lock that nobody holds the gesture for is let go; typing works', async ({
  page,
}) => {
  await quietNote(page)
  await stick(page, 'lock')
  expect(await editable(page)).toBe('false')
  expect((await health(page)).join()).toContain('editLock.owners')
  expect((await section(page, 'editLock')).owners).toEqual([])
  expect(await editable(page)).toBe('true')
  await page.locator('.bn-editor').click()
  await page.keyboard.type(' typed')
  await expect(page.locator('.bn-editor')).toContainText('typed')
})

test('a page whose contenteditable disagrees with the mode is put right', async ({
  page,
}) => {
  await quietNote(page)
  await toolsReady(page)
  await page.evaluate(() =>
    (window.__lnTools as unknown as Hooks).stick.editable('false'),
  )
  expect(await editable(page)).toBe('false')
  expect((await health(page)).join()).toContain('contenteditable')
  expect(await editable(page)).toBe('true')
  // Ink tools want it off, and the check leaves that alone.
  await tool(page, 'Pen').click()
  await page.waitForTimeout(600)
  expect(await editable(page)).toBe('false')
  expect(await health(page)).toEqual([])
})

test('ink that went blank is painted again, by a run and by coming back', async ({
  page,
}) => {
  await inkNote(page, 'Pen')
  const box = await textBox(page)
  await stroke(page, wave(box.x + 20, box.x + 200, box.y + box.height + 60))
  await expectStrokes(page, 1)
  await page.waitForTimeout(700)
  const painted = () =>
    page.evaluate(() => {
      const cs = [
        ...document.querySelectorAll<HTMLCanvasElement>(
          '[data-ink-canvas="ink"]',
        ),
      ]
      return cs.some((c) => {
        const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
        for (let i = 3; i < d.length; i += 4) if (d[i] !== 0) return true
        return false
      })
    })
  const wipe = () =>
    page.evaluate(() => {
      for (const c of document.querySelectorAll<HTMLCanvasElement>(
        '[data-ink-canvas]',
      )) {
        c.getContext('2d')!.clearRect(0, 0, c.width, c.height)
      }
    })
  await expect.poll(painted).toBe(true)
  await wipe()
  expect(await painted()).toBe(false)
  expect((await health(page)).join()).toContain('ink-canvas')
  await expect.poll(painted).toBe(true)
  // The same, found when the app comes back.
  await wipe()
  expect(await painted()).toBe(false)
  await appSwitch(page)
  await expect.poll(painted).toBe(true)
  const log = (await section(page, 'health')).problems as {
    name: string
    on: string
  }[]
  expect(log.some((p) => p.name === 'ink-canvas' && p.on === 'test')).toBe(true)
})

test('a live gesture is left alone', async ({ page }) => {
  await inkNote(page, 'Lasso')
  const box = await textBox(page)
  const y = box.y + box.height + 60
  await stroke(
    page,
    [
      [box.x + 20, y],
      [box.x + 40, y + 6],
    ],
    { keepDown: true, id: 61 },
  )
  expect((await section(page, 'ink')).gesture).toBe('lasso#61')
  expect(await health(page)).toEqual([])
  expect((await section(page, 'ink')).gesture).toBe('lasso#61')
})

test('it runs by itself after 30 s of quiet', async ({ page }) => {
  test.setTimeout(90_000)
  await quietNote(page)
  await stick(page, 'selectGesture')
  await expect
    .poll(async () => (await section(page, 'selectGesture')).active, {
      timeout: 60_000,
      intervals: [1000],
    })
    .toBe(false)
  const log = (await section(page, 'health')).problems as { on: string }[]
  expect(log.some((p) => p.on === 'idle')).toBe(true)
})
