// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, type Page } from '@playwright/test'

/**
 * Puts the keyboard in the page's editor and waits until the editor has
 * finished taking it. ProseMirror's focus handler queues a check (a 20 ms
 * timer) that puts the page caret back where the editor last read it. WebKit
 * reports a caret move (selectionchange) as a later task, so a key pressed
 * before that check can be undone by it: on CI run 46032562297 an ArrowUp
 * in toolbarV8FormatOn was undone and Bold stayed off. The wait is for every timer the focus
 * queued to have run (that check among them), not for a fixed time.
 */
export async function focusEditor(page: Page) {
  const done = await page
    .locator('.ProseMirror[contenteditable="true"]')
    .first()
    .evaluate((el: HTMLElement) => {
      const w = window as unknown as { __focusLeft?: number }
      const real = window.setTimeout
      w.__focusLeft = 0
      window.setTimeout = ((
        fn: TimerHandler,
        ms?: number,
        ...args: unknown[]
      ) => {
        w.__focusLeft! += 1
        return real(() => {
          try {
            if (typeof fn === 'function') fn(...args)
          } finally {
            w.__focusLeft! -= 1
          }
        }, ms)
      }) as typeof window.setTimeout
      try {
        el.focus()
      } finally {
        window.setTimeout = real
      }
      return document.activeElement === el
    })
  expect(done).toBe(true)
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { __focusLeft?: number }).__focusLeft,
      ),
    )
    .toBe(0)
}
