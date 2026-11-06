import { layoutMindMap, type MindMap, type MindTheme } from './model'
import { lineColour, nodeLook, resolveColour } from './palette'

/**
 * Draws a mind map as a PNG (browser only), at twice the screen size so it
 * stays sharp. Colours are read from the page, so Day, Night and Sepia all
 * come out as the user sees them.
 */
export async function mindMapToPng(
  map: MindMap,
  theme: MindTheme,
  root: HTMLElement,
): Promise<Blob> {
  const layout = layoutMindMap(map)
  const scale = 2
  const c = document.createElement('canvas')
  c.width = Math.round(layout.width * scale)
  c.height = Math.round(layout.height * scale)
  const g = c.getContext('2d')
  if (!g) throw new Error('canvas')
  const col = (v: string) => resolveColour(v, root)
  g.scale(scale, scale)
  g.fillStyle = col('var(--color-bg)')
  g.fillRect(0, 0, layout.width, layout.height)
  const at = new Map(layout.nodes.map((n) => [n.id, n]))

  g.lineWidth = 2
  g.lineCap = 'round'
  for (const n of map.nodes) {
    if (n.parent === null) continue
    const a = at.get(n.parent)
    const b = at.get(n.id)
    if (!a || !b) continue
    const x1 = a.x + a.w
    const y1 = a.y + a.h / 2
    const mid = (x1 + b.x) / 2
    g.strokeStyle = col(lineColour(theme, b.branch))
    g.beginPath()
    g.moveTo(x1, y1)
    g.bezierCurveTo(mid, y1, mid, b.y + b.h / 2, b.x, b.y + b.h / 2)
    g.stroke()
  }

  g.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  g.textBaseline = 'middle'
  for (const p of layout.nodes) {
    const node = map.nodes.find((m) => m.id === p.id)!
    const look = nodeLook(theme, p.branch)
    g.beginPath()
    g.roundRect(p.x, p.y, p.w, p.h, p.h / 2)
    if (look.background !== 'transparent') {
      g.fillStyle = col(look.background)
      g.fill()
    }
    g.lineWidth = look.borderWidth
    g.setLineDash(look.dashed ? [6, 4] : [])
    g.strokeStyle = col(look.border)
    g.stroke()
    g.setLineDash([])
    g.fillStyle = col(look.colour)
    // Cut long text to the box.
    let text = node.text
    while (text.length > 1 && g.measureText(text).width > p.w - 24) {
      text = text.slice(0, -2) + '…'
    }
    g.fillText(text, p.x + 12, p.y + p.h / 2 + 1)
  }

  const blob = await new Promise<Blob | null>((resolve) =>
    c.toBlob(resolve, 'image/png'),
  )
  if (!blob) throw new Error('canvas')
  return blob
}
