import Dexie from 'dexie'
import type {
  DBCore,
  DBCoreMutateRequest,
  DBCoreMutateResponse,
  DBCoreTable,
  Middleware,
} from 'dexie'
import type { SyncState } from '../core/types'
import { isTracking, nextHlc } from './device'
import { SYNC_TABLES, isSynced } from './tables'

/**
 * Marks every save of a synced table as "changed here" (L6), from any
 * service, inside the same transaction (like the search index). Writes that
 * sync itself makes while applying pulled records are marked with
 * `markRemote(tx)` and are not tracked. Hard deletes are not tracked: the
 * app never hard-deletes synced records (Delete forever keeps a marker).
 * Tracking is on only once sync is set up (`device.ts`); edits made while
 * it is off are found by `enqueueChanged` through `updatedAt`.
 */

const remote = new WeakSet<object>()

/** Marks a transaction as "applying pulled records" (not tracked). */
export function markRemote(idbtrans: object): void {
  remote.add(idbtrans)
}

const writeListeners = new Set<() => void>()

/** Calls `fn` after every tracked local save (sync sends them soon after). */
export function onLocalWrite(fn: () => void): () => void {
  writeListeners.add(fn)
  return () => writeListeners.delete(fn)
}

export const syncStateId = (table: string, id: string) => `${table}/${id}`

export const syncOutboxMiddleware: Middleware<DBCore> = {
  stack: 'dbcore',
  name: 'syncOutbox',
  // Below Dexie's own layers (cache, hooks), right above IndexedDB: those
  // layers need a transaction context that awaits inside a middleware lose.
  // Live queries therefore do not see sync rows change (none needs to).
  level: -2,
  create: (down) => ({
    ...down,
    transaction: (stores, mode, options) =>
      down.transaction(
        mode === 'readwrite' &&
          isTracking() &&
          stores.some(isSynced) &&
          !stores.includes('syncState')
          ? [...stores, 'syncState']
          : stores,
        mode,
        options,
      ),
    table: (name) => {
      const table = down.table(name)
      if (!isSynced(name)) return table
      return {
        ...table,
        mutate: (req) => {
          const tracked =
            isTracking() &&
            (req.type === 'add' || req.type === 'put') &&
            !remote.has(req.trans as object)
          if (!tracked) return table.mutate(req)
          // Chained with Dexie's own promise (no async/await), so the layers
          // above keep their transaction context after this write.
          const P = Dexie.Promise
          const states = down.table('syncState')
          const ids = req.values.map((v) => (v as { id: string }).id)
          const keys = ids.map((id) => syncStateId(name, id))
          return P.resolve(states.getMany({ trans: req.trans, keys })).then(
            (old) =>
              P.resolve(table.mutate(req)).then((res) =>
                P.resolve(
                  writeStates(states, req, name, ids, keys, old, res),
                ).then(() => {
                  for (const l of writeListeners) l()
                  return res
                }),
              ),
          )
        },
      }
    },
  }),
}

function writeStates(
  states: DBCoreTable,
  req: DBCoreMutateRequest,
  name: string,
  ids: string[],
  keys: string[],
  oldRows: unknown[],
  res: DBCoreMutateResponse,
): Promise<unknown> | undefined {
  const old = oldRows as (SyncState | undefined)[]
  const hlc = nextHlc()
  const file = SYNC_TABLES[name] === 'file'
  const values: SyncState[] = []
  ids.forEach((recordId, i) => {
    if (i in res.failures) return
    values.push({
      ...(old[i] ?? { rev: 0 }),
      id: keys[i],
      table: name,
      recordId,
      hlc,
      dirty: 1,
      ...(file ? { fileState: 'up' as const } : {}),
    })
  })
  if (values.length === 0) return undefined
  return states.mutate({ type: 'put', trans: req.trans, values })
}

/** Is this transaction applying records pulled from another device? */
export const isRemoteTrans = (idbtrans: object | undefined): boolean =>
  !!idbtrans && remote.has(idbtrans)
