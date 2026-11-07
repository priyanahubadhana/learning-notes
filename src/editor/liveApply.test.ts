/**
 * @vitest-environment jsdom
 */
import { BlockNoteEditor } from '@blocknote/core'
import { TextSelection } from 'prosemirror-state'
import { beforeEach, describe, expect, it } from 'vitest'
import { createBlock, listBlocks, updateBlock } from '../core/blockService'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import { getOrCreateDefaultWorkspace } from '../core/workspaceService'
import { listVersions } from '../history/versionService'
import { createNotebook } from '../notebooks/notebookService'
import { createPage } from '../pages/pageService'
import { applyRemoteBlocks } from './liveApply'
import { editorToDrafts, recordsToEditor } from './mapping'
import { createPageSync } from './pageSync'
import { editorBlockTypes, schema, type AppSchema } from './schema'

type Editor = AppSchema['BlockNoteEditor']
const line = (s: string) => ({ text: [{ type: 'text', text: s, styles: {} }] })
const plain = (editor: Editor) =>
  editor.document.map((b) =>
    Array.isArray(b.content)
      ? b.content.map((c) => ('text' in c ? c.text : '')).join('')
      : '',
  )

let db: LearningNotesDB
let pageId: string
let ids: string[]

beforeEach(async () => {
  db = createTestDb()
  const ws = await getOrCreateDefaultWorkspace(db)
  const nb = await createNotebook(db, ws.id, 'Bio')
  const page = await createPage(db, nb.id, null, 'Cells')
  pageId = page.id
  ids = []
  for (const s of ['one', 'two', 'three']) {
    ids.push(
      (await createBlock(db, { pageId, type: 'paragraph', content: line(s) }))
        .id,
    )
  }
})

async function open() {
  const records = await listBlocks(db, pageId)
  const editor = BlockNoteEditor.create({
    schema,
    initialContent: recordsToEditor(records, editorBlockTypes),
  })
  editor.mount(document.createElement('div'))
  const sync = createPageSync(db, pageId, records, () =>
    editorToDrafts(editor.document),
  )
  return { editor, sync }
}

/** The caret as (block id, offset in its text). */
function caret(editor: Editor) {
  const id = editor.getTextCursorPosition().block.id
  const { from } = editor.prosemirrorState.selection
  let start = 0
  editor.prosemirrorState.doc.descendants((node, pos) => {
    if (node.type.name === 'blockContainer' && node.attrs.id === id) {
      start = pos + 2
      return false
    }
    return true
  })
  return { id, offset: from - start }
}

describe('live apply of synced blocks (R6-13)', () => {
  it('updates a changed block in place and keeps the caret where it was', async () => {
    const { editor, sync } = await open()
    editor.setTextCursorPosition(ids[2], 'end') // "three|"
    expect(caret(editor)).toEqual({ id: ids[2], offset: 5 })

    // The other device changed "one" (already merged into the database).
    await updateBlock(db, ids[0], { content: line('one, changed there') })
    const res = await applyRemoteBlocks(db, editor, pageId, sync, [ids[0]])
    expect(res.applied).toEqual([ids[0]])
    expect(plain(editor)).toEqual(['one, changed there', 'two', 'three'])
    expect(caret(editor)).toEqual({ id: ids[2], offset: 5 })

    // The snapshot took it as saved: a flush writes nothing new.
    await sync.flush()
    expect((await db.blocks.get(ids[0]))!.content).toEqual(
      line('one, changed there'),
    )
    expect(await db.syncState.count()).toBe(0) // tracking is off in tests
  })

  it('keeps the caret offset inside the block that changed', async () => {
    const { editor, sync } = await open()
    editor.setTextCursorPosition(ids[1], 'end') // "two|"
    await updateBlock(db, ids[1], { content: line('two plus more') })
    await applyRemoteBlocks(db, editor, pageId, sync, [ids[1]])
    expect(plain(editor)[1]).toBe('two plus more')
    expect(caret(editor)).toEqual({ id: ids[1], offset: 3 })
  })

  it('inserts a new block at its place and removes a deleted one', async () => {
    const { editor, sync } = await open()
    const made = await createBlock(db, {
      pageId,
      type: 'paragraph',
      content: line('one and a half'),
      index: 1,
    })
    await db.blocks.update(ids[2], { deletedAt: Date.now() })
    const res = await applyRemoteBlocks(db, editor, pageId, sync, [
      made.id,
      ids[2],
    ])
    expect(res.applied.sort()).toEqual([made.id, ids[2]].sort())
    expect(plain(editor)).toEqual(['one', 'one and a half', 'two'])
    await sync.flush()
    expect((await db.blocks.get(ids[2]))!.deletedAt).not.toBeNull()
  })

  it('never touches a block being typed in; their text goes to History', async () => {
    const { editor, sync } = await open()
    // Typing here, not saved yet.
    editor.updateBlock(ids[1], { content: 'two, typed here' })
    sync.changed()
    await updateBlock(db, ids[1], { content: line('two, changed there') })
    const res = await applyRemoteBlocks(db, editor, pageId, sync, [ids[1]])
    expect(res.kept).toEqual([ids[1]])
    expect(plain(editor)[1]).toBe('two, typed here')
    const versions = await listVersions(db, pageId)
    expect(versions).toHaveLength(1)
    expect(versions[0].blocks.find((b) => b.id === ids[1])!.content).toEqual(
      line('two, changed there'),
    )
    // The typing wins and is saved.
    await sync.flush()
    expect((await db.blocks.get(ids[1]))!.content.text).toEqual(
      line('two, typed here').text,
    )
  })

  it('ignores unknown blocks and ones already up to date (own saves echoed back)', async () => {
    const { editor, sync } = await open()
    // As another device's editor saves it: the props travel with the text.
    await updateBlock(db, ids[0], {
      content: {
        backgroundColor: 'default',
        textColor: 'default',
        textAlignment: 'left',
        ...line('one again'),
      },
    })
    const first = await applyRemoteBlocks(db, editor, pageId, sync, [ids[0]])
    expect(first.applied).toEqual([ids[0]])
    // The same record announced again (e.g. this device's save came back).
    const res = await applyRemoteBlocks(db, editor, pageId, sync, [
      ids[0],
      'not-a-block',
    ])
    expect(res.applied).toEqual([])
    expect(plain(editor)).toEqual(['one again', 'two', 'three'])
  })

  it('R7-4: a word selected here stays selected when another block arrives', async () => {
    const { editor, sync } = await open()
    // The word "two" is selected (a Pencil double tap).
    let from = -1
    editor.prosemirrorState.doc.descendants((node, pos) => {
      if (from < 0 && node.isText && node.text === 'two') from = pos
      return from < 0
    })
    expect(from).toBeGreaterThan(0)
    editor.transact((tr) =>
      tr.setSelection(TextSelection.create(tr.doc, from, from + 3)),
    )
    const selected = () => {
      const { doc, selection } = editor.prosemirrorState
      return doc.textBetween(selection.from, selection.to)
    }
    expect(selected()).toBe('two')
    // The block above changes on the other device, and a new one is inserted.
    await updateBlock(db, ids[0], { content: line('one, longer now') })
    const added = await createBlock(db, {
      pageId,
      type: 'paragraph',
      content: line('new from there'),
    })
    const res = await applyRemoteBlocks(db, editor, pageId, sync, [
      ids[0],
      added.id,
    ])
    expect(res.applied).toEqual(expect.arrayContaining([ids[0], added.id]))
    expect(plain(editor)).toContain('one, longer now')
    expect(selected()).toBe('two')
  })
})
