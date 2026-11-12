/* ============ v5: Beginner Draw shape card: tiny ============
   One main switch. "Advanced options" opens two more. The shape list, ruler and magnifier stay one step away (Pen card > Math assist).
   Professional keeps every shape option in Pen > More and in All tools > Shapes & aids. */
const BS = { adv: false }
function renderBeg() {
  if (!BC.open) return
  const a = $('#tb [data-id=shapes]')
  if (!a) {
    begClose()
    return
  }
  const sw = (k, t, sub, on) =>
    '<button class="mrow" role="switch" aria-checked="' +
    !!on +
    '" data-g="' +
    k +
    '" aria-label="' +
    t +
    '"><span class="mt"><b>' +
    t +
    '</b>' +
    (sub ? '<i>' + sub + '</i>' : '') +
    '</span><span class="sw2" aria-hidden="true"></span></button>'
  begcard.innerHTML =
    '<div class="ch"><strong>Draw shape</strong><button class="sq" data-g="x" aria-label="Close">✕</button></div><div class="cpane">' +
    sw(
      'hold',
      'Draw shape',
      'Hold your pen still at the end of a line and it snaps to a clean shape.',
      PN.hold,
    ) +
    '<button class="abtn disc" data-g="adv" aria-expanded="' +
    BS.adv +
    '">' +
    svg('sliders') +
    '<span>Advanced options</span>' +
    svg('chevD') +
    '</button>' +
    (BS.adv
      ? '<div class="bsadv">' +
        sw(
          'snap',
          'Snap shapes',
          'Corners and edges line up with each other.',
          PN.snap,
        ) +
        sw(
          'fill',
          'Fill closed shapes',
          'Boxes, circles and triangles are filled with colour.',
          PN.fill,
        ) +
        '</div>'
      : '') +
    '<button class="mrow bsmore" data-g="more" aria-label="Pick a shape or use the ruler">' +
    svg('shapes') +
    '<span class="mt"><b>Pick a shape or use the ruler</b></span>' +
    svg('chevR') +
    '</button></div>'
  begcard.classList.add('show')
  begcard.setAttribute('aria-hidden', 'false')
  const r = a.getBoundingClientRect(),
    w = begcard.offsetWidth
  begcard.style.top = r.bottom + 8 + 'px'
  begcard.style.left =
    Math.max(8, Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - 8)) +
    'px'
}
begcard.addEventListener('click', (e) => {
  const b = e.target.closest('[data-g]')
  if (!b) return
  const k = b.dataset.g
  if (k === 'hold' || k === 'snap' || k === 'fill') {
    PN[k] = !PN[k]
    save()
    renderBeg()
  } else if (k === 'adv') {
    BS.adv = !BS.adv
    renderBeg()
  } else if (k === 'more') {
    begClose()
    if (R.tool !== 'pen') setTool('pen')
    BP.view = 'math'
    R.acard = true
    R.tabIn = true
    renderOpts()
    R.tabIn = false
  }
})
