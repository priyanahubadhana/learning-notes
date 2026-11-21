import { useEffect, type Ref } from 'react'
import { ensureFont } from '../app/reading/fonts'
import { isReadingFont } from '../app/reading/readingPrefs'
import { faceCss, sizeCss } from './lookStyle'

/** Words with their own size (px) or font: the styles of the one bar's Size and Font. */
export function LookSpan({
  kind,
  value,
  contentRef,
}: {
  kind: 'size' | 'face'
  value: string
  contentRef: Ref<HTMLSpanElement>
}) {
  // A font's files load only when words in it are shown.
  useEffect(() => {
    if (kind === 'face' && isReadingFont(value) && value !== 'app')
      void ensureFont(value)
  }, [kind, value])
  return (
    <span
      data-look-size={kind === 'size' ? value : undefined}
      data-look-face={kind === 'face' ? value : undefined}
      style={kind === 'size' ? sizeCss(value) : faceCss(value)}
      ref={contentRef}
    />
  )
}
