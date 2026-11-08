import { describe, expect, it } from 'vitest'
import {
  CLEANUP_FORMAT,
  answerTokens,
  composeCleanup,
  missingFigures,
  unplacedLines,
} from './cleanupAi'
import { CLEANUP_PROMPT, CLEANUP_STARTER, SEEDS } from '../prompts/seedPrompts'

describe('Clean up with AI', () => {
  it('is a seeded library prompt with a starter id', () => {
    const seed = SEEDS.find((s) => s.starterId === CLEANUP_STARTER)
    expect(seed?.text).toBe(CLEANUP_PROMPT)
    expect(seed?.name).toBe('Clean up pasted text')
  })
  it('sends the instructions, the answer format and the text', () => {
    const p = composeCleanup('  Be careful.  ', 'messy words')
    expect(p.startsWith('Be careful.')).toBe(true)
    expect(p).toContain(CLEANUP_FORMAT)
    expect(p.endsWith('Text:\nmessy words')).toBe(true)
  })
  it('limits the answer size', () => {
    expect(answerTokens('x'.repeat(100))).toBeLessThan(1000)
    expect(answerTokens('x'.repeat(500_000))).toBe(8000)
  })
  it('lists what the AI could not place', () => {
    const md = '## A\n\n- x\n\n## Not placed\n\n- call Sam at 5pm\n- 99 red\n'
    expect(unplacedLines(md)).toEqual(['call Sam at 5pm', '99 red'])
    expect(unplacedLines('## A\n\n- x')).toEqual([])
  })
  it('finds numbers lost in the answer', () => {
    expect(
      missingFigures('46 chromosomes, 36 ATP', '- 46 chromosomes'),
    ).toEqual(['36'])
    expect(missingFigures('about 3.5 and 1,200', '3.5 / 1,200')).toEqual([])
  })
})
