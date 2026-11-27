// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from './frameFixture.ts'
import { expectStrokes, inkNote, line, stroke, textBox } from './inkHelpers.ts'

/**
 * A user in Touch or Computer mode who picks the Pen and draws with the Pencil:
 * the first touch switches the page to Pencil mode, and that first line is
 * kept. The switch happens only when the last key is older than 1.5 s, so the
 * page records its last key press itself and the pen line is drawn once the
 * page measures that key older than 1.6 s (as tb2-bar-fix F61-F63 do): the
 * switch is certain, whatever the speed of the machine. Checked 26 Nov for CI
 * run 45747467400: the switch keeps the drawing pad and the line.
 */
for (const from of ['touch', 'computer'] as const) {
  test(`the first Pencil line of a ${from} page is kept when it switches to Pencil mode`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      ;(window as unknown as { __lastKey: number }).__lastKey = 0
      window.addEventListener(
        'keydown',
        () =>
          ((window as unknown as { __lastKey: number }).__lastKey = Date.now()),
        true,
      )
    })
    await inkNote(page, 'Pen', from, { 'advanced.autoSwitch': 'pen' })
    await page.waitForFunction(
      () =>
        Date.now() - (window as unknown as { __lastKey: number }).__lastKey >
        1600,
    )
    const box = await textBox(page)
    const y = box.y + 150
    await stroke(page, line([box.x + 20, y], [box.x + 300, y]))
    await expect(page.getByText('Switched to Pencil mode')).toBeVisible()
    expect(
      await page.evaluate(() =>
        localStorage.getItem('learning-notes:general.deviceMode'),
      ),
      'the first Pencil touch switched the page',
    ).toBe('"pencil"')
    await expectStrokes(page, 1)
  })
}
