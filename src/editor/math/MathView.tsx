import { useMemo } from 'react'
import { t } from '../../i18n/t'
import { renderMath } from './render'

/**
 * A formula drawn on the page. When the page can be edited, the whole
 * formula is one big button: tap (or Enter) opens the maths editor.
 */
export function MathView({
  latex,
  display = true,
  onOpen,
  className = '',
}: {
  latex: string
  display?: boolean
  /** Set when the formula may be edited. */
  onOpen?: () => void
  className?: string
}) {
  const drawn = useMemo(
    () => (latex.trim() ? renderMath(latex, display) : null),
    [latex, display],
  )
  const body = drawn ? (
    <div
      data-math-ok={drawn.ok}
      className="overflow-x-auto py-1 text-center"
      dangerouslySetInnerHTML={{ __html: drawn.html }}
    />
  ) : (
    <p className="py-2 text-center text-[14px] text-muted">{t('math.empty')}</p>
  )
  if (!onOpen) {
    return (
      <div data-math-block className={`w-full ${className}`}>
        {body}
      </div>
    )
  }
  return (
    <div
      data-math-block
      role="button"
      tabIndex={0}
      aria-label={t('math.edit')}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      className={`w-full cursor-pointer rounded-lg hover:bg-hover focus-visible:outline-2 focus-visible:outline-accent ${className}`}
    >
      {body}
    </div>
  )
}
