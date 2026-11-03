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

/** Width of a pen segment from the pressure (a pen that sends 0 counts as 0.5). */
const penWidth = (base, pressure) => base * (0.25 + 1.75 * (pressure || 0.5))

function drawSegment(stroke, a, b) {
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = stroke.color
  ctx.lineWidth = penWidth(stroke.width, (a.p + b.p) / 2)
  ctx.beginPath()
  ctx.moveTo(a.x, a.y)
  ctx.lineTo(b.x, b.y)
  ctx.stroke()
}

/** A highlighter stroke is one see-through path, so overlaps do not darken. */
function drawHighlighter(stroke) {
  if (stroke.points.length === 0) return
  ctx.save()
  ctx.globalAlpha = 0.32
  ctx.lineCap = 'butt'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = stroke.color
  ctx.lineWidth = stroke.width * 3
  ctx.beginPath()
  stroke.points.forEach((p, i) =>
    i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y),
  )
  if (stroke.points.length === 1)
    ctx.lineTo(stroke.points[0].x + 0.1, stroke.points[0].y)
  ctx.stroke()
  ctx.restore()
}

function drawStroke(stroke) {
  if (stroke.tool === 'highlighter') return drawHighlighter(stroke)
  const pts = stroke.points
  if (pts.length === 1) {
    ctx.fillStyle = stroke.color
    ctx.beginPath()
    ctx.arc(
      pts[0].x,
      pts[0].y,
      penWidth(stroke.width, pts[0].p) / 2,
      0,
      Math.PI * 2,
    )
    ctx.fill()
  }
  for (let i = 1; i < pts.length; i++) drawSegment(stroke, pts[i - 1], pts[i])
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

const local = (e) => {
  const r = ink.getBoundingClientRect()
  return { x: e.clientX - r.left, y: e.clientY - r.top, p: e.pressure }
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
    const p = local(ev)
    const last = stroke.points[stroke.points.length - 1]
    stroke.points.push(p)
    if (stroke.tool === 'pen') drawSegment(stroke, last, p)
    state.lastPoints.push(p)
  }
  if (state.lastPoints.length > 4)
    state.lastPoints.splice(0, state.lastPoints.length - 4)
  if (stroke.tool === 'highlighter') redraw()
}

function onUp(e) {
  note(e)
  if (e.pointerId !== state.drawingId) return
  state.drawingId = null
  state.current = null
  state.lastPoints = []
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
    box.value = text
    box.focus()
    box.select()
    let ok = false
    try {
      ok = document.execCommand('copy')
    } catch {
      ok = false
    }
    status.textContent = ok
      ? 'Copied. Paste it into the chat.'
      : 'Select the text below, copy it and paste it into the chat.'
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
