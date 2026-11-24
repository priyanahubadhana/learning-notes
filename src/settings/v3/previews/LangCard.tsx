import type { JsonValue } from '../../../core/types'
import { tv } from '../tv'

/**
 * SET-B34: the calm "Bold · Pen · Read" card of the Language row. Three small
 * plain labels in theme colours, the same radius and type as other previews,
 * no bright fills, no shadow beyond the shared one. The words follow the
 * chosen language (the value of the row), not only the one on screen.
 */
export function LangCard({ value }: { value: JsonValue }) {
  const lang = typeof value === 'string' ? value : undefined
  return (
    <div data-lang-card className="sv3-lang" lang={lang}>
      {(['sv3.langBold', 'sv3.langPen', 'sv3.langRead'] as const).map((key) => (
        <span key={key} className="sv3-lang-label">
          {tv(key, undefined, lang)}
        </span>
      ))}
    </div>
  )
}
