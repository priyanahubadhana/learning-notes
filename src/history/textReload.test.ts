/**
 * @vitest-environment jsdom
 */
import { history } from 'prosemirror-history'
import { Schema } from 'prosemirror-model'
import { EditorState } from 'prosemirror-state'
import { EditorView } from 'prosemirror-view'
import { beforeEach, describe, expect, it } from 'vitest'
import * as dbModule from '../core/db'
import { newRecordFields } from '../core/records'
import { pushStep, registerKind } from '../core/historySteps'
import {
  attachEditor,
  journalOf,
  persistNow,
  ready,
  redo,
  reloadSavedForTest,
  release,
  setActive,
  undo,
} from './pageHistory'

// Batch 1 item 47: text and ink Undo survive a reload.

const schema = new Schema({
  nodes: {
    doc: { content: 'paragraph+' },
    paragraph: { content: 'text*', toDOM: () => ['p', 0] },
    text: {},
  },
})

/** A small editor with the pieces the journal needs. */
function makeEditor(text: string) {
  const callbacks: Array<() => void> = []
  const doc = schema.node(
    'doc',
    null,
    schema.node('paragraph', null, text ? [schema.text(text)] : []),
  )
  const view: EditorView = new EditorView(document.createElement('div'), {
    state: EditorState.create({ doc, plugins: [history()] }),
    dispatchTransaction(tr) {
      view.updateState(view.state.apply(tr))
      if (tr.docChanged) for (const cb of callbacks) cb()
    },
  })
  const editor = {
    prosemirrorView: view,
    onChange: (cb: () => void) => {
      callbacks.push(cb)
      return () => undefined
    },
  }
  const type = (s: string) =>
    view.dispatch(view.state.tr.insertText(s, view.state.doc.content.size - 1))
  const words = () => view.state.doc.textContent
  return { editor, type, words }
}

const tick = (ms = 20) => new Promise((r) => setTimeout(r, ms))

beforeEach(async () => {
  await dbModule.db.delete()
  await dbModule.db.open()
  await dbModule.db.pages.add({
    ...newRecordFields(),
    id: 'p1',
    notebookId: 'n',
    parentId: null,
    title: 'T',
    order: 'a',
    boxes: [],
  } as never)
  setActive('page:p1')
  await ready('page:p1')
  const j = journalOf('page:p1')
  j.done.length = 0
  j.undone.length = 0
})

describe('text Undo after a reload', () => {
  it('a typed line is undone and redone from the saved copy', async () => {
    const first = makeEditor('')
    const off = attachEditor(first.editor as never, 'box1')
    first.type('hello')
    // Another kind of step closes the typing group, as in a real session.
    pushStep({ kind: 'x', label: 'x', undo: () => true, redo: () => true })
    await persistNow('page:p1')
    off()

    // "Reload": a new editor holding the saved text, an empty session list.
    const second = makeEditor('hello')
    attachEditor(second.editor as never, 'box1')
    await reloadSavedForTest('page:p1')
    const kinds = journalOf('page:p1').done.map((s) => s.kind)
    expect(kinds).toContain('pm')

    // The 'x' step had no saved data, so the text step is the newest saved one.
    expect(await undo()).toBe(true)
    expect(second.words()).toBe('')
    expect(await redo()).toBe(true)
    expect(second.words()).toBe('hello')
  })

  it('the open typing group is saved with its latest text', async () => {
    const e = makeEditor('')
    attachEditor(e.editor as never, 'box1')
    e.type('abc')
    e.type('def')
    await persistNow('page:p1')
    const row = await dbModule.db.meta.get('hist:page:p1')
    expect(JSON.stringify(row?.value)).toContain('abcdef')
  })

  it('a step with saved data survives the editor going away', () => {
    registerKind('demo', { undo: () => true, redo: () => true })
    const owner = {}
    pushStep({
      kind: 'demo',
      label: 'd',
      undo: () => true,
      redo: () => true,
      owner,
      data: { n: 1 },
    })
    pushStep({ kind: 'plain', label: 'p', undo: () => true, owner })
    return tick().then(() => {
      release(owner)
      const done = journalOf('page:p1').done
      expect(done.map((s) => s.kind)).toEqual(['demo'])
      expect(done[0].undo).toBeUndefined()
    })
  })
})
