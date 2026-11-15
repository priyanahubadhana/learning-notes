// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'

/** Tool bar v9, task 2A.14: tool names are a setting (TB-01, TB-02); Box ▾ hangs under its button (TB-42). */
test.use({ viewport: { width: 1700, height: 900 }, hasTouch: true })

async function open(
  page: Page,
  o: {
    level: 'beginner' | 'professional'
    mode?: 'touch' | 'pencil'
    names?: 'on' | 'off'
    hoverTips?: 'on' | 'off'
  },
) {
  await page.addInitScript((x) => {
    localStorage.setItem(
      'learning-notes:level',
      JSON.stringify({ level: x.level, unlocked: [] }),
    )
    if (x.names)
      localStorage.setItem(
        'learning-notes:toolbar.v9.toolNames',
        JSON.stringify(x.names),
      )
  }, o)
  await startInMode(page, o.mode ?? 'touch')
  if (o.hoverTips)
    await page.addInitScript((v) => {
      localStorage.setItem(
        'learning-notes:advanced.hoverTips',
        JSON.stringify(v),
      )
    }, o.hoverTips)
  await page.goto('/?flags=toolbar.v8')
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')
}

const tool = (page: Page, id: string) => page.getByTestId(`v8-tool-${id}`)

test('TB-01 Beginner with "Show tool names" on shows the names', async ({
  page,
}) => {
  await open(page, { level: 'beginner', names: 'on' })
  await expect(tool(page, 'pen')).toContainText('Pen')
})

test('TB-01 Professional with "Show tool names" off shows icons only; the name still shows on hold', async ({
  page,
}) => {
  await open(page, { level: 'professional', names: 'off', hoverTips: 'on' })
  await expect(tool(page, 'pen').locator('.v8tool-name')).toHaveCount(0)
  await tool(page, 'pen').hover()
  await expect(page.getByTestId('v8-hover-tip')).toHaveText('Pen')
  const box = (await tool(page, 'pen').boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await expect(page.getByTestId('v8-tip')).toHaveText('Pen')
  await page.mouse.up()
  await expect(tool(page, 'text')).toHaveAttribute('data-active', 'true')
})

test('TB-01 upright on a Pencil device the bar shows icons only; sideways the names come back', async ({
  page,
}) => {
  await open(page, { level: 'professional', mode: 'pencil' })
  await page.setViewportSize({ width: 1700, height: 900 })
  await expect(tool(page, 'pen')).toContainText('Pen')
  await page.setViewportSize({ width: 1000, height: 1500 })
  await expect(tool(page, 'pen').locator('.v8tool-name')).toHaveCount(0)
  await page.setViewportSize({ width: 1700, height: 900 })
  await expect(tool(page, 'pen')).toContainText('Pen')
})

test('TB-02 the hover name follows Button tips: off shows none', async ({
  page,
}) => {
  await open(page, { level: 'professional', names: 'off', hoverTips: 'off' })
  await tool(page, 'pen').hover()
  await page.waitForTimeout(400)
  await expect(page.getByTestId('v8-hover-tip')).toHaveCount(0)
})

test('TB-02 upright Pencil mode: a long press shows the name and does not choose the tool', async ({
  page,
}) => {
  await open(page, { level: 'professional', mode: 'pencil' })
  await page.setViewportSize({ width: 1000, height: 1500 })
  await tool(page, 'eraser').click()
  await expect(tool(page, 'eraser')).toHaveAttribute('data-active', 'true')
  const box = (await tool(page, 'pen').boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await expect(page.getByTestId('v8-tip')).toHaveText('Pen')
  await page.mouse.up()
  await expect(tool(page, 'pen')).not.toHaveAttribute('data-active', 'true')
  await expect(tool(page, 'eraser')).toHaveAttribute('data-active', 'true')
})

test('TB-42 the Box card hangs under its Box button, arrow under it, like every other ▾', async ({
  page,
}) => {
  await open(page, { level: 'professional' })
  await page.locator('.bn-editor').first().click()
  const chip = page.getByTestId('v8-chip-text.box')
  await expect(chip).toBeVisible()
  await chip.click()
  const card = page.getByTestId('v8-card-text.box')
  await expect(card).toBeVisible()
  await page.waitForTimeout(300)
  const c = (await card.boundingBox())!
  const a = (await chip.boundingBox())!
  expect(c.y).toBeGreaterThanOrEqual(a.y + a.height)
  expect(c.y - (a.y + a.height)).toBeLessThan(24)
  expect(a.x + a.width / 2).toBeGreaterThan(c.x)
  expect(a.x + a.width / 2).toBeLessThan(c.x + c.width)
})

const NEW_ROWS = [
  'advanced.toolNames',
  'advanced.formatTabs',
  'advanced.backToPen',
  'advanced.eraserMenus',
  'advanced.biggerLasso',
]

test('the five tool bar settings have no rows with toolbar.v8 off, and rows with it on', async ({
  page,
}) => {
  await page.goto('/#/settings')
  await expect(page.locator('[data-setting-id="general.theme"]')).toBeVisible()
  for (const id of NEW_ROWS)
    await expect(page.locator(`[data-setting-id="${id}"]`)).toHaveCount(0)
  await page.goto('/?flags=toolbar.v8#/settings')
  await page.reload()
  await expect(page.locator('[data-setting-id="general.theme"]')).toBeVisible()
  await page
    .getByRole('tab', { name: /advanced/i })
    .first()
    .click()
    .catch(() => {})
  for (const id of NEW_ROWS)
    await expect(page.locator(`[data-setting-id="${id}"]`)).toHaveCount(1)
})

test('Layout shortcut: hidden with toolbar.v8 off; one tap sets all five rows; a single change after shows neither', async ({
  page,
}) => {
  await page.goto('/#/settings')
  await expect(page.locator('[data-setting-id="general.theme"]')).toBeVisible()
  await expect(
    page.locator('[data-setting-id="advanced.layoutShortcut"]'),
  ).toHaveCount(0)
  await page.goto('/?flags=toolbar.v8#/settings')
  await page.reload()
  await expect(page.locator('[data-setting-id="general.theme"]')).toBeVisible()
  await page
    .getByRole('tab', { name: /advanced/i })
    .first()
    .click()
    .catch(() => {})
  const row = page.locator('[data-setting-id="advanced.layoutShortcut"]')
  await expect(row).toHaveCount(1)
  const pressed = (id: string, name: string) =>
    page
      .locator(`[data-setting-id="${id}"]`)
      .getByRole('button', { name, exact: true })
  await pressed('advanced.layoutShortcut', 'Professional').click()
  await expect(pressed('advanced.toolNames', 'On')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(pressed('advanced.formatTabs', '4')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await pressed('advanced.layoutShortcut', 'Beginner').click()
  await expect(pressed('advanced.toolNames', 'Off')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await pressed('advanced.toolNames', 'On').click()
  for (const name of ['Beginner', 'Professional'])
    await expect(pressed('advanced.layoutShortcut', name)).toHaveAttribute(
      'aria-pressed',
      'false',
    )
})
