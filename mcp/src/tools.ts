import type { NotesCache } from './cache'

/**
 * The read-only tools. Each one is a plain function from inputs to a JSON
 * result, so tests can call them without a server. All of them first bring
 * the cache up to date.
 */

export class ToolError extends Error {}

const clamp = (n: number | undefined, def: number, max: number) =>
  Math.min(Math.max(Math.floor(n ?? def), 1), max)

const iso = (ms: number) => new Date(ms).toISOString()

/** Lower case with accents removed, so "Café" finds "cafe". */
function fold(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC')
}

export function makeTools(cache: NotesCache, now: () => number = Date.now) {
  const fresh = () => cache.refresh()

  return {
    async list_notebooks() {
      await fresh()
      const pages = cache.pages()
      const notebooks = cache.notebooks().map((n) => ({
        id: n.id,
        title: n.title,
        kind: n.kind ?? 'notebook',
        pageCount: pages.filter((p) => p.notebookId === n.id).length,
      }))
      const hidden = cache.hiddenNotebookCount()
      return {
        notebooks,
        ...(hidden > 0
          ? {
              note: `${hidden} notebook(s) are hidden because "Allow AI" is off for them in the app (Settings › AI › Permissions).`,
            }
          : {}),
      }
    },

    async list_pages(a: { notebookId: string; parentId?: string | null }) {
      await fresh()
      if (!cache.notebooks().some((n) => n.id === a.notebookId))
        throw new ToolError('No such notebook (or Claude may not read it).')
      const pages = cache
        .pages(a.notebookId)
        .filter((p) =>
          a.parentId === undefined ? true : p.parentId === a.parentId,
        )
        .map((p) => ({
          id: p.id,
          title: p.title,
          parentId: p.parentId,
          updatedAt: p.updatedAt ? iso(p.updatedAt) : null,
        }))
      return { pages }
    },

    async search_notes(a: { query: string; limit?: number }) {
      await fresh()
      const words = fold(a.query).split(/\s+/).filter(Boolean)
      if (words.length === 0) throw new ToolError('Give some words to search.')
      const limit = clamp(a.limit, 10, 50)
      const hits: { score: number; row: object }[] = []
      for (const p of cache.pages()) {
        const title = fold(p.title)
        const body = fold(cache.pageText(p.id))
        if (!words.every((w) => title.includes(w) || body.includes(w))) continue
        const score =
          words.filter((w) => title.includes(w)).length * 10 + words.length
        const at = body.indexOf(words.find((w) => body.includes(w)) ?? '')
        const raw = cache.pageText(p.id)
        const snippet =
          at < 0
            ? ''
            : raw
                .slice(Math.max(0, at - 60), at + 140)
                .replace(/\s+/g, ' ')
                .trim()
        hits.push({
          score,
          row: {
            pageId: p.id,
            title: p.title,
            notebook: cache.notebookTitle(p.notebookId),
            snippet,
          },
        })
      }
      hits.sort((x, y) => y.score - x.score)
      return { results: hits.slice(0, limit).map((h) => h.row) }
    },

    async read_page(a: { pageId: string }) {
      await fresh()
      const r = cache.readPage(a.pageId)
      if (!r) throw new ToolError('No such page (or Claude may not read it).')
      return {
        pageId: r.page.id,
        title: r.page.title,
        notebook: cache.notebookTitle(r.page.notebookId),
        version: r.version,
        blocks: r.blocks,
        markdown: r.markdown,
      }
    },

    async list_cards(a: {
      pageId?: string
      notebookId?: string
      limit?: number
    }) {
      await fresh()
      const limit = clamp(a.limit, 50, 200)
      const all = cache.cards({ pageId: a.pageId, notebookId: a.notebookId })
      return {
        total: all.length,
        cards: all.slice(0, limit).map(shape),
      }
    },

    async due_cards(a: { notebookId?: string; limit?: number }) {
      await fresh()
      const limit = clamp(a.limit, 20, 100)
      const t = now()
      const due = cache
        .cards({ notebookId: a.notebookId })
        .filter((c) => !c.suspended && c.due <= t)
      return { totalDue: due.length, cards: due.slice(0, limit).map(shape) }
    },
  }
}

function shape(c: ReturnType<NotesCache['cards']>[number]) {
  return {
    id: c.id,
    pageId: c.pageId,
    page: c.pageTitle,
    question: c.front,
    answer: c.back,
    due: iso(c.due),
    reviews: c.reps,
    lapses: c.lapses,
    intervalDays: c.intervalDays,
    suspended: c.suspended,
  }
}

export type Tools = ReturnType<typeof makeTools>
