import type { AiToolDef } from './types'
import { cardsMakeCloze } from './tools/cardsMakeCloze'
import { cardsMakeRecall } from './tools/cardsMakeRecall'
import { databasesCreate } from './tools/databasesCreate'
import { notebooksCreate } from './tools/notebooksCreate'
import { pagesRefine } from './tools/pagesRefine'
import { pagesWriteNotes } from './tools/pagesWriteNotes'
import { stylesApply } from './tools/stylesApply'

/**
 * Every AI tool, in catalog order. Slice 0 holds the six existing connector
 * write tools (add_cards is two tools). Nothing reads this yet.
 */
export const AI_TOOLS: readonly AiToolDef[] = [
  notebooksCreate,
  pagesWriteNotes,
  cardsMakeRecall,
  cardsMakeCloze,
  databasesCreate,
  stylesApply,
  pagesRefine,
]

export const AI_TOOLS_BY_ID: ReadonlyMap<string, AiToolDef> = new Map(
  AI_TOOLS.map((tool) => [tool.id, tool]),
)
