/**
 * Sync connectors (L3): the only place that knows a vendor. The rest of the
 * app talks to these three small interfaces, so Supabase or Drive can be
 * swapped by writing a new connector. A lint rule keeps vendor code (and
 * vendor addresses) inside `src/sync/connectors/`.
 *
 * Everything that crosses these interfaces is already encrypted, except the
 * account details of the sign-in.
 */

/** One encrypted record as the record store keeps it. */
export interface RemoteRecord {
  /** Record id (a UUID made on a device). */
  id: string
  /** Revision: 1 on first save, +1 on each accepted save. */
  rev: number
  /** Id of the master key that locked `data`. */
  keyId: string
  /** Encrypted content (base64), see `sync/crypto.ts`. */
  data: string
  /** Server order of the last change, rising; used as the pull cursor. */
  seq: number
}

/** A save to push: accepted only if the server still has `baseRev`. */
export interface PushItem {
  id: string
  /** The revision this device last saw (0 = new). */
  baseRev: number
  keyId: string
  data: string
}

export interface PushResult {
  /** Ids the server accepted, with their new revision and seq. */
  accepted: { id: string; rev: number; seq: number }[]
  /** Ids refused because someone else saved first (pull, merge, retry). */
  conflicts: string[]
}

/** Record store with compare-and-swap (Supabase). */
export interface RecordStore {
  /** Changes after `sinceSeq`, oldest first, at most `limit`. */
  pull(sinceSeq: number, limit: number): Promise<RemoteRecord[]>
  push(items: PushItem[]): Promise<PushResult>
  /** The server's copies of these ids (after a refused save). */
  get(ids: string[]): Promise<RemoteRecord[]>
  /** Locked copies of the master key (see `KeyBundle`), as JSON text. */
  listKeyBundles(): Promise<string[]>
  putKeyBundle(id: string, json: string): Promise<void>
  /** Removes one locked copy by id (the server allows recovery-code copies only). */
  deleteKeyBundle(id: string): Promise<void>
  /** Server time in ms (clock-skew check, L8). */
  serverTime(): Promise<number>
}

/** Write-once file store (Drive): each name is written once, read by id. */
export interface FileStore {
  /** Saves new bytes; returns the store's own file id. */
  put(name: string, bytes: Uint8Array): Promise<string>
  get(fileId: string): Promise<Uint8Array>
  /** Files whose name starts with `prefix`, newest first. */
  list(prefix: string): Promise<{ id: string; name: string }[]>
  remove(fileId: string): Promise<void>
}

export interface Account {
  /** Our own account id (the record store's user id). */
  accountId: string
  email: string
  /** Google's never-reused subject id. */
  sub: string
  /** Google profile picture address (https), if Google sent one. */
  avatar?: string
}

/** Sign-in provider (Google through Supabase). */
export interface AuthProvider {
  /** The signed-in account, or null. Never touches local notes. */
  current(): Account | null
  /** Starts sign-in (may leave the page and come back). */
  signIn(): Promise<void>
  /** Finishes a sign-in after the redirect; returns true if it did. */
  finishSignIn(url: URL): Promise<boolean>
  /** Forgets the session on this device; local notes stay. */
  signOut(): Promise<void>
  /**
   * Signs out on EVERY device (the server ends all sessions and cancels
   * Drive's long-lived key). Returns false, changing nothing here, if the
   * server could not be reached. Local notes stay.
   */
  signOutEverywhere?(): Promise<boolean>
  /** A fresh access token for the record store (renews when needed). */
  accessToken(): Promise<string>
  /** A Drive pass; may need a tap (`interactive`) after its hour runs out. */
  driveToken(interactive: boolean): Promise<string | null>
  /** The pass was refused (401): forget it so the next call renews. */
  dropDriveToken?(): void
  /** Does the server hold Drive's long-lived key? ('ask' = will ask to reconnect). */
  driveLasting?(): 'kept' | 'ask'
  /** The last Drive-connection note (plain words, no secrets). */
  lastDriveNote?(): string
  /** Sign in again WITH Google's consent screen so the server gets the key. */
  setUpLasting?(): Promise<void>
  /** Loads Google's script early so a tap can open its window at once. */
  prepareDrive?(): void
}

/**
 * A "something changed" feed (R6-13): the server pings every open device
 * about a second after a save, so it pulls at once instead of waiting for
 * the next poll. Only a ping and the server order (`seq`) travel: no record.
 */
export interface ChangeFeed {
  /**
   * Opens the feed; `onPing(seq)` fires on each change, `onOpen` when the
   * connection opens or closes (polling takes over while it is closed).
   * Returns the stop function. Reconnects by itself while open.
   */
  subscribe(
    onPing: (seq: number) => void,
    onOpen: (open: boolean) => void,
  ): () => void
}

export interface Connectors {
  auth: AuthProvider
  records: RecordStore
  files: FileStore
  /** Missing = polling only. */
  changes?: ChangeFeed
}

/** The sign-in was refused (e.g. not the allowed Gmail account). */
export class NotAllowedError extends Error {}
/** The store said "try later" (offline, paused project, rate limit). */
export class TryLaterError extends Error {}
/** The Drive pass has run out; a tap is needed to renew it. */
export class NeedsTapError extends Error {}
