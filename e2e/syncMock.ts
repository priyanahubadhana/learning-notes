// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, type Browser, type Page } from '@playwright/test'
import { createNotebook, openPage, signInFromAccount } from './helpers.ts'

export type MockServer = (op: string, ...args: unknown[]) => Promise<unknown>
interface Rec {
  id: string
  rev: number
  keyId: string
  data: string
  seq: number
}
interface Item {
  id: string
  baseRev: number
  keyId: string
  data: string
}

/**
 * Real-time sync (R6-13) with a mocked connector: two browser contexts (two
 * devices) share one in-memory "server" that lives in the test, and the
 * test pings every open page after each save, like Supabase Realtime. An
 * edit on A shows on B's open page without a reload, B's caret stays put,
 * and B's own typing reaches A the same way.
 */

export const PASS = 'river candle mango tiger'
/**
 * One shared server for both devices, served through a page binding. The
 * same rules as the app's memory connector: compare-and-swap saves, a
 * rising seq, write-once files.
 */
export function makeServer(latencyMs = 0) {
  const state = {
    records: {} as Record<string, Rec>,
    seq: 0,
    bundles: {} as Record<string, string>,
    files: {} as Record<string, { name: string; data: string; at: number }>,
    fileSeq: 0,
  }
  const pages = new Set<Page>()
  const ping = (seq: number) => {
    for (const p of pages) {
      p.evaluate(
        (s) =>
          (
            window as unknown as { __lnSyncPing?: (seq: number) => void }
          ).__lnSyncPing?.(s),
        seq,
      ).catch(() => {})
    }
  }
  // While closed, pulls and pushes wait: two devices can both edit before either hears of the other.
  let held: Promise<void> | null = null
  let letGo: () => void = () => {}
  const gate = {
    close: () => {
      held = new Promise<void>((r) => (letGo = r))
    },
    open: () => {
      held = null
      letGo()
    },
  }
  const serve: MockServer = async (op, ...args) => {
    if (held && (op === 'pull' || op === 'push')) await held
    if (latencyMs > 0)
      await new Promise((r) => setTimeout(r, Math.random() * latencyMs))
    switch (op) {
      case 'pull': {
        const [since, limit] = args as [number, number]
        return Object.values(state.records)
          .filter((r) => r.seq > since)
          .sort((a, b) => a.seq - b.seq)
          .slice(0, limit)
      }
      case 'push': {
        const [items] = args as [Item[]]
        const accepted: { id: string; rev: number; seq: number }[] = []
        const conflicts: string[] = []
        for (const item of items) {
          const now = state.records[item.id]
          if ((now?.rev ?? 0) !== item.baseRev) {
            conflicts.push(item.id)
            continue
          }
          const rec: Rec = {
            id: item.id,
            rev: item.baseRev + 1,
            keyId: item.keyId,
            data: item.data,
            seq: ++state.seq,
          }
          state.records[item.id] = rec
          accepted.push({ id: rec.id, rev: rec.rev, seq: rec.seq })
        }
        if (accepted.length > 0) {
          const seq = Math.max(...accepted.map((x) => x.seq))
          setTimeout(() => ping(seq), 30)
        }
        return { accepted, conflicts }
      }
      case 'get': {
        const [ids] = args as [string[]]
        return ids.flatMap((id) =>
          state.records[id] ? [state.records[id]] : [],
        )
      }
      case 'listKeyBundles':
        return Object.values(state.bundles)
      case 'putKeyBundle': {
        const [id, json] = args as [string, string]
        state.bundles[id] = json
        return
      }
      case 'deleteKeyBundle': {
        const [id] = args as [string]
        delete state.bundles[id]
        return
      }
      case 'filePut': {
        const [name, data] = args as [string, string]
        const id = `f${++state.fileSeq}`
        state.files[id] = { name, data, at: state.fileSeq }
        return id
      }
      case 'fileGet': {
        const [id] = args as [string]
        if (!state.files[id]) throw new Error('No such file')
        return state.files[id].data
      }
      case 'fileList': {
        const [prefix] = args as [string]
        return Object.entries(state.files)
          .filter(([, f]) => f.name.startsWith(prefix))
          .sort((a, b) => b[1].at - a[1].at)
          .map(([id, f]) => ({ id, name: f.name }))
      }
      case 'fileRemove': {
        const [id] = args as [string]
        delete state.files[id]
        return
      }
      default:
        throw new Error(`unknown op ${op}`)
    }
  }
  return { serve, pages, state, gate }
}

export async function device(
  browser: Browser,
  serve: MockServer,
  pages: Set<Page>,
) {
  const context = await browser.newContext()
  await context.exposeBinding('__lnSyncServer', (_src, op: string, ...args) =>
    serve(op, ...args),
  )
  await context.addInitScript(() => {
    localStorage.setItem('learning-notes:sync.mock', '1')
  })
  // No real sync host may be called.
  await context.route(
    /supabase\.co|googleapis\.com|accounts\.google\.com/,
    (r) => r.abort(),
  )
  const page = await context.newPage()
  pages.add(page)
  return page
}

export const lines = (page: Page) =>
  page.locator('.bn-editor .bn-block-content').allInnerTexts()

/** Device A: a notebook "Shared" with `texts` as lines, sync set up. */
export async function setupA(a: Page, texts: string[]) {
  await a.goto('/')
  await createNotebook(a, 'Live NB', 'Shared')
  await a.locator('.bn-editor').click()
  for (const [i, t] of texts.entries()) {
    if (i > 0) await a.keyboard.press('Enter')
    await a.keyboard.type(t)
  }
  await a.waitForTimeout(800)
  await a.goto('/#/settings/sync')
  const sa = a.getByTestId('sync-section')
  await signInFromAccount(sa.page())
  await sa.getByLabel('Passphrase', { exact: true }).fill(PASS)
  await sa.getByLabel('Type it again').fill(PASS)
  await sa.getByRole('button', { name: 'Lock my notes and start' }).click()
  const code = (
    await a.getByTestId('recovery-code').locator('.font-mono').innerText()
  ).trim()
  await sa
    .getByLabel(/last four letters/)
    .fill(code.replace(/-/g, '').slice(-4))
  await sa.getByRole('button', { name: 'I saved it' }).click()
  await expect(a.getByTestId('sync-status')).toContainText('Last synced')
  await expect(a.getByTestId('sync-live')).toContainText('Live')
}

/** Device B: unlock and open the shared page. */
export async function setupB(b: Page) {
  await b.goto('/#/settings/sync')
  const sb = b.getByTestId('sync-section')
  await signInFromAccount(sb.page())
  await sb.getByLabel('Passphrase', { exact: true }).fill(PASS)
  await sb.getByRole('button', { name: 'Unlock' }).click()
  await expect(b.getByTestId('sync-status')).toContainText('Last synced', {
    timeout: 20_000,
  })
  await b.goto('/')
  await openPage(b, 'Shared')
}
