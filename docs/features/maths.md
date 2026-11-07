# Maths (N1)

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

Write maths in notes: fractions, powers, roots, sums, integrals, Greek letters, symbols and common statistics formulas, without knowing LaTeX, and with LaTeX available for people who do. Loaded only when used.

## How it works

- Block type `math` (`editor/math/mathBlock.tsx`; registered in `schema.tsx` and `builtinBlockTypes.ts`; slash menu "Formula", also found by maths, equation, latex, fraction, greek). Prop `latex` (the formula as LaTeX text). A block record like any other: no new table, no Dexie version, it syncs with the blocks.
- **Drawing**: KaTeX 0.19.1 (MIT, one small dependency `commander` that is only for its command line and is not bundled; `npm audit --omit=dev` clean; about 77 KB gzipped plus 20 small font files). Only `editor/math/render.ts` imports it. The block loads it through `React.lazy` (`MathLazy.tsx` → `MathHost`), so a page without a formula never downloads it and the first load is unchanged. Options: `trust` off (no links or raw HTML from a formula), `strict` quiet, `maxExpand` 1000, `maxSize` 50. A broken formula shows in red with the typed text instead of failing.
- **Editing**: tap the formula (or Enter on it) → `MathEditor` (a modal dialog placed in the page body, loaded on first tap): the formula drawn live, a LaTeX box, and a palette in four tabs (Basics: fraction, power, subscript, roots, sum, integral, product, limit, brackets, bar, hat, vector, binomial, 2x2 matrix; Greek; Symbols; Statistics: mean, standard deviation, z-score, probability, binomial, chi-square, correlation). A button inserts its LaTeX at the cursor; selected text goes into the new piece's first slot. Buttons keep focus in the box so the iPad keyboard stays up. Done (or Ctrl/Cmd+Enter) saves, Cancel, Esc or the backdrop discards.
- **Elsewhere**: search finds a formula by its LaTeX; export writes `$$ latex $$` text; Reading mode shows the formula, not editable.
- Not built (parked): inline formulas in a line of text, a true type-in-the-picture editor (MathLive, large; see DECISIONS), handwriting to maths (Phase P), a ribbon button.

## Edge cases

- Empty formula shows "Tap to add a formula". Long formulas scroll sideways inside their block.
- Very large or recursive macros are cut off by `maxExpand`.

## Security check

Formula text is data, never HTML: KaTeX builds the markup from a parsed formula, `trust` is off (no `\href`, `\url`, `\includegraphics`, raw HTML). CSP is unchanged (fonts are `'self'`).

## Tests

- Unit: `editor/math/math.test.ts` (insert rule, every palette button renders, no links or raw HTML from a formula, errors shown not thrown), `blocks/blockTypes.test.ts`.
- E2E: `e2e/math.spec.ts` (KaTeX not requested without a formula; palette + typing + Greek + reload; Cancel/Esc; error display; phone fit). Owner: iPad keyboard and finger/Pencil taps.
