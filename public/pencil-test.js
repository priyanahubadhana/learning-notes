/*
  Pencil test page (throwaway). Draws only with a pen (Apple Pencil) and shows
  live numbers. Standalone: no app code, no storage, no network.
*/
'use strict'

const $ = (id) => document.getElementById(id)
const stage = $('stage')
const ink = $('ink')
const overlay = $('overlay')
// Ask for the low-latency canvas; the browser may or may not grant it.
const ctx = ink.getContext('2d', { desynchronized: true })
const octx = overlay.getContext('2d')

const state = {
  tool: 'pen',
  color: '#1a1a1a',
  width: 4,
  strokes: [], // finished and current strokes, for redraw and the eraser
  current: null,
  drawingId: null,
  pointerTypes: new Set(),
  penEvents: 0,
  pressureMin: Infinity,
  pressureMax: -Infinity,
  tiltXMin: Infinity,
  tiltXMax: -Infinity,
  tiltYMin: Infinity,
  tiltYMax: -Infinity,
  sawAltitude: false,
  sawAzimuth: false,
  moveStamps: [], // times of recent pen move events (for events per second)
  epsMax: 0,
  coalescedSupported:
    typeof PointerEvent !== 'undefined' &&
    'getCoalescedEvents' in PointerEvent.prototype,
  predictedSupported:
    typeof PointerEvent !== 'undefined' &&
    'getPredictedEvents' in PointerEvent.prototype,
  coalescedTotal: 0,
  coalescedCount: 0,
  coalescedMax: 0,
  coalescedLast: 0,
  predictedTotal: 0,
  predictedCount: 0,
  predictedMax: 0,
  predictedLast: 0,
  fps: 0,
  fpsMin: Infinity,
  fpsMax: 0,
  lastPoints: [], // for our own prediction line
}

let dpr = 1
function resize() {
  dpr = window.devicePixelRatio || 1
  const w = stage.clientWidth
  const h = stage.clientHeight
  for (const c of [ink, overlay]) {
    c.width = Math.max(1, Math.round(w * dpr))
    c.height = Math.max(1, Math.round(h * dpr))
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  octx.setTransform(dpr, 0, 0, dpr, 0, 0)
  redraw()
}

// ---------------------------------------------------------------- drawing

/** Pressure used when a pen sends 0 before it has sent anything else. */
const DEFAULT_PRESSURE = 0.4

/**
 * Pressure rescaled so the pressure this device really sends fills the whole
 * range: p' = min(1, p / max(0.25, highest pressure seen so far)). A 0 (some
 * pens send it for the first events of a stroke) takes the previous value of
 * the stroke, or a middle value at the very start.
 */
function scalePressure(raw, previous) {
  if (!(raw > 0)) return previous === undefined ? DEFAULT_PRESSURE : previous
  const seen = state.pressureMax === -Infinity ? 0 : state.pressureMax
  return Math.min(1, raw / Math.max(0.25, seen))
}

/** Width of a pen segment from the (already rescaled) pressure. */
const penWidth = (base, pressure) => base * (0.25 + 1.75 * pressure)

const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

/**
 * One piece of a smooth pen line: a curve from the middle of the previous
 * two points to the middle of the next two, bending towards the point
 * between (quadratic curves through midpoints). k = index of that point.
 */
function drawCurve(stroke, k, last) {
  const pts = stroke.points
  const from = k === 1 ? pts[0] : mid(pts[k - 1], pts[k])
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = stroke.color
  ctx.lineWidth = penWidth(stroke.width, (pts[k - 1].p + pts[k].p) / 2)
  ctx.beginPath()
  if (last) {
    // The final piece runs on to the very last point.
    const m = k === 1 ? pts[0] : mid(pts[k - 1], pts[k])
    ctx.moveTo(m.x, m.y)
    ctx.lineTo(pts[k].x, pts[k].y)
  } else {
    const to = mid(pts[k], pts[k + 1])
    ctx.moveTo(from.x, from.y)
    ctx.quadraticCurveTo(pts[k].x, pts[k].y, to.x, to.y)
  }
  ctx.stroke()
}

/** A highlighter stroke is one see-through path, so overlaps do not darken. */
function drawHighlighter(stroke) {
  const pts = stroke.points
  if (pts.length === 0) return
  ctx.save()
  ctx.globalAlpha = 0.32
  ctx.lineCap = 'butt'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = stroke.color
  ctx.lineWidth = stroke.width * 3
  if (pts.length === 1) {
    // A tap with no movement: a round dot.
    ctx.fillStyle = stroke.color
    ctx.beginPath()
    ctx.arc(pts[0].x, pts[0].y, stroke.width * 1.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    return
  }
  ctx.beginPath()
  ctx.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < pts.length - 1; i++) {
    const to = mid(pts[i], pts[i + 1])
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, to.x, to.y)
  }
  ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
  ctx.stroke()
  ctx.restore()
}

function drawStroke(stroke) {
  if (stroke.tool === 'highlighter') return drawHighlighter(stroke)
  const pts = stroke.points
  if (pts.length === 1) {
    // A tap with no movement: a round dot.
    ctx.fillStyle = stroke.color
    ctx.beginPath()
    ctx.arc(
      pts[0].x,
      pts[0].y,
      Math.max(penWidth(stroke.width, pts[0].p), stroke.width * 1.5) / 2,
      0,
      Math.PI * 2,
    )
    ctx.fill()
    return
  }
  for (let k = 1; k < pts.length - 1; k++) drawCurve(stroke, k, false)
  drawCurve(stroke, pts.length - 1, true)
}

function redraw() {
  ctx.clearRect(0, 0, ink.width / dpr, ink.height / dpr)
  state.strokes.forEach(drawStroke)
}

/** Which strokes does the eraser at (x, y) touch? */
function eraseAt(x, y) {
  const reach = 14
  const before = state.strokes.length
  state.strokes = state.strokes.filter((s) => {
    const near = (a, b) => {
      // Distance from the point to the segment a-b.
      const dx = b.x - a.x
      const dy = b.y - a.y
      const len = dx * dx + dy * dy
      const t = len
        ? Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / len))
        : 0
      return (
        Math.hypot(x - (a.x + t * dx), y - (a.y + t * dy)) <= reach + s.width
      )
    }
    const pts = s.points
    if (pts.length === 1)
      return Math.hypot(x - pts[0].x, y - pts[0].y) > reach + s.width
    for (let i = 1; i < pts.length; i++)
      if (near(pts[i - 1], pts[i])) return false
    return true
  })
  if (state.strokes.length !== before) redraw()
}

// ----------------------------------------------------------------- events

const local = (e, previous) => {
  const r = ink.getBoundingClientRect()
  return {
    x: e.clientX - r.left,
    y: e.clientY - r.top,
    p: scalePressure(e.pressure, previous),
  }
}

function note(e) {
  state.pointerTypes.add(e.pointerType)
  $('rType').textContent = e.pointerType
  $('rPressure').textContent = e.pressure.toFixed(3)
  $('rTilt').textContent = `${e.tiltX} / ${e.tiltY}`
  const alt = 'altitudeAngle' in e && e.altitudeAngle !== undefined
  const azi = 'azimuthAngle' in e && e.azimuthAngle !== undefined
  $('rAngle').textContent =
    alt || azi
      ? `${alt ? e.altitudeAngle.toFixed(2) : '–'} / ${azi ? e.azimuthAngle.toFixed(2) : '–'}`
      : 'not available'
  if (e.pointerType !== 'pen') return
  state.penEvents++
  state.pressureMin = Math.min(state.pressureMin, e.pressure)
  state.pressureMax = Math.max(state.pressureMax, e.pressure)
  state.tiltXMin = Math.min(state.tiltXMin, e.tiltX)
  state.tiltXMax = Math.max(state.tiltXMax, e.tiltX)
  state.tiltYMin = Math.min(state.tiltYMin, e.tiltY)
  state.tiltYMax = Math.max(state.tiltYMax, e.tiltY)
  if ('altitudeAngle' in e && e.altitudeAngle !== undefined)
    state.sawAltitude = true
  if ('azimuthAngle' in e && e.azimuthAngle !== undefined)
    state.sawAzimuth = true
}

function countExtra(e) {
  if (state.coalescedSupported) {
    const n = e.getCoalescedEvents().length
    state.coalescedLast = n
    state.coalescedTotal += n
    state.coalescedCount++
    state.coalescedMax = Math.max(state.coalescedMax, n)
    $('rCoalesced').textContent =
      `${n} (avg ${(state.coalescedTotal / state.coalescedCount).toFixed(1)}, max ${state.coalescedMax})`
  } else {
    $('rCoalesced').textContent = 'not supported'
  }
  if (state.predictedSupported) {
    const n = e.getPredictedEvents().length
    state.predictedLast = n
    state.predictedTotal += n
    state.predictedCount++
    state.predictedMax = Math.max(state.predictedMax, n)
    $('rPredicted').textContent =
      `${n} (avg ${(state.predictedTotal / state.predictedCount).toFixed(1)}, max ${state.predictedMax})`
  } else {
    $('rPredicted').textContent = 'not supported'
  }
}

function onDown(e) {
  note(e)
  if (e.pointerType !== 'pen') return // fingers and mouse are ignored
  e.preventDefault()
  try {
    ink.setPointerCapture(e.pointerId)
  } catch {
    // A made-up event has no pointer to capture; drawing still works.
  }
  state.drawingId = e.pointerId
  const p = local(e)
  if (state.tool === 'eraser') {
    eraseAt(p.x, p.y)
    return
  }
  state.current = {
    tool: state.tool,
    color: state.color,
    width: state.width,
    points: [p],
  }
  state.strokes.push(state.current)
  state.lastPoints = [p]
  if (state.tool === 'pen') drawStroke(state.current)
  else redraw()
}

function onMove(e) {
  note(e)
  if (e.pointerType !== 'pen') return
  const now = performance.now()
  state.moveStamps.push(now)
  countExtra(e)
  if (state.drawingId !== e.pointerId) return
  e.preventDefault()
  const events =
    state.coalescedSupported && e.getCoalescedEvents().length
      ? e.getCoalescedEvents()
      : [e]
  if (state.tool === 'eraser') {
    events.forEach((ev) => {
      const p = local(ev)
      eraseAt(p.x, p.y)
    })
    return
  }
  const stroke = state.current
  if (!stroke) return
  for (const ev of events) {
    const last = stroke.points[stroke.points.length - 1]
    const p = local(ev, last.p)
    stroke.points.push(p)
    // Draw the curve that is now complete (one point behind the pen).
    const n = stroke.points.length
    if (stroke.tool === 'pen' && n >= 3) drawCurve(stroke, n - 2, false)
    state.lastPoints.push(p)
  }
  if (state.lastPoints.length > 4)
    state.lastPoints.splice(0, state.lastPoints.length - 4)
  if (stroke.tool === 'highlighter') redraw()
}

function onUp(e) {
  note(e)
  if (e.pointerId !== state.drawingId) return
  const stroke = state.current
  if (stroke && stroke.tool === 'pen' && stroke.points.length >= 2) {
    drawCurve(stroke, stroke.points.length - 1, true) // the last bit
  }
  state.drawingId = null
  state.current = null
  state.lastPoints = []
}

/*
  Safari decides what a touch does (scroll, zoom, selection) from the touch
  events, before the pointer events. The Pencil is told apart by touchType, so
  its touches are stopped here and a new stroke starts at once. Fingers are
  left alone (palm resting, scrolling).
*/
const stopPen = (e) => {
  for (const touch of e.changedTouches) {
    if (touch.touchType === 'stylus') {
      e.preventDefault()
      return
    }
  }
}
for (const type of ['touchstart', 'touchmove', 'touchend']) {
  ink.addEventListener(type, stopPen, { passive: false })
}
// No double-tap zoom and no pinch gestures on the drawing area.
for (const type of [
  'dblclick',
  'gesturestart',
  'gesturechange',
  'gestureend',
]) {
  ink.addEventListener(type, (e) => e.preventDefault(), { passive: false })
}

ink.addEventListener('pointerdown', onDown)
ink.addEventListener('pointermove', onMove)
ink.addEventListener('pointerup', onUp)
ink.addEventListener('pointercancel', onUp)
// No long-press menu or text selection from the pen.
ink.addEventListener('contextmenu', (e) => e.preventDefault())

// ------------------------------------------------- readouts and prediction

let lastFrame = 0
let fpsStamps = []
function frame(now) {
  if (lastFrame) {
    fpsStamps.push(now)
    fpsStamps = fpsStamps.filter((t) => now - t <= 1000)
    if (fpsStamps.length > 1) {
      state.fps = ((fpsStamps.length - 1) * 1000) / (now - fpsStamps[0])
      if (fpsStamps.length > 20) {
        state.fpsMin = Math.min(state.fpsMin, state.fps)
        state.fpsMax = Math.max(state.fpsMax, state.fps)
      }
    }
  }
  lastFrame = now
  state.moveStamps = state.moveStamps.filter((t) => now - t <= 1000)
  const eps = state.moveStamps.length
  state.epsMax = Math.max(state.epsMax, eps)
  $('rEps').textContent = `${eps} (max ${state.epsMax})`
  $('rFps').textContent = state.fps ? `${state.fps.toFixed(0)} fps` : '–'
  drawPrediction()
  requestAnimationFrame(frame)
}

/** Our own simple prediction: carry on in the direction and speed of the last points. */
function drawPrediction() {
  octx.clearRect(0, 0, overlay.width / dpr, overlay.height / dpr)
  if (
    !$('predict').checked ||
    state.lastPoints.length < 2 ||
    state.drawingId === null
  )
    return
  const a = state.lastPoints[state.lastPoints.length - 2]
  const b = state.lastPoints[state.lastPoints.length - 1]
  octx.strokeStyle = '#e0457b'
  octx.lineWidth = 2
  octx.setLineDash([4, 4])
  octx.beginPath()
  octx.moveTo(b.x, b.y)
  octx.lineTo(b.x + (b.x - a.x) * 2, b.y + (b.y - a.y) * 2)
  octx.stroke()
  octx.setLineDash([])
}

// ---------------------------------------------------------------- toolbar

document.querySelectorAll('[data-tool]').forEach((button) =>
  button.addEventListener('click', () => {
    state.tool = button.dataset.tool
    document
      .querySelectorAll('[data-tool]')
      .forEach((b) => b.setAttribute('aria-pressed', String(b === button)))
  }),
)
$('color').addEventListener('input', (e) => (state.color = e.target.value))
$('width').addEventListener('input', (e) => {
  state.width = Number(e.target.value)
  $('widthOut').textContent = e.target.value
})
$('paper').addEventListener('change', (e) => {
  stage.className = e.target.value === 'blank' ? '' : e.target.value
})
$('clear').addEventListener('click', () => {
  state.strokes = []
  state.current = null
  redraw()
})

// ---------------------------------------------------------- copy results

const range = (min, max) => (min === Infinity ? 'none yet' : `${min} to ${max}`)

function resultsText() {
  const attrs = ctx.getContextAttributes ? ctx.getContextAttributes() : {}
  const avg = (total, count) => (count ? (total / count).toFixed(1) : 'n/a')
  return [
    'Pencil test results',
    `Date: ${new Date().toISOString()}`,
    `Device and browser: ${navigator.userAgent}`,
    `Screen: ${screen.width}x${screen.height} at ${window.devicePixelRatio}x, touch points ${navigator.maxTouchPoints}`,
    `Pointer types seen: ${[...state.pointerTypes].join(', ') || 'none yet'}`,
    `Pen events: ${state.penEvents}`,
    'Pressure drawn as: rescaled by the highest pressure seen (at least 0.25)',
    `Pressure seen: ${state.pressureMin === Infinity ? 'none yet' : `${state.pressureMin.toFixed(3)} to ${state.pressureMax.toFixed(3)}`}`,
    `Tilt X seen: ${range(state.tiltXMin, state.tiltXMax)}`,
    `Tilt Y seen: ${range(state.tiltYMin, state.tiltYMax)}`,
    `Altitude angle: ${state.sawAltitude ? 'yes' : 'no'}, azimuth angle: ${state.sawAzimuth ? 'yes' : 'no'}`,
    `Events per second: ${state.moveStamps.length} now, ${state.epsMax} at most`,
    `getCoalescedEvents: ${state.coalescedSupported ? `supported, average ${avg(state.coalescedTotal, state.coalescedCount)} points per event, most ${state.coalescedMax}` : 'not supported'}`,
    `getPredictedEvents: ${state.predictedSupported ? `supported, average ${avg(state.predictedTotal, state.predictedCount)} points per event, most ${state.predictedMax}` : 'not supported'}`,
    `Frame rate: ${state.fps ? state.fps.toFixed(0) : 'n/a'} fps now (lowest ${state.fpsMin === Infinity ? 'n/a' : state.fpsMin.toFixed(0)}, highest ${state.fpsMax ? state.fpsMax.toFixed(0) : 'n/a'})`,
    `Low-latency canvas (desynchronized) granted: ${attrs.desynchronized === undefined ? 'unknown' : attrs.desynchronized ? 'yes' : 'no'}`,
    `Strokes drawn: ${state.strokes.length}`,
    'Felt: (write "smooth" or "laggy" here)',
  ].join('\n')
}

$('copy').addEventListener('click', () => {
  const text = resultsText()
  const status = $('copyStatus')
  const box = $('copyBox')
  // The clipboard call must happen right here, inside the tap.
  const fallback = () => {
    box.hidden = false
    box.readOnly = false // iPad selects an editable box more reliably
    box.value = text
    box.focus()
    box.select()
    box.setSelectionRange(0, text.length)
    box.scrollIntoView({ block: 'nearest' })
    let ok = false
    try {
      ok = document.execCommand('copy')
    } catch {
      ok = false
    }
    status.textContent = ok
      ? 'Copied. Paste it into the chat.'
      : 'The text below is already selected: touch and hold it, tap Copy, then paste it into the chat.'
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      box.hidden = true
      status.textContent = 'Copied. Paste it into the chat.'
    }, fallback)
  } else {
    fallback()
  }
})

// ------------------------------------------------------------------ start

$('rDesync').textContent = ctx.getContextAttributes
  ? ctx.getContextAttributes().desynchronized
    ? 'granted'
    : 'not granted'
  : 'unknown'
window.addEventListener('resize', resize)
resize()
requestAnimationFrame(frame)
