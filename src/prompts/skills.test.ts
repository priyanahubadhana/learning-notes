/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { addKey } from '../ai/keyStore'
import { AI_KEYS, readAiConfig } from '../ai/route'
import { writePref } from '../app/uiPrefs'
import { SEEDS } from './seedPrompts'
import {
  applyFactCheck,
  cheapestFirst,
  factCheckCost,
  inputPrefix,
  runFactCheck,
  runSkill,
  secondModelConfig,
  skillConfig,
  skillCopyText,
  skillCost,
} from './skillRun'
import {
  SkillFormatError,
  answerFormat,
  levelOf,
  parseFactCheck,
  parseSkillAnswer,
  safeIcon,
  safeUrl,
} from './skillFormat'
import { newPrompt, SKILL_PARTS } from './promptModel'

const good = {
  format: 'ln-skill/1',
  title: 'Cells',
  summary: 'Cells make energy.',
  keywords: ['cell', 'energy'],
  sources: [
    { n: 1, title: 'The lecture', url: 'https://example.org/a' },
    { n: 2, title: 'Bad link', url: 'javascript:alert(1)' },
  ],
  points: [
    {
      text: 'Mitochondria make ATP',
      stars: 10,
      icon: '🔋',
      topic: 'Energy',
      sources: [1],
    },
    { text: 'Cells are small', stars: '5', sources: [] },
    { text: 'Fun fact', stars: 1, sources: [7] },
    { text: 'Big idea without icon', stars: 9, sources: [2] },
  ],
  pages: [{ title: 'Energy', body: 'ATP is made [1].' }],
  cards: [
    { kind: 'qa', q: 'What makes ATP?', a: 'Mitochondria', point: 0 },
    { kind: 'cloze', q: 'Cells make {{energy}}', a: '' },
    { kind: 'cloze', q: 'No blank here', a: '' },
    {
      kind: 'truefalse',
      q: 'Cells are huge',
      a: 'False, they are small',
      point: 99,
    },
  ],
}

describe('reading a skill answer strictly', () => {
  it('reads levels, icons, sources and cards', () => {
    const r = parseSkillAnswer(JSON.stringify(good))
    expect(r.points.map((p) => p.level)).toEqual([
      'must',
      'good',
      'extra',
      'must',
    ])
    expect(r.points[0].icon).toBe('🔋')
    // A Must-know point always has an icon.
    expect(r.points[3].icon).not.toBe('')
    // Unknown source numbers are dropped; unsourced points are unchecked.
    expect(r.points[2].sources).toEqual([])
    expect(r.points.map((p) => p.checked)).toEqual([true, false, false, true])
    // A javascript: link is dropped, the source stays.
    expect(r.sources[1].url).toBe('')
    expect(r.sources[0].url).toBe('https://example.org/a')
    // A cloze with no blank, and a card with no answer, are dropped.
    expect(r.cards.map((c) => c.kind)).toEqual(['qa', 'cloze', 'truefalse'])
    expect(r.cards[2].point).toBeNull()
    expect(r.cards[0].point).toBe(0)
  })

  it('takes a fenced answer and a sentence before the object', () => {
    const body = JSON.stringify(good)
    expect(parseSkillAnswer('```json\n' + body + '\n```').title).toBe('Cells')
    expect(parseSkillAnswer('Here you go: ' + body + ' Enjoy!').title).toBe(
      'Cells',
    )
  })

  it('refuses empty, huge, not-JSON and contentless answers', () => {
    const problem = (s: string) => {
      try {
        parseSkillAnswer(s)
      } catch (e) {
        return (e as SkillFormatError).problem
      }
      return 'none'
    }
    expect(problem('   ')).toBe('empty')
    expect(problem('x'.repeat(400_001))).toBe('tooLong')
    expect(problem('not json at all')).toBe('notJson')
    expect(problem('[1,2,3]')).toBe('notJson')
    expect(problem('{"title":"x"}')).toBe('noContent')
  })

  it('clamps numbers, cuts lengths and ignores HTML-like icons and unknown fields', () => {
    const r = parseSkillAnswer(
      JSON.stringify({
        __proto__: { admin: true },
        extra: '<script>',
        points: [
          { text: 'a'.repeat(5000), stars: 99, icon: '<b>x</b>' },
          { text: 'b', stars: -3 },
          { text: 'c', stars: 'abc' },
        ],
      }),
    )
    expect(r.points[0].text).toHaveLength(1000)
    expect(r.points.map((p) => p.stars)).toEqual([10, 1, 5])
    expect(r.points[0].icon).toBe('⭐')
    expect(Object.keys(r)).not.toContain('extra')
    expect(({} as Record<string, unknown>).admin).toBeUndefined()
  })

  it('has helpers for levels, urls and icons', () => {
    expect([1, 3, 4, 7, 8, 10].map(levelOf)).toEqual([
      'extra',
      'extra',
      'good',
      'good',
      'must',
      'must',
    ])
    expect(safeUrl('ftp://x.org')).toBe('')
    expect(safeUrl('https://x.org/a b')).toContain('https://x.org/')
    expect(safeIcon('A')).toBe('')
    expect(safeIcon('🧬')).toBe('🧬')
  })

  it('describes only the parts a skill makes', () => {
    expect(answerFormat(['summary'])).toContain('"summary"')
    expect(answerFormat(['summary'])).not.toContain('"cards"')
    expect(answerFormat([...SKILL_PARTS])).toContain('"cards"')
  })
})

describe('fact check', () => {
  it('marks doubted points unchecked and ignores bad rows', () => {
    const r = parseSkillAnswer(JSON.stringify(good))
    const checks = parseFactCheck(
      '{"checks":[{"i":0,"verdict":"ok","note":"fine"},{"i":3,"verdict":"wrong","note":"no"},{"i":50,"verdict":"wrong"},{"i":"x"}]}',
      r.points.length,
    )
    expect(checks).toHaveLength(2)
    const next = applyFactCheck(r, checks)
    expect(next.points[3].flag).toBe('wrong')
    expect(next.points[3].checked).toBe(false)
    expect(next.points[0].checked).toBe(true)
  })
})

beforeEach(() => {
  localStorage.clear()
  writePref(AI_KEYS.enabled, true)
})

const skill = {
  ...newPrompt('skill'),
  name: 'S',
  text: 'Be brief.',
}

/** A fetch that records each request body and answers with `answers[i]`. */
function recorder(answers: string[]) {
  const bodies: { body: Record<string, unknown>; model: string }[] = []
  const fetchImpl = (async (_u: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body)) as Record<string, unknown>
    bodies.push({ body, model: String(body.model) })
    const text = answers[Math.min(bodies.length - 1, answers.length - 1)]
    return new Response(
      JSON.stringify({
        content: [{ type: 'text', text }],
        usage: {
          input_tokens: 20,
          output_tokens: 10,
          cache_read_input_tokens: 500,
        },
      }),
      { status: 200 },
    )
  }) as typeof fetch
  return { bodies, fetchImpl }
}

describe('running a skill', () => {
  it('sends the input first as a cached block, in ONE call, and counts cached tokens', async () => {
    addKey('anthropic', 'Claude', 'sk-ant-test-1234567890')
    const { bodies, fetchImpl } = recorder([JSON.stringify(good)])
    const r = await runSkill(readAiConfig(), skill, 'LONG TRANSCRIPT', {
      fetchImpl,
    })
    expect(r.points).toHaveLength(4)
    expect(bodies).toHaveLength(1)
    const content = (bodies[0].body.messages as { content: unknown }[])[0]
      .content as { text: string; cache_control?: unknown }[]
    expect(content[0].text).toBe(inputPrefix('LONG TRANSCRIPT'))
    expect(content[0].cache_control).toEqual({ type: 'ephemeral' })
    expect(content[1].text).toContain('ln-skill/1')
    expect(content[1].cache_control).toBeUndefined()
    expect(skillCopyText(skill, 'X')).toContain('ln-skill/1')
  })

  it('other companies get the same words in one string (no cache marks)', async () => {
    addKey('gemini', 'G', 'AIza-test-1234567890')
    let body = ''
    const fetchImpl = (async (_u: string, init: RequestInit) => {
      body = String(init.body)
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify(good) } }],
          usage: {},
        }),
        { status: 200 },
      )
    }) as typeof fetch
    await runSkill(readAiConfig(), skill, 'LONG TRANSCRIPT', { fetchImpl })
    expect(JSON.parse(body).messages[0].content).toContain('LONG TRANSCRIPT')
    expect(body).not.toContain('cache_control')
  })

  it('uses the cheapest model for a simple skill, the default order otherwise', () => {
    addKey('anthropic', 'Claude', 'sk-ant-test-1234567890')
    writePref(AI_KEYS.order, ['claude-sonnet-5-5', 'claude-haiku-5-5'])
    const config = readAiConfig()
    expect(config.model).toBe('claude-sonnet-5-5')
    expect(cheapestFirst(config).model).toBe('claude-haiku-5-5')
    const digest = SEEDS.find((s) => s.starterId === 'own.skill.digest')!
    expect(skillConfig(config, digest).model).toBe('claude-haiku-5-5')
    expect(skillConfig(config, skill).model).toBe('claude-sonnet-5-5')
  })

  it('shows the cost first, and the fact check uses a second model and shows its own cost', async () => {
    addKey('anthropic', 'Claude', 'sk-ant-test-1234567890')
    writePref(AI_KEYS.order, ['claude-sonnet-5-5', 'claude-haiku-5-5'])
    const config = readAiConfig()
    const cost = skillCost(config, skill, 'x'.repeat(8000))
    expect(cost.inputTokens).toBeGreaterThan(2000)
    expect(cost.inr).toBeGreaterThan(0)
    const result = parseSkillAnswer(JSON.stringify(good))
    expect(secondModelConfig(config, 'claude-sonnet-5-5').model).toBe(
      'claude-haiku-5-5',
    )
    const fact = factCheckCost(config, result, 'claude-sonnet-5-5')
    expect(fact.model).toBe('claude-haiku-5-5')
    const { bodies, fetchImpl } = recorder([
      '{"checks":[{"i":1,"verdict":"doubt","note":"no source"}]}',
    ])
    const checked = await runFactCheck(config, result, 'claude-sonnet-5-5', {
      fetchImpl,
    })
    expect(bodies[0].model).toBe('claude-haiku-5-5')
    expect(checked.points[1].flag).toBe('doubt')
  })
})
