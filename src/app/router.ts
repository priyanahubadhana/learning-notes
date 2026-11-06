import { useSyncExternalStore } from 'react'
import { pushEntry, replaceEntry } from './navHistory'

/**
 * Screens and their addresses (the part after "#"). Pure parsing/building
 * lives here; App.tsx connects it to its screen state and the browser
 * history. `parts` are the screen's own levels: a notebook's tab and Revise
 * lesson, a database's view.
 */
export type Route =
  | { kind: 'home' }
  | { kind: 'page'; id: string }
  | { kind: 'notebook'; id: string; parts: string[] }
  | { kind: 'database'; id: string; parts: string[] }
  | { kind: 'databases' }
  | { kind: 'cards' }
  | { kind: 'data' }
  | { kind: 'calendar' }
  | { kind: 'lab' }
  | { kind: 'settings'; parts: string[] }
  | { kind: 'search'; savedId?: string; query?: Record<string, unknown> }
  | { kind: 'review'; scope: ReviewRoute }

/** The review scopes an address can hold (a list of blocks cannot). */
export type ReviewRoute =
  | { kind: 'all' }
  | { kind: 'wrong' }
  | { kind: 'notebook'; notebookId: string }
  | { kind: 'page'; pageId: string; includeSubpages: boolean }
  /** A list of blocks (e.g. search results): cannot be reopened later. */
  | { kind: 'custom' }

const MAX_PARTS = 3

/** The hash for a route, e.g. `#/notebook/<id>/<tab>`. */
export function routeToHash(route: Route): string {
  const e = encodeURIComponent
  switch (route.kind) {
    case 'home':
      return '#/'
    case 'page':
      return `#/page/${e(route.id)}`
    case 'notebook':
    case 'database':
      return `#/${route.kind}/${e(route.id)}${route.parts
        .slice(0, MAX_PARTS)
        .map((p) => `/${e(p)}`)
        .join('')}`
    case 'settings':
      return `#/settings${route.parts
        .slice(0, MAX_PARTS)
        .map((p) => `/${e(p)}`)
        .join('')}`
    case 'lab':
      return '#/lab/pencil'
    case 'databases':
    case 'cards':
    case 'data':
    case 'calendar':
      return `#/${route.kind}`
    case 'search':
      if (route.savedId) return `#/search/saved/${e(route.savedId)}`
      return route.query
        ? `#/search?q=${e(JSON.stringify(route.query))}`
        : '#/search'
    case 'review': {
      const s = route.scope
      if (s.kind === 'notebook') return `#/review/notebook/${e(s.notebookId)}`
      if (s.kind === 'page') {
        return `#/review/page/${e(s.pageId)}${s.includeSubpages ? '?sub=1' : ''}`
      }
      if (s.kind === 'custom') return '#/review/custom'
      return s.kind === 'wrong' ? '#/review/wrong' : '#/review'
    }
  }
}

function decode(part: string): string | null {
  try {
    return decodeURIComponent(part) || null
  } catch {
    return null
  }
}

/** The route for a hash. Anything unknown or damaged is home. */
export function parseHash(hash: string): Route {
  const home: Route = { kind: 'home' }
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?', 2)
  const [head, ...rest] = path.split('/')
  const args = rest.map(decode)
  const first = args[0]
  if (args.some((a) => a === null)) return home
  switch (head) {
    case 'page':
      return first ? { kind: 'page', id: first } : home
    case 'notebook':
    case 'database':
      return first
        ? {
            kind: head,
            id: first,
            parts: args.slice(1, 1 + MAX_PARTS) as string[],
          }
        : home
    case 'settings':
      return { kind: 'settings', parts: args.slice(0, MAX_PARTS) as string[] }
    case 'lab':
      return first === 'pencil' ? { kind: 'lab' } : home
    case 'databases':
    case 'cards':
    case 'data':
    case 'calendar':
      return { kind: head }
    case 'search': {
      if (first === 'saved' && args[1]) {
        return { kind: 'search', savedId: args[1] }
      }
      const raw = new URLSearchParams(query).get('q')
      if (!raw) return { kind: 'search' }
      try {
        const parsed: unknown = JSON.parse(raw)
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
          ? { kind: 'search', query: parsed as Record<string, unknown> }
          : { kind: 'search' }
      } catch {
        return { kind: 'search' }
      }
    }
    case 'review': {
      if (first === 'wrong') {
        return { kind: 'review', scope: { kind: 'wrong' } }
      }
      if (first === 'notebook' && args[1]) {
        return {
          kind: 'review',
          scope: { kind: 'notebook', notebookId: args[1] },
        }
      }
      if (first === 'page' && args[1]) {
        return {
          kind: 'review',
          scope: {
            kind: 'page',
            pageId: args[1],
            includeSubpages: new URLSearchParams(query).get('sub') === '1',
          },
        }
      }
      // "custom" and anything unknown cannot be reopened.
      return first ? home : { kind: 'review', scope: { kind: 'all' } }
    }
    default:
      return home
  }
}

/** The hash without a notebook's/database's own levels (tab, view…). */
export function baseHash(hash: string): string {
  const route = parseHash(hash)
  return routeToHash(
    route.kind === 'notebook' ||
      route.kind === 'database' ||
      route.kind === 'settings'
      ? { ...route, parts: [] }
      : route,
  )
}

/** The screen's own levels in the current address. */
export function currentParts(hash: string = location.hash): string[] {
  const route = parseHash(hash)
  return route.kind === 'notebook' ||
    route.kind === 'database' ||
    route.kind === 'settings'
    ? route.parts
    : []
}

const SUB_EVENT = 'learning-notes:route-parts'

/**
 * Sets level `index` of the open notebook/database (0 = tab/view, 1 = Revise
 * lesson) as a new history entry. If the address has no level yet, the
 * current value is written into the old entry first, so Back returns to it.
 */
export function pushRouteParts(index: number, value: string, before: string[]) {
  const route = parseHash(location.hash)
  if (
    route.kind !== 'notebook' &&
    route.kind !== 'database' &&
    route.kind !== 'settings'
  ) {
    return
  }
  // The address may not say yet what is on screen (a level was never chosen):
  // write it into the entry we are leaving, so Back returns to it.
  const keep = route.parts.length >= before.length ? route.parts : before
  if (route.parts.length < before.length) {
    replaceEntry(routeToHash({ ...route, parts: before }))
  }
  const parts = [...keep.slice(0, index), value]
  if (parts.join('/') === route.parts.join('/')) return
  pushEntry(routeToHash({ ...route, parts }))
  window.dispatchEvent(new Event(SUB_EVENT))
}

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange)
  window.addEventListener(SUB_EVENT, onChange)
  return () => {
    window.removeEventListener('popstate', onChange)
    window.removeEventListener(SUB_EVENT, onChange)
  }
}

/** Level `index` of the open notebook's/database's address (or null). */
export function useRouteParts(index: number): string | null {
  return useSyncExternalStore(subscribe, () => currentParts()[index] ?? null)
}
