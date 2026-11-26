// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from './frameFixture.ts'
import {
  createNotebook,
  hideSidebar,
  startInMode,
  typeInEditor,
} from './helpers.ts'

/**
 * PROBE (branch probe/g1-frames only, never merged; issue 73). Asserts nothing
 * about speed. Walks the first steps of TB-42 (toolbarV8Text.spec.ts:390) and,
 * at each screen, measures the time between drawn frames with every
 * backdrop-filter on, then off (one injected style, nothing else changes),
 * then on and off again, on the same page a second apart. "idle" = nothing
 * moves; "busy" = a 1 px dot changes each frame, so the page must be drawn
 * again every frame (what a caret blink, a hover or a card fade does).
 */
test.use({ viewport: { width: 1180, height: 820 }, hasTouch: true })

const OFF_ID = 'probe-noblur'

async function blur(page: Page, on: boolean) {
  await page.evaluate(
    ([on, id]) => {
      const old = document.getElementById(id as string)
      if (on) old?.remove()
      else if (!old) {
        const s = document.createElement('style')
        s.id = id as string
        s.textContent =
          '*,*::before,*::after{-webkit-backdrop-filter:none!important;backdrop-filter:none!important}'
        document.documentElement.appendChild(s)
      }
    },
    [on, OFF_ID] as const,
  )
}

/** Median and worst frame gap over `n` frames; `busy` forces a redraw each frame. */
const gaps = (page: Page, n: number, busy: boolean) =>
  page.evaluate(
    ([n, busy]) =>
      new Promise<string>((resolve) => {
        const dot = document.createElement('div')
        dot.style.cssText =
          'position:fixed;right:2px;bottom:2px;width:1px;height:1px;background:#000;z-index:2147483647;pointer-events:none'
        if (busy) document.body.appendChild(dot)
        const g: number[] = []
        let last = performance.now()
        const t0 = last
        const step = (t: number) => {
          g.push(t - last)
          last = t
          if (busy) dot.style.opacity = String(0.5 + (g.length % 2) * 0.5)
          if (g.length < (n as number) && t - t0 < 15000)
            requestAnimationFrame(step)
          else {
            dot.remove()
            const s = [...g].sort((a, b) => a - b)
            resolve(
              `med=${s[Math.floor(s.length / 2)].toFixed(1)} worst=${s[s.length - 1].toFixed(0)} n=${s.length}`,
            )
          }
        }
        requestAnimationFrame(step)
      }),
    [n, busy] as const,
  )

/** What is blurred on screen now: count and area (CSS px and device px). */
const blurred = (page: Page) =>
  page.evaluate(() => {
    let n = 0
    let area = 0
    const names: string[] = []
    for (const el of Array.from(document.querySelectorAll('*'))) {
      const cs = getComputedStyle(el)
      const f =
        cs.backdropFilter ||
        (cs as unknown as { webkitBackdropFilter?: string })
          .webkitBackdropFilter
      if (!f || f === 'none') continue
      const r = el.getBoundingClientRect()
      if (r.width * r.height === 0 || cs.visibility === 'hidden') continue
      n++
      const vis =
        Math.max(0, Math.min(r.right, innerWidth) - Math.max(r.left, 0)) *
        Math.max(0, Math.min(r.bottom, innerHeight) - Math.max(r.top, 0))
      area += vis
      names.push(
        `${(el.getAttribute('data-testid') || el.className.toString()).slice(0, 24)}:${Math.round(r.width)}x${Math.round(r.height)}:${f}`,
      )
    }
    const dpr = devicePixelRatio
    return `blurred=${n} css_px=${Math.round(area)} dev_px=${Math.round(area * dpr * dpr)} dpr=${dpr} [${names.join(' | ')}]`
  })

async function measure(page: Page, screen: string) {
  const inv = await blurred(page)
  const out: string[] = []
  for (const on of [true, false, true, false]) {
    await blur(page, on)
    await page.waitForTimeout(300)
    const idle = await gaps(page, 20, false)
    const busy = await gaps(page, 30, true)
    out.push(`${on ? 'BLUR' : 'NOBLUR'} idle(${idle}) busy(${busy})`)
  }
  await blur(page, true)
  const line = `G1PROBE label=${process.env.PROBE_LABEL} screen=${screen} ${inv} :: ${out.join(' ; ')}`
  console.log(line)
  test.info().annotations.push({ type: 'g1 frames', description: line })
}

for (const dsf of [2, 1]) {
  test.describe(`dpr ${dsf}`, () => {
    test.use({ deviceScaleFactor: dsf })
    test(`g1 frames per screen of TB-42 (dpr ${dsf})`, async ({ page }) => {
      test.setTimeout(240_000)
      await page.addInitScript(() => {
        localStorage.setItem(
          'learning-notes:level',
          JSON.stringify({ level: 'beginner', unlocked: ['tb.textBox'] }),
        )
      })
      await startInMode(page, 'touch')
      await page.goto('/?flags=toolbar.v8')
      await createNotebook(page, 'Biology', 'First')
      await measure(page, 'notebook_sidebar_open')
      await hideSidebar(page)
      await typeInEditor(page, 'The nucleus holds the DNA')
      await page.locator('.bn-editor').first().click()
      await measure(page, 'editor_textbar')
      await page.getByTestId('v8-chip-text.box').click()
      const c = page.getByTestId('v8-card-text.box')
      await expect(c).toBeVisible()
      await measure(page, 'box_card_open')
      await c.getByTestId('v8-box-bg-yellow').click()
      await c.getByRole('switch', { name: 'Shadow' }).click()
      await measure(page, 'box_card_yellow_shadow')
      await c.getByTestId('pcard-close').click()
      await expect(c).toHaveCount(0)
      await measure(page, 'card_closed')
    })
  })
}

/** Starts recording frame gaps in the page for `ms`; read with `stopRec`. */
const startRec = (page: Page, ms: number) =>
  page.evaluate((ms) => {
    const w = window as unknown as { __rec?: Promise<number[]> }
    w.__rec = new Promise<number[]>((resolve) => {
      const g: number[] = []
      let last = performance.now()
      const t0 = last
      const step = (t: number) => {
        g.push(t - last)
        last = t
        if (t - t0 < ms) requestAnimationFrame(step)
        else resolve(g)
      }
      requestAnimationFrame(step)
    })
  }, ms)
const stopRec = (page: Page) =>
  page.evaluate(() => (window as unknown as { __rec: Promise<number[]> }).__rec)
const stat = (g: number[]) => {
  const s = [...g].sort((a, b) => a - b)
  const q = (f: number) => s[Math.min(s.length - 1, Math.floor(s.length * f))]
  return `n=${s.length} med=${q(0.5).toFixed(0)} p90=${q(0.9).toFixed(0)} worst=${s[s.length - 1].toFixed(0)}`
}
const STYLE: Record<string, string> = {
  noblur:
    '*,*::before,*::after{-webkit-backdrop-filter:none!important;backdrop-filter:none!important}',
  noanim:
    '*,*::before,*::after{animation:none!important;transition:none!important}',
  noshadow: '*,*::before,*::after{box-shadow:none!important}',
  shcards:
    '.pcard,.cs__bar,.cs-pick,.cl,.fb-dialog,.fb-sheet{box-shadow:none!important}',
  shglass: '.glass,.glass-flat{box-shadow:none!important}',
  shsheet: '[data-paper-sheet]{box-shadow:none!important}',
  shhandles: '.shadow-md{box-shadow:none!important}',
  shscroller: '[class*="shadow-[var(--elev-1)]"]{box-shadow:none!important}',
  shrest:
    '*:not(.pcard,.cs__bar,.cs-pick,.cl,.fb-dialog,.fb-sheet):not(.glass):not(.glass-flat){box-shadow:none!important}',
}
async function look(page: Page, v: string) {
  await page.evaluate(
    ([v, css]) => {
      document.querySelectorAll('style[data-probe]').forEach((e) => e.remove())
      if (v === 'lite') document.documentElement.dataset.glass = 'lite'
      else delete document.documentElement.dataset.glass
      for (const k of Object.keys(css))
        if (v.split('+').includes(k)) {
          const s = document.createElement('style')
          s.dataset.probe = k
          s.textContent = css[k]
          document.documentElement.appendChild(s)
        }
    },
    [v, STYLE] as const,
  )
}

for (const dsf of [2]) {
  test.describe(`action dpr ${dsf}`, () => {
    test.use({ deviceScaleFactor: dsf })
    test(`g1 action frames: Box card open and close (dpr ${dsf})`, async ({
      page,
    }) => {
      test.setTimeout(420_000)
      await page.addInitScript(() => {
        localStorage.setItem(
          'learning-notes:level',
          JSON.stringify({ level: 'beginner', unlocked: ['tb.textBox'] }),
        )
      })
      await startInMode(page, 'touch')
      await page.goto('/?flags=toolbar.v8')
      await createNotebook(page, 'Biology', 'First')
      await hideSidebar(page)
      await typeInEditor(page, 'The nucleus holds the DNA')
      await page.locator('.bn-editor').first().click()
      const c = page.getByTestId('v8-card-text.box')
      const variants = (
        process.env.PROBE_VARIANTS ?? 'asis,noshadow,shcards,shglass,shrest'
      ).split(',')
      for (let rep = 0; rep < 3; rep++)
        for (const v of rep % 2 ? [...variants].reverse() : variants) {
          await look(page, v)
          await page.waitForTimeout(400)
          await startRec(page, 1200)
          await page.getByTestId('v8-chip-text.box').click({ force: true })
          await expect(c).toBeVisible()
          const open = await stopRec(page)
          await startRec(page, 1200)
          await c.getByTestId('pcard-close').click({ force: true })
          await expect(c).toHaveCount(0)
          const close = await stopRec(page)
          await page.locator('.bn-editor').first().click({ force: true })
          const line = `G1ACTION label=${process.env.PROBE_LABEL} dpr=${dsf} rep=${rep} look=${v} open(${stat(open)}) close(${stat(close)})`
          console.log(line)
          test.info().annotations.push({ type: 'g1 action', description: line })
        }
    })
  })
}

/** Every visible box-shadow on screen: element, size, shadow. */
const shadows = (page: Page) =>
  page.evaluate(() => {
    const out: string[] = []
    for (const el of Array.from(document.querySelectorAll('*'))) {
      const cs = getComputedStyle(el)
      if (!cs.boxShadow || cs.boxShadow === 'none') continue
      const r = el.getBoundingClientRect()
      if (r.width * r.height === 0 || cs.visibility === 'hidden') continue
      if (r.bottom < 0 || r.top > innerHeight) continue
      out.push(
        `${(el.getAttribute('data-testid') || el.className.toString() || el.tagName).slice(0, 30)}:${Math.round(r.width)}x${Math.round(r.height)}:${cs.boxShadow.replace(/rgba?([^)]*)/g, 'c')}`,
      )
    }
    return out.join(' | ')
  })

test('g1 shadow inventory per screen of TB-42', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'learning-notes:level',
      JSON.stringify({ level: 'beginner', unlocked: ['tb.textBox'] }),
    )
  })
  await startInMode(page, 'touch')
  await page.goto('/?flags=toolbar.v8')
  await createNotebook(page, 'Biology', 'First')
  console.log(`G1SHADOW screen=notebook ${await shadows(page)}`)
  await hideSidebar(page)
  await typeInEditor(page, 'The nucleus holds the DNA')
  await page.locator('.bn-editor').first().click()
  console.log(`G1SHADOW screen=editor ${await shadows(page)}`)
  await page.getByTestId('v8-chip-text.box').click()
  const c = page.getByTestId('v8-card-text.box')
  await expect(c).toBeVisible()
  await c.getByTestId('v8-box-bg-yellow').click()
  await c.getByRole('switch', { name: 'Shadow' }).click()
  console.log(`G1SHADOW screen=card_open ${await shadows(page)}`)
})
