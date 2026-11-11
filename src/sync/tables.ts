/**
 * Which tables sync, and how (L6, L7). Every table of the database must be
 * listed here: a unit test fails when a new table is added without a line,
 * so no table is forgotten. See docs/features/sync.md.
 *
 * - `record`: the whole record; the newer edit wins (hybrid clock).
 * - `blocks`: like `record`, and when both devices changed the same block
 *   the losing text is kept in the page's History.
 * - `append`: rows are only ever added (review logs): every device keeps all.
 * - `file`: like `record`, but the bytes (`data`) go to Drive, encrypted;
 *   the record carries only a pointer.
 * - `local`: never synced (rebuildable lists, device-only data).
 */
export type MergeMode = 'record' | 'blocks' | 'append' | 'file' | 'local'

export const SYNC_TABLES: Record<string, MergeMode> = {
  workspaces: 'record',
  notebooks: 'record',
  pages: 'record',
  blocks: 'blocks',
  cards: 'record',
  reviewLogs: 'append',
  tags: 'record',
  savedSearches: 'record',
  databases: 'record',
  dbColumns: 'record',
  dbViews: 'record',
  rowRefs: 'record',
  decks: 'record',
  layerInstalls: 'record',
  summaryItems: 'record',
  inkLayers: 'record',
  inkChunks: 'record',
  annotations: 'record',
  pageVersions: 'record',
  // Changes Claude proposed that wait for the person (Settings > Claude > Inbox).
  claudeInbox: 'record',
  images: 'file',
  fonts: 'file',
  recordings: 'file',
  bookFiles: 'file',
  tasks: 'record',
  projects: 'record',
  timeEntries: 'record',
  dayPlans: 'record',
  habits: 'record',
  habitChecks: 'record',
  files: 'file',
  secrets: 'record',
  // One record per setting (settings that follow you). Per-device overrides
  // and group switches are in the browser, not in this table.
  settings: 'record',
  // Device-only.
  meta: 'local',
  searchEntries: 'local',
  links: 'local',
  blockTags: 'local',
  syncState: 'local',
}

export const isSynced = (table: string): boolean =>
  (SYNC_TABLES[table] ?? 'local') !== 'local'

/** Format of the synced envelope; bump when its shape changes. */
export const SYNC_FORMAT_VERSION = 1
