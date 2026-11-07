import katex from 'katex'
import 'katex/dist/katex.min.css'

/**
 * Draws LaTeX as HTML (KaTeX, MIT). This is the only file that imports the
 * library, and it is only loaded when a page has a formula or the maths
 * editor opens (see mathBlock.tsx), so the first load does not grow.
 * `trust` stays off (no links, no raw HTML from a formula), `strict` is
 * quiet and `maxExpand` stops runaway macros.
 */
export function renderMath(
  latex: string,
  display = true,
): { html: string; ok: boolean } {
  const options = {
    displayMode: display,
    strict: 'ignore',
    trust: false,
    maxExpand: 1000,
    maxSize: 50,
    output: 'htmlAndMathml',
  } as const
  try {
    return {
      html: katex.renderToString(latex, { ...options, throwOnError: true }),
      ok: true,
    }
  } catch {
    // Show what was typed, marked as an error, instead of failing.
    return {
      html: katex.renderToString(latex, { ...options, throwOnError: false }),
      ok: false,
    }
  }
}
