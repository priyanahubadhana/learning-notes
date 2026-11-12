/* ============ v5: boot state, mode sync, Undo/Redo in the top bar ============ */
function shMode() {
  return ($('#app') || { dataset: {} }).dataset.mode || 'beg'
}
function v5Boot() {
  try {
    if (Shell.icons() !== 'A') Shell.icons('A')
  } catch (_) {} /* icon set A is fixed: no switcher */
  // Night is the default look for a new person; the mode follows the layout (a fresh load = Beginner)
  try {
    const s = JSON.parse(localStorage.getItem('ln-shell-v1') || '{}')
    if (!s.theme) Shell.setTheme('Night')
  } catch (_) {}
  Shell.setMode(isPro() ? 'pro' : 'beg')
  moveHist()
  updateStates()
  syncMin()
  startPulse()
}
/* Undo and Redo live in the shell's top bar, once. The toolbar builds them; they are moved up (handlers and state stay). */
function moveHist() {
  const t = $('#sh-top'),
    hs = $('#tb .hist')
  if (!t || !hs) return
  const old = $('.hist', t)
  if (old) old.remove()
  const a = t.querySelector('[data-sh-search]')
  t.insertBefore(hs, a)
  hs.classList.add('tophist')
}
{
  const rt0 = renderToolbar
  renderToolbar = function () {
    rt0()
    tb.insertAdjacentHTML('beforeend', minHtml('main'))
    if (shellReady) {
      const m = isPro() ? 'pro' : 'beg'
      if (shMode() !== m) Shell.setMode(m)
      moveHist()
      syncMin()
    }
  }
}
/* enabled state of the two top-bar buttons comes from the shared Shell.history (the toolbar keeps its own click wiring) */
const SHH = Shell.history({
  undo: () => undo(),
  redo: () => redo(),
  can: () => [hi > 0, hi < hist.length - 1],
  click: false,
  keys: false,
  disCls: 'dis',
  els: () => ({
    undo: $('#sh-top .hist .ic[data-id=undo]'),
    redo: $('#sh-top .hist .ic[data-id=redo]'),
  }),
})
{
  const us0 = updateStates
  updateStates = function () {
    us0()
    SHH.sync()
  }
}

/* ============ v5: ONE minimise component, the same in every floating bar ============
   44 px, arrow-to-edge icon, accent ring, at the END of the bar after a separator. Until it has been used once, a gentle pulse
   re-highlights it every 3 minutes (window.__pulseMinimise() runs it now). Reduced motion: a still ring instead. */
MINS.main = {
  on: () => !document.body.classList.contains('tbhidden') && !R.reading,
  label: () => 'Main bar',
  ic: () => 'pen',
  sh: () => 'Tools',
}
const PULSE = { t: null, off: null }
{
  const sm0 = setMin
  setMin = function (key, on) {
    if (on && !ST.minUsed) {
      ST.minUsed = 1
      $$('.minb.pulse').forEach((b) => b.classList.remove('pulse'))
      clearInterval(PULSE.t)
    }
    return sm0(key, on)
  }
}
function minVisible(b) {
  const s = getComputedStyle(b)
  return (
    b.getClientRects().length > 0 &&
    s.visibility !== 'hidden' &&
    !b.closest('[aria-hidden=true]')
  )
}
function pulseMinimise() {
  if (ST.minUsed) return 0
  const vis = $$('.minb').filter(minVisible)
  vis.forEach((b) => b.classList.add('pulse'))
  if (vis[0]) showTip(vis[0])
  clearTimeout(PULSE.off)
  PULSE.off = setTimeout(() => {
    $$('.minb.pulse').forEach((b) => b.classList.remove('pulse'))
    tip.hidden = true
  }, 4200)
  return vis.length
}
function startPulse() {
  clearInterval(PULSE.t)
  if (!ST.minUsed) PULSE.t = setInterval(pulseMinimise, 180000)
}
window.__pulseMinimise = pulseMinimise

/* a card never runs under the phone tab bar or past the bottom of the screen: its scrolling part takes what room is left */
function fitCard(el) {
  if (!el || !el.classList.contains('show') || pillEdge() === 'bottom') return
  const pane = $('.cpane', el)
  if (!pane) return
  pane.style.maxHeight = ''
  const r = el.getBoundingClientRect(),
    tab =
      innerWidth <= 640
        ? (parseFloat(
            getComputedStyle(document.documentElement).getPropertyValue(
              '--sh-tabbar',
            ),
          ) || 56) + 12
        : 0
  const extra = el.offsetHeight - pane.offsetHeight,
    room = innerHeight - tab - r.top - extra - 10
  if (room < pane.scrollHeight)
    pane.style.maxHeight = Math.max(140, Math.floor(room)) + 'px'
}
