import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { LearningNotesDB } from '../core/db'
import { createBlock } from '../core/blockService'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { createDatabase } from '../databases/databaseService'
import { createNotebook } from '../notebooks/notebookService'
import { createPage } from '../pages/pageService'
import { ensureTemplates } from '../templates/templateService'
import {
  bundleFile,
  exportWorkspaceBundle,
  readBundle,
  workspaceFileName,
} from './bundle'
import { importBundle } from './importBundle'
import { fileToSave, readImportFile } from './fileIO'

let db: LearningNotesDB
let ws: string

beforeEach(async () => {
  db = createTestDb()
  ws = (await getOrCreateDefaultWorkspace(db)).id
})
afterEach(async () => {
  await db.delete()
})

describe('whole-workspace file', () => {
  it('carries every notebook, the templates and loose databases, and imports into a clean app', async () => {
    await ensureTemplates(db, ws)
    for (const name of ['One', 'Two']) {
      const nb = await createNotebook(db, ws, name)
      const page = await createPage(db, nb.id, null)
      await createBlock(db, {
        pageId: page.id,
        type: 'paragraph',
        content: { text: [{ type: 'text', text: `in ${name}`, styles: {} }] },
      })
    }
    await createDatabase(db, ws, null, 'Loose list')

    const bundle = await exportWorkspaceBundle(db, 1_700_000_000_000)
    expect(bundle.kind).toBe('backup')
    expect(bundle.notebooks.map((n) => n.title)).toEqual(
      expect.arrayContaining(['One', 'Two']),
    )
    expect(bundle.databases.map((d) => d.title)).toContain('Loose list')

    // Through a locked file and back.
    const locked = await fileToSave(bundleFile(bundle), 'a-good-password')
    const back = await readImportFile(locked, 'a-good-password')
    const fresh = createTestDb()
    try {
      const ws2 = (await getOrCreateDefaultWorkspace(fresh)).id
      await importBundle(fresh, ws2, back)
      const titles = (await fresh.notebooks.toArray()).map((n) => n.title)
      expect(titles).toEqual(
        expect.arrayContaining(['One (imported)', 'Two (imported)']),
      )
      expect((await fresh.databases.toArray()).map((d) => d.title)).toContain(
        'Loose list',
      )
      expect(await fresh.blocks.count()).toBeGreaterThanOrEqual(2)
    } finally {
      await fresh.delete()
    }
    // The plain file is readable by the normal reader too.
    expect(readBundle(await bundleFile(bundle).text()).kind).toBe('backup')
  })

  it('names the file by date', () => {
    expect(workspaceFileName(Date.UTC(2026, 9, 28, 12))).toBe(
      'Learning Notes 2026-10-28.learningnotes.json',
    )
  })
})
