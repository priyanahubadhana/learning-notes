import type {
  Account,
  AuthProvider,
  ChangeFeed,
  Connectors,
  FileStore,
  PushItem,
  PushResult,
  RecordStore,
  RemoteRecord,
} from './types'

/**
 * In-memory connectors with the same rules as the real ones (compare-and-
 * swap, rising seq, write-once files). Used by unit tests and, when the
 * test switch is set, by the browser tests. `persist` keeps the state in
 * localStorage so a second "device" (browser context) can read it.
 */

export interface MemoryState {
  records: Record<string, RemoteRecord>
  seq: number
  bundles: Record<string, string>
  files: Record<string, { name: string; data: string; at: number }>
  fileSeq: number
}

export const emptyMemoryState = (): MemoryState => ({
  records: {},
  seq: 0,
  bundles: {},
  files: {},
  fileSeq: 0,
})

const MOCK_ACCOUNT: Account = {
  accountId: '00000000-0000-4000-8000-000000000001',
  email: 'owner@example.com',
  sub: 'mock-sub',
}

/**
 * A browser test can expose one shared "server" on `window` so two browser
 * contexts (two devices) talk to the same state: `__lnSyncServer(op, …args)`
 * answers like the memory stores below, and the test calls `__lnSyncPing`
 * after a save, the way Realtime would.
 */
export type MockServer = (op: string, ...args: unknown[]) => Promise<unknown>
declare global {
  interface Window {
    __lnSyncServer?: MockServer
    __lnSyncPing?: (seq: number) => void
  }
}

const toB64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes))
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))

/** Connectors that talk to the test's shared server (see `MockServer`). */
export function sharedMemoryConnectors(call: MockServer): Connectors {
  const records: RecordStore = {
    pull: (since, limit) =>
      call('pull', since, limit) as Promise<RemoteRecord[]>,
    push: (items) => call('push', items) as Promise<PushResult>,
    get: (ids) => call('get', ids) as Promise<RemoteRecord[]>,
    listKeyBundles: () => call('listKeyBundles') as Promise<string[]>,
    putKeyBundle: (id, json) => call('putKeyBundle', id, json) as Promise<void>,
    deleteKeyBundle: (id) => call('deleteKeyBundle', id) as Promise<void>,
    serverTime: async () => Date.now(),
  }
  const files: FileStore = {
    put: (name, bytes) =>
      call('filePut', name, toB64(bytes)) as Promise<string>,
    get: async (id) => fromB64((await call('fileGet', id)) as string),
    list: (prefix) =>
      call('fileList', prefix) as Promise<{ id: string; name: string }[]>,
    remove: (id) => call('fileRemove', id) as Promise<void>,
  }
  const changes: ChangeFeed = {
    subscribe(onPing, onOpen) {
      window.__lnSyncPing = onPing
      onOpen(true)
      return () => {
        if (window.__lnSyncPing === onPing) delete window.__lnSyncPing
        onOpen(false)
      }
    },
  }
  return { auth: mockAuth(true), records, files, changes }
}

const MOCK_DRIVE = 'learning-notes:sync.mockDrive'

function mockAuth(persist: boolean): AuthProvider {
  let signedIn: Account | null = persist ? loadSignedIn() : null
  return {
    current: () => signedIn,
    async signIn() {
      signedIn = MOCK_ACCOUNT
      if (persist) saveSignedIn(true)
    },
    async finishSignIn() {
      return false
    },
    async signOut() {
      signedIn = null
      if (persist) saveSignedIn(false)
    },
    async signOutEverywhere() {
      signedIn = null
      if (persist) saveSignedIn(false)
      return true
    },
    async accessToken() {
      return 'mock-token'
    },
    // Browser tests: "tap" makes the quiet renewal fail until a tap.
    async driveToken(interactive) {
      try {
        if (localStorage.getItem(MOCK_DRIVE) === 'tap') {
          if (!interactive) return null
          localStorage.removeItem(MOCK_DRIVE)
        }
      } catch {
        // Storage blocked: the pass always works.
      }
      return 'mock-drive'
    },
  }
}

export function memoryConnectors(
  state: MemoryState = emptyMemoryState(),
  persist?: (s: MemoryState) => void,
): Connectors & { state: MemoryState } {
  const save = () => persist?.(state)

  const records: RecordStore = {
    async pull(sinceSeq, limit) {
      return Object.values(state.records)
        .filter((r) => r.seq > sinceSeq)
        .sort((a, b) => a.seq - b.seq)
        .slice(0, limit)
    },
    async push(items: PushItem[]): Promise<PushResult> {
      const result: PushResult = { accepted: [], conflicts: [] }
      for (const item of items) {
        const now = state.records[item.id]
        if ((now?.rev ?? 0) !== item.baseRev) {
          result.conflicts.push(item.id)
          continue
        }
        const rec: RemoteRecord = {
          id: item.id,
          rev: item.baseRev + 1,
          keyId: item.keyId,
          data: item.data,
          seq: ++state.seq,
        }
        state.records[item.id] = rec
        result.accepted.push({ id: rec.id, rev: rec.rev, seq: rec.seq })
      }
      save()
      return result
    },
    async get(ids) {
      return ids.flatMap((id) => (state.records[id] ? [state.records[id]] : []))
    },
    async listKeyBundles() {
      return Object.values(state.bundles)
    },
    async putKeyBundle(id, json) {
      state.bundles[id] = json
      save()
    },
    async deleteKeyBundle(id) {
      delete state.bundles[id]
      save()
    },
    async serverTime() {
      return Date.now()
    },
  }

  const files: FileStore = {
    async put(name, bytes) {
      const id = `f${++state.fileSeq}`
      state.files[id] = {
        name,
        data: btoa(String.fromCharCode(...bytes)),
        at: state.fileSeq,
      }
      save()
      return id
    },
    async get(id) {
      const f = state.files[id]
      if (!f) throw new Error('No such file')
      return Uint8Array.from(atob(f.data), (c) => c.charCodeAt(0))
    },
    async list(prefix) {
      return Object.entries(state.files)
        .filter(([, f]) => f.name.startsWith(prefix))
        .sort((a, b) => b[1].at - a[1].at)
        .map(([id, f]) => ({ id, name: f.name }))
    },
    async remove(id) {
      delete state.files[id]
      save()
    },
  }

  const auth = mockAuth(!!persist)

  // Windows of one browser share the state: a write in one is a ping in the
  // others (the `storage` event), like Realtime between devices.
  const changes: ChangeFeed = {
    subscribe(onPing, onOpen) {
      const onStorage = (e: StorageEvent) => {
        if (e.key === 'learning-notes:sync.mockState') onPing(0)
      }
      window.addEventListener('storage', onStorage)
      onOpen(true)
      return () => {
        window.removeEventListener('storage', onStorage)
        onOpen(false)
      }
    },
  }

  return { auth, records, files, state, ...(persist ? { changes } : {}) }
}

const SIGNED_KEY = 'learning-notes:sync.mockSignedIn'
function loadSignedIn(): Account | null {
  try {
    return localStorage.getItem(SIGNED_KEY) === '1' ? MOCK_ACCOUNT : null
  } catch {
    return null
  }
}
function saveSignedIn(on: boolean) {
  try {
    if (on) localStorage.setItem(SIGNED_KEY, '1')
    else localStorage.removeItem(SIGNED_KEY)
  } catch {
    // Private mode: the mock stays signed in for this page only.
  }
}
