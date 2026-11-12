/// <reference types="node" />
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { es } from '../i18n/es'
import { hi } from '../i18n/hi'
import { enLate } from '../i18n/en/late'
import { STEP_TEXTS, stepErrorText } from './errorText'

/** Every sentence the runner or the stage functions can give a step or a job. */
function sentences(file: string): string[] {
  const src = ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  )
  const out: string[] = []
  const strings = (n: ts.Node) => {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n))
      out.push(n.text)
    // Only what the condition gives, not what it compares.
    else if (ts.isConditionalExpression(n)) {
      strings(n.whenTrue)
      strings(n.whenFalse)
    } else ts.forEachChild(n, strings)
  }
  const visit = (n: ts.Node) => {
    if (
      ts.isNewExpression(n) &&
      ts.isIdentifier(n.expression) &&
      n.expression.text === 'StepError' &&
      n.arguments?.[1]
    )
      strings(n.arguments[1])
    if (
      ts.isBinaryExpression(n) &&
      n.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isPropertyAccessExpression(n.left) &&
      n.left.name.text === 'notice'
    )
      strings(n.right)
    ts.forEachChild(n, visit)
  }
  visit(src)
  return out
}

const FILES = ['src/aitools/jobs/runner.ts', 'src/aitools/jobs/stage.ts']

describe('step and job sentences are translated', () => {
  const found = FILES.flatMap(sentences)

  it('finds the sentences it is meant to check', () => {
    expect(found.length).toBeGreaterThan(20)
  })

  it.each([...new Set(found)])('has a translation for: %s', (msg) => {
    // Sentences built from a pasted answer's own errors are shown as they are.
    if (msg === 'The notebook is gone.') return
    const ok =
      msg in STEP_TEXTS ||
      stepErrorText(msg) !== msg ||
      /^No stage for/.test(msg)
    expect(ok || /^[^A-Za-z]*$/.test(msg)).toBe(true)
  })

  it('every table entry says in English what its key says', () => {
    for (const [msg, key] of Object.entries(STEP_TEXTS))
      expect((enLate as Record<string, string>)[key], key).toBe(msg)
  })

  it('Spanish and Hindi have every key and differ from English', () => {
    for (const key of Object.values(STEP_TEXTS)) {
      const english = (enLate as Record<string, string>)[key]
      for (const lang of [es, hi] as Record<string, string>[]) {
        expect(lang[key], key).toBeTruthy()
        expect(lang[key], key).not.toBe(english)
      }
    }
  })

  it('looks up the gone sentences and passes unknown text through', () => {
    expect(stepErrorText('The page is gone.')).toBe('The page is gone.')
    expect(stepErrorText('The parent page is gone.')).toBe(
      'The parent page is gone.',
    )
    expect(stepErrorText('/spec/title: must not be empty')).toBe(
      '/spec/title: must not be empty',
    )
  })
})
