import type { SqlJsStatic } from 'sql.js'
// The SQLite engine's file, served by the app (only fetched when needed).
import wasmUrl from 'sql.js/dist/sql-wasm-browser.wasm?url'

let loading: Promise<SqlJsStatic> | undefined

/**
 * Loads the SQLite engine (sql.js) the first time it is needed, so the
 * app's start does not pay for it. Only Anki files use it.
 */
export function loadSql(): Promise<SqlJsStatic> {
  loading ??= import('sql.js').then((module) => {
    const init = (module.default ?? module) as unknown as (config?: {
      locateFile?: (file: string) => string
    }) => Promise<SqlJsStatic>
    // In the browser the engine is fetched from the app; Node (tests) finds it itself.
    return init(
      typeof window === 'undefined' ? undefined : { locateFile: () => wasmUrl },
    )
  })
  loading.catch(() => (loading = undefined)) // try again next time
  return loading
}
