import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { ToolError, type Tools } from './tools'

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const

/** Wraps a tool so errors come back as a plain message Claude can show. */
function wrap<A>(fn: (a: A) => Promise<unknown>) {
  return async (a: A) => {
    try {
      const out = await fn(a)
      return {
        content: [
          { type: 'text' as const, text: JSON.stringify(out, null, 2) },
        ],
      }
    } catch (e) {
      // Plain messages only: never a stack trace, never a secret.
      const text =
        e instanceof Error && (e instanceof ToolError || e.name !== 'TypeError')
          ? e.message
          : 'Something went wrong reading the notes.'
      return { isError: true, content: [{ type: 'text' as const, text }] }
    }
  }
}

export function buildServer(tools: Tools): McpServer {
  const server = new McpServer({ name: 'learning-notes', version: '0.1.0' })

  server.registerTool(
    'list_notebooks',
    {
      title: 'List notebooks',
      description:
        'List the notebooks Claude may read, with how many pages each has.',
      annotations: READ_ONLY,
    },
    wrap(() => tools.list_notebooks()),
  )

  server.registerTool(
    'list_pages',
    {
      title: 'List pages',
      description:
        'List the pages of one notebook (id, title, parent page). Use parentId to list the sub-pages of a page; pass null for top-level pages only.',
      inputSchema: {
        notebookId: z.string().describe('Notebook id from list_notebooks'),
        parentId: z.string().nullable().optional(),
      },
      annotations: READ_ONLY,
    },
    wrap((a: { notebookId: string; parentId?: string | null }) =>
      tools.list_pages(a),
    ),
  )

  server.registerTool(
    'search_notes',
    {
      title: 'Search notes',
      description:
        'Find pages whose title or text contains all the given words. Returns page ids and a short snippet.',
      inputSchema: {
        query: z.string().min(1).max(200),
        limit: z.number().int().min(1).max(50).optional(),
      },
      annotations: READ_ONLY,
    },
    wrap((a: { query: string; limit?: number }) => tools.search_notes(a)),
  )

  server.registerTool(
    'read_page',
    {
      title: 'Read a page',
      description:
        'Read one page as Markdown. Also returns its version (a value that changes whenever the page changes).',
      inputSchema: { pageId: z.string() },
      annotations: READ_ONLY,
    },
    wrap((a: { pageId: string }) => tools.read_page(a)),
  )

  server.registerTool(
    'list_cards',
    {
      title: 'List recall cards',
      description:
        'List recall cards (question, answer, when due) for a page or a notebook.',
      inputSchema: {
        pageId: z.string().optional(),
        notebookId: z.string().optional(),
        limit: z.number().int().min(1).max(200).optional(),
      },
      annotations: READ_ONLY,
    },
    wrap((a: { pageId?: string; notebookId?: string; limit?: number }) =>
      tools.list_cards(a),
    ),
  )

  server.registerTool(
    'due_cards',
    {
      title: 'Cards due for review',
      description:
        'List recall cards that are due for review now (oldest first). Read only: reviewing happens in the app.',
      inputSchema: {
        notebookId: z.string().optional(),
        limit: z.number().int().min(1).max(100).optional(),
      },
      annotations: READ_ONLY,
    },
    wrap((a: { notebookId?: string; limit?: number }) => tools.due_cards(a)),
  )

  return server
}
