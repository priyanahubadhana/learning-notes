import { describe, expect, it } from 'vitest'
import { parseCsv, protectCell, unprotectCell, writeCsv } from './csv'

describe('csv', () => {
  it('reads quotes, doubled quotes and line breaks inside cells', () => {
    const { rows } = parseCsv(
      'a,b\r\n"x, y","He said ""hi"""\r\n"two\nlines",z\n',
    )
    expect(rows).toEqual([
      ['a', 'b'],
      ['x, y', 'He said "hi"'],
      ['two\nlines', 'z'],
    ])
  })

  it('ignores a BOM and blank lines, and reads ; and tab separators', () => {
    expect(parseCsv('﻿a;b\n\n1;2\n').rows).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
    expect(parseCsv('a\tb\n1\t2').rows).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
    expect(parseCsv('').rows).toEqual([])
  })

  it('writes what it reads back', () => {
    const table = [
      ['Name', 'Note'],
      ['Amlodipine', 'a, "b"\nc'],
      ['', 'plain'],
    ]
    expect(parseCsv(writeCsv(table)).rows).toEqual(table)
  })

  it('protects cells a spreadsheet would run as formulas, and gives them back', () => {
    for (const text of ['=SUM(A1)', '+1', '-2', '@x']) {
      expect(protectCell(text)).toBe(`'${text}`)
      expect(unprotectCell(protectCell(text))).toBe(text)
    }
    expect(protectCell('safe')).toBe('safe')
    expect(unprotectCell("'quoted")).toBe("'quoted")
  })
})
