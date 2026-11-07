/**
 * The maths editor's palette (N1) and the insert rule, apart from the
 * screen so they can be tested. A snippet is LaTeX text; `@@` marks where
 * the cursor goes (and where selected text is wrapped).
 */

export const SLOT = '@@'

export interface Snippet {
  /** LaTeX to insert (may hold one SLOT). */
  tex: string
  /** LaTeX drawn on the button; defaults to the snippet without its SLOT. */
  label?: string
}

export const CATEGORIES = ['basics', 'greek', 'symbols', 'statistics'] as const
export type Category = (typeof CATEGORIES)[number]

const s = (tex: string, label?: string): Snippet => ({ tex, label })
const greek = (...names: string[]) => names.map((n) => s(`\\${n} `))

export const PALETTE: Record<Category, Snippet[]> = {
  basics: [
    s('\\frac{@@}{}', '\\frac{a}{b}'),
    s('^{@@}', 'x^{n}'),
    s('_{@@}', 'x_{n}'),
    s('\\sqrt{@@}', '\\sqrt{x}'),
    s('\\sqrt[@@]{}', '\\sqrt[n]{x}'),
    s('\\sum_{@@}^{}', '\\sum_{i}^{n}'),
    s('\\int_{@@}^{}', '\\int_{a}^{b}'),
    s('\\prod_{@@}^{}', '\\prod_{i}^{n}'),
    s('\\lim_{@@ \\to }', '\\lim_{x \\to a}'),
    s('\\left(@@\\right)', '(\\ x\\ )'),
    s('\\left[@@\\right]', '[\\ x\\ ]'),
    s('\\left|@@\\right|', '|\\ x\\ |'),
    s('\\overline{@@}', '\\overline{x}'),
    s('\\hat{@@}', '\\hat{x}'),
    s('\\vec{@@}', '\\vec{v}'),
    s('\\binom{@@}{}', '\\binom{n}{k}'),
    s(
      '\\begin{pmatrix} @@ & \\\\  &  \\end{pmatrix}',
      '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}',
    ),
  ],
  greek: [
    ...greek(
      'alpha',
      'beta',
      'gamma',
      'delta',
      'epsilon',
      'theta',
      'lambda',
      'mu',
      'pi',
      'rho',
      'sigma',
      'tau',
      'phi',
      'chi',
      'psi',
      'omega',
      'Gamma',
      'Delta',
      'Theta',
      'Lambda',
      'Pi',
      'Sigma',
      'Phi',
      'Psi',
      'Omega',
    ),
  ],
  symbols: [
    ...[
      '\\pm',
      '\\times',
      '\\div',
      '\\cdot',
      '\\leq',
      '\\geq',
      '\\neq',
      '\\approx',
      '\\equiv',
      '\\propto',
      '\\infty',
      '\\partial',
      '\\nabla',
      '\\in',
      '\\notin',
      '\\subset',
      '\\subseteq',
      '\\cup',
      '\\cap',
      '\\emptyset',
      '\\forall',
      '\\exists',
      '\\to',
      '\\Rightarrow',
      '\\Leftrightarrow',
      '\\therefore',
      '\\degree',
      '\\angle',
      '\\perp',
      '\\parallel',
    ].map((name) => s(`${name} `)),
  ],
  statistics: [
    s('\\bar{x}'),
    s('\\hat{p}'),
    s('\\sigma^{2}'),
    s('\\frac{\\sum x_i}{n}', '\\bar{x}=\\frac{\\sum x_i}{n}'),
    s(
      '\\sqrt{\\frac{\\sum (x_i-\\bar{x})^2}{n-1}}',
      's=\\sqrt{\\frac{\\sum (x_i-\\bar{x})^2}{n-1}}',
    ),
    s('z=\\frac{x-\\mu}{\\sigma}'),
    s('P(A\\mid B)'),
    s('\\mathbb{E}[X]'),
    s('\\operatorname{Var}(X)'),
    s('\\binom{n}{k}p^{k}(1-p)^{n-k}'),
    s('\\chi^{2}=\\sum\\frac{(O-E)^2}{E}'),
    s('r=\\frac{\\operatorname{Cov}(X,Y)}{\\sigma_X\\sigma_Y}'),
  ],
}

/** What a button draws. */
export const snippetLabel = (snippet: Snippet): string =>
  snippet.label ?? snippet.tex.replace(SLOT, '').trim()

/**
 * Puts a snippet into the text at the selection. Selected text goes into
 * the snippet's first slot; the cursor lands right after it (or after the
 * snippet if it has no slot).
 */
export function insertSnippet(
  value: string,
  start: number,
  end: number,
  snippet: string,
): { value: string; caret: number } {
  const from = Math.max(0, Math.min(start, end, value.length))
  const to = Math.max(from, Math.min(Math.max(start, end), value.length))
  const selected = value.slice(from, to)
  const slot = snippet.indexOf(SLOT)
  const text =
    slot < 0
      ? snippet
      : snippet.slice(0, slot) + selected + snippet.slice(slot + SLOT.length)
  const caret = from + (slot < 0 ? text.length : slot + selected.length)
  return { value: value.slice(0, from) + text + value.slice(to), caret }
}
