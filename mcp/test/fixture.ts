import {
  createMasterKey,
  remoteId,
  sealRecord,
  type MasterKey,
} from '../../src/sync/crypto'
import { toWire } from '../../src/sync/wire'
import {
  RevokedError,
  SourceError,
  type DeviceStatus,
  type PushItem,
  type PushResult,
  type RecordSource,
  type RemoteRow,
} from '../src/source'

/**
 * Fake server data, sealed with the app's real encryption, so the tests
 * exercise the true decrypt path. No network.
 */
export class FixtureSource implements RecordSource {
  rows: RemoteRow[] = []
  private seq = 0
  private revs = new Map<string, number>()
  pulls = 0
  /** What the server says about this connection (Revoke in the app flips it). */
  state: DeviceStatus = 'ok'
  registered: { id: string; name: string }[] = []
  audits: {
    tool: string
    ids: string[]
    counts: Record<string, number>
  }[] = []
  /** Every item ever pushed (what reached the server). */
  pushed: PushItem[] = []
  /** Tests: the server is down for the next audit call. */
  failAudit = false
  /** Tests: runs just before a save is applied (another device saving in between). */
  beforePush: (() => Promise<void>) | null = null

  master: MasterKey
  constructor(master: MasterKey) {
    this.master = master
  }

  /** Adds or updates a record (like another device saving it). */
  async put(
    table: string,
    record: { id: string } & Record<string, unknown>,
    key: MasterKey = this.master,
  ) {
    const sid = remoteId(table, record.id)
    const rev = (this.revs.get(sid) ?? 0) + 1
    this.revs.set(sid, rev)
    const env = {
      f: 1,
      h: '000000000000001-000000-dev',
      d: 'dev',
      r: toWire(record),
    }
    const sealed = await sealRecord(key, table, record.id, rev, env)
    this.rows = this.rows.filter((r) => r.id !== sid)
    this.rows.push({
      id: sid,
      rev,
      keyId: sealed.keyId,
      data: sealed.data,
      seq: ++this.seq,
    })
  }

  async pull(since: number, limit: number) {
    this.pulls++
    // The database's row rules show a revoked connection no rows at all.
    if (this.state === 'revoked') return []
    return this.rows
      .filter((r) => r.seq > since)
      .sort((a, b) => a.seq - b.seq)
      .slice(0, limit)
  }

  async keyBundles() {
    return []
  }

  async status() {
    return this.state
  }

  async register(deviceId: string, name: string) {
    if (this.state === 'revoked') throw new RevokedError()
    this.registered.push({ id: deviceId, name })
    this.state = 'ok'
  }

  async push(items: PushItem[]): Promise<PushResult> {
    if (this.state === 'revoked') throw new RevokedError()
    await this.beforePush?.()
    if ((this.state as DeviceStatus) === 'revoked') throw new RevokedError()
    const accepted: PushResult['accepted'] = []
    const conflicts: string[] = []
    for (const it of items) {
      const have = this.rows.find((r) => r.id === it.id)
      const ok = it.baseRev === 0 ? !have : have?.rev === it.baseRev
      if (!ok) {
        conflicts.push(it.id)
        continue
      }
      const rev = it.baseRev + 1
      this.revs.set(it.id, rev)
      this.rows = this.rows.filter((r) => r.id !== it.id)
      const row = {
        id: it.id,
        rev,
        keyId: it.keyId,
        data: it.data,
        seq: ++this.seq,
      }
      this.rows.push(row)
      this.pushed.push(it)
      accepted.push({ id: it.id, rev, seq: row.seq })
    }
    return { accepted, conflicts }
  }

  async audit(tool: string, ids: string[], counts: Record<string, number>) {
    if (this.failAudit) throw new SourceError('offline')
    this.audits.push({ tool, ids, counts })
  }
}

export const t = (text: string, styles: Record<string, unknown> = {}) => ({
  type: 'text',
  text,
  styles,
})

const base = { createdAt: 1, updatedAt: 1000, deletedAt: null }

export async function seedNotes(src: FixtureSource, now = 1_000_000) {
  await src.put('notebooks', {
    ...base,
    id: 'nb1',
    title: 'Biology',
    order: 'a0',
    allowAi: true,
    workspaceId: 'ws1',
  })
  await src.put('notebooks', {
    ...base,
    id: 'nb2',
    title: 'Private diary',
    order: 'a1',
  })
  await src.put('notebooks', {
    ...base,
    id: 'nb3',
    title: 'Locked but shared',
    order: 'a2',
    allowAi: true,
    locked: true,
  })
  await src.put('pages', {
    ...base,
    id: 'p1',
    notebookId: 'nb1',
    parentId: null,
    title: 'Cells',
    order: 'a0',
  })
  await src.put('pages', {
    ...base,
    id: 'p2',
    notebookId: 'nb1',
    parentId: 'p1',
    title: 'Mitochondria',
    order: 'a0',
  })
  await src.put('pages', {
    ...base,
    id: 'p3',
    notebookId: 'nb1',
    parentId: null,
    title: 'Secret page',
    order: 'a1',
    locked: true,
  })
  await src.put('pages', {
    ...base,
    id: 'p4',
    notebookId: 'nb1',
    parentId: null,
    title: 'Deleted page',
    order: 'a2',
    deletedAt: 5,
  })
  await src.put('pages', {
    ...base,
    id: 'p5',
    notebookId: 'nb2',
    parentId: null,
    title: 'Dear diary',
    order: 'a0',
  })
  await src.put('pages', {
    ...base,
    id: 'p6',
    notebookId: 'nb3',
    parentId: null,
    title: 'Behind the lock',
    order: 'a0',
  })
  await src.put('pages', {
    ...base,
    id: 'p7',
    notebookId: 'nb1',
    parentId: null,
    title: 'Paused',
    order: 'a3',
    paused: true,
  })
  const b = (
    id: string,
    pageId: string,
    type: string,
    order: string,
    content: Record<string, unknown>,
    parentId: string | null = null,
  ) =>
    src.put('blocks', { ...base, id, pageId, parentId, type, order, content })
  await b('b1', 'p1', 'heading', 'a0', { level: 1, text: [t('The cell')] })
  await b('b2', 'p1', 'paragraph', 'a1', {
    text: [
      t('The cell is the '),
      t('basic unit', { bold: true }),
      t(' of life, see '),
      { type: 'link', href: 'https://example.org', content: [t('here')] },
    ],
  })
  await b('b3', 'p1', 'bulletListItem', 'a2', { text: [t('Nucleus')] })
  await b('b4', 'p1', 'bulletListItem', 'a3', { text: [t('Membrane')] }, 'b3')
  await b('b5', 'p1', 'checkListItem', 'a4', {
    text: [t('Revise')],
    checked: true,
  })
  await b('b6', 'p1', 'numberedListItem', 'a5', { text: [t('one')] })
  await b('b7', 'p1', 'numberedListItem', 'a6', { text: [t('two')] })
  await b('b8', 'p1', 'card', 'a7', { text: [t('What makes ATP?')] })
  await b('b9', 'p1', 'paragraph', 'a0', { text: [t('Mitochondria')] }, 'b8')
  await b('b10', 'p2', 'paragraph', 'a0', {
    text: [t('Powerhouse of the '), t('cell', { blank: 'x1' })],
  })
  await b('b11', 'p3', 'paragraph', 'a0', { text: [t('hidden words')] })
  await b('b12', 'p1', 'paragraph', 'a9', { text: [t('removed text')] })
  await src.put('blocks', {
    ...base,
    id: 'b13',
    pageId: 'p1',
    parentId: null,
    type: 'paragraph',
    order: 'a10',
    content: { text: [t('gone')] },
    deletedAt: 9,
  })
  await b('b14', 'p5', 'paragraph', 'a0', {
    text: [t('my secret diary entry')],
  })
  await b('b15', 'p6', 'paragraph', 'a0', { text: [t('locked text')] })
  await b('b16', 'p1', 'codeBlock', 'a11', {
    language: 'js',
    text: [t('let a = 1')],
  })
  await b('b17', 'p1', 'table', 'a12', {
    text: {
      type: 'tableContent',
      rows: [
        { cells: [[t('H1')], [t('H2')]] },
        { cells: [[t('a')], [t('b')]] },
      ],
    },
  })
  const card = (
    id: string,
    blockId: string,
    part: string,
    pageId: string,
    notebookId: string,
    due: number,
    extra: Record<string, unknown> = {},
  ) =>
    src.put('cards', {
      ...base,
      id,
      blockId,
      part,
      pageId,
      notebookId,
      due,
      intervalDays: 0,
      step: 0,
      reps: 0,
      lapses: 0,
      suspendedAt: null,
      ...extra,
    })
  await card('c1', 'b8', 'main', 'p1', 'nb1', now - 1000)
  await card('c2', 'b10', 'x1', 'p2', 'nb1', now + 86_400_000)
  await card('c3', 'b8', 'other', 'p1', 'nb1', now - 5000, { suspendedAt: 1 })
  await card('c4', 'b14', 'main', 'p5', 'nb2', now - 1)
  await card('c5', 'b11', 'main', 'p3', 'nb1', now - 1)
  await card('c6', 'b10', 'x1', 'p7', 'nb1', now - 1)
}

export async function newFixture() {
  const master = await createMasterKey()
  const source = new FixtureSource(master)
  return { master, source }
}
