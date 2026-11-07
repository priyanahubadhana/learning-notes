import type {
  Account,
  AuthProvider,
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

export function memoryConnectors(
  state: MemoryState = emptyMemoryState(),
  persist?: (s: MemoryState) => void,
): Connectors & { state: MemoryState } {
  const save = () => persist?.(state)
  let signedIn: Account | null = persist ? loadSignedIn() : null

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

  const auth: AuthProvider = {
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
    async accessToken() {
      return 'mock-token'
    },
    async driveToken() {
      return 'mock-drive'
    },
  }

  return { auth, records, files, state }
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
