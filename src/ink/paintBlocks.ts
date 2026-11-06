/**
 * Draws the words and pictures of some blocks the way they sit on the page
 * (for the screenshot of a mixed Lasso selection). Each word is placed at the
 * spot the browser measured for it, so wrapping is exact; pictures are drawn
 * from the page's own images. No foreignObject, so the canvas is never
 * tainted (WebKit refuses to read one that is). (ox, oy) is the page point at
 * the top-left of the picture; `scale` is the canvas scale.
 */
export function paintBlocks(
  ctx: CanvasRenderingContext2D,
  wrap: HTMLElement,
  ids: readonly string[],
  ox: number,
  oy: number,
  scale: number,
): void {
  const origin = wrap.getBoundingClientRect()
  ctx.save()
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  ctx.textBaseline = 'alphabetic'
  const at = (r: { left: number; top: number }) => ({
    x: r.left - origin.left - ox,
    y: r.top - origin.top - oy,
  })
  for (const id of ids) {
    const block = wrap.querySelector<HTMLElement>(
      `.bn-block[data-id="${CSS.escape(id)}"] > .bn-block-content`,
    )
    if (!block) continue
    for (const img of block.querySelectorAll('img')) {
      const r = img.getBoundingClientRect()
      try {
        ctx.drawImage(img, at(r).x, at(r).y, r.width, r.height)
      } catch {
        // A picture that is not ready: the rest still draws.
      }
    }
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT)
    const range = document.createRange()
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const parent = n.parentElement
      if (!parent) continue
      const s = getComputedStyle(parent)
      ctx.font = `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`
      ctx.fillStyle = s.color
      for (const m of (n.textContent ?? '').matchAll(/\S+/g)) {
        range.setStart(n, m.index)
        range.setEnd(n, m.index + m[0].length)
        const r = range.getClientRects()[0]
        if (!r) continue
        // The baseline sits about 80% down a line box.
        ctx.fillText(m[0], at(r).x, at(r).y + r.height * 0.8)
      }
    }
  }
  ctx.restore()
}
