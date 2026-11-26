// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from './frameFixture.ts'
import { expectStrokes, inkNote, line, stroke, textBox } from './inkHelpers.ts'

/**
 * A user in Touch mode who picks the Pen and draws with the Pencil: the first
 * touch switches the page to Pencil mode, and that first line is kept. (No key
 * was pressed, so the switch is certain; it does not depend on the clock.)
 * Checked 26 Nov for CI run 45747467400: the switch keeps the drawing pad and
 * the line.
 */
for (const from of ['touch', 'computer'] as const) {
  test(`the first Pencil line of a ${from} page is kept when it switches to Pencil mode`, async ({
    page,
  }) => {
    await inkNote(page, 'Pen', from, { 'advanced.autoSwitch': 'pen' })
    const box = await textBox(page)
    const y = box.y + 150
    await stroke(page, line([box.x + 20, y], [box.x + 300, y]))
    expect(
      await page.evaluate(() =>
        localStorage.getItem('learning-notes:general.deviceMode'),
      ),
      'the first Pencil touch switched the page',
    ).toBe('"pencil"')
    await expectStrokes(page, 1)
  })
}
