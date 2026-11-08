import { createElement, useEffect, useState } from 'react'
import { iconName, iconSymbol } from './iconNames'

type Shapes = (typeof import('./iconShapes'))['ICON_SHAPES']
let loaded: Shapes | null = null

/**
 * One key-point icon: a drawn open icon (Lucide, `lucide:name`) once its
 * small shapes file has loaded, the emoji meanwhile and for every emoji.
 * Decorative, so hidden from screen readers.
 */
export function SkillIcon({ icon }: { icon: string }) {
  const name = iconName(icon)
  const [shapes, setShapes] = useState<Shapes | null>(loaded)
  useEffect(() => {
    if (!name || shapes) return
    let live = true
    void import('./iconShapes').then((m) => {
      loaded = m.ICON_SHAPES
      if (live) setShapes(m.ICON_SHAPES)
    })
    return () => {
      live = false
    }
  }, [name, shapes])
  const parts = name && shapes ? shapes[name] : undefined
  if (!parts) return <span aria-hidden>{iconSymbol(icon)}</span>
  return (
    <svg
      data-testid="drawn-icon"
      aria-hidden
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {parts.map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs }))}
    </svg>
  )
}
