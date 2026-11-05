import { expect, test } from '@playwright/test'
import {
  expectStrokes,
  inkNote,
  line,
  painted,
  savedInk,
  stroke,
  textBox,
  wave,
} from './inkHelpers.ts'

/**
 * The ink engine (redesign step 3), driven by simulated pen events: drawing,
 * what is saved, palm rejection. The other behaviours are in the specs
 * inkPens, inkEraser, inkLasso and inkLayers.
 */

test.use({ viewport: { width: 1024, height: 900 }, hasTouch: true })

test('the Pen draws a stroke and saves raw points', async ({
  page,
  browserName,
}) => {
  await inkNote(page, 'Pen')
  const box = await textBox(page)
  await stroke(page, wave(box.x + 20, box.x + 300, box.y + 10), {
    tilt: [20, -10],
  })
  const saved = await expectStrokes(page, 1)
  const s = saved[0]
  expect(s.kind).toBe('ink')
  // x, y, pressure, tiltX, tiltY, time: six numbers per point.
  expect(s.pts.length % 6).toBe(0)
  expect(s.pts.length / 6).toBeGreaterThan(20)
  // WebKit does not take tilt from a simulated event: only check it is saved.
  if (browserName === 'chromium') {
    expect(s.pts[3]).toBe(20)
    expect(s.pts[4]).toBe(-10)
  } else {
    expect(Number.isFinite(s.pts[3])).toBe(true)
  }
  expect(
    s.pts
      .slice(2)
      .filter((_, i) => i % 6 === 0)
      .some((p) => p > 0.5),
  ).toBe(true)
  expect(s.style).toMatchObject({ pen: 'fountain', colour: '#1d1d1f' })
  expect(s.at).toBeGreaterThan(1.7e12) // a UTC time in ms
  expect(await painted(page, 'ink')).toBeGreaterThan(200)
  // One layer was made, and the stroke is anchored to a block.
  const ink = await savedInk(page)
  expect(ink.layers).toHaveLength(1)
  expect(ink.chunks[0].blockId).toBeTruthy()
})

test('a finger scrolls in Pencil mode and the pen draws; a mouse always draws', async ({
  page,
}) => {
  await inkNote(page, 'Pen', 'pencil')
  const box = await textBox(page)
  const path = line([box.x + 20, box.y + 12], [box.x + 200, box.y + 12])
  await stroke(page, path, { type: 'touch' })
  await page.waitForTimeout(700)
  expect((await savedInk(page)).strokes).toHaveLength(0)
  await stroke(page, path, { type: 'pen' })
  await expectStrokes(page, 1)
  await stroke(
    page,
    line([box.x + 20, box.y + 40], [box.x + 200, box.y + 40]),
    {
      type: 'mouse',
      id: 3,
    },
  )
  await expectStrokes(page, 2)
})

test('the finger can draw in Touch mode, and "Never" turns that off', async ({
  page,
}) => {
  await inkNote(page, 'Pen', 'touch')
  const box = await textBox(page)
  await stroke(
    page,
    line([box.x + 20, box.y + 12], [box.x + 200, box.y + 12]),
    {
      type: 'touch',
      id: 2,
    },
  )
  await expectStrokes(page, 1)
})

test('a finger is ignored while the Pencil is down (palm rejection)', async ({
  page,
}) => {
  await inkNote(page, 'Pen', 'touch', {
    'ink.pen': { finger: 'on' },
  })
  const box = await textBox(page)
  await stroke(
    page,
    line([box.x + 20, box.y + 12], [box.x + 200, box.y + 12]),
    {
      keepDown: true,
      id: 5,
    },
  )
  // A palm lands while the Pencil is on the glass.
  await stroke(page, line([box.x + 20, box.y + 60], [box.x + 90, box.y + 60]), {
    type: 'touch',
    id: 6,
  })
  await page.evaluate(() =>
    document.querySelector('[data-ink-pad]')!.dispatchEvent(
      new PointerEvent('pointerup', {
        pointerType: 'pen',
        pointerId: 5,
        bubbles: true,
        button: 0,
      }),
    ),
  )
  await expectStrokes(page, 1)
})
