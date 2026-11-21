import { describe, expect, it } from 'vitest'
import { AI_TOOLS_BY_ID } from '../aitools/registry'
import { StepError } from '../aitools/jobs/filler'
import { makeKit } from '../aitools/jobs/testKit'
import { plan } from '../aitools/jobs/testKit'
import {
  PasteFiller,
  buildPrompt,
  checkAnswer,
  parseAnswerText,
} from './pasteFiller'

const notes = AI_TOOLS_BY_ID.get('pages.write_notes')!
const PAGE = {
  title: 'Habits',
  blocks: [{ type: 'paragraph', text: 'A **habit** is a loop.' }],
}
const good = JSON.stringify({ page: PAGE })
const args = { notebookId: 'nb1', brief: 'Habits' }

describe('parseAnswerText', () => {
  it('reads plain JSON and a json code fence', () => {
    expect(parseAnswerText('{"a":1}')).toEqual({ ok: true, value: { a: 1 } })
    expect(parseAnswerText('```json\n{"a":1}\n```')).toEqual({
      ok: true,
      value: { a: 1 },
    })
  })
  it('refuses empty text, broken JSON and non-objects', () => {
    expect(parseAnswerText('  ')).toEqual({ ok: false, problem: 'empty' })
    expect(parseAnswerText('{oops')).toEqual({ ok: false, problem: 'json' })
    expect(parseAnswerText('[1]')).toEqual({ ok: false, problem: 'object' })
  })
})

describe('checkAnswer', () => {
  it('accepts content that fits the tool', () => {
    expect(checkAnswer(notes, args, good).ok).toBe(true)
  })
  it('refuses a missing content key and a wrong block type', () => {
    const none = checkAnswer(notes, args, '{"other":1}')
    expect(none).toEqual({ ok: false, problems: [':missing page'] })
    const bad = checkAnswer(
      notes,
      args,
      JSON.stringify({ page: { title: 'T', blocks: [{ type: 'nope' }] } }),
    )
    expect(bad.ok).toBe(false)
    if (!bad.ok) expect(bad.problems.join()).toContain('/page/blocks/0/type')
  })
  it('refuses a link that is not https', () => {
    const r = checkAnswer(
      notes,
      args,
      JSON.stringify({
        page: {
          title: 'T',
          blocks: [{ type: 'embed', url: 'javascript:alert(1)' }],
        },
      }),
    )
    expect(r.ok).toBe(false)
  })
})

describe('buildPrompt', () => {
  it('names the key, the brief and the shape, and lists repairs', () => {
    const p = buildPrompt(notes, args, 'page', ['/page: bad'])
    expect(p).toContain('{"page": ...}')
    expect(p).toContain('What to make: Habits')
    expect(p).toContain('/page: bad')
  })
})

describe('PasteFiller', () => {
  const req = (ctl = new AbortController()) => ({
    ctl,
    r: { stepId: 's2', tool: notes, args },
  })

  it('waits, refuses a bad answer, then resolves a good one', async () => {
    const f = new PasteFiller()
    const { ctl, r } = req()
    const got = f.fill(r, ctl.signal)
    expect(f.current()?.stepId).toBe('s2')
    expect(f.current()?.field).toBe('page')
    expect(f.submit('nonsense').ok).toBe(false)
    expect(f.current()).not.toBeNull()
    expect(f.submit(good)).toEqual({ ok: true })
    expect(await got).toEqual({ page: PAGE })
    expect(f.current()).toBeNull()
  })

  it('rejects when stopped, and when declined', async () => {
    const f = new PasteFiller()
    const a = req()
    const p1 = f.fill(a.r, a.ctl.signal)
    a.ctl.abort()
    await expect(p1).rejects.toThrow('aborted')
    expect(f.current()).toBeNull()
    const b = req()
    const p2 = f.fill(b.r, b.ctl.signal)
    f.decline(new StepError('validation', 'no'))
    await expect(p2).rejects.toThrow('no')
  })

  it('tells subscribers when a request appears and goes', async () => {
    const f = new PasteFiller()
    let n = 0
    f.subscribe(() => n++)
    const { ctl, r } = req()
    const got = f.fill(r, ctl.signal)
    f.submit(good)
    await got
    expect(n).toBe(2)
  })

  it('drives a real job to preview, and a bad paste is never staged', async () => {
    const f = new PasteFiller()
    const kit = makeKit({}, { filler: f, fillTimeoutMs: 60_000 })
    await kit.runner.create(plan('p1'))
    const running = kit.runner.run('p1')
    await new Promise((r) => setTimeout(r, 20))
    expect(f.current()?.tool.id).toBe('pages.write_notes')
    expect(f.submit('{"page":{"title":""}}').ok).toBe(false)
    expect(f.submit(good).ok).toBe(true)
    await new Promise((r) => setTimeout(r, 20))
    expect(f.current()?.tool.id).toBe('cards.make_recall')
    expect(
      f.submit(JSON.stringify({ cards: [{ kind: 'qa', q: 'Q?', a: 'A.' }] }))
        .ok,
    ).toBe(true)
    const job = await running
    expect(job.state).toBe('preview')
    expect(kit.port.count('pages')).toBe(0)
  })
})
