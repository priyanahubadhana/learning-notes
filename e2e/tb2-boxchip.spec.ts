// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from './frameFixture.ts'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'

/**
 * T6 (owner, 15 Nov): the "Box ▾" chip of the Text tool's second row opened a
 * card that blinked and kept stretching and collapsing. The card hangs around
 * the box; when it is a little taller than the room above, it was capped to
 * the room, measured at that smaller size, found to fit uncapped, grown,
 * measured again ... every frame. Its rect must stay still after it opens.
 */
test.use({ viewport: { width: 780, height: 1000 }, hasTouch: true })

for (const v2 of [false, true])
  test(`T6 the Box card keeps one size and place for 2 s after it opens (switch ${v2 ? 'ON' : 'OFF'})`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'learning-notes:level',
        JSON.stringify({ level: 'professional', unlocked: [] }),
      )
      localStorage.setItem('learning-notes:advanced.autoSwitch', '"off"')
    })
    await startInMode(page, 'pencil')
    await page.goto('/?flags=toolbar.v8' + (v2 ? ',textbox.v2' : ''))
    await createNotebook(page, 'Paper', 'T6')
    await typeInEditor(page, 'Main text')
    await page.getByTestId('v8-tool-text').click()
    // No side menu: the box is wide, so the card cannot sit beside it.
    await page.getByRole('button', { name: 'Hide menu' }).click()
    await page.waitForTimeout(800)
    await page.getByTestId('v8-chip-text.box').click()
    const card = page.getByTestId('v8-card-text.box')
    await expect(card).toBeVisible()
    // Let it open (its animation and the lazy parts), then watch every frame.
    await page.waitForTimeout(1200)
    const changes = await page.evaluate(
      () =>
        new Promise<string[]>((done) => {
          const el = document.querySelector('[data-testid="v8-card-text.box"]')!
          const seen: string[] = []
          const t0 = performance.now()
          let last = ''
          const tick = () => {
            const b = el.getBoundingClientRect()
            const v = [b.left, b.top, b.width, b.height].map(Math.round).join()
            if (v !== last) seen.push(v)
            last = v
            if (performance.now() - t0 < 2000) requestAnimationFrame(tick)
            else done(seen)
          }
          tick()
        }),
    )
    // The first sample is the rect it already has; nothing after it may change.
    expect(changes).toHaveLength(1)
  })
