import r400 from '@fontsource/literata/files/literata-latin-400-normal.woff2?url'
import r400i from '@fontsource/literata/files/literata-latin-400-italic.woff2?url'
import r700 from '@fontsource/literata/files/literata-latin-700-normal.woff2?url'
import r700i from '@fontsource/literata/files/literata-latin-700-italic.woff2?url'

/**
 * The "Bookerly-style" reading font is Literata (SIL Open Font Licence 1.1,
 * the typeface Google Play Books reads in). Bookerly itself is Amazon's and
 * not free. An EPUB page is its own document, so the app's @font-face rules
 * do not reach it: this CSS declares the same files inside the page. The
 * browser downloads a file only when the book actually uses it.
 */
export function bookFontCss(
  base = typeof window === 'undefined'
    ? 'http://localhost/'
    : window.location.href,
): string {
  const face = (url: string, weight: number, style: 'normal' | 'italic') =>
    `@font-face { font-family: "Literata"; font-style: ${style}; font-weight: ${weight}; font-display: swap; src: url("${new URL(url, base).href}") format("woff2"); }`
  return [
    face(r400, 400, 'normal'),
    face(r400i, 400, 'italic'),
    face(r700, 700, 'normal'),
    face(r700i, 700, 'italic'),
  ].join('\n')
}
