import { readFileSync } from 'node:fs'
import { unzipSync, strFromU8 } from 'fflate'
import { describe, expect, it } from 'vitest'
import { buildSkillZip } from '../../scripts/skillZip'
import { parseSkillAnswer, SKILL_FORMAT } from './skillFormat'

const skillMd = readFileSync('claude-skill/learning-notes/SKILL.md', 'utf8')

/** The first ```json block of SKILL.md: the example Claude copies. */
const example = /```json\n([\s\S]*?)\n```/.exec(skillMd)?.[1] ?? ''

describe('Claude Skill (claude-skill/learning-notes)', () => {
  it('has the front matter Claude needs', () => {
    expect(skillMd).toMatch(/^---\nname: learning-notes\ndescription: .+\n---/)
    expect(skillMd).toContain('make notes for Learning Notes')
    expect(skillMd).toContain('for my notes app')
  })

  it('the SKILL.md example is read whole by the app reader', () => {
    expect(JSON.parse(example).format).toBe(SKILL_FORMAT)
    const r = parseSkillAnswer('```json\n' + example + '\n```')
    expect(r.title).toBe('Mitochondria and ATP')
    expect(r.sources.map((s) => s.n)).toEqual([1, 2])
    expect(r.points).toHaveLength(4)
    expect(r.points.map((p) => p.level)).toEqual([
      'must',
      'must',
      'good',
      'extra',
    ])
    // Stars, icons, sources and the unchecked mark survive.
    expect(r.points[0]).toMatchObject({ stars: 10, icon: '🔋', checked: true })
    expect(r.points[3].checked).toBe(false)
    expect(r.pages).toHaveLength(2)
    expect(r.cards.map((c) => c.kind)).toEqual([
      'qa',
      'cloze',
      'truefalse',
      'reverse',
    ])
    expect(r.keywords).toHaveLength(4)
    // Every Must know point has a card.
    r.points.forEach((p, i) => {
      if (p.level === 'must')
        expect(r.cards.some((c) => c.point === i)).toBe(true)
    })
  })

  it('the zip holds the folder with SKILL.md and the reference', () => {
    const files = unzipSync(buildSkillZip())
    expect(Object.keys(files).sort()).toEqual([
      'learning-notes/SKILL.md',
      'learning-notes/reference/format.md',
    ])
    expect(strFromU8(files['learning-notes/SKILL.md'])).toBe(skillMd)
  })
})
