// v7: same probes as v6, locations updated for the v7 cards (Feel sections, Fine-tune, Fountain pen). Was: v6: every v5 probe, rewritten to the feature's NEW home (open the ▾ then find the control) + new layout checks.
// Items removed BY DESIGN in v6 (category row, Professional map banner, in-toolbar layout switch, grip, second minimise, Paper chips in More) become "must be gone" probes.
import fs from 'fs'
import { MAP, mapMd } from './mapping.mjs'
import { chromium } from 'file:///C:/Users/pc/Downloads/learning-notes/node_modules/playwright/index.mjs'
const D =
  'C:/Users/pc/AppData/Local/Temp/claude/4d2a322303203713/e6354cc9-3f84-4a5e-9756-7304491d5da4/scratchpad/'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1180, height: 820 } })
const errs = []
p.on('pageerror', (e) => errs.push('PE ' + e.message))
p.on('console', (m) => {
  if (['error', 'warning'].includes(m.type()) && !/fonts|ERR_/.test(m.text()))
    errs.push(m.type() + ' ' + m.text())
})
await p.goto('file:///' + D + 'v7/toolbar-mock-v7.html')
await p.waitForTimeout(500)
await p.click('[data-sh-mode=pro]')
await p.waitForTimeout(300)
let ROWP = '',
  ROWB = '',
  BOXBOX = '',
  BOXLAY = '',
  FMT = '',
  FMTB = '',
  BOXMENU = '',
  BEGBOX = ''
let found = 0,
  total = 0
const miss = []
const txt = (sel) =>
  p.evaluate(
    (s) =>
      [...document.querySelectorAll(s)]
        .map(
          (e) =>
            (e.textContent || '') +
            ' ' +
            (e.getAttribute('aria-label') || '') +
            ' ' +
            (e.dataset.tip || '') +
            ' ' +
            (e.getAttribute('title') || ''),
        )
        .join(' | '),
    sel,
  )
function chkT(group, t, items) {
  for (const it of items) {
    total++
    const re = new RegExp(it, 'i')
    if (re.test(t)) found++
    else miss.push(group + ': ' + it)
  }
}
async function chk(group, sel, items) {
  chkT(group, await txt(sel), items)
}
async function has(group, name, sel) {
  total++
  if (await p.locator(sel).count()) found++
  else miss.push(group + ': ' + name)
}
async function gone(group, name, sel) {
  total++
  if (
    !(await p.evaluate(
      (s) =>
        [...document.querySelectorAll(s)].some(
          (e) => e.getClientRects().length,
        ),
      sel,
    ))
  )
    found++
  else miss.push(group + ': still present: ' + name)
}
const wait = (n) => p.waitForTimeout(n || 250)
const tool = async (id) => {
  await p.click('#tb [data-id=' + id + ']')
  await wait(200)
}
const openDD = async (id) => {
  await p.click('[data-dd=' + id + ']')
  await wait(300)
}
const closeAll = async () => {
  await p.evaluate(() => closeCards())
  await wait(120)
}
const menuTxt = () =>
  p.evaluate(() => {
    const m = document.querySelector('#more'),
      h = (m.querySelector('.h') || {}).textContent || ''
    return [
      h,
      ...[...m.querySelectorAll('.mrow2,.clab')].map(
        (x) => h + ' ' + x.textContent.trim() + ' | ' + x.textContent.trim(),
      ),
    ].join(' | ')
  })
const menuOf = async (id) => {
  await openDD(id)
  const t = await menuTxt()
  await p.evaluate(() => closeMenu())
  await closeAll()
  return t
}
// text of a card, with every section tab clicked and every small ▾ menu in it opened
async function cardTxt(card) {
  let out = await txt(card + ' *')
  const n = await p.locator(card + ' .ctab').count()
  for (let i = 0; i < n; i++) {
    await p
      .locator(card + ' .ctab')
      .nth(i)
      .click()
    await wait(120)
    out += ' | ' + (await txt(card + ' *'))
  }
  for (const m of await p
    .locator(card + ' [data-m]')
    .evaluateAll((e) => e.map((x) => x.dataset.m))) {
    await p.click(card + ' [data-m="' + m + '"]')
    await wait(200)
    out += ' | ' + (await menuTxt())
    await p.evaluate(() => closeMenu())
  }
  return out
}
const cardOf = async (id, card) => {
  await openDD(id)
  const t = await cardTxt(card || '#acard')
  await closeAll()
  return t
}
async function pickType(n) {
  await openDD('pentype')
  await p.evaluate((n) => {
    ;[...document.querySelectorAll('#more .mrow2')]
      .find((x) => x.textContent.trim() === n)
      .click()
  }, n)
  await wait(200)
}

// ---------------- Pen row ----------------
await tool('pen')
const rowPen = (await txt('#opts *')) + (await txt('#tb *'))
const typeT = await menuOf('pentype'),
  sizeT = await cardOf('size'),
  colT = await cardOf('colour'),
  favT = await cardOf('fav'),
  feelT = await cardOf('feel')
chkT('Pen row', rowPen + typeT + sizeT + colT + favT, [
  'Pen',
  'Ballpoint',
  'Favourites',
  'Brush',
  'Pencil',
  'Marker',
  'Highlighter',
  'Black',
  'Blue',
  'Red',
  'Green',
  'Orange',
  'Purple',
  'Fine',
  'Medium',
  'Bold',
  'Add colour',
  'Feel',
  'Colour',
  'Size',
  'Minimise',
])
await gone('Pen row', 'Move these options (grip is removed)', '#opts .pgrip')
await gone('Pen row', 'More pen options caret is removed', '#opts .more')
total++
await openDD('feel')
if ((await p.textContent('#acard .ch strong')).trim() === 'Feel') found++
else miss.push('Feel card: title Feel')
await closeAll()
chkT('Pen dropdowns', sizeT + colT + favT + feelT, [
  'Exact thickness',
  'Solid',
  'Dashed',
  'Dotted',
  'Add colour',
  'Custom colours|Pick a custom colour',
  'Favourites',
  'Save current',
  'Tip sharpness',
  'Pressure',
  'Stabilisation',
  'Flatness',
  'Tilt widens',
  'Thickness by speed',
  'Reduce latency',
  'Finger can draw',
  'Automatic',
  'Always',
  'Never',
  'Scribble to erase',
  'Circle to lasso',
  'Layers',
  'Draw here',
  'Add layer',
  'Merge top into second',
  'Blank',
  'Lined',
  'Grid',
  'Dots',
  'Fit page',
  'A4',
  'Letter',
  'Zoom',
  'View as drawn',
  'Preview of the current pen',
])
await pickType('Highlighter')
const hS = await cardOf('size'),
  hC = await cardOf('colour'),
  hF = await cardOf('feel'),
  hV = await cardOf('fav')
chkT('Highlighter row', (await txt('#opts *')) + hS + hC, [
  'Yellow',
  'Green',
  'Blue',
  'Pink',
  'Orange',
  'Purple',
  'Fine',
  'Medium',
  'Bold',
])
chkT('Highlighter dropdowns', hS + hC + hF + hV, [
  'Snap to text lines',
  'Draw behind ink',
  'Opacity',
  'Highlight eraser',
  'Save to notes',
  'Favourites',
  'Custom colour',
])
await pickType('Fountain pen')
// ---------------- Eraser row ----------------
await tool('eraser')
const eT =
  (await menuOf('emode')) + (await menuOf('esize')) + (await menuOf('eopt'))
chkT('Eraser', eT + (await txt('#opts *')), [
  'Precise',
  'Standard',
  'Whole stroke',
  'Thin',
  'Medium',
  'Thick',
  'Erase highlights only',
  'Go back to the previous tool',
  'Magnifier',
  'More eraser options',
])
// ---------------- Lasso row ----------------
await tool('lasso')
const lT =
  (await cardOf('lsel', '#lcard')) +
  (await cardOf('lmenu', '#lcard')) +
  (await cardOf('llayers', '#lcard'))
chkT('Lasso dropdowns', (await txt('#opts *')) + lT, [
  'Free-hand',
  'Rectangle',
  'Ink',
  'Pictures',
  'Text',
  'Copy',
  'Cut',
  'Duplicate',
  'Convert to text',
  'Colour',
  'Delete',
  'Thickness',
  'Make card',
  'Add to Summary',
  'Name this drawing',
  'Arrange the menu',
  'Layers',
  'Draw here',
])

const B = await p.evaluate(() => {
  const r = document.querySelector('#paper').getBoundingClientRect()
  return { x: r.left, y: r.top }
})
await p.click('#tb [data-id=pen]')
await p.evaluate(() => {
  R.acard = false
  renderOpts()
})
await p.mouse.move(B.x + 700, B.y + 300)
await p.mouse.down()
await p.mouse.move(B.x + 800, B.y + 340, { steps: 6 })
await p.mouse.up()
await p.evaluate(() => {
  R.rec = performance.now() - 3000
})
await p.mouse.move(B.x + 720, B.y + 400)
await p.mouse.down()
await p.mouse.move(B.x + 800, B.y + 420, { steps: 6 })
await p.mouse.up()
await p.evaluate(() => {
  R.rec = null
})
await p.click('#tb [data-id=lasso]')
await p.mouse.move(B.x + 660, B.y + 280)
await p.mouse.down()
for (const q of [
  [860, 280],
  [860, 460],
  [660, 460],
  [662, 282],
])
  await p.mouse.move(B.x + q[0], B.y + q[1], { steps: 3 })
await p.mouse.up()
await p.waitForTimeout(300)
await p.click('#lsel [data-m=more]')
await p.waitForTimeout(150)
await chk('Lasso ink menu', '#lsel .lm2 *', [
  'selected',
  'Deselect',
  'Copy',
  'Cut',
  'Duplicate',
  'Convert to text',
  'Colour',
  'Delete',
  'Thickness',
  'Make card',
  'Add to Summary',
  'Name this drawing',
  'Paste|More',
  'Play the recording',
  'Screenshot',
  'Copy as picture',
  'Save as picture',
])
await p.evaluate(() => {
  L.boxes = [document.querySelectorAll('.box')[1]]
  calcBBox()
  syncLsel()
})
await p.waitForTimeout(150)
await chk('Mixed menu', '#lsel .lm2 *', [
  'Copy',
  'Cut',
  'Delete',
  'Screenshot of the selection',
  'Make card',
  'Deselect',
])
await p.evaluate(() => {
  L.ids = new Set()
  calcBBox()
  R.lm = { more: true }
  syncLsel()
})
await p.waitForTimeout(150)
await chk('Text menu', '#lsel .lm2 *', [
  'Copy',
  'Cut',
  'Duplicate',
  'Delete',
  'Colour',
  'Key point',
  'Make card',
  'Add to Summary',
  'Save to notes',
  'Move',
  'Scale',
  'Rotate',
  'Screenshot',
  'Convert to text',
])
await p.evaluate(() => {
  addInsert('pic')
  setTool('lasso')
  const bx = [...document.querySelectorAll('.box')].find(
    (b) => b.dataset.t === 'pic',
  )
  L.ids = new Set()
  L.boxes = [bx]
  calcBBox()
  R.lm = { size: true }
  syncLsel()
})
await p.waitForTimeout(200)
await chk('Picture bar', '#lsel .lm2 *', [
  'Copy',
  'Cut',
  'Duplicate',
  'Delete',
  'Resize',
  'Deselect',
  'Smaller',
  'Bigger',
  'Fit width',
  'Original',
  'Fit to page',
  'Edit picture',
])
await p.evaluate(() => {
  R.lm = { edit: true }
  syncLsel()
})
await chk('Edit picture', '#lsel .lm2 *', [
  'Crop',
  'Turn',
  'Straighten',
  'Shapes',
])
await p.evaluate(() => clearLasso())
// ---------------- Text row ----------------
await tool('text')
const rowT = await txt('#opts *')
const boxT = await cardOf('box')
await openDD('box')
await p.click('#acard .ctab[data-tab=box]')
if (!(await p.locator('#acard .fine').count()))
  await p.click('#acard [data-a=fine]')
await wait(150)
BOXBOX = await txt('#acard *')
await p.click('#acard .ctab[data-tab=layout]')
await wait(150)
BOXLAY = await txt('#acard *')
await closeAll()
FMT = await cardOf('format')
const styleT = await menuOf('style'),
  listT = await menuOf('list')
ROWP = rowT
// the box grip menu: two new entries on top, they open the SAME cards (same #acard element, same render function)
await p.evaluate(() => {
  select(document.querySelectorAll('.box')[1])
  updateBoxBar()
})
await wait(250)
await p.click('.box.sel .tab')
await wait(350)
BOXMENU = await menuTxt()
await p.click('#more .mrow2:has-text("Format…")')
await wait(350)
chkT(
  'Box menu > Format… opens the Format card in #acard',
  await txt('#acard.show *'),
  ['Format', 'Font & size', 'Emphasis', 'Advanced'],
)
total++
if (
  await p.evaluate(
    () =>
      V.dd === 'format' &&
      acard.classList.contains('show') &&
      V.anchorEl &&
      V.anchorEl.classList.contains('box'),
  )
)
  found++
else miss.push('Box menu > Format… uses the same card, placed next to the box')
await closeAll()
await p.click('.box.sel .tab')
await wait(350)
await p.click('#more .mrow2:has-text("Box style…")')
await wait(350)
chkT(
  'Box menu > Box style… opens the Box card in #acard',
  await txt('#acard.show *'),
  ['Box', 'Look', 'Border', 'Layout'],
)
total++
if (
  await p.evaluate(
    () => V.dd === 'box' && acard.classList.contains('show') && !!V.anchorEl,
  )
)
  found++
else miss.push('Box menu > Box style… uses the same card')
await closeAll()
await p.evaluate(() => deselect())
chkT('Text row', rowT + boxT, ['Box style', 'Width', 'Layout', 'Format'])
total++
if (
  (await p
    .locator('#opts .v6b')
    .evaluateAll((x) =>
      x.map((y) => y.dataset.dd || y.getAttribute('aria-label')).join(','),
    )) === 'box,format,style,Bold,Italic,list'
)
  found++
else miss.push('Pro Text row order: Box | Format | Style B I List')
total++
if (!(await p.locator('[data-dd=font]').count())) found++
else miss.push('Font button is removed')
chkT('Text aa row', rowT + styleT + listT + FMT, [
  'Title',
  'Heading 1',
  'Heading 2',
  'Heading 3',
  'Body',
  'Bold',
  'Italic',
  'Underline',
  'Text colour',
  'Highlight colour',
  'Bullet',
  'Number',
  'Checklist',
  'Toggle list',
  'Left',
  'Centre',
  'Right',
  'Justify',
])
const TEXTALL = boxT + BOXBOX + BOXLAY + rowT + FMT + styleT + listT
chkT('Text card', TEXTALL, [
  'Font',
  'Default',
  'Serif',
  'Sans',
  'Dyslexia',
  'Literata',
  'Source Serif',
  'Atkinson',
  'Lexend',
  'Caveat',
  'Kalam',
  'Patrick',
  'Shantell',
  '90%',
  '100%',
  '115%',
  '130%',
  '150%',
  'Line height',
  'Tight',
  'Loose',
  'Plain',
  'Quote',
  'Callout',
  'Code block',
  'Strikethrough',
  'Code',
  'Link',
  'Key point',
  'None',
  'Dark',
  'Lime',
  'Peach',
  'White',
  'Red',
  'Yellow',
  'Blue',
  'Slate',
  'Outlined',
  'Outline',
  'Soft card',
  'Sticky note',
  'Shadow card',
  'My presets',
  'Save this style',
  'Background',
  'Border width',
  'Corner radius',
  'Padding',
  'Shadow',
  'Use for new boxes',
  'Reset box style',
  'No border',
  'Thin border',
  'Medium border',
  'Thick border',
  'Border colour',
  'Square corners',
  'Soft corners',
  'Round corners',
  'Tight padding',
  'Normal padding',
  'Roomy padding',
  'Every change shows on the selected box',
  'One box',
  'Two columns',
  'Narrow-wide',
  'Wide-narrow',
  'Three columns',
  '2×2',
  '2×3',
  'Layout Assist',
  'Equalise',
])

await p.evaluate(() => {
  const bx = document.querySelectorAll('.box')[1]
  select(bx)
  updateBoxBar()
})
await chk('Box bar', '#boxbar *', [
  'Style',
  'Duplicate',
  'Cut',
  'Copy',
  'Delete',
  'More',
  'Minimise',
])
await p.evaluate(() => {
  buildSelbar(false)
})
await chk('Mini toolbar', '#selbar *', [
  'Colour',
  'Size',
  'Style',
  'Bold',
  'Italic',
  'Align',
  'List',
  'Highlight',
  'Link',
  'Cut',
  'Copy',
  'Delete',
  'More',
  'Move this bar',
  'Keep this bar',
  'Deselect',
  'Dictate',
  'Minimise',
])
await p.evaluate(() => {
  buildSelbar(true)
})
await chk('Micro bar', '#selbar *', [
  'Move this bar',
  'Text colour',
  'Size',
  'Style',
  'Bold',
  'Italic',
  'Align',
  'List',
  'Highlight',
  'More',
  'Dictate',
  'Minimise',
])
await chk('Keyboard bar', '#kbbar *', [
  'Outdent',
  'Indent',
  'Bullets',
  'Numbers',
  'Checklist',
  'Align',
  'Underline',
  'Strike',
  'Hide keyboard',
  'Minimise',
])
await p.evaluate(() => {
  buildSelbar(false)
  selbar.hidden = false
})
await p.evaluate(() => {
  selbar.style.top = '200px'
  selbar.style.left = '200px'
})
await p.click('#selbar [data-c=more]')
await chk('Mini More menu', '#more *', [
  'Paste',
  'Make card',
  'Add to Summary',
  'Key point',
  'Save to notes',
])
await p.keyboard.press('Escape')
// ---------------- Insert ▾ ----------------
await p.click('#tb [data-dd=insert]')
await wait(300)
const insT = await cardTxt('#acard')
chkT('Insert card', insT, [
  'Table',
  'Picture',
  'Callout',
  'Recall card',
  'Text box',
  'Link',
  'Insert',
  'Camera',
  'File or PDF',
  'Write pad',
  'Handwriting',
  'Audio',
  'Divider',
  'Page link',
  'Database',
  'Mind map',
  'Insert template',
  'Save as template',
  'Summary',
  'To Home',
  'Mic',
])
await closeAll()
// ---------------- Main bar + More ----------------
await p.click('#tb [data-id=more]')
await wait(300)
const moreT = await txt('#morecard *')
chkT('Main bar', (await txt('#tb *')) + moreT + insT, [
  'Undo',
  'Redo',
  'Text',
  'Pen',
  'Eraser',
  'Lasso',
  'Last tool|Back to',
  'Insert',
  'New line',
  'Backspace',
  'Keyboard',
  'Mic',
  'More',
])
chkT('More card', moreT, [
  'View',
  'Reading mode',
  'Focus mode',
  'Write & input',
  'Keyboard stays hidden',
  'Copy & paste',
  'Copy',
  'Cut',
  'Paste',
  'Layout & settings',
  'Toolbar layouts',
  'Customise toolbar',
  'Toolbar settings',
  'Hide toolbar',
  'Help',
  'Where things live',
  'Search',
])
await p.click('#morecard [data-z=help]')
await wait(300)
await chk('Help', '#sheet *', [
  'Where things live',
  'Main bar',
  'Insert',
  'Eraser',
  'Lasso',
  'Beginner and Professional',
])
await p.evaluate(() => closeSheet())
await gone(
  'More card',
  'Paper style chips (paper style lives only in Feel)',
  '#morecard [data-z=paper]',
)
await gone(
  'More card',
  'Paper, layers and zoom row (Layers live in Feel)',
  '#morecard [data-z=page]',
)
await p.keyboard.press('Escape')
await p.evaluate(() => closeCards())

await p.evaluate(() => settingsSheet())
await chk('Settings', '#sheet *', [
  'Pencil picks the Pen',
  'Tool bar: finger only',
  'Pencil writes text',
  'Pencil can scroll',
  'Pencil hold time',
  'New line extras',
  'New line hold time',
])
await p.evaluate(() => closeSheet())
await p.evaluate(() => toggleReading(true))
await chk('Reader bar', '#rbar *', [
  'Reading look',
  'Full reader',
  'Line focus',
  'Read aloud',
  'Contents',
  'Hide blanks',
  'Find',
  'Lock to reading',
  'Exit',
])
await p.evaluate(() => readSheet())
await chk('Read Aa', '#sheet *', [
  'Font',
  'Spacing',
  'Margin',
  'Width',
  'Flow',
  'Themes',
  'All settings',
])
await p.evaluate(() => {
  closeSheet()
  toggleReading(false)
})
await p.click('#tb [data-dd=insert]')
await wait(300)
await p.click('#acard [data-v=mic]')
await wait(250)
await chk('Mini keys', '#strip *', [
  'Move the keys',
  'Speak to type',
  'Enter',
  'Backspace',
  'Minimise',
])
await p.evaluate(() => {
  toggleStrip()
})
await closeAll()
// ---------------- the old All tools row: every item now has a home inside a ▾ or More ----------------
await gone('Removed by design', 'category row (All tools)', '#all')
await gone('Removed by design', 'Professional map banner', '#pmap')
await gone('Removed by design', 'layout switch inside the toolbar', '#layBtn')
await gone('Removed by design', 'grip on the tool row', '.pgrip')
total++
if (
  (await p
    .locator('.minb')
    .evaluateAll((e) => e.filter((x) => x.closest('#barbox')).length)) === 1
)
  found++
else miss.push('Removed by design: exactly ONE minimise in the toolbar')
await tool('shapes')
const shapeT = await menuOf('shape')
await p.click('#tb [data-id=more]')
await wait(300)
const MOREALL = await txt('#morecard *')
await p.evaluate(() => closeCards())
const ALL = {
  Text: [
    ['Box style', 'Box style'],
    ['Plain look', 'Plain'],
    ['Outline look', 'Outline'],
    ['Soft card look', 'Soft card'],
    ['Sticky note look', 'Sticky note'],
    ['Callout look', 'Callout'],
    ['Shadow card look', 'Shadow card'],
    ['Layout', 'Layout'],
    ['Two columns', 'Two columns'],
    ['Three columns', 'Three columns'],
    ['Auto width', 'Auto'],
    ['Full width', 'Wide'],
    ['Font', 'Font'],
    ['Smaller text', '90%'],
    ['Larger text', '150%'],
    ['Title', 'Title'],
    ['Heading 1', 'Heading 1'],
    ['Heading 2', 'Heading 2'],
    ['Heading 3', 'Heading 3'],
    ['Body text', 'Body'],
    ['Bullet list', 'Bullets'],
    ['Star list', 'Star list'],
    ['Numbered list', 'Numbers'],
    ['Checklist', 'Checklist'],
    ['Toggle list', 'Toggle list'],
    ['Bold', 'Bold'],
    ['Italic', 'Italic'],
    ['Underline', 'Underline'],
    ['Strikethrough', 'Strikethrough'],
    ['Text colour', 'Text colour'],
    ['Highlight', 'Highlight colour'],
    ['Indent', 'Indent'],
    ['Outdent', 'Outdent'],
    ['Align left', 'Left'],
    ['Align centre', 'Centre'],
    ['Align right', 'Right'],
    ['Quote', 'Quote'],
    ['Callout', 'Callout'],
    ['Code block', 'Code block'],
    ['Inline code', 'Inline code'],
    ['Divider', 'Divider'],
  ],
  Pen: [
    'Pen',
    'Ballpoint',
    'Brush',
    'Pencil',
    'Marker',
    'Highlighter',
    'Black ink',
    'Blue ink',
    'Red ink',
    'Green ink',
    'Orange ink',
    'Purple ink',
    'Custom colours',
    'Favourites',
    'Fine',
    'Medium',
    ['Bold line', 'Bold'],
    'Exact thickness',
    'Solid',
    'Dashed',
    'Dotted',
    ['Feel & pressure', 'Pressure'],
    ['Finger & gestures', 'Finger can draw'],
    'Layers',
    ['Blank paper', 'Blank'],
    ['Lined paper', 'Lined'],
    ['Grid paper', 'Grid'],
    ['Dotted paper', 'Dots'],
    ['Paper size & zoom', 'Paper size'],
    'View as drawn',
  ],
  Insert: [
    'Camera',
    'Divider',
    ['File', 'File or PDF'],
    ['Audio clip', 'Audio'],
  ],
  'Shapes & aids': [
    'Freehand',
    'Line',
    'Arrow',
    'Box',
    'Oval',
    'Triangle',
    'Tape',
    'Draw and hold',
    'Snap shapes',
    'Fill closed shapes',
    'Ruler',
    'Magnifier',
    'Colour picker',
  ],
  View: ['Zoom in', 'Zoom out', 'Fit width', 'Grid lines', 'Dark mode'],
  Study: ['Summary', 'Quiz me', 'Flashcards', 'Mark key term', 'Review today'],
  File: [
    'Export PDF',
    'Share',
    'Duplicate page',
    'Move page',
    'Version history',
  ],
}
const BLOB = {
  Text: TEXTALL,
  Pen: rowPen + typeT + sizeT + colT + favT + feelT,
  Insert: insT,
  'Shapes & aids': shapeT + feelT + colT,
  View: MOREALL,
  Study: MOREALL,
  File: MOREALL,
}
for (const t of Object.keys(ALL))
  for (const it of ALL[t]) {
    const [nm, re] = Array.isArray(it) ? it : [it, it]
    chkT('Old All tools > ' + t, BLOB[t], [re])
  }
// the removed Insert > Drawing items must not be back in the Insert card
total++
if (!/Drawing|Shape|Ruler|Magnifier|Tape/.test(insT)) found++
else miss.push('Insert card still has Drawing items')
await tool('text')
await p.click('#tb [data-id=more]')
await wait(250)
await p.click('#morecard [data-z=lay]')
await wait(300)
await chk('Layouts card', '#laycard *', [
  'Beginner',
  'Professional',
  'New layout',
  'Rename',
  'Duplicate',
  'Reset to default',
  'Delete',
  'Use this layout',
  'Cancel',
])
await p.keyboard.press('Escape')
await p.evaluate(() => closeCards())

const V4F = found,
  V4T = total
// ---------- v5 additions ----------
// Elements (Insert ▾ > Elements)
await p.click('#tb [data-dd=insert]')
await wait(250)
await chk('Insert (v5)', '#acard *', ['Elements'])
await p.click('#acard [data-v=elements]')
await wait(300)
await chk('Elements card', '#elcard *', [
  'Elements',
  'Edit',
  'Search elements',
  'Recent',
  'Study',
  'Arrows',
  'Emoji',
  'Badges',
  'GIFs',
  'Mine',
  'Close',
])
const ELN = {
  Study: [
    'Big idea',
    'Warning',
    'Question',
    'Well done',
    'Favourite',
    'Book',
    'Goal',
    'Deadline',
  ],
  Arrows: [
    'Arrow right',
    'Arrow left',
    'Arrow up',
    'Arrow down',
    'Bent arrow',
    'Curved arrow',
    'Diagonal arrow',
    'Loop arrows',
  ],
  Emoji: [
    'Smile',
    'Love it',
    'Party',
    'Thumbs up',
    'On fire',
    'Brain',
    'Rocket',
    'Wow',
  ],
  Badges: [
    'Must know',
    'Revise',
    'Easy',
    'Hard',
    'Exam',
    'New',
    'Mastered',
    'Tricky',
  ],
  GIFs: [
    'Spinning star',
    'Beating heart',
    'Bouncing ball',
    'Sparkles',
    'Waving hand',
    'Confetti',
  ],
}
for (const k of Object.keys(ELN)) {
  await p.click('#elcard .ctab[data-cat=' + k + ']')
  await wait(100)
  await chk('Elements ' + k, '#elcard .eltile', ELN[k])
}
await p.click('#elcard [data-el=edit]')
await wait(150)
await chk('Elements edit', '#elcard *', [
  'Done',
  'Move',
  'Rename',
  'Delete',
  'Add your own',
])
await p.click('#elcard [data-el=edit]')
await p.fill('#elQ', 'arrow')
await wait(100)
await chk('Elements search', '#elcard *', [
  'Clear search',
  'Arrow right',
  'Loop arrows',
])
await p.click('#elClr')
await p.click('#elcard [data-el=close]')
await p.evaluate(() => elInsert('el-bulb'))
await p.click('#tb [data-dd=insert]')
await wait(250)
await p.click('#acard [data-v=elements]')
await wait(300)
await p.click('#elcard .ctab[data-cat=Recent]')
await wait(150)
await chk('Recent elements row', '#elcard *', ['Recent', 'Big idea'])
await closeAll()
total++
if (await p.evaluate(() => typeof ACHIP['See all elements'] !== 'undefined'))
  found++
else miss.push('See all elements hook')
// Beginner
await p.click('[data-sh-mode=beg]')
await wait(300)
await tool('pen')
const bT = await menuOf('pentype')
await openDD('feel')
await wait(200)
chkT(
  'Beginner Feel card',
  (await txt('#acard *')) + bT + (await txt('#opts *')),
  [
    'Pen type',
    'Pen',
    'Ballpoint',
    'Brush',
    'Pencil',
    'Marker',
    'Highlighter',
    'Pressure',
    'Stabilisation',
    'Settings',
    'Pen settings',
    'Writing aids',
    'Math assist',
    'Page style',
    'Preview of the current pen',
  ],
)
await p.click('#acard [data-v7=tune]')
await wait(
  200,
) /* v7: Pen settings = the Fine-tune row in the Feel section; Line style is a 3-way control there */
let lsT = ''
chkT('Beginner Pen settings', (await txt('#acard *')) + lsT, [
  'Exact thickness',
  'Solid',
  'Dashed',
  'Dotted',
  'Tip sharpness',
  'Tilt widens the line',
  'Thickness by speed',
])
await p.click('#acard [data-v7=tune]')
await wait(150)
await p.click('#acard [data-v7seg="feel:aids"]')
await wait(250)
await chk('Beginner Writing aids', '#acard *', [
  'Finger can draw',
  'Automatic',
  'Always',
  'Never',
  'Scribble to erase',
  'Circle to lasso',
  'Reduce latency',
])
await p.click('#acard [data-v7seg="feel:math"]')
await wait(250)
const bMath = await txt('#acard *')
await chk('Beginner Math assist', '#acard *', [
  'Ruler',
  'Magnifier',
  'Draw and hold',
])
await closeAll()
await tool('shapes')
const bShape = await menuOf('shape')
chkT('Beginner Shape ▾ (Draw as)', bShape, [
  'Draw as',
  'Freehand',
  'Line',
  'Arrow',
  'Rectangle',
  'Circle',
])
chkT('Beginner Draw shape', (await txt('#opts *')) + bMath + bShape, [
  'Shapes',
  'Draw and hold',
  'Snap shapes',
  'Fill closed shapes',
  'Shape',
  'Ruler',
])
chkT(
  'Professional-only shapes (Box, Oval, Triangle, Tape) are inside the Pro Shape ▾',
  shapeT,
  ['Box', 'Oval', 'Triangle', 'Tape'],
)
await chk('Beginner main bar', '#tb *', ['Undo', 'Redo', 'Minimise'])
await tool('text')
ROWB = await txt('#opts *')
FMTB = await cardOf('format')
await openDD('box')
BEGBOX = await menuTxt()
await closeAll()
gone(
  'Beginner Text row',
  'Style/List quick picks hidden in Beginner',
  '[data-dd=style],[data-dd=list]',
)
await has(
  'Minimise',
  'one minimise at the end of the main bar',
  '#tb .minsep + .minb',
)
await gone('Minimise', 'no minimise on the tool row', '#opts .minb')

// ---------- mapping.md: one probe per row ----------
const BL = {
  ROWP,
  ROWB,
  BOXBOX,
  BOXLAY,
  FMT,
  FMTB,
  STYLE: styleT,
  LIST: listT,
  BOXMENU,
  BEGBOX,
}
fs.writeFileSync(D + 'v7/mapping.md', mapMd())
const V6M0 = found,
  V6M1 = total
for (const [o, old, nw, k, re] of MAP) {
  total++
  if (new RegExp(re, 'i').test(BL[k] || '')) found++
  else
    miss.push('Mapping: ' + o + ' -> ' + nw + ' (' + k + ' lacks ' + re + ')')
}
const MAPN = total - V6M1
// ---------- NEW v6 layout checks ----------
const V5T = found,
  V5N = total
async function layoutChecks(W, H, mode) {
  await p.setViewportSize({ width: W, height: H })
  await p.click('[data-sh-mode=' + mode + ']')
  await wait(400)
  for (const t of ['text', 'pen', 'eraser', 'shapes', 'lasso']) {
    await tool(t)
    const r = await p.evaluate(() => {
      const bb = document.querySelector('#barbox'),
        over = [...bb.querySelectorAll('*')]
          .filter(
            (e) =>
              e.getClientRects().length &&
              e.scrollWidth > e.clientWidth + 1 &&
              getComputedStyle(e).display !== 'inline' &&
              e.clientWidth > 0,
          )
          .map((e) => e.className + ':' + e.scrollWidth + '>' + e.clientWidth)
      return {
        over,
        h: Math.round(bb.getBoundingClientRect().height),
        sw: document.documentElement.scrollWidth,
        iw: innerWidth,
      }
    })
    total++
    if (r.over.length === 0 && r.sw <= r.iw) found++
    else
      miss.push(
        'No horizontal scroll/overflow (' +
          mode +
          ' ' +
          t +
          ' @' +
          W +
          '): ' +
          JSON.stringify(r),
      )
    total++
    if (r.h <= 98) found++
    else
      miss.push(
        'Toolbar height <= ~96 (' + mode + ' ' + t + ' @' + W + '): ' + r.h,
      )
  }
}
await layoutChecks(1180, 820, 'beg')
await layoutChecks(1180, 820, 'pro')
await layoutChecks(820, 1180, 'beg')
await layoutChecks(820, 1180, 'pro')
// every dropdown has a close button and 44 px buttons; no control twice across rows + More
await p.setViewportSize({ width: 1180, height: 820 })
const DDS = {
  text: ['box', 'format', 'style', 'list'],
  pen: ['pentype', 'size', 'colour', 'feel', 'fav'],
  eraser: ['emode', 'esize', 'eopt'],
  shapes: ['shape', 'size', 'colour'],
  lasso: ['lsel', 'lmenu', 'llayers', 'lshape', 'lact'],
}
for (const mode of ['beg', 'pro']) {
  await p.click('[data-sh-mode=' + mode + ']')
  await wait(400)
  for (const t of Object.keys(DDS)) {
    await tool(t)
    for (const id of DDS[t]) {
      if (!(await p.locator('[data-dd=' + id + ']').count())) continue
      await openDD(id)
      const r = await p.evaluate(() => {
        const els = ['#more', '#acard', '#lcard', '#elcard', '#morecard']
          .map((s) => document.querySelector(s))
          .filter((e) => e && e.classList.contains('show'))
        if (!els.length) return null
        const e = els[0]
        const xs = [...e.querySelectorAll('button,[role=switch]')].filter(
          (x) => x.getClientRects().length && !x.disabled,
        )
        const small = xs
          .filter((x) => {
            const q = x.getBoundingClientRect()
            return q.width > 0 && (q.height < 43.5 || q.width < 43.5)
          })
          .map(
            (x) =>
              (x.getAttribute('aria-label') || x.textContent.trim()).slice(
                0,
                24,
              ) +
              ' ' +
              Math.round(x.getBoundingClientRect().width) +
              'x' +
              Math.round(x.getBoundingClientRect().height),
          )
        return {
          id: e.id,
          close: !!e.querySelector(
            '.ch [data-a=close],.ch [data-l=close],.ch [data-mx],.ch [data-g=x],.ch [data-z=x],.ch [data-el=close]',
          ),
          small,
        }
      })
      total++
      if (r && r.close) found++
      else
        miss.push(
          'Dropdown has a close button (' + mode + ' ' + t + ' ' + id + ')',
        )
      total++
      if (r && r.small.length === 0) found++
      else
        miss.push(
          'Dropdown buttons >= 44px (' +
            mode +
            ' ' +
            t +
            ' ' +
            id +
            '): ' +
            (r && r.small.slice(0, 4).join('; ')),
        )
      await p.evaluate(() => closeCards())
      await wait(100)
    }
    // no duplicate labels across the row(s) and More
    await p.click('#tb [data-id=more]')
    await wait(250)
    const dup = await p.evaluate(() => {
      const labs = [
        ...document.querySelectorAll(
          '#tb button,#opts button,#morecard button.mrow,#morecard .chip,#morecard .tile',
        ),
      ]
        .filter((e) => e.getClientRects().length)
        .map((e) =>
          (e.getAttribute('aria-label') || e.textContent)
            .trim()
            .replace(/:.*$/, ''),
        )
        .filter(Boolean)
        .filter((l) => !['Style', 'List', 'Bold', 'Italic'].includes(l))
      const c = {}
      labs.forEach((l) => (c[l] = (c[l] || 0) + 1))
      return Object.entries(c)
        .filter(([k, v]) => v > 1)
        .map(([k, v]) => k + 'x' + v)
    })
    total++
    if (dup.length === 0) found++
    else
      miss.push(
        'No duplicate control labels (' +
          mode +
          ' ' +
          t +
          '): ' +
          dup.join(', '),
      )
    await p.evaluate(() => closeCards())
  }
}
console.log(
  'REMOVED BY DESIGN (verified gone above): category row, Professional map banner, layout switch, grips, extra minimise buttons, Paper chips in More',
)
console.log('COVERAGE v5-equivalent probes', V5T + '/' + V5N)
console.log('COVERAGE new v6 layout probes', found - V5T + '/' + (total - V5N))
console.log('MAPPING rows', MAPN, 'passed', found - V6M0 - 0)
console.log('COVERAGE total', found + '/' + total)
console.log('COVERAGE', found + '/' + total)
console.log('MISSING:\n' + miss.join('\n'))
console.log('ERRORS:\n' + errs.join('\n'))
await b.close()
