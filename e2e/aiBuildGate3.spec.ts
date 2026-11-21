/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'

/** Gate 3 fixes for the Build screen (slice 9b, flag ai.framework), items 1 to 7. */
const FLAGGED = '/?flags=ai.framework#/settings/ai'

async function open(page: Page, theme = 'day') {
  await page.addInitScript((th) => {
    localStorage.setItem('learning-notes:theme', JSON.stringify(th))
  }, theme)
  await page.goto(FLAGGED)
  await expect(page.getByTestId('aifw-entry')).toBeVisible()
  await page.getByTestId('aifw-open').click()
  await expect(page.getByTestId('aifw-build')).toBeVisible()
}

for (const [name, size] of [
  ['phone', { width: 390, height: 780 }],
  ['PC', { width: 1200, height: 900 }],
] as const) {
  test.describe(`Build gate 3 (${name})`, () => {
    test.use({ viewport: size, hasTouch: name === 'phone' })

    // 1: the sheet is solid to its bottom edge (no fade mask from scroll hints).
    test('1 the sheet does not fade to the shell at the bottom', async ({
      page,
    }) => {
      await open(page)
      await page.waitForTimeout(500)
      const s = await page.getByTestId('aifw-screen').evaluate((el) => {
        const c = getComputedStyle(el)
        return { mask: c.maskImage, scrolls: c.overflowY }
      })
      expect(s.mask).toBe('none')
      expect(s.scrolls).not.toBe('auto')
    })

    // 2: one destination place.
    test('2 the destination is asked for once', async ({ page }) => {
      await open(page)
      await expect(page.getByText('Notebook name')).toHaveCount(0)
      await expect(page.getByTestId('aifw-dest-name')).toHaveCount(1)
      await expect(
        page
          .getByTestId('aifw-screen')
          .getByRole('radio', { name: 'New notebook' }),
      ).toHaveCount(1)
      // The goal box uses that same destination.
      await page.getByTestId('aifw-goal-text').fill('Habits')
      await expect(page.getByTestId('aifw-goal-make')).toBeDisabled()
      await page.getByTestId('aifw-dest-name').fill('Habits nb')
      await expect(page.getByTestId('aifw-goal-make')).toBeEnabled()
    })

    // 3: no browser radio dots; the shared segmented control.
    test('3 choices use the shared segmented control', async ({ page }) => {
      await open(page)
      await expect(page.locator('input[type="radio"]')).toHaveCount(0)
      await expect(page.locator('.onoff-choice')).toHaveCount(2)
      await page.getByTestId('aifw-effort-deep').click()
      await expect(page.getByTestId('aifw-effort-deep')).toHaveAttribute(
        'aria-checked',
        'true',
      )
      await page.getByTestId('aifw-dest-kind-page').click()
      await expect(page.getByTestId('aifw-dest-kind-page')).toHaveAttribute(
        'aria-checked',
        'true',
      )
    })

    // 4: no resize grip.
    test('4 the goal box has no resize grip and grows with the text', async ({
      page,
    }) => {
      await open(page)
      const box = page.getByTestId('aifw-goal-text')
      expect(await box.evaluate((e) => getComputedStyle(e).resize)).toBe('none')
      const h0 = (await box.boundingBox())!.height
      await box.fill('line one\nline two\nline three\nline four\nline five')
      expect((await box.boundingBox())!.height).toBeGreaterThan(h0)
    })

    // 5: 16 px between cards and the same card frame on all four blocks.
    test('5 four cards with the same frame and 16 px gaps', async ({
      page,
    }) => {
      await open(page)
      const cards = page.locator('[data-aifw-card]')
      await expect(cards).toHaveCount(4)
      const boxes = []
      for (let i = 0; i < 4; i++) {
        boxes.push(await cards.nth(i).boundingBox())
        expect(
          await cards
            .nth(i)
            .evaluate((e) => getComputedStyle(e).borderTopWidth),
        ).toBe('1px')
      }
      for (let i = 1; i < 4; i++)
        expect(
          boxes[i]!.y - (boxes[i - 1]!.y + boxes[i - 1]!.height),
        ).toBeGreaterThanOrEqual(16)
    })

    // 6: disabled buttons keep readable text in every theme.
    for (const theme of ['day', 'night', 'sepia']) {
      test(`6 disabled Make a plan is readable (${theme})`, async ({
        page,
      }) => {
        await open(page, theme)
        const btn = page.getByTestId('aifw-goal-make')
        await expect(btn).toBeDisabled()
        const ratio = await btn.evaluate((el) => {
          const parse = (c: string) => c.match(/[\d.]+/g)!.map(Number)
          const lum = ([r, g, b]: number[]) => {
            const f = (v: number) => {
              const x = v / 255
              return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
            }
            return 0.2126 * f(r!) + 0.7152 * f(g!) + 0.0722 * f(b!)
          }
          const cs = getComputedStyle(el)
          const op = Number(cs.opacity)
          const bg = parse(cs.backgroundColor)
          const base = parse(getComputedStyle(document.body).backgroundColor)
          const mix = (a: number[], b2: number[]) =>
            a.map((v, i) => v * op + b2[i]! * (1 - op))
          const bgM = mix(bg, base)
          const fg = mix(parse(cs.color), base)
          const [a, b] = [lum(fg), lum(bgM)].sort((x, y) => y - x)
          return (a! + 0.05) / (b! + 0.05)
        })
        expect(ratio).toBeGreaterThanOrEqual(3)
      })
    }
  })
}

// 7: phone: the three destination choices sit in one row.
test.describe('Build gate 3 (phone choices)', () => {
  test.use({ viewport: { width: 360, height: 740 }, hasTouch: true })
  test('7 three destination choices share one row', async ({ page }) => {
    await open(page)
    const ys = []
    for (const k of ['new_notebook', 'notebook', 'page'])
      ys.push((await page.getByTestId(`aifw-dest-kind-${k}`).boundingBox())!.y)
    expect(new Set(ys.map(Math.round)).size).toBe(1)
  })
})
