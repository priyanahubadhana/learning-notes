import { afterEach, describe, expect, it } from 'vitest'
import { AI_TOOLS_BY_ID } from '../aitools/registry'
import { es } from '../i18n/es'
import { hi } from '../i18n/hi'
import { setMessages } from '../i18n/t'
import { checkAnswer } from './pasteFiller'
import { problemText, validatorText } from './validatorText'

const notes = AI_TOOLS_BY_ID.get('pages.write_notes')!
const args = { notebookId: 'nb1', brief: 'Habits' }

afterEach(() => setMessages('en', {}))

describe('validatorText', () => {
  it('keeps English as it is', () => {
    expect(validatorText('This is required.')).toBe('This is required.')
    expect(validatorText('This must be a list.')).toBe('This must be a list.')
  })
  it('translates the checker sentences a pasted answer can get', () => {
    const r = checkAnswer(
      notes,
      args,
      JSON.stringify({ page: { blocks: 'x', extra: 1 } }),
    )
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.problems.length).toBeGreaterThan(1)
    const en = r.problems.map(problemText)
    for (const [loc, msgs] of [
      ['es', es],
      ['hi', hi],
    ] as const) {
      setMessages(loc, msgs)
      const out = r.problems.map(problemText)
      out.forEach((line, i) => expect(line).not.toBe(en[i]))
      // The path stays as written.
      r.problems.forEach((p, i) =>
        expect(out[i].startsWith(p.slice(0, p.indexOf(': ')))).toBe(true),
      )
    }
  })
  it('passes numbers and lists into the sentence', () => {
    setMessages('es', es)
    expect(validatorText('This must have at least 3 characters.')).toContain(
      '3',
    )
    expect(validatorText('This must be one of: "a", "b".')).toContain(
      '"a", "b"',
    )
  })
  it('leaves an unknown sentence alone and still reads the codes', () => {
    setMessages('es', es)
    expect(validatorText('Something new.')).toBe('Something new.')
    expect(problemText(':empty')).toBe('Pega primero la respuesta.')
  })
})
