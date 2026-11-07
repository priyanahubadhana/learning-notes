import { useEffect, type Ref } from 'react'
import { ensureFont } from '../../app/reading/fonts'
import { decodeHand, handCss } from './handStyle'

/** Text written in the Write pad: its font, weight and size. */
export function HandSpan({
  value,
  contentRef,
}: {
  value: string
  contentRef: Ref<HTMLSpanElement>
}) {
  const look = decodeHand(value)
  const font = look?.font
  // The font files load only when such text is shown.
  useEffect(() => {
    if (font && font !== 'app') void ensureFont(font)
  }, [font])
  return (
    <span
      data-hand={value}
      style={look ? handCss(look) : undefined}
      ref={contentRef}
    />
  )
}
