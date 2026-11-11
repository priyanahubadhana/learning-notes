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
}

export interface Block extends Base {
  pageId: string
  parentId: string | null
  type: string
  content: { [k: string]: Json }
  order: string
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
] as const
export type LoadTable = (typeof LOAD_TABLES)[number]
