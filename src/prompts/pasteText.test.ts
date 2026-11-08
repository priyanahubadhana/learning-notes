/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest'
import {
  INPUT_PLACEHOLDER,
  MAX_PASTED_ANSWER,
  copyTextFor,
  readPastedAnswer,
} from './pasteText'
import { newPrompt } from './promptModel'
import { ANSWER_FORMAT } from './promptRun'
import { SKILL_FORMAT } from './skillFormat'

describe('paste-in copy', () => {
  it('a prompt copies itself with the exact answer format and the input', () => {
    const item = { ...newPrompt('prompt'), name: 'Q', text: 'Summarise.' }
    const text = copyTextFor(item, 'The cell text')
    expect(text).toContain('Summarise.')
    expect(text).toContain(ANSWER_FORMAT)
    expect(text).toContain('The cell text')
    expect(copyTextFor(item, '  ')).toContain(INPUT_PLACEHOLDER)
  })

  it('a skill copies the JSON format the app reads back', () => {
    const item = { ...newPrompt('skill'), name: 'S', text: 'Be brief.' }
    const text = copyTextFor(item, 'Lecture')
    expect(text).toContain(SKILL_FORMAT)
    expect(text).toContain('"points"')
    expect(text).toContain('Lecture')
  })
})

describe('pasted answers are checked', () => {
  it('refuses empty and huge answers, cleans invisible and control characters', () => {
    expect(readPastedAnswer('   ')).toEqual({ ok: false, problem: 'empty' })
    expect(readPastedAnswer('x'.repeat(MAX_PASTED_ANSWER + 1))).toEqual({
      ok: false,
      problem: 'tooLong',
    })
    const r = readPastedAnswer('Hi\u0000 there​\r\nline two‮')
    expect(r).toEqual({ ok: true, text: 'Hi there\nline two' })
  })
})
