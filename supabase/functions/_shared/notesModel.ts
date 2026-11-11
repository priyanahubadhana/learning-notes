// Copy of the record shapes in mcp/src/model.ts (see markdown.ts for why), plus what writes need.
/** The few fields of the app records the connector reads (see src/core/types.ts). */
export type Json =
  string | number | boolean | null | Json[] | { [k: string]: Json }

interface Base {
  id: string
  createdAt?: number
  updatedAt?: number
  deletedAt?: number | null
  purgedAt?: number
}

export interface Notebook extends Base {
  title: string
  order: string
  kind?: string
  editLocked?: true
  locked?: true
  allowAi?: true
  allowAiLocked?: true
}

export interface Page extends Base {
  notebookId: string
  parentId: string | null
  title: string
  order: string
  locked?: true
  paused?: true
  /** Set when this page is a row of a database (not listed in the notes tree). */
  databaseId?: string
  editLocked?: true
  boxes?: unknown[]
  inkBg?: string
  sheet?: string
}

export interface Block extends Base {
  pageId: string
  parentId: string | null
  type: string
  content: { [k: string]: Json }
  order: string
  boxId?: string
}

export interface Card extends Base {
  blockId: string
  part: string
  pageId: string
  notebookId: string
  due: number
  intervalDays: number
  reps: number
  lapses: number
  suspendedAt: number | null
  lastReviewAt?: number
}

export const READ_TABLES = ['notebooks', 'pages', 'blocks', 'cards'] as const
export type ReadTable = (typeof READ_TABLES)[number]

export interface Workspace extends Base {
  name: string
}

export const LOAD_TABLES = [
  'workspaces',
  'notebooks',
  'pages',
  'blocks',
  'cards',
  'databases',
] as const
export type LoadTable = (typeof LOAD_TABLES)[number]

export interface Database extends Base {
  title: string
  order: string
  notebookId: string | null
}
