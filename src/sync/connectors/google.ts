import { DRIVE_FOLDER, DRIVE_SCOPE, GOOGLE_CLIENT_ID } from './config'
import {
  NeedsTapError,
  TryLaterError,
  type AuthProvider,
  type FileStore,
} from './types'

/**
 * Google connector (L3, L8): renews the Drive pass and stores encrypted
 * files in one visible Drive folder with the `drive.file` permission (only
 * files this app made). Google's sign-in script is loaded only when a pass
 * must be renewed, never on start.
 */

interface TokenClient {
  requestAccessToken(o?: { prompt?: string; login_hint?: string }): void
}
interface Gis {
  accounts: {
    oauth2: {
      initTokenClient(o: {
        client_id: string
        scope: string
        prompt?: string
        login_hint?: string
        callback: (r: {
          access_token?: string
          expires_in?: number
          error?: string
        }) => void
        error_callback?: (e: { type: string }) => void
      }): TokenClient
    }
  }
}

let gisLoad: Promise<Gis> | null = null
function loadGis(): Promise<Gis> {
  gisLoad ??= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => resolve((globalThis as unknown as { google: Gis }).google)
    s.onerror = () => {
      gisLoad = null
      reject(new TryLaterError('google script'))
    }
    document.head.append(s)
  })
  return gisLoad
}

/**
 * A new Drive pass. Quiet first (`prompt: 'none'` worked 1 h 36 min later
 * on the iPad, 2 Nov); if that is refused and `interactive` is false, it
 * returns null so the app can show a one-tap "Reconnect Drive" button.
 */
export async function renewDriveToken(
  email: string,
  interactive: boolean,
): Promise<{ token: string; expiresAt: number } | null> {
  const gis = await loadGis()
  return new Promise((resolve) => {
    const client = gis.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: DRIVE_SCOPE,
      login_hint: email,
      prompt: interactive ? '' : 'none',
      callback: (r) =>
        resolve(
          r.access_token
            ? {
                token: r.access_token,
                expiresAt: Date.now() + ((r.expires_in ?? 3600) - 300) * 1000,
              }
            : null,
        ),
      error_callback: () => resolve(null),
    })
    client.requestAccessToken({ login_hint: email })
  })
}

const API = 'https://www.googleapis.com/drive/v3'
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3'
const FOLDER_KEY = 'learning-notes:sync.driveFolder'

export function driveFiles(auth: AuthProvider): FileStore {
  const token = async () => {
    const t = await auth.driveToken(false)
    if (!t) throw new NeedsTapError('drive')
    return t
  }
  const call = async (url: string, init: RequestInit = {}) => {
    let res: Response
    try {
      res = await fetch(url, {
        ...init,
        headers: {
          Authorization: `Bearer ${await token()}`,
          ...(init.headers ?? {}),
        },
      })
    } catch (e) {
      if (e instanceof NeedsTapError) throw e
      throw new TryLaterError('offline')
    }
    if (res.status === 401) throw new NeedsTapError('drive 401')
    if (!res.ok) {
      // Drive answers 403 for "no room left" and for other refusals.
      if (res.status === 403 && /uotaExceeded/.test(await res.clone().text())) {
        throw new TryLaterError('drive full')
      }
      throw new TryLaterError(`drive ${res.status}`)
    }
    return res
  }

  const folder = async (): Promise<string> => {
    const saved = localStorage.getItem(FOLDER_KEY)
    if (saved) return saved
    const q = encodeURIComponent(
      `name='${DRIVE_FOLDER}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    )
    const found = (await (
      await call(`${API}/files?q=${q}&fields=files(id)&spaces=drive`)
    ).json()) as { files: { id: string }[] }
    const id =
      found.files[0]?.id ??
      (
        (await (
          await call(`${API}/files?fields=id`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: DRIVE_FOLDER,
              mimeType: 'application/vnd.google-apps.folder',
            }),
          })
        ).json()) as { id: string }
      ).id
    localStorage.setItem(FOLDER_KEY, id)
    return id
  }

  return {
    async put(name, bytes) {
      const parent = await folder()
      const boundary = `ln${crypto.randomUUID()}`
      const meta = JSON.stringify({ name, parents: [parent] })
      const body = new Blob([
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n`,
        `--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`,
        bytes as BlobPart,
        `\r\n--${boundary}--`,
      ])
      const res = await call(`${UPLOAD}/files?uploadType=multipart&fields=id`, {
        method: 'POST',
        headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
        body,
      })
      return ((await res.json()) as { id: string }).id
    },
    async get(id) {
      const res = await call(`${API}/files/${encodeURIComponent(id)}?alt=media`)
      return new Uint8Array(await res.arrayBuffer())
    },
    async list(prefix) {
      const parent = await folder()
      const q = encodeURIComponent(
        `'${parent}' in parents and name contains '${prefix.replace(/'/g, '')}' and trashed=false`,
      )
      const res = await call(
        `${API}/files?q=${q}&orderBy=createdTime desc&fields=files(id,name)&pageSize=100`,
      )
      const out = (await res.json()) as {
        files: { id: string; name: string }[]
      }
      return out.files.filter((f) => f.name.startsWith(prefix))
    },
    async remove(id) {
      await call(`${API}/files/${encodeURIComponent(id)}`, { method: 'DELETE' })
    },
  }
}
