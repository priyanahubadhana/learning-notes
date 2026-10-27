import { describe, expect, it } from 'vitest'
import { clozeToLines, hasCloze, htmlToLines, htmlToText } from './ankiHtml'

const text = (lines: { text: string }[][]) =>
  lines.map((l) => l.map((r) => r.text).join(''))

describe('htmlToLines', () => {
  it('keeps text, line breaks and bold/italic; drops other markup', () => {
    const lines = htmlToLines(
      'The <b>mitral</b> valve<br>has <i>two</i> <span style="x">cusps</span><div>and a ring</div>',
    )
    expect(text(lines)).toEqual([
      'The mitral valve',
      'has two cusps',
      'and a ring',
    ])
    expect(lines[0][1]).toMatchObject({
      text: 'mitral',
      styles: { bold: true },
    })
    expect(lines[1][1]).toMatchObject({ text: 'two', styles: { italic: true } })
  })

  it('decodes entities and drops sounds, scripts and styles', () => {
    expect(
      htmlToText(
        '5 &gt; 3 &amp; &#65;&#x42; [sound:a.mp3]<script>alert(1)</script><style>b{}</style>ok',
      ),
    ).toBe('5 > 3 & AB ok')
  })

  it('never lets markup through', () => {
    const lines = htmlToLines(
      '<img src="x" onerror="alert(1)"><a href="javascript:evil()">link</a>',
    )
    expect(text(lines)).toEqual(['[image]link'])
    expect(JSON.stringify(lines)).not.toContain('onerror')
  })

  it('collapses empty lines and trims', () => {
    expect(text(htmlToLines('<br><br>a<br><br><br>b<br>'))).toEqual([
      'a',
      '',
      'b',
    ])
  })

  it('survives broken html', () => {
    expect(htmlToText('a <b unclosed')).toBe('a <b unclosed')
    expect(htmlToText('')).toBe('')
  })
})

describe('clozeToLines', () => {
  it('turns deletions into blank-styled runs, one id per number', () => {
    expect(hasCloze('x {{c1::y}}')).toBe(true)
    const [line] = clozeToLines(
      'The {{c1::heart}} has {{c2::four::hint}} chambers; {{c1::it}} pumps',
    )
    expect(line.map((r) => r.text).join('')).toBe(
      'The heart has four chambers; it pumps',
    )
    const blanks = line.filter((r) => r.styles.blank)
    expect(blanks.map((r) => r.text)).toEqual(['heart', 'four', 'it'])
    expect(blanks[0].styles.blank).toBe(blanks[2].styles.blank) // c1 twice = one card
    expect(blanks[0].styles.blank).not.toBe(blanks[1].styles.blank)
  })

  it('works across bold text', () => {
    const [line] = clozeToLines('{{c1::the <b>aortic</b> valve}} opens')
    expect(line.map((r) => r.text).join('')).toBe('the aortic valve opens')
    expect(
      line
        .filter((r) => r.styles.blank)
        .map((r) => r.text)
        .join(''),
    ).toBe('the aortic valve')
  })
})
