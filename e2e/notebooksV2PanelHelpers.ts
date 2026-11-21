// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, type Locator, type Page } from '@playwright/test'
import { createNotebook } from './helpers.ts'

/**
 * Shared set-up for the left panel v2 specs (slice 4, flag notebooks.v2).
 * Pages are written straight into the database (fast, any number of them);
 * everything the test checks is then done by clicking, like a person.
 */
export const FLAG = '/?flags=notebooks.v2'

export interface SeedPage {
  title: string
  /** Title of the parent page (a sub-page). */
  parent?: string
  /** Paragraph lines (the thumbnail shows the first three). */
  lines?: string[]
  /** Headings as [level, text], written after the lines. */
  heads?: [number, string][]
  /** Extra blocks written as they are. */
  blocks?: { type: string; content: Record<string, unknown> }[]
  locked?: boolean
}

export type Level = 'beginner' | 'professional'

/** Starts the app with the flag on and the level / unlock switches given. */
export async function start(
  page: Page,
  opts: { level?: Level; unlocked?: string[] } = {},
) {
  const level = opts.level ?? 'beginner'
  const unlocked = opts.unlocked ?? []
  await page.addInitScript(
    ([l, u]) => {
      try {
        // Only at the first load: a test may change the switches and reload.
        if (!sessionStorage.getItem('nbv2-level-set')) {
          sessionStorage.setItem('nbv2-level-set', '1')
          localStorage.setItem(
            'learning-notes:level',
            JSON.stringify({ level: l, unlocked: u }),
          )
        }
      } catch {
        /* storage blocked */
      }
    },
    [level, unlocked] as const,
  )
  await page.goto(FLAG)
}

/** base-62 order keys 'b00'..'bzz' (after the first page's 'a0'). */
const KEYS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
export const orderKey = (i: number) =>
  'b' + KEYS[Math.floor(i / 62)] + KEYS[i % 62]

/**
 * Makes notebook `notebook` (with its first page `first`) and adds pages to it
 * in the database. Returns the ids by title. The page is reloaded so the
 * screen reads them.
 */
export async function seedNotebook(
  page: Page,
  notebook: string,
  first: string,
  pages: SeedPage[],
): Promise<Record<string, string>> {
  await createNotebook(page, notebook, first)
  const ids = await page.evaluate(
    async ([nbTitle, firstTitle, list, keys]) => {
      const open = indexedDB.open('learning-notes')
      const db: IDBDatabase = await new Promise((res) => {
        open.onsuccess = () => res(open.result)
      })
      const getAll = <T>(store: string) =>
        new Promise<T[]>((res) => {
          const r = db.transaction(store).objectStore(store).getAll()
          r.onsuccess = () => res(r.result as T[])
        })
      const nb = (
        await getAll<{ id: string; title: string }>('notebooks')
      ).find((n) => n.title === nbTitle)!
      const firstPage = (await getAll<Record<string, unknown>>('pages')).find(
        (p) => p.title === firstTitle && p.notebookId === nb.id,
      )!
      const out: Record<string, string> = {
        [firstTitle]: firstPage.id as string,
      }
      const idOf = (t: string) => out[t]
      const key = (i: number) => 'b' + keys[Math.floor(i / 62)] + keys[i % 62]
      const now = Date.now()
      const tx = db.transaction(['pages', 'blocks'], 'readwrite')
      list.forEach((p, i) => {
        const id = `seed-page-${i}`
        out[p.title] = id
        tx.objectStore('pages').put({
          ...firstPage,
          id,
          title: p.title,
          parentId: p.parent ? idOf(p.parent) : null,
          order: key(i),
          createdAt: now,
          updatedAt: now,
          ...(p.locked ? { locked: true } : {}),
        })
        let n = 0
        const text = (s: string) => [{ type: 'text', text: s, styles: {} }]
        const add = (type: string, content: Record<string, unknown>) =>
          tx.objectStore('blocks').put({
            id: `${id}-b${n}`,
            pageId: id,
            parentId: null,
            type,
            content,
            order: key(n++),
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          })
        for (const line of p.lines ?? []) add('paragraph', { text: text(line) })
        for (const [level, h] of p.heads ?? [])
          add('heading', { text: text(h), level })
        for (const b of p.blocks ?? []) add(b.type, b.content)
      })
      await new Promise<void>((res) => {
        tx.oncomplete = () => res()
      })
      db.close()
      return out
    },
    [notebook, first, pages, KEYS] as const,
  )
  return ids
}

/** Opens a page by its address (the panel's open / closed choice is kept). */
export async function openById(page: Page, id: string) {
  await page.goto(`${FLAG}#/page/${id}`)
  await page.reload()
  await expect(page.getByRole('textbox', { name: 'Page title' })).toBeVisible({
    timeout: 20_000,
  })
}

export const panel = (page: Page) => page.getByTestId('left-panel')

/** Shows the panel (the toggle in the top bar), docked or as a drawer. */
export async function openPanel(page: Page) {
  const toggle = page.getByTestId('panel-toggle')
  if ((await toggle.getAttribute('aria-pressed')) !== 'true')
    await toggle.click()
  await expect(panel(page)).toBeVisible()
}

export const tabButton = (page: Page, name: string) =>
  panel(page).getByRole('tab', { name, exact: true })

export const rows = (page: Page) => panel(page).getByTestId('lpv2-page')
export const row = (page: Page, title: string): Locator =>
  rows(page).filter({ hasText: title })

/** The page titles in the panel's list, top to bottom (only the rows drawn). */
export async function drawnTitles(page: Page): Promise<string[]> {
  return panel(page)
    .getByTestId('lpv2-page')
    .evaluateAll((els) =>
      els.map((e) => e.querySelector('b')?.textContent?.trim() ?? ''),
    )
}

/** Titles of all pages of the notebook in order, read from the database. */
export async function dbTitles(
  page: Page,
  notebook: string,
): Promise<string[]> {
  return page.evaluate(async (nbTitle) => {
    const open = indexedDB.open('learning-notes')
    const db: IDBDatabase = await new Promise((res) => {
      open.onsuccess = () => res(open.result)
    })
    const getAll = <T>(store: string) =>
      new Promise<T[]>((res) => {
        const r = db.transaction(store).objectStore(store).getAll()
        r.onsuccess = () => res(r.result as T[])
      })
    const nb = (await getAll<{ id: string; title: string }>('notebooks')).find(
      (n) => n.title === nbTitle,
    )!
    const pages = (
      await getAll<{
        notebookId: string
        parentId: string | null
        title: string
        order: string
        deletedAt: number | null
        id: string
      }>('pages')
    ).filter((p) => p.notebookId === nb.id && p.deletedAt === null)
    db.close()
    const kids = (pid: string | null): string[] =>
      pages
        .filter((p) => p.parentId === pid)
        .sort((a, b) => (a.order < b.order ? -1 : 1))
        .flatMap((p) => [p.title, ...kids(p.id)])
    return kids(null)
  }, notebook)
}
