const $ = (s, r = document) => r.querySelector(s),
  $$ = (s, r = document) => [...r.querySelectorAll(s)]
const { ic, esc } = Shell
const T = (m, u) => Shell.toast(m, u)
/* extra icons (same 1.6 stroke style); only added when the shell has no icon of that name */
const X = {
  link: '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
  inbox:
    '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.1z"/>',
  note: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>',
  bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  ext: '<path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  play: '<path d="M7 4l13 8-13 8z"/>',
  wand: '<path d="M15 4V2M15 10V8M11 6H9M21 6h-2M18 9l1.5 1.5M18 3l1.5-1.5M3 21 14 10l-1-1L2 20z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
  image:
    '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
  audio:
    '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/>',
  video:
    '<rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 5 3-5 3z"/>',
  text: '<path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/>',
  cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z"/>',
  book: '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
  map: '<circle cx="12" cy="12" r="2.5"/><circle cx="5" cy="6" r="2"/><circle cx="5" cy="18" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><path d="M10 11 6.5 7.5M10 13l-3.5 3.5M14 11l3.5-3.5M14 13l3.5 3.5"/>',
  rupee:
    '<circle cx="12" cy="12" r="9"/><path d="M9 8h6M9 11h6M9 8c3 0 4 1.5 4 3s-1 3-4 3l4 3"/>',
  key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.3-9.3M17 6l3 3M14 9l2 2"/>',
  plug: '<path d="M12 22v-5"/><path d="M9 8V2M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8z"/>',
  cpu: '<rect x="5" y="5" width="14" height="14" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v4M15 1v4M9 19v4M15 19v4M1 9h4M1 15h4M19 9h4M19 15h4"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  folder:
    '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z"/>',
  quiz: '<circle cx="12" cy="12" r="9"/><path d="M9.2 9a3 3 0 0 1 5.6 1c0 2-3 2.3-3 4"/><path d="M12 17h.01"/>',
}
for (const k in X) if (!Shell.I[k]) Shell.I[k] = X[k]
Shell.SPACES.push(['ai', 'AI'])
Shell.I.aiA = Shell.I.sparkle
const IC = (n) => ic(n)

/* ---------- plain data ---------- */
const NBS = [
  'Product thinking',
  'Habits and focus',
  'Biology 101',
  'Reading list',
]
const SECS = ['Videos', 'Key ideas', 'To revisit']
const TYPES = [
  ['file', 'file', 'File', 'PDF, Word, slides'],
  ['link', 'link', 'Link', 'An article or post'],
  ['yt', 'video', 'YouTube', 'Transcript and frames'],
  ['note', 'note', 'Write a note', 'Type it here'],
  ['text', 'text', 'Paste text', 'Copy and paste'],
  ['img', 'image', 'Image', 'A photo or screenshot'],
  ['audio', 'audio', 'Audio', 'A recording'],
  ['drive', 'cloud', 'Google Drive', 'Pick from Drive'],
  ['mine', 'book', 'My notebooks and books', 'What you already have'],
]
const PASS = {
  s1: [
    {
      loc: '04:12',
      pre: 'People think they need a bigger goal. ',
      hit: 'The cue matters more than the goal. Attach the new habit to something you already do every day',
      post: ', and it starts to run by itself.',
    },
  ],
  s2: [
    {
      loc: 'Page 38',
      pre: 'Make it easy to begin. ',
      hit: 'Start with a habit so small that it takes two minutes or less',
      post: '. You can build from there once showing up is automatic.',
    },
  ],
  s3: [
    {
      loc: 'Highlights',
      pre: 'Tiny steps beat big plans. ',
      hit: 'Tie every new habit to one thing you already do',
      post: '. Review it every Sunday.',
    },
  ],
  s4: [
    {
      loc: 'Paragraph 3',
      pre: 'Small changes feel pointless at first. ',
      hit: 'Getting 1% better each day adds up to a very large change over a year',
      post: '.',
    },
  ],
  s5: [
    {
      loc: 'Line 2',
      pre: 'Morning: ',
      hit: 'Water, then one page of reading, then the plan for the day',
      post: '. Keep it the same every day.',
    },
  ],
  s6: [
    {
      loc: 'Slide 7',
      pre: 'Spacing helps memory. ',
      hit: 'Reviewing after one day, one week and one month keeps facts for good',
      post: '.',
    },
  ],
}
const MODELS = [
  {
    id: 'conn',
    n: 'Claude via connector',
    d: 'Uses your own Claude plan. First choice, always free.',
    tier: 'all',
    rate: 0,
    badge: 'Free',
  },
  {
    id: 'opus',
    n: 'Claude Opus',
    d: 'Best for planning and hard problems.',
    tier: 'top',
    rate: 4,
    badge: '$$$',
    prov: 'anthropic',
  },
  {
    id: 'gpro',
    n: 'Gemini Pro',
    d: 'Strong all-rounder for long sources.',
    tier: 'top',
    rate: 3.4,
    badge: '$$$',
    prov: 'google',
  },
  {
    id: 'sonnet',
    n: 'Claude Sonnet',
    d: 'Good writing at a middle price.',
    tier: 'mid',
    rate: 1.2,
    badge: '$$',
    prov: 'anthropic',
  },
  {
    id: 'haiku',
    n: 'Claude Haiku',
    d: 'Fast and cheap for simple jobs.',
    tier: 'small',
    rate: 0.15,
    badge: '$',
    prov: 'anthropic',
  },
  {
    id: 'flash',
    n: 'Gemini Flash',
    d: 'Very cheap for tags and cards.',
    tier: 'small',
    rate: 0.1,
    badge: '$',
    prov: 'google',
  },
]
const TIERS = {
  top: ['Top', 'planning'],
  mid: ['Middle', 'writing'],
  small: ['Small', 'simple jobs'],
}
const TASK = {
  chat: { size: 1, tier: 'mid', n: 'question' },
  notes: { size: 4, tier: 'mid', n: 'notes' },
  map: { size: 2, tier: 'top', n: 'mind map' },
  cards: { size: 3, tier: 'small', n: 'cards' },
  quiz: { size: 2, tier: 'small', n: 'quiz' },
  summary: { size: 2, tier: 'mid', n: 'summary' },
  job: { size: 8, tier: 'top', n: 'job' },
  wf: { size: 5, tier: 'mid', n: 'workflow' },
  qp: { size: 1, tier: 'small', n: 'quick question' },
}
const SUGS = [
  {
    id: 'g1',
    wf: 'w1',
    t: 'Skip the “keep it short” line',
    d: 'Claude already writes short notes now. Removing this line saves cost and gives the same result.',
  },
  {
    id: 'g2',
    wf: 'w3',
    t: 'Ask for source times',
    d: 'Add “name the time of each idea”. Citations get easier to check.',
  },
]
const WFS = [
  {
    id: 'w1',
    n: 'Video to notes with frames',
    tags: ['video', 'notes'],
    ai: 'Claude',
    jt: 'Video',
    star: 4.8,
    uses: 42,
    my: 0,
    p: 'Read the transcript. Write clear notes with headings. Put each frame under the idea it shows. Keep it short.',
  },
  {
    id: 'w2',
    n: 'Article to Library summary',
    tags: ['article', 'summary'],
    ai: 'Claude',
    jt: 'Article',
    star: 4.5,
    uses: 31,
    my: 0,
    p: 'Summarise the article in six lines. Name the author and date. Add three tags.',
  },
  {
    id: 'w3',
    n: 'Chapter to recall cards',
    tags: ['cards', 'book'],
    ai: 'Any',
    jt: 'Book',
    star: 4.2,
    uses: 18,
    my: 0,
    p: 'Turn the chapter into question and answer cards. One idea per card.',
  },
  {
    id: 'w4',
    n: 'Lecture to mind map',
    tags: ['map', 'study'],
    ai: 'Claude',
    jt: 'Audio',
    star: 3.9,
    uses: 9,
    my: 0,
    p: 'Find the main topic and four to six branches. Keep every label under five words.',
  },
  {
    id: 'w5',
    n: 'Podcast to key points',
    tags: ['audio', 'summary'],
    ai: 'Any',
    jt: 'Audio',
    star: 4.6,
    uses: 27,
    my: 0,
    p: 'List the main points with the time of each.',
  },
  {
    id: 'w6',
    n: 'Book chapter to mind map',
    tags: ['book', 'map'],
    ai: 'Claude',
    jt: 'Book',
    star: 4.4,
    uses: 12,
    my: 0,
    p: 'Draw the chapter as a mind map with short labels.',
  },
  {
    id: 'w7',
    n: 'Video to recall cards',
    tags: ['video', 'cards'],
    ai: 'Claude',
    jt: 'Video',
    star: 4.1,
    uses: 22,
    my: 0,
    p: 'Make one card per idea in the video.',
  },
  {
    id: 'w8',
    n: 'Article to notes and tags',
    tags: ['article', 'notes'],
    ai: 'Any',
    jt: 'Article',
    star: 3.6,
    uses: 6,
    my: 0,
    p: 'Write short notes and add three tags.',
  },
]

/* ---------- state ---------- */
const S = {
  tab: 'build',
  pane: 'chat',
  src: [
    {
      id: 's1',
      t: 'Why habits stick',
      k: 'video',
      m: 'YouTube · 18:42 · 6 frames',
      on: true,
    },
    {
      id: 's2',
      t: 'Atomic Habits',
      k: 'book',
      m: 'Book · 12 highlights',
      on: true,
    },
    {
      id: 's3',
      t: 'Habits and focus',
      k: 'folder',
      m: 'Notebook · 24 pages',
      on: true,
    },
    {
      id: 's4',
      t: 'The 1% better idea',
      k: 'link',
      m: 'Link · article',
      on: false,
    },
    {
      id: 's5',
      t: 'My morning routine',
      k: 'text',
      m: 'Pasted text · 140 words',
      on: false,
    },
    {
      id: 's6',
      t: 'lecture-slides.pdf',
      k: 'file',
      m: 'File · 32 slides',
      on: false,
    },
  ],
  chat: [
    { r: 'u', t: 'What do my sources say about making a habit stick?' },
    {
      r: 'a',
      t: [
        'Your sources agree on one idea: make the habit tiny and tie it to something you already do.',
        'The video adds that the cue matters more than the goal.',
      ],
      c: [
        ['s2', 0],
        ['s1', 0],
        ['s3', 0],
      ],
      saved: false,
    },
  ],
  draft: '',
  out: [
    { id: 'o1', k: 'summary', t: 'Summary' },
    { id: 'o2', k: 'map', t: 'Mind map' },
  ],
  model: { mode: 'auto', exact: 'conn' },
  conn: { claude: true, drive: false, ext: false },
  keys: { or: null, anthropic: null, google: null },
  cost: {
    monthly: 0,
    warn: true,
    hard: true,
    perJob: false,
    perJobVal: 50,
    ask: true,
    askVal: 10,
    est: true,
    hist: true,
  },
  auto: false,
  spent: 0,
  usage: [
    {
      d: 'Today 09:14',
      w: 'Job: Why habits stick',
      m: 'Claude via connector',
      c: 0,
      tok: '31k',
    },
    {
      d: 'Today 08:50',
      w: 'Tags for 14 highlights',
      m: 'Claude via connector',
      c: 0,
      tok: '6k',
    },
    {
      d: 'Yesterday 21:30',
      w: 'Question in chat',
      m: 'Claude via connector',
      c: 0,
      tok: '3k',
    },
    {
      d: 'Yesterday 18:05',
      w: 'Cards from Sleep chapter 2',
      m: 'Claude via connector',
      c: 0,
      tok: '9k',
    },
  ],
  J: {
    from: 'ticked',
    wf: 'w1',
    dest: 'nb',
    nb: 'Habits and focus',
    sec: 'Videos',
    remember: true,
    adv: false,
    running: false,
    preview: null,
  },
  paths: [
    { tag: 'focus', path: 'Habits and focus › Key ideas' },
    { tag: 'biology', path: 'Biology 101 › Videos' },
  ],
  wfs: WFS.map((w, i) =>
    Object.assign({ last: [1, 3, 6, 9, 2, 12, 4, 20][i] || 5 }, w),
  ),
  sug: SUGS.slice(),
  wq: '',
  wtag: '',
  act: [
    {
      id: 'a1',
      t: 'Created notes for “Why habits stick”',
      d: 'Habits and focus › Videos · 6 frames, 1 mind map, 8 cards',
      w: 'Today, 09:14',
      ico: 'note',
      un: false,
    },
    {
      id: 'a2',
      t: 'Added tags to 14 highlights',
      d: 'habits, identity, focus · all were tags you accepted before',
      w: 'Today, 08:50',
      ico: 'tag',
      un: false,
    },
    {
      id: 'a3',
      t: 'Moved “Deep Work” summary to Library',
      d: 'From Inbox · remembered path for #focus',
      w: 'Yesterday, 21:30',
      ico: 'layers',
      un: false,
    },
    {
      id: 'a4',
      t: 'Made 6 recall cards from “Sleep” chapter 2',
      d: 'Biology 101 › Key ideas',
      w: 'Yesterday, 18:05',
      ico: 'layers',
      un: true,
    },
  ],
  open: {},
  qpq: '',
  unl: {},
  demo: 'fail',
  fx: null,
  tq: '',
  stu: {
    sel: [],
    d: { kind: 'new', name: '', nb: 'Habits and focus', sec: '' },
  },
  W: {
    q: '',
    tags: [],
    tmode: 'any',
    jt: [],
    ai: [],
    star: 0,
    uses: 0,
    sort: 'rating',
    more: false,
  },
  wviews: [{ id: 'v1', n: 'Top rated video', f: { jt: ['Video'], star: 4 } }],
  B: {
    goal: '',
    plan: null,
    stage: 'idea',
    eff: 'standard',
    view: 'build',
    pick: false,
    q: '',
    cg: '',
    pv: 'notes',
    job: null,
    fromStudio: null,
    dest: {
      kind: 'new',
      name: 'Habits that stick',
      nb: 'Habits and focus',
      sec: '',
    },
  },
}
let AS = { type: 'file', val: '', body: '', pick: [] } /* add-source draft */
let MS = null /* model sheet draft */
let RUN = null /* pending run dialog */
const isPro = () => Shell.mode() === 'pro'
const money = (c) =>
  c === 0 ? '0' : c < 10 ? c.toFixed(1) : Math.round(c) + ''

/* ---------- history ---------- */
const HST = [],
  RDO = []
const H = Shell.history({
  undo: () => undo(),
  redo: () => redo(),
  can: () => [HST.length > 0, RDO.length > 0],
})
function commit(label, doFn, undoFn, quiet) {
  doFn()
  HST.push({ label, doFn, undoFn })
  RDO.length = 0
  H.sync()
  render()
  if (qpOpen) qpDraw()
  if (!quiet) T(label, undo)
}
function undo() {
  const x = HST.pop()
  if (!x) return
  x.undoFn()
  RDO.push(x)
  H.sync()
  render()
  if (qpOpen) qpDraw()
  if (Shell.sheet.isOpen()) Shell.sheet.draw()
}
function redo() {
  const x = RDO.pop()
  if (!x) return
  x.doFn()
  HST.push(x)
  H.sync()
  render()
  if (qpOpen) qpDraw()
  if (Shell.sheet.isOpen()) Shell.sheet.draw()
}
const sw = (k, label, desc, on, dis) =>
  '<div class="sw-row"><div class="g"><b>' +
  esc(label) +
  '</b>' +
  (desc ? '<small>' + esc(desc) + '</small>' : '') +
  '</div><button type="button" class="sw" role="switch" aria-checked="' +
  !!on +
  '" aria-label="' +
  esc(label) +
  '" data-a="sw" data-k="' +
  k +
  '"' +
  (dis ? ' disabled' : '') +
  '></button></div>'
const more = (k, label) =>
  '<button type="button" class="mt" data-a="open" data-k="' +
  k +
  '" aria-expanded="' +
  !!S.open[k] +
  '">' +
  esc(label) +
  IC('down') +
  '</button>'
const sel = (id, opts, cur, label) =>
  '<select class="inp" id="' +
  id +
  '" aria-label="' +
  esc(label) +
  '">' +
  opts
    .map((o) => {
      const v = Array.isArray(o) ? o[0] : o,
        l = Array.isArray(o) ? o[1] : o
      return (
        '<option value="' +
        esc(v) +
        '"' +
        (v === cur ? ' selected' : '') +
        '>' +
        esc(l) +
        '</option>'
      )
    })
    .join('') +
  '</select>'
const stars = (n) => {
  const f = Math.round(n)
  return (
    '<span class="star" aria-label="' +
    n +
    ' out of 5">' +
    '★'.repeat(f) +
    '<span style="opacity:.3">' +
    '★'.repeat(5 - f) +
    '</span><em>' +
    n.toFixed(1) +
    '</em></span>'
  )
}
const ticked = () => S.src.filter((s) => s.on)
const wfName = (id) => (S.wfs.find((r) => r.id === id) || {}).n || ''

/* ---------- models and cost ---------- */
const avail = (m) =>
  m.id === 'conn' ? S.conn.claude : !!(S.keys.or || S.keys[m.prov])
function pick(tier, M) {
  M = M || S.model
  const av = MODELS.filter(avail)
  if (!av.length) return null
  if (M.mode === 'exact') {
    const m = MODELS.find((x) => x.id === M.exact)
    if (m && avail(m)) return m
  }
  const free = av.find((m) => m.id === 'conn')
  if (M.mode === 'best')
    return (
      av.filter((m) => m.tier === 'top').sort((a, b) => a.rate - b.rate)[0] ||
      free ||
      av[0]
    )
  if (M.mode === 'cheap')
    return free || av.slice().sort((a, b) => a.rate - b.rate)[0]
  return (
    free ||
    av.filter((m) => m.tier === tier).sort((a, b) => a.rate - b.rate)[0] ||
    av[0]
  )
}
const costOf = (key, M) => {
  if (key === 'build') {
    const m = pick(EFF[S.B.eff].t, M)
    return { m, c: m ? (m.rate === 0 ? 0 : bCost(CUR || S.B.plan)) : 0 }
  }
  const t = TASK[key],
    m = pick(t.tier, M)
  return { m, c: m ? Math.round(m.rate * t.size * 10) / 10 : 0 }
}
const chipLabel = (M) => {
  M = M || S.model
  if (M.mode === 'exact') {
    const m = MODELS.find((x) => x.id === M.exact)
    return m ? m.n.replace('Claude via connector', 'Claude') : 'Auto'
  }
  return M.mode === 'best'
    ? 'Auto · Best'
    : M.mode === 'cheap'
      ? 'Auto · Cheapest'
      : 'Auto'
}
const chip = () =>
  '<button type="button" class="chip" data-a="model" aria-haspopup="dialog" aria-label="AI model: ' +
  esc(chipLabel()) +
  '. Change">' +
  IC('cpu') +
  '<span>' +
  esc(chipLabel()) +
  '</span>' +
  IC('down') +
  '</button>'
function est(key) {
  const r = costOf(key)
  if (!r.m) return '<span class="est">No AI connected</span>'
  if (!S.cost.est)
    return '<span class="est" title="Turned off in Settings">Estimate off</span>'
  return (
    '<span class="est">about ₹' +
    money(r.c) +
    (r.c === 0 ? ' · <b>free</b>' : '') +
    '</span>'
  )
}
function budget() {
  const M = S.cost.monthly,
    sp = S.spent
  let pct = M > 0 ? Math.min(100, (sp / M) * 100) : 0,
    cls = ''
  if (M > 0 && sp >= M) cls = 'stop'
  else if (M > 0 && S.cost.warn && pct >= 80) cls = 'warn'
  const txt =
    M === 0
      ? 'Free mode · ₹' + money(sp) + ' of ₹0'
      : '₹' + money(sp) + ' of ₹' + money(M) + ' this month'
  return { pct, cls, txt }
}
function record(what, r, tok) {
  S.usage.unshift({
    d: 'Just now',
    w: what,
    m: r.m ? r.m.n : '-',
    c: r.c,
    tok: tok || '4k',
  })
  S.spent = Math.round((S.spent + r.c) * 10) / 10
}
/* checks the limits, then runs go(); the owner's rules: monthly limit with hard stop, per-job limit, ask above */
function guard(key, what, go) {
  const r = costOf(key)
  if (!r.m) {
    Shell.dialog(
      '<h3>No AI is connected</h3><p class="mini" style="margin:0 0 4px">Connect Claude or add a key first. It takes a minute.</p><div class="ft"><button type="button" class="btn pri" data-a="gosettings">Open Settings</button></div>',
    )
    return
  }
  const C = S.cost,
    M = C.monthly
  const stop = (why, fix) =>
    Shell.dialog(
      '<h3>Not run: ' +
        esc(why) +
        '</h3><p class="mini" style="margin:0 0 6px">' +
        esc(r.m.n) +
        ' would cost about ₹' +
        money(r.c) +
        '. ' +
        esc(fix) +
        '</p><div class="ft"><button type="button" class="btn" data-a="gosettings">Change limits</button><button type="button" class="btn pri" data-a="usefree">Use the free model</button></div>',
    )
  if (r.c > 0 && C.hard && S.spent + r.c > M) {
    stop(
      M === 0 ? 'your monthly limit is ₹0' : 'it is over your monthly limit',
      M === 0
        ? 'With a ₹0 limit only free models can run.'
        : 'You have used ₹' + money(S.spent) + ' of ₹' + money(M) + '.',
    )
    return
  }
  if (r.c > 0 && C.perJob && r.c > C.perJobVal) {
    stop(
      'it is over your per-job limit',
      'Your per-job limit is ₹' + money(C.perJobVal) + '.',
    )
    return
  }
  const fin = () => {
    record(what, r)
    go(r)
    if (M > 0 && C.warn && S.spent >= M * 0.8 && S.spent - r.c < M * 0.8)
      setTimeout(() => T('You have used 80% of this month’s limit'), 400)
    render()
  }
  if (r.c > 0 && C.ask && r.c > C.askVal) {
    Shell.dialog(
      '<h3>This costs about ₹' +
        money(r.c) +
        '</h3><p class="mini" style="margin:0 0 6px">It is above ₹' +
        money(C.askVal) +
        ', so we ask first. Model: ' +
        esc(r.m.n) +
        '.</p><div class="ft"><button type="button" class="btn" data-x>Cancel</button><button type="button" class="btn pri" data-ok>Run anyway</button></div>',
      (d) => {
        d.querySelector('[data-x]').onclick = Shell.dialogClose
        d.querySelector('[data-ok]').onclick = () => {
          Shell.dialogClose()
          fin()
        }
      },
    )
    return
  }
  fin()
}
/* the Run dialog used by Studio, Workflows and the quick panel */
function runDialog(o) {
  RUN = o
  Shell.dialog(
    '<h3>' +
      esc(o.title) +
      '</h3><p class="mini" style="margin:0 0 12px">' +
      esc(o.desc) +
      '</p><div class="row sp"><span class="row">' +
      chip() +
      '</span>' +
      est(o.key) +
      '</div><div class="ft"><button type="button" class="btn" data-x>Cancel</button><button type="button" class="btn pri" data-ok>' +
      IC('play') +
      'Run</button></div>',
    (d) => {
      d.querySelector('[data-x]').onclick = () => {
        RUN = null
        Shell.dialogClose()
      }
      d.querySelector('[data-ok]').onclick = () => {
        RUN = null
        Shell.dialogClose()
        guard(o.key, o.what || o.title, o.run)
      }
    },
  )
}
function openModel(back) {
  MS = {
    mode: S.model.mode,
    exact: S.model.exact,
    xo: S.model.mode === 'exact',
  }
  Shell.sheet.open({
    title: 'AI model',
    sub: 'Who does the work for this run',
    body: modelBody,
    hint: 'Changes apply when you tap Done',
    onClose: (ok) => {
      if (ok && (MS.mode !== S.model.mode || MS.exact !== S.model.exact)) {
        const a = Object.assign({}, S.model),
          b = { mode: MS.mode, exact: MS.exact }
        commit(
          'Model: ' + chipLabel(b),
          () => (S.model = b),
          () => (S.model = a),
          0,
        )
      }
      if (RUN) {
        const r = RUN
        RUN = null
        setTimeout(() => runDialog(r), 120)
      }
      if (back) setTimeout(() => qpShow(), 160)
    },
  })
}
function modelBody() {
  const m = MS.mode,
    av = MODELS.filter(avail),
    ex = m === 'exact',
    cur = MODELS.find((x) => x.id === MS.exact)
  /* only ONE row ever shows the selected dot: Auto / Best / Cheapest, or one exact model */
  const opt = (v, n, d, badge) =>
    '<button type="button" class="mrow" data-a="mode" data-v="' +
    v +
    '" aria-pressed="' +
    (m === v) +
    '"><span class="rd"></span><span class="g"><b>' +
    n +
    '</b><small>' +
    d +
    '</small></span>' +
    (badge ? '<span class="px f">' + badge + '</span>' : '') +
    '</button>'
  let h =
    '<span class="lbl">Let Auto choose</span>' +
    opt(
      'auto',
      'Auto',
      'Balanced. Free first, then the cheapest model that fits the task.',
      'Free first',
    ) +
    opt(
      'best',
      'Best quality',
      'Uses the top model for every task. Costs more.',
      '',
    ) +
    opt(
      'cheap',
      'Cheapest',
      'Always the lowest price, even if the answer is shorter.',
      '',
    ) +
    '<div class="row sp" style="margin:2px 0 0"><button type="button" class="mt" data-a="tierinfo">' +
    IC('help') +
    'How does Auto choose?</button></div>' +
    '<span class="lbl">Or pick it yourself</span>' +
    '<button type="button" class="mrow hd" data-a="xopen" aria-expanded="' +
    !!MS.xo +
    '"><span class="g"><b>Pick an exact model</b><small>' +
    (ex && cur
      ? 'Now: ' + esc(cur.n)
      : 'You choose. Auto stays out of the way.') +
    '</small></span>' +
    IC('down') +
    '</button>'
  if (MS.xo)
    [
      ['all', 'Free, through your connector'],
      ['top', 'Top · planning'],
      ['mid', 'Middle · writing'],
      ['small', 'Small · simple jobs'],
    ].forEach(([t, l]) => {
      const L = MODELS.filter((x) => x.tier === t)
      if (!L.length) return
      h +=
        '<div class="tierh">' +
        l +
        '</div>' +
        L.map((x) => {
          const ok = avail(x)
          return (
            '<button type="button" class="mrow" data-a="exact" data-v="' +
            x.id +
            '" aria-pressed="' +
            (ex && MS.exact === x.id) +
            '"' +
            (ok ? '' : ' aria-disabled="true"') +
            '><span class="rd"></span><span class="g"><b>' +
            esc(x.n) +
            (x.id === 'conn'
              ? ' <small style="display:inline;margin-left:4px">listed first</small>'
              : '') +
            '</b><small>' +
            (ok ? esc(x.d) : 'Needs a key. Add one in Settings › Keys.') +
            '</small></span><span class="px' +
            (x.rate === 0 ? ' f' : '') +
            '">' +
            x.badge +
            '</span></button>'
          )
        }).join('')
    })
  if (m === 'best' && av.length === 1)
    h +=
      '<p class="note" style="margin-top:6px">No paid model is connected yet, so Claude via connector is used until you add a key.</p>'
  return h
}
function tierInfo() {
  Shell.dialog(
    '<h3>How Auto chooses</h3><p class="mini" style="margin:0">A small model reads your task first and sorts it into one of three levels.</p><div class="tierx"><div><b>Planning · top model</b>Big jobs that need thinking: turning a whole video into notes, mind maps, plans.</div><div><b>Writing · middle model</b>Notes, summaries, answers with sources.</div><div><b>Simple jobs · small model</b>Tags, cards, quick questions.</div></div><p class="mini" style="margin:10px 0 0">Free comes first: Claude via connector is used whenever it can do the job. A paid model is used only if you pick Best quality or choose one yourself.</p><div class="ft"><button type="button" class="btn pri" data-a="dx">Got it</button></div>',
  )
}

/* ---------- live-reflow drag (items move aside while dragging) ---------- */
function dragList(root, item, handle, onDrop) {
  if (!root) return
  const items = () => [...root.querySelectorAll(':scope>' + item)]
  root.addEventListener('pointerdown', (e) => {
    const h = e.target.closest(handle)
    if (!h || (e.button || 0) > 0) return
    const it = h.closest(item)
    if (!it || it.parentNode !== root) return
    e.preventDefault()
    const sc = root.closest('.pb2') || $('#main')
    const y0 = e.clientY + sc.scrollTop,
      top0 = it.offsetTop,
      hg = it.offsetHeight,
      order0 = items()
        .map((x) => x.dataset.id)
        .join()
    it.classList.add('dragging')
    try {
      h.setPointerCapture(e.pointerId)
    } catch (_) {}
    const move = (ev) => {
      const want = top0 + (ev.clientY + sc.scrollTop - y0),
        centre = want + hg / 2
      const others = items().filter((x) => x !== it)
      let idx = 0
      others.forEach((o) => {
        if (o.offsetTop + o.offsetHeight / 2 < centre) idx++
      })
      if (idx !== items().indexOf(it)) {
        const first = new Map(
          others.map((o) => [o, o.getBoundingClientRect().top]),
        )
        root.insertBefore(it, others[idx] || null)
        others.forEach((o) => {
          const d = first.get(o) - o.getBoundingClientRect().top
          if (d) {
            o.style.transition = 'none'
            o.style.transform = 'translateY(' + d + 'px)'
            o.getBoundingClientRect()
            o.style.transition = ''
            o.style.transform = ''
          }
        })
      }
      it.style.transform = 'translateY(' + (want - it.offsetTop) + 'px)'
    }
    const end = (ev) => {
      h.removeEventListener('pointermove', move)
      h.removeEventListener('pointerup', end)
      h.removeEventListener('pointercancel', end)
      it.classList.remove('dragging')
      it.style.transform = ''
      const ids = items().map((x) => x.dataset.id)
      if (ids.join() !== order0) onDrop(ids)
      else render()
    }
    h.addEventListener('pointermove', move)
    h.addEventListener('pointerup', end)
    h.addEventListener('pointercancel', end)
  })
  root.addEventListener('keydown', (e) => {
    const h = e.target.closest(handle)
    if (!h || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return
    e.preventDefault()
    const ids = items().map((x) => x.dataset.id),
      id = h.closest(item).dataset.id,
      i = ids.indexOf(id),
      j = i + (e.key === 'ArrowUp' ? -1 : 1)
    if (j < 0 || j >= ids.length) return
    ids.splice(i, 1)
    ids.splice(j, 0, id)
    onDrop(ids, id)
  })
}
const orderBy = (arr, ids) =>
  ids.map((i) => arr.find((x) => x.id === i)).filter(Boolean)

/* ---------- Workspace: Sources | Chat | Studio ---------- */
function srcPanel() {
  const n = ticked().length,
    all = n === S.src.length
  return (
    '<section class="pn pn-src" aria-label="Sources"><div class="ph"><h2>Sources</h2><button type="button" class="btn sm pri" data-a="addsrc">' +
    IC('plus') +
    'Add source</button></div><div class="pb2">' +
    '<div class="srcbar"><label><input type="checkbox" data-a="tickall" ' +
    (all ? 'checked' : '') +
    ' aria-label="Tick all sources"> ' +
    (n ? n + ' of ' + S.src.length + ' ticked' : 'None ticked') +
    '</label></div>' +
    '<div class="slist" id="slist">' +
    S.src
      .map(
        (s) =>
          '<div class="src" data-id="' +
          s.id +
          '"><button type="button" class="gp" aria-label="Drag to move ' +
          esc(s.t) +
          ' (or use the up and down arrow keys)" title="Drag to move">' +
          IC('grip') +
          '</button><label class="tk"><input type="checkbox" data-a="tick" data-id="' +
          s.id +
          '" ' +
          (s.on ? 'checked' : '') +
          ' aria-label="Use ' +
          esc(s.t) +
          '"></label><span class="ty">' +
          IC(s.k) +
          '</span><div class="g"><b>' +
          esc(s.t) +
          '</b><small>' +
          esc(s.m) +
          '</small></div><button type="button" class="ib sm" data-a="rmsrc" data-id="' +
          s.id +
          '" aria-label="Remove ' +
          esc(s.t) +
          '" title="Remove">' +
          IC('x') +
          '</button></div>',
      )
      .join('') +
    '</div>' +
    (S.src.length
      ? ''
      : '<div class="empty">Add a video, link, file or note to start.</div>') +
    '</div></section>'
  )
}
function chatPanel() {
  const n = ticked().length
  return (
    '<section class="pn pn-chat" aria-label="Chat"><div class="ph"><h2>Chat</h2><span class="mini">Answers come from ' +
    n +
    ' ticked source' +
    (n === 1 ? '' : 's') +
    '</span></div><div class="chatlog" id="chatlog">' +
    S.chat
      .map((m, i) =>
        m.r === 'u'
          ? '<div class="msg u">' + esc(m.t) + '</div>'
          : '<div class="msg a">' +
            m.t.map((p) => '<p>' + esc(p) + '</p>').join('') +
            '<div class="cites">' +
            m.c
              .map((c) => {
                const s = S.src.find((x) => x.id === c[0])
                return s
                  ? '<button type="button" class="cite" data-a="cite" data-s="' +
                      c[0] +
                      '" data-i="' +
                      c[1] +
                      '" aria-label="Show the passage from ' +
                      esc(s.t) +
                      '">' +
                      IC(s.k) +
                      '<span>' +
                      esc(s.t) +
                      ' · ' +
                      PASS[c[0]][c[1]].loc +
                      '</span></button>'
                  : ''
              })
              .join('') +
            '</div><div class="tools"><button type="button" class="btn sm' +
            (m.saved ? '' : '') +
            '" data-a="savechat" data-i="' +
            i +
            '">' +
            IC(m.saved ? 'check' : 'save') +
            (m.saved ? 'Saved to notes' : 'Save to notes') +
            '</button></div></div>',
      )
      .join('') +
    '</div><div class="chatfoot">' +
    (n
      ? ''
      : '<p class="nosrc">Tick at least one source to ask a question.</p>') +
    '<form class="compose" id="cform"><textarea class="inp" id="cq" rows="1" placeholder="Ask about your sources…" aria-label="Your question" style="min-height:44px">' +
    esc(S.draft) +
    '</textarea><button type="submit" class="btn pri" aria-label="Send">' +
    IC('send') +
    'Send</button></form><div class="opts">' +
    chip() +
    '<span class="gr"></span>' +
    est('chat') +
    '</div></div></section>'
  )
}
const OUTS = {
  summary: ['summary', 'Summary', 'note'],
  map: ['map', 'Mind map', 'map'],
  cards: ['cards', 'Cards', 'layers'],
  quiz: ['quiz', 'Quiz', 'quiz'],
  notes: ['notes', 'Notes', 'note'],
}
function outBody(o) {
  if (o.k === 'summary')
    return (
      '<p>' +
      esc(
        o.x ||
          'Small habits, tied to something you already do, stick best. The cue matters more than the goal, and tiny starts beat big plans.',
      ) +
      '</p>'
    )
  if (o.k === 'map')
    return '<div class="mm"><div class="c">Habits that stick</div><div class="br"><div class="n">Make it tiny</div><div class="n">Pick a cue</div><div class="n">Review weekly</div></div></div>'
  if (o.k === 'cards')
    return '<div class="qc"><div><b>What matters more than the goal?</b><span>The cue</span></div><div><b>How long is a tiny habit?</b><span>Two minutes or less</span></div></div>'
  if (o.k === 'quiz')
    return '<p><b>Which cue helps a new habit stick best?</b></p><p>A task you already do every day</p>'
  return (
    '<p>' +
    esc(
      o.x ||
        'Make the habit tiny. Tie it to one thing you already do. Review on Sunday.',
    ) +
    '</p>'
  )
}
/* Studio v4: tick several tiles, then one "Make selected" builds ONE plan of real catalog steps */
const STU = [
  ['notes', 'Notes', 'note', 'pg_add'],
  ['map', 'Mind map', 'map', 'map_new'],
  ['cards', 'Cards', 'layers', 'cards_new'],
  ['quiz', 'Quiz', 'quiz', 'cards_quiz'],
  ['summary', 'Summary', 'text', 'sum_tab'],
]
const stuDest = () => {
  const d = S.stu.d
  return d.kind === 'new'
    ? {
        kind: 'new',
        name: (d.name || '').trim() || 'Habits that stick',
        nb: d.nb,
        sec: d.sec,
      }
    : { kind: 'nb', name: d.name, nb: d.nb, sec: d.sec }
}
function stuPlan() {
  const U = S.stu,
    d = stuDest(),
    ids = []
  if (d.kind === 'new') ids.push('nb_new')
  ids.push('pg_add')
  STU.forEach((x) => {
    if (x[0] !== 'notes' && U.sel.includes(x[0])) ids.push(x[3])
  })
  return ids.map((id) =>
    mkStep(
      id,
      id === 'pg_add' && !U.sel.includes('notes')
        ? 'A page to hold what you picked.'
        : null,
    ),
  )
}
function stuPanel() {
  const U = S.stu,
    n = U.sel.length,
    d = stuDest()
  let h =
    '<section class="pn pn-stu" aria-label="Studio"><div class="ph"><h2>Studio</h2><span class="mini">Tick what to make</span></div><div class="pb2"><div class="mk2" role="group" aria-label="What to make">' +
    STU.map(
      (x) =>
        '<button type="button" class="tile" data-a="stsel" data-k="' +
        x[0] +
        '" aria-pressed="' +
        U.sel.includes(x[0]) +
        '">' +
        IC(x[2]) +
        x[1] +
        '<span class="tkk" aria-hidden="true">' +
        IC('check') +
        '</span></button>',
    ).join('') +
    '<button type="button" class="tile" disabled aria-disabled="true" title="Coming later">' +
    IC('audio') +
    '<span>Audio<span class="later">Later</span></span></button></div>'
  if (n) {
    const P = stuPlan()
    h +=
      '<div class="mkbar"><span class="lbl">Where it goes</span>' +
      destPick('st', S.stu.d) +
      '<ul class="mkl" aria-label="What will be made">' +
      STU.filter((x) => U.sel.includes(x[0]))
        .map(
          (x) =>
            '<li><b>' +
            x[1] +
            '</b><small>' +
            esc(place(d, TOOL[x[3]])) +
            '</small></li>',
        )
        .join('') +
      '</ul>' +
      '<div class="row sp">' +
      chip() +
      bEst(P) +
      '</div><button type="button" class="btn pri" data-a="mksel">' +
      IC('wand') +
      'Make selected (' +
      n +
      ')</button><p class="note">Opens as one plan in Build. You check it before it runs.</p></div>'
  } else
    h +=
      '<p class="note" style="margin:0 4px 12px">Tick one or more. They are made together as one plan.</p>'
  h +=
    '<div class="olist" id="olist">' +
    S.out
      .map(
        (o) =>
          '<div class="o2" data-id="' +
          o.id +
          '"><div class="oh"><button type="button" class="gp" aria-label="Drag to move ' +
          esc(o.t) +
          ' (or use the up and down arrow keys)" title="Drag to move">' +
          IC('grip') +
          '</button><b>' +
          esc(o.t) +
          '</b><button type="button" class="ib sm" data-a="rmout" data-id="' +
          o.id +
          '" aria-label="Remove ' +
          esc(o.t) +
          '" title="Remove">' +
          IC('x') +
          '</button></div><div class="ob">' +
          outBody(o) +
          '</div><div class="of"><button type="button" class="btn sm" data-a="saveout" data-id="' +
          o.id +
          '">' +
          IC(o.saved ? 'check' : 'save') +
          (o.saved ? 'Saved to notes' : 'Save to notes') +
          '</button></div></div>',
      )
      .join('') +
    '</div>' +
    (S.out.length ? '' : '<div class="empty">Nothing made yet.</div>') +
    '</div></section>'
  return h
}
function workspace() {
  return (
    '<div class="panes"><div class="seg" role="tablist" aria-label="Panels">' +
    [
      ['sources', 'Sources'],
      ['chat', 'Chat'],
      ['studio', 'Studio'],
    ]
      .map(
        (p) =>
          '<button type="button" role="tab" aria-selected="' +
          (S.pane === p[0]) +
          '" class="' +
          (S.pane === p[0] ? 'on' : '') +
          '" data-a="pane" data-v="' +
          p[0] +
          '">' +
          p[1] +
          '</button>',
      )
      .join('') +
    '</div></div><div class="ws" data-pane="' +
    S.pane +
    '">' +
    srcPanel() +
    chatPanel() +
    stuPanel() +
    '</div>'
  )
}

/* ---------- Jobs ---------- */
function jobs() {
  const J = S.J,
    n = ticked().length
  const dest = [
    ['lib', 'Library', 'A Library entry only'],
    ['nb', 'A notebook', 'Pick one you have'],
    ['new', 'New notebook', 'Start a fresh one'],
  ]
  const tag = 'habits'
  let h =
    '<section class="card" aria-label="New job"><div class="ch"><h2>New job</h2><span class="mini">Claude turns what you captured into notes, cards and tags. You check first.</span></div>' +
    '<span class="lbl">What to read</span>' +
    sel(
      'jfrom',
      [
        ['ticked', 'The ' + n + ' ticked source' + (n === 1 ? '' : 's')],
        ['inbox', 'Inbox: “Sleep and memory” (video)'],
        ['inbox2', 'Inbox: “Deep Work” (article)'],
      ],
      J.from,
      'What to read',
    ) +
    '<span class="lbl">Workflow</span>' +
    sel(
      'jwf',
      S.wfs.map((w) => [w.id, w.n]),
      J.wf,
      'Workflow',
    ) +
    '<span class="lbl">Where it goes</span><div class="tiles" role="group" aria-label="Where it goes">' +
    dest
      .map(
        (x) =>
          '<button type="button" class="tile" data-a="dest" data-v="' +
          x[0] +
          '" aria-pressed="' +
          (J.dest === x[0]) +
          '">' +
          x[1] +
          '<small>' +
          x[2] +
          '</small></button>',
      )
      .join('') +
    '</div>' +
    (J.dest === 'nb'
      ? '<div style="margin-top:10px">' +
        sel('jnb', nbNames(), J.nb, 'Notebook') +
        '</div>'
      : '') +
    (J.dest === 'new'
      ? '<div style="margin-top:10px"><input class="inp" id="jnew" value="' +
        esc(J.newName || '') +
        '" placeholder="Name of the new notebook" aria-label="New notebook name"></div>'
      : '') +
    (J.dest !== 'lib'
      ? '<div>' +
        more('jadv', 'Section inside the notebook') +
        (S.open.jadv
          ? '<div class="adv">' + sel('jsec', SECS, J.sec, 'Section') + '</div>'
          : '') +
        '</div>'
      : '') +
    sw(
      'remember',
      'Remember this path',
      'Next time, anything tagged #' +
        tag +
        ' goes to ' +
        pathStr() +
        ' by itself.',
      J.remember,
    ).replace('class="sw-row"', 'class="sw-row rem"') +
    '<div class="runbar jr"><div class="gr"><span class="path">' +
    IC('folder') +
    '<span>' +
    esc(pathStr()) +
    '</span></span></div><div class="rmeta">' +
    chip() +
    est('job') +
    '</div><button type="button" class="btn pri" data-a="runjob"' +
    (J.running ? ' disabled' : '') +
    '>' +
    IC('play') +
    'Run</button></div>' +
    '<p class="note" style="margin-top:8px">' +
    (S.auto
      ? 'Applies automatically (turn off in Settings › Jobs). You can still undo it in Activity.'
      : 'You see a preview first. Nothing is saved until you tap Apply.') +
    '</p>' +
    (J.running
      ? '<div class="working" role="status"><i></i>Claude is working on “Why habits stick”…</div>'
      : '') +
    '</section>'
  if (J.preview) h += preview()
  h +=
    '<section class="card" aria-label="Remembered paths"><div class="ch"><h2>Remembered paths</h2><span class="mini">Where tagged items go by themselves</span></div>' +
    (S.paths.length
      ? S.paths
          .map(
            (p, i) =>
              '<div class="kv"><span class="ico">' +
              IC('tag') +
              '</span><div class="g"><b>#' +
              esc(p.tag) +
              '</b><small>' +
              esc(p.path) +
              '</small></div><button type="button" class="ib sm" data-a="rmpath" data-i="' +
              i +
              '" aria-label="Forget the path for #' +
              esc(p.tag) +
              '" title="Forget">' +
              IC('x') +
              '</button></div>',
          )
          .join('')
      : '<p class="mini" style="margin:0">None yet. Turn on “Remember this path” above.</p>') +
    '</section>'
  return h
}
function pathStr() {
  const J = S.J
  return J.dest === 'lib'
    ? 'Library'
    : J.dest === 'new'
      ? (J.newName || 'New notebook') + ' › ' + J.sec
      : J.nb + ' › ' + J.sec
}
function preview() {
  const p = S.J.preview
  return (
    '<section class="card pv" aria-label="Preview"><div class="ch"><h2>Preview</h2><span class="path">' +
    IC('folder') +
    esc(p.path) +
    '</span><button type="button" class="ib sm" data-a="discard" aria-label="Discard preview" title="Discard">' +
    IC('x') +
    '</button></div><p class="lead">Nothing is saved yet. Untick anything you do not want.</p><div class="pvlist">' +
    p.items
      .map(
        (i) =>
          '<label><input type="checkbox" data-a="pvtick" data-id="' +
          i.id +
          '" ' +
          (i.on ? 'checked' : '') +
          '><span>' +
          esc(i.t) +
          '<small>' +
          esc(i.d) +
          '</small></span></label>',
      )
      .join('') +
    '</div>' +
    '<div class="frames" aria-hidden="true">' +
    [210, 250, 290]
      .map(
        (h, i) =>
          '<div class="fr" style="--h:' +
          h +
          '"><i>0' +
          (i * 3 + 2) +
          ':1' +
          i +
          '</i></div>',
      )
      .join('') +
    '</div>' +
    '<div class="ft2"><span class="gr">' +
    p.items.filter((i) => i.on).length +
    ' of ' +
    p.items.length +
    ' will be saved</span><button type="button" class="btn" data-a="discard">Discard</button><button type="button" class="btn pri" data-a="applyjob">' +
    IC('check') +
    'Apply</button></div></section>'
  )
}
function buildPreview() {
  return {
    title: 'Why habits stick',
    path: pathStr(),
    items: [
      {
        id: 'i1',
        t: 'Library entry',
        d: 'Title, link, 3-line summary',
        on: true,
      },
      {
        id: 'i2',
        t: 'Notes with 6 frames',
        d: 'Each frame sits under its idea',
        on: true,
      },
      {
        id: 'i3',
        t: 'Mind map',
        d: 'Habits that stick · 5 branches',
        on: true,
      },
      {
        id: 'i4',
        t: '8 recall cards',
        d: 'Added to your review deck',
        on: true,
      },
      { id: 'i5', t: 'Tags', d: '#habits #identity #focus', on: true },
    ],
  }
}
function applyJob(p) {
  const n = p.items.filter((i) => i.on).length
  const e = {
    id: 'a' + Date.now(),
    t: 'Created notes for “' + p.title + '”',
    d: p.path + ' · ' + n + ' of ' + p.items.length + ' items',
    w: 'Just now',
    ico: 'note',
    un: false,
  }
  const had = S.paths.some((x) => x.tag === 'habits'),
    addP = S.J.remember && !had && S.J.dest !== 'lib'
  const prev = S.J.preview
  commit(
    'Applied: ' + p.title,
    () => {
      S.act.unshift(e)
      S.J.preview = null
      if (addP) S.paths.unshift({ tag: 'habits', path: p.path })
    },
    () => {
      S.act = S.act.filter((x) => x !== e)
      S.J.preview = prev
      if (addP) S.paths.shift()
    },
    0,
  )
}

/* ---------- Workflows ---------- */
/* ---------- Workflows v4: a database view with the app-wide filter bar ---------- */
const WF0 = {
  q: '',
  tags: [],
  tmode: 'any',
  jt: [],
  ai: [],
  star: 0,
  uses: 0,
  sort: 'rating',
}
const SORTS = {
  rating: ['Rating', (a, b) => b.star - a.star],
  used: ['Most used', (a, b) => b.uses - a.uses],
  name: ['Name', (a, b) => a.n.localeCompare(b.n)],
  recent: ['Recently run', (a, b) => a.last - b.last],
}
const wfF = () => {
  const W = S.W
  return {
    q: W.q.trim(),
    tags: W.tags.slice().sort(),
    tmode: W.tags.length > 1 ? W.tmode : 'any',
    jt: W.jt.slice().sort(),
    ai: W.ai.slice().sort(),
    star: W.star,
    uses: W.uses,
    sort: W.sort,
  }
}
const wfSame = (f) =>
  JSON.stringify(
    Object.assign({}, WF0, f, {
      tags: (f.tags || []).slice().sort(),
      jt: (f.jt || []).slice().sort(),
      ai: (f.ai || []).slice().sort(),
    }),
  ) === JSON.stringify(wfF())
const wfMatch = (w) => {
  const W = S.W,
    q = W.q.toLowerCase().trim()
  return (
    (!q ||
      (w.n + ' ' + w.tags.join(' ') + ' ' + w.jt + ' ' + w.ai)
        .toLowerCase()
        .includes(q)) &&
    (!W.tags.length ||
      (W.tmode === 'all'
        ? W.tags.every((t) => w.tags.includes(t))
        : W.tags.some((t) => w.tags.includes(t)))) &&
    (!W.jt.length || W.jt.includes(w.jt)) &&
    (!W.ai.length || W.ai.includes(w.ai)) &&
    w.star >= W.star &&
    w.uses >= W.uses
  )
}
const wfChips = () => {
  const W = S.W,
    c = []
  if (W.q.trim()) c.push(['q', '', '“' + W.q.trim() + '”'])
  W.tags.forEach((t) => c.push(['tags', t, '#' + t]))
  if (W.tags.length > 1 && W.tmode === 'all')
    c.push(['tmode', '', 'Has all tags'])
  W.jt.forEach((t) => c.push(['jt', t, 'For: ' + t]))
  W.ai.forEach((t) => c.push(['ai', t, 'AI: ' + t]))
  if (W.star) c.push(['star', '', 'Rating ' + W.star + '+'])
  if (W.uses) c.push(['uses', '', 'Used ' + W.uses + '+ times'])
  return c
}
const wfMoreN = () => {
  const W = S.W
  return W.jt.length + W.ai.length + (W.star ? 1 : 0) + (W.uses ? 1 : 0)
}
function workflows() {
  const W = S.W,
    L = S.wfs.filter(wfMatch).sort(SORTS[W.sort][1]),
    chips = wfChips(),
    act = chips.filter((c) => c[0] !== 'tmode').length,
    mn = wfMoreN(),
    cur = S.wviews.find((v) => wfSame(v.f)),
    plain = wfSame(WF0)
  const tgl = (a, v, on, l) =>
    '<button type="button" class="tag btn2" data-a="' +
    a +
    '" data-v="' +
    v +
    '" aria-pressed="' +
    on +
    '">' +
    l +
    '</button>'
  let h =
    '<section class="card" aria-label="Workflows"><div class="ch"><h2>Workflows</h2><button type="button" class="btn sm" data-a="newwf">' +
    IC('plus') +
    'New workflow</button></div><p class="lead">A workflow is a saved plan you can run again. Filter them like any list in the app.</p>' +
    '<div class="fline"><button type="button" class="btn more" data-a="wmore" aria-expanded="' +
    !!W.more +
    '">' +
    IC('sliders') +
    'More filters' +
    (mn ? ' · ' + mn : '') +
    '</button><input class="inp" id="wq" type="search" placeholder="Search workflows" value="' +
    esc(W.q) +
    '" aria-label="Search workflows">' +
    '<button type="button" class="chip' +
    (W.tags.length ? ' on' : '') +
    '" data-a="wtags" aria-haspopup="dialog">' +
    IC('tag') +
    '<span>Tags' +
    (W.tags.length ? ' · ' + W.tags.length : '') +
    '</span>' +
    IC('down') +
    '</button><button type="button" class="chip" data-a="wsort" aria-haspopup="dialog">' +
    IC('sort') +
    '<span>' +
    SORTS[W.sort][0] +
    '</span>' +
    IC('down') +
    '</button></div>' +
    (W.more
      ? '<div class="well fmore"><span class="lbl">For</span><div class="tg" role="group" aria-label="For">' +
        ['Video', 'Article', 'Book', 'Audio']
          .map((x) => tgl('wjt', x, W.jt.includes(x), x))
          .join('') +
        '</div><span class="lbl">AI</span><div class="tg" role="group" aria-label="AI">' +
        ['Claude', 'Any']
          .map((x) =>
            tgl('wai', x, W.ai.includes(x), x === 'Any' ? 'Any AI' : x),
          )
          .join('') +
        '</div><span class="lbl">Rating at least</span><div class="seg sm" role="group" aria-label="Rating at least">' +
        [
          [0, 'Any'],
          [3, '3+'],
          [4, '4+'],
          [4.5, '4.5+'],
        ]
          .map(
            (x) =>
              '<button type="button" class="' +
              (W.star === x[0] ? 'on' : '') +
              '" aria-pressed="' +
              (W.star === x[0]) +
              '" data-a="wstar" data-v="' +
              x[0] +
              '">' +
              x[1] +
              '</button>',
          )
          .join('') +
        '</div><span class="lbl">Times used at least</span><div class="seg sm" role="group" aria-label="Times used at least">' +
        [
          [0, 'Any'],
          [10, '10+'],
          [25, '25+'],
        ]
          .map(
            (x) =>
              '<button type="button" class="' +
              (W.uses === x[0] ? 'on' : '') +
              '" aria-pressed="' +
              (W.uses === x[0]) +
              '" data-a="wuses" data-v="' +
              x[0] +
              '">' +
              x[1] +
              '</button>',
          )
          .join('') +
        '</div></div>'
      : '') +
    '<div class="vrow" role="group" aria-label="Saved views">' +
    tgl('wview', '', plain, 'All workflows') +
    S.wviews
      .map(
        (v) =>
          '<span class="tag v' +
          (cur === v ? ' on' : '') +
          '"><button type="button" data-a="wview" data-v="' +
          v.id +
          '" aria-pressed="' +
          (cur === v) +
          '">' +
          esc(v.n) +
          '</button><button type="button" class="ib" data-a="wvrm" data-v="' +
          v.id +
          '" aria-label="Delete the view ' +
          esc(v.n) +
          '" title="Delete view">' +
          IC('x') +
          '</button></span>',
      )
      .join('') +
    (!plain && !cur
      ? '<button type="button" class="mt" style="margin-left:0" data-a="wsave">' +
        IC('plus') +
        'Save this view</button>'
      : '') +
    '</div>' +
    '<div class="acts2">' +
    chips
      .map(
        (c) =>
          '<span class="tag">' +
          esc(c[2]) +
          '<button type="button" class="ib" data-a="wchip" data-k="' +
          c[0] +
          '" data-v="' +
          esc(c[1]) +
          '" aria-label="Remove filter ' +
          esc(c[2]) +
          '">' +
          IC('x') +
          '</button></span>',
      )
      .join('') +
    (act
      ? '<button type="button" class="mt" style="margin-left:0" data-a="wclear">Clear all</button>'
      : '') +
    '<span class="cnt" role="status" aria-live="polite">' +
    (act ? L.length + ' of ' + S.wfs.length : S.wfs.length) +
    ' workflow' +
    (S.wfs.length === 1 ? '' : 's') +
    '</span></div>' +
    '<div class="rtab"><div class="rr hd"><span>Name</span><span>Rating</span><span>For</span><span>Used</span><span></span><span></span></div>' +
    (L.length
      ? L.map(
          (w) =>
            '<div class="rr"><div class="nm"><b>' +
            esc(w.n) +
            '</b><div class="tg">' +
            w.tags
              .map(
                (t) =>
                  '<span class="tag" style="padding-right:10px">#' +
                  t +
                  '</span>',
              )
              .join('') +
            '</div></div><div class="c">' +
            stars(w.star) +
            '</div><div class="c" data-l="For">' +
            esc(w.jt) +
            '</div><div class="c us" data-l="Used">' +
            w.uses +
            ' times</div><div class="go"><button type="button" class="btn sm" data-a="rate" data-id="' +
            w.id +
            '" aria-haspopup="menu">' +
            IC('star') +
            (w.my ? w.my + '★' : 'Rate') +
            '</button></div><div class="go row" style="flex-wrap:nowrap">' +
            chip() +
            '<button type="button" class="btn sm pri" data-a="runwf" data-id="' +
            w.id +
            '">' +
            IC('play') +
            'Run</button><button type="button" class="ib sm" data-a="editwf" data-id="' +
            w.id +
            '" aria-label="Edit ' +
            esc(w.n) +
            '" title="Edit">' +
            IC('dots') +
            '</button></div></div>',
        ).join('')
      : '<div class="empty" style="margin-top:12px">No workflow matches these filters.<div class="row" style="justify-content:center;margin-top:12px"><button type="button" class="btn" data-a="wclear">Clear all</button></div></div>') +
    '</div></section>'
  if (S.sug.length)
    h +=
      '<section class="card pc" aria-label="Prompt checker"><div class="ch"><h2>Prompt checker</h2><span class="mini">Claude reviews your workflows and suggests updates</span><button type="button" class="btn sm" data-a="check">' +
      IC('wand') +
      'Check now</button></div>' +
      S.sug
        .map(
          (g) =>
            '<div class="sg"><b>' +
            esc(g.t) +
            ' <span class="mini">· ' +
            esc(wfName(g.wf)) +
            '</span></b><p>' +
            esc(g.d) +
            '</p><div class="row"><button type="button" class="btn sm pri" data-a="sugok" data-id="' +
            g.id +
            '">Accept</button><button type="button" class="btn sm" data-a="sugno" data-id="' +
            g.id +
            '">Not now</button></div></div>',
        )
        .join('') +
      '</section>'
  return h
}
/* the universal pop-over for the Tag picker and Sort: stays open while you tick, closes on Done, outside tap or Esc */
let FP = null
function fpopClose() {
  const p = $('#fpop')
  if (p) p.remove()
  if (FP) {
    const a = $(FP.sel)
    if (a) a.setAttribute('aria-expanded', 'false')
  }
  FP = null
}
function fpopDraw() {
  if (!FP) return
  let p = $('#fpop')
  const f = document.activeElement && document.activeElement.id === 'tpq',
    pos = f ? document.activeElement.selectionStart : 0
  if (!p) {
    p = document.createElement('div')
    p.className = 'fpop'
    p.id = 'fpop'
    p.setAttribute('role', 'dialog')
    p.setAttribute('aria-label', FP.label)
    document.body.appendChild(p)
  }
  const y = (p.querySelector('.fl2') || {}).scrollTop || 0
  p.innerHTML = FP.draw()
  const l = p.querySelector('.fl2')
  if (l) l.scrollTop = y
  const a = $(FP.sel)
  if (a && innerWidth > 640) {
    const r = a.getBoundingClientRect(),
      w = p.offsetWidth,
      hh = p.offsetHeight
    p.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left)) + 'px'
    p.style.top =
      Math.max(8, Math.min(innerHeight - hh - 8, r.bottom + 8)) + 'px'
  }
  if (a) a.setAttribute('aria-expanded', 'true')
  if (f) {
    const i = $('#tpq')
    if (i) {
      i.focus()
      try {
        i.setSelectionRange(pos, pos)
      } catch (_) {}
    }
  }
  Shell.clearable(p, (i) => i.id === 'tpq')
}
function fpop(sel, label, draw) {
  if (FP && FP.sel === sel) {
    fpopClose()
    return
  }
  fpopClose()
  Shell.closePop()
  FP = { sel, label, draw }
  fpopDraw()
}
function tagPicker() {
  const W = S.W,
    q = (S.tq || '').toLowerCase().trim(),
    all = [...new Set(S.wfs.flatMap((w) => w.tags))].sort(),
    L = all.filter((t) => !q || t.includes(q))
  return (
    '<div class="fh"><b>Tags</b><button type="button" class="ib sm" data-a="fpx" aria-label="Close" title="Close">' +
    IC('x') +
    '</button></div>' +
    '<div class="seg sm" role="group" aria-label="Match">' +
    [
      ['any', 'Has any'],
      ['all', 'Has all'],
    ]
      .map(
        (x) =>
          '<button type="button" class="' +
          (W.tmode === x[0] ? 'on' : '') +
          '" aria-pressed="' +
          (W.tmode === x[0]) +
          '" data-a="tmode" data-v="' +
          x[0] +
          '">' +
          x[1] +
          '</button>',
      )
      .join('') +
    '</div>' +
    '<input class="inp" id="tpq" type="search" placeholder="Find a tag" value="' +
    esc(S.tq || '') +
    '" aria-label="Find a tag">' +
    '<div class="fl2">' +
    (L.length
      ? L.map(
          (t) =>
            '<label class="fo"><input type="checkbox" data-a="tpick" data-v="' +
            t +
            '" ' +
            (W.tags.includes(t) ? 'checked' : '') +
            '><span>#' +
            t +
            '</span><small>' +
            S.wfs.filter((w) => w.tags.includes(t)).length +
            '</small></label>',
        ).join('')
      : '<p class="note" style="padding:10px 8px">No tag matches.</p>') +
    '</div>' +
    '<div class="ff"><button type="button" class="btn sm" data-a="tpclear"' +
    (W.tags.length ? '' : ' disabled') +
    '>Clear</button><button type="button" class="btn sm pri" data-a="fpx">Done</button></div>'
  )
}
const sortPicker = () =>
  '<div class="fh"><b>Sort by</b><button type="button" class="ib sm" data-a="fpx" aria-label="Close" title="Close">' +
  IC('x') +
  '</button></div>' +
  Object.keys(SORTS)
    .map(
      (k) =>
        '<button type="button" class="fo" role="radio" aria-checked="' +
        (S.W.sort === k) +
        '" data-a="sortpick" data-v="' +
        k +
        '"><span class="rd"></span><span>' +
        SORTS[k][0] +
        '</span></button>',
    )
    .join('')

/* ---------- Activity ---------- */
function activity() {
  return (
    '<section class="card" aria-label="Activity"><div class="ch"><h2>What the AI changed</h2><span class="mini">' +
    S.act.filter((a) => !a.un).length +
    ' active</span></div><ul class="al">' +
    S.act
      .map(
        (a) =>
          '<li class="' +
          (a.un ? 'un' : '') +
          '"><span class="ico">' +
          IC(a.ico) +
          '</span><div class="g"><b>' +
          esc(a.t) +
          '</b><small>' +
          esc(a.d) +
          ' · ' +
          esc(a.w) +
          '</small>' +
          (a.job ? more('ad' + a.id, 'Steps') : '') +
          '</div><button type="button" class="btn sm" data-a="actundo" data-id="' +
          a.id +
          '">' +
          (a.un ? 'Redo' : 'Undo') +
          '</button>' +
          (a.job && S.open['ad' + a.id] ? jobDetail(a.job) : '') +
          '</li>',
      )
      .join('') +
    '</ul></section>' +
    (S.cost.hist
      ? '<section class="card"><div class="ch"><h2>Usage and spend</h2><button type="button" class="btn sm" data-a="usage">Open history</button></div><p class="lead" style="margin:0">' +
        budget().txt +
        '. ' +
        S.usage.length +
        ' runs so far, ' +
        S.usage.filter((u) => u.c === 0).length +
        ' of them free.</p></section>'
      : '')
  )
}

/* ---------- Settings ---------- */
function settings() {
  const C = S.cost
  const keyRow = (k, n, d) =>
    '<div class="kv"><span class="ico">' +
    IC('key') +
    '</span><div class="g"><b>' +
    n +
    '</b><small>' +
    (S.keys[k] ? 'Saved · ' + S.keys[k] + ' · hidden' : d) +
    '</small></div>' +
    (S.keys[k]
      ? '<button type="button" class="btn sm dng" data-a="rmkey" data-k="' +
        k +
        '">Remove</button>'
      : '<button type="button" class="btn sm" data-a="addkey" data-k="' +
        k +
        '">Add key</button>') +
    '</div>'
  let h =
    '<section class="card" aria-label="Connectors"><div class="ch"><h2>Connectors</h2><span class="mini">Where the AI and your files come from</span></div>' +
    [
      ['claude', 'Claude (your plan)', 'Free. The first choice for every run.'],
      ['drive', 'Google Drive', 'Lets you add files from Drive as sources.'],
      [
        'ext',
        'Send to Learning Notes (Chrome)',
        'One click from any page into your Inbox.',
      ],
    ]
      .map(
        (x) =>
          '<div class="kv"><span class="ico">' +
          IC(
            x[0] === 'claude' ? 'sparkle' : x[0] === 'drive' ? 'cloud' : 'plug',
          ) +
          '</span><div class="g"><b>' +
          x[1] +
          '</b><small>' +
          (S.conn[x[0]] ? 'Connected · ' + x[2] : x[2]) +
          '</small></div><button type="button" class="sw" role="switch" aria-checked="' +
          S.conn[x[0]] +
          '" aria-label="' +
          x[1] +
          '" data-a="conn" data-k="' +
          x[0] +
          '"></button></div>',
      )
      .join('') +
    '</section>' +
    '<section class="card" aria-label="Keys vault"><div class="ch"><h2>Keys vault</h2><span class="mini">Kept on your device. A key is never shown again.</span></div>' +
    keyRow(
      'or',
      'OpenRouter',
      'One key opens many models. Easiest way to start.',
    ) +
    keyRow('anthropic', 'Anthropic', 'Only for Claude models.') +
    keyRow('google', 'Google AI', 'Only for Gemini models.') +
    '</section>' +
    '<section class="card" aria-label="Models"><div class="ch"><h2>Models</h2></div><div class="kv"><span class="ico">' +
    IC('cpu') +
    '</span><div class="g"><b>Now: ' +
    esc(chipLabel()) +
    '</b><small>' +
    (S.model.mode === 'auto'
      ? 'Balanced. Free first, then the cheapest that fits.'
      : S.model.mode === 'best'
        ? 'Top model for every task.'
        : S.model.mode === 'cheap'
          ? 'Always the lowest price.'
          : 'Always the model you picked.') +
    '</small></div><button type="button" class="btn sm" data-a="model">Change</button></div>' +
    more('mlist', 'All models') +
    (S.open.mlist
      ? '<div class="adv">' +
        MODELS.map(
          (m) =>
            '<div class="kv"><div class="g"><b>' +
            esc(m.n) +
            '</b><small>' +
            (avail(m) ? esc(m.d) : 'Needs a key') +
            '</small></div><span class="px' +
            (m.rate === 0 ? ' f' : '') +
            '">' +
            m.badge +
            '</span></div>',
        ).join('') +
        '<button type="button" class="mt" data-a="tierinfo">' +
        IC('help') +
        'How does Auto choose?</button></div>'
      : '') +
    '</section>' +
    '<section class="card" aria-label="Cost and limits"><div class="ch"><h2>Cost and limits</h2><span class="mini">Nothing is spent without your OK</span></div>' +
    '<div class="sw-row"><div class="g"><b>Monthly limit</b><small>₹0 means only free models run.</small></div><label class="amt">₹<input type="number" min="0" step="50" inputmode="numeric" id="fmonthly" value="' +
    C.monthly +
    '" aria-label="Monthly limit in rupees"></label></div>' +
    sw(
      'warn',
      'Warn me at 80%',
      'A heads-up before you reach the limit.',
      C.warn,
    ) +
    sw(
      'hard',
      'Stop at the limit',
      'Hard stop: nothing paid runs once it is reached.',
      C.hard,
    ) +
    sw(
      'est',
      'Estimate before each job',
      'Shows “about ₹X” or “free” next to every Run.',
      C.est,
    ) +
    sw(
      'hist',
      'Usage and spend history',
      'A page like a provider’s usage screen.',
      C.hist,
    ) +
    (C.hist
      ? '<div class="row" style="margin:2px 0 6px"><button type="button" class="btn sm" data-a="usage">' +
        IC('clock') +
        'Open history</button><button type="button" class="btn sm" data-a="csv">' +
        IC('save') +
        'Export CSV</button></div>'
      : '') +
    more('cmore', 'Per-job limits') +
    (S.open.cmore
      ? '<div class="adv">' +
        '<div class="sw-row"><div class="g"><b>Per-job limit</b><small>No single job may cost more than this.</small></div><label class="amt">₹<input type="number" min="0" step="10" inputmode="numeric" id="fperJobVal" value="' +
        C.perJobVal +
        '" aria-label="Per-job limit in rupees"></label><button type="button" class="sw" role="switch" aria-checked="' +
        C.perJob +
        '" aria-label="Per-job limit" data-a="sw" data-k="perJob"></button></div>' +
        '<div class="sw-row"><div class="g"><b>Ask me above</b><small>Asks before a job that costs more than this.</small></div><label class="amt">₹<input type="number" min="0" step="5" inputmode="numeric" id="faskVal" value="' +
        C.askVal +
        '" aria-label="Ask above this many rupees"></label><button type="button" class="sw" role="switch" aria-checked="' +
        C.ask +
        '" aria-label="Ask above" data-a="sw" data-k="ask"></button></div></div>'
      : '') +
    '</section>' +
    '<section class="card" aria-label="Jobs"><div class="ch"><h2>Jobs</h2></div>' +
    sw(
      'auto',
      'Apply automatically',
      'Skip the preview once you trust Claude. Undo stays in Activity.',
      S.auto,
    ) +
    '<p class="mini" style="margin:6px 0 0">AI mode lives in Settings › Professional features › AI mode.</p></section>'
  h +=
    '<section class="card" aria-label="Professional tools"><div class="ch"><h2>Professional tools</h2><span class="mini">Unlock each one on its own</span></div>' +
    TOOLS.filter((t) => t.lock)
      .map(
        (t) =>
          '<div class="kv"><span class="ico">' +
          IC(t.ic) +
          '</span><div class="g"><b>' +
          esc(t.n) +
          '</b><small>' +
          esc(t.d) +
          '</small></div><button type="button" class="sw" role="switch" aria-checked="' +
          !!S.unl[t.id] +
          '" aria-label="Unlock ' +
          esc(t.n) +
          '" data-a="unl" data-id="' +
          t.id +
          '"></button></div>',
      )
      .join('') +
    '</section>'
  return h
}

/* ---------- Beginner ---------- */
function beginner() {
  return (
    '<div class="beg"><div class="mk">' +
    IC('lock') +
    '</div><h1>AI mode is a Professional feature</h1><p>It turns videos, articles and notes into notes, cards and mind maps. Your notes work exactly the same without it.</p><div class="explain" style="text-align:left">' +
    IC('help') +
    '<p><b>To turn it on:</b> open Settings › Professional features › AI mode.</p></div><button type="button" class="btn pri" data-a="topro">Switch to Professional</button></div>'
  )
}

/* ---------- AI mode v3: Build (plan), Tool catalog ---------- */
const X3 = {
  table:
    '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 4v16"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  palette:
    '<path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-.8 2-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7" r="1"/>',
  columns:
    '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  calendar:
    '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
  download: '<path d="M12 4v12"/><path d="m7 11 5 5 5-5"/><path d="M4 20h16"/>',
  share:
    '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  filter: '<path d="M3 5h18l-7 8v6l-4 2v-8z"/>',
  repeat:
    '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  target:
    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  scissors:
    '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12"/>',
  sort: '<path d="M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4"/>',
  head: '<path d="M6 4v16M18 4v16M6 12h12"/>',
  swap: '<path d="M7 7h13l-4-4M17 17H4l4 4"/>',
  pin: '<path d="M12 17v5"/><path d="M9 3h6l-1 6 3 3v2H7v-2l3-3z"/>',
  code: '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
}
for (const k in X3) if (!Shell.I[k]) Shell.I[k] = X3[k]
const GROUPS = [
  'Notebooks',
  'Pages',
  'Tabs',
  'Summaries',
  'Mind maps',
  'Cards',
  'Databases',
  'Styles',
  'Layouts',
  'Tags',
  'Library',
  'Home widgets',
  'Search',
  'Review',
  'Import and export',
]
/* id, space, plain name, one-line description, icon, locked until you unlock it (Professional feature) */
const TOOLS = [
  [
    'nb_new',
    'Notebooks',
    'Create notebook',
    'Starts a new notebook with a name, a cover and sections.',
    'notebooksB',
  ],
  [
    'nb_section',
    'Notebooks',
    'Add section',
    'Adds a section inside a notebook.',
    'folder',
  ],
  [
    'nb_cover',
    'Notebooks',
    'Set cover',
    'Picks a cover style that fits the topic.',
    'image',
  ],
  [
    'nb_merge',
    'Notebooks',
    'Merge notebooks',
    'Joins two notebooks into one and keeps every page.',
    'layers',
  ],
  [
    'pg_add',
    'Pages',
    'Write notes page',
    'Adds a page with headings, paragraphs and lists.',
    'note',
  ],
  [
    'pg_refine',
    'Pages',
    'Refine this page',
    'Rewrites the page to be clearer and shorter. Your meaning stays.',
    'wand',
  ],
  [
    'pg_split',
    'Pages',
    'Split a long page',
    'Cuts a long page into smaller pages at each heading.',
    'scissors',
  ],
  [
    'pg_join',
    'Pages',
    'Join pages',
    'Puts several pages together in one page.',
    'copy',
  ],
  [
    'pg_order',
    'Pages',
    'Reorder pages',
    'Puts pages in a sensible order.',
    'sort',
  ],
  [
    'pg_dup',
    'Pages',
    'Duplicate page',
    'Makes a copy of a page to try changes on.',
    'copy',
  ],
  [
    'pg_tpl',
    'Pages',
    'Start from a page template',
    'Fills a page from a template such as Cornell notes.',
    'file',
  ],
  [
    'tab_add',
    'Tabs',
    'Add a page tab',
    'Adds a tab such as Summary or Cards to a page.',
    'folder',
  ],
  [
    'tab_name',
    'Tabs',
    'Rename tabs',
    'Gives the tabs short, clear names.',
    'pen',
  ],
  [
    'tab_order',
    'Tabs',
    'Reorder tabs',
    'Puts the tabs in the order you use them.',
    'sort',
  ],
  [
    'tab_default',
    'Tabs',
    'Set the default tabs',
    'Chooses which tabs every new page starts with.',
    'sliders',
  ],
  [
    'sum_tab',
    'Summaries',
    'Summary tab',
    'Adds a Summary tab with a short, plain summary of the page.',
    'note',
  ],
  [
    'sum_short',
    'Summaries',
    'Short summary',
    'Writes a three-line summary at the top of a page.',
    'text',
  ],
  [
    'sum_points',
    'Summaries',
    'Key points list',
    'Pulls out the main points as a list.',
    'list',
  ],
  [
    'sum_plain',
    'Summaries',
    'Say it simply',
    'Rewrites hard passages in everyday words.',
    'bulb',
  ],
  [
    'map_new',
    'Mind maps',
    'Make a mind map',
    'Draws the main idea and its branches from your notes.',
    'map',
  ],
  [
    'map_grow',
    'Mind maps',
    'Grow a branch',
    'Adds detail under one branch of a mind map.',
    'plus',
  ],
  [
    'map_style',
    'Mind maps',
    'Restyle the map',
    'Changes colours and shape of a mind map.',
    'palette',
  ],
  [
    'cards_new',
    'Cards',
    'Make recall cards',
    'Turns the notes into question and answer cards.',
    'layers',
  ],
  [
    'cards_cloze',
    'Cards',
    'Fill-in-the-blank cards',
    'Hides a key word in a sentence for you to recall.',
    'text',
  ],
  [
    'cards_quiz',
    'Cards',
    'Make a quiz',
    'Builds a short multiple-choice quiz from the notes.',
    'quiz',
  ],
  [
    'cards_fix',
    'Cards',
    'Fix weak cards',
    'Rewrites cards you keep getting wrong.',
    'wand',
  ],
  [
    'cards_deck',
    'Cards',
    'Choose the deck',
    'Sends the new cards to a deck you pick.',
    'folder',
  ],
  [
    'db_new',
    'Databases',
    'Create a database',
    'Makes a table with columns that fit your content.',
    'table',
  ],
  [
    'db_rows',
    'Databases',
    'Add rows from notes',
    'Fills the table with rows found in your notes.',
    'plus',
  ],
  [
    'db_view',
    'Databases',
    'Add a view',
    'Shows the same data as a table, board or calendar.',
    'calendar',
  ],
  [
    'db_formula',
    'Databases',
    'Formula column',
    'Adds a column that works out a value for each row.',
    'code',
    1,
  ],
  [
    'db_chart',
    'Databases',
    'Chart from a database',
    'Draws a chart from the rows and columns.',
    'chart',
    1,
  ],
  [
    'style_apply',
    'Styles',
    'Apply a style',
    'Gives the page a consistent look from a style you choose.',
    'palette',
  ],
  [
    'hd_style',
    'Styles',
    'Heading style',
    'Makes headings the same size and weight everywhere.',
    'head',
  ],
  [
    'hl_terms',
    'Styles',
    'Highlight key terms',
    'Marks the important words with a highlight.',
    'pen',
  ],
  [
    'style_theme',
    'Styles',
    'Custom theme',
    'Builds your own colours and fonts for a notebook.',
    'sliders',
    1,
  ],
  [
    'layout_cols',
    'Layouts',
    'Two-column layout',
    'Puts a page in two columns, side by side.',
    'columns',
  ],
  [
    'layout_call',
    'Layouts',
    'Callout boxes',
    'Wraps key ideas in highlighted boxes.',
    'bulb',
  ],
  [
    'layout_move',
    'Layouts',
    'Move blocks',
    'Moves paragraphs, pictures and tables around a page.',
    'grip',
  ],
  [
    'layout_pic',
    'Layouts',
    'Add pictures',
    'Puts pictures or video frames next to the ideas they show.',
    'image',
  ],
  [
    'tags_add',
    'Tags',
    'Add tags',
    'Adds short tags so you can find things later.',
    'tag',
  ],
  [
    'tags_merge',
    'Tags',
    'Rename or merge tags',
    'Tidies tags that mean the same thing.',
    'swap',
  ],
  [
    'tags_rules',
    'Tags',
    'Tag rules',
    'Tags new items by itself using rules you set.',
    'filter',
    1,
  ],
  [
    'lib_add',
    'Library',
    'Add Library entry',
    'Saves a title, link and three-line summary to your Library.',
    'libraryA',
  ],
  [
    'lib_move',
    'Library',
    'Move to a Library folder',
    'Files an entry where it belongs.',
    'folder',
  ],
  [
    'lib_src',
    'Library',
    'Attach the source link',
    'Adds the original link to a page.',
    'link',
  ],
  [
    'lib_star',
    'Library',
    'Star or archive',
    'Stars what matters and archives what you are done with.',
    'star',
  ],
  [
    'home_widget',
    'Home widgets',
    'Add a Home widget',
    'Puts a number, streak or list on your Home page.',
    'grid',
    1,
  ],
  [
    'home_plan',
    'Home widgets',
    'Add to today’s plan',
    'Adds a task or time block to Today.',
    'calendar',
  ],
  [
    'home_tpl',
    'Home widgets',
    'Home template',
    'Builds a whole Home layout such as a planner.',
    'grid',
    1,
  ],
  [
    'find_replace',
    'Search',
    'Find and replace',
    'Changes a word or phrase across a notebook.',
    'search',
  ],
  [
    'find_related',
    'Search',
    'Find related pages',
    'Lists pages that talk about the same thing and links them.',
    'link',
  ],
  [
    'find_save',
    'Search',
    'Save a search',
    'Keeps a search so you can open it in one tap.',
    'pin',
  ],
  [
    'rev_plan',
    'Review',
    'Schedule reviews',
    'Plans when you should look at this again.',
    'clock',
  ],
  [
    'rev_deck',
    'Review',
    'Add to the Revise deck',
    'Sends cards to your daily review.',
    'reviewB',
  ],
  ['rev_remind', 'Review', 'Remind me', 'Sets a reminder to review.', 'bell'],
  [
    'rev_weak',
    'Review',
    'Weak spots report',
    'Lists what you forget most.',
    'target',
  ],
  [
    'io_pdf',
    'Import and export',
    'Import a PDF or book',
    'Reads a PDF or book into your Library.',
    'upload',
  ],
  [
    'io_link',
    'Import and export',
    'Import from a link',
    'Reads an article or video page.',
    'link',
  ],
  [
    'io_export',
    'Import and export',
    'Export as PDF',
    'Saves a notebook or page as a PDF.',
    'download',
  ],
  [
    'io_share',
    'Import and export',
    'Share a notebook file',
    'Makes a file a friend can import.',
    'share',
  ],
  [
    'io_bulk',
    'Import and export',
    'Bulk import',
    'Brings in many files at once and sorts them.',
    'inbox',
    1,
  ],
].map((t) => ({ id: t[0], g: t[1], n: t[2], d: t[3], ic: t[4], lock: !!t[5] }))
const TOOL = Object.fromEntries(TOOLS.map((t) => [t.id, t]))
const PV = {
  sum_tab: 'summary',
  sum_short: 'summary',
  map_new: 'map',
  cards_new: 'cards',
  cards_cloze: 'cards',
  cards_quiz: 'cards',
  db_new: 'db',
  layout_cols: 'cols',
}
const isLocked = (id) => TOOL[id] && TOOL[id].lock && !S.unl[id]
const EFF = {
  quick: {
    n: 'Quick',
    c: 0,
    t: 'small',
    d: 'One small, fast model does everything. Best for short jobs.',
  },
  standard: {
    n: 'Standard',
    c: 2,
    t: 'mid',
    d: 'A middle model plans and writes. Good for most notebooks.',
  },
  deep: {
    n: 'Deep',
    c: 8,
    t: 'top',
    d: 'The top model makes the plan; smaller models write each part. Best for big or tricky jobs.',
  },
}
let UID = 0,
  CUR = null
const uid = () => 'p' + ++UID
const mkStep = (t, d) => ({ id: uid(), t, on: true, d: d || TOOL[t].d })
const cp = (a) => (a ? a.map((s) => Object.assign({}, s)) : null)
/* ===== v4: the tool framework, a small in-page copy of docs/design/ai-tool-framework.md =====
   REGISTRY (what each tool needs, makes, where it writes, cost, undo, risk) → VALIDATE (a plan cannot run with an error)
   → EXECUTE (stage each step, retry with backoff, pause on failure: Retry / Skip / Stop; nothing is written yet)
   → COMMIT (all or nothing, same ids if repeated) → UNDO (takes the whole job back). */
const GDEF = {
  Notebooks: { needs: ['notebook'], w: 'Notebook' },
  Pages: { needs: ['page'], w: 'Notes tab' },
  Tabs: { needs: ['page'], w: 'Page tabs' },
  Summaries: { needs: ['page'], w: 'Summary tab' },
  'Mind maps': { needs: ['map'], w: 'Mind map tab' },
  Cards: { needs: ['cards'], w: 'Cards deck' },
  Databases: { needs: ['database'], w: 'Database' },
  Styles: { needs: ['page'], w: 'Page style' },
  Layouts: { needs: ['page'], w: 'Notes tab' },
  Tags: { needs: ['page'], w: 'Tags' },
  Library: { needs: [], w: 'Library' },
  'Home widgets': { needs: [], w: 'Home' },
  Search: { needs: ['notebook'], w: 'Search' },
  Review: { needs: ['cards'], w: 'Review' },
  'Import and export': { needs: [], w: 'Library' },
}
const MOV = {
  nb_new: { needs: [], gives: ['notebook'], cost: 'none', undo: 'batch' },
  nb_section: { gives: ['section'], cost: 'none', undo: 'batch' },
  nb_cover: { cost: 'none', undo: 'values' },
  nb_merge: { risk: 'inbox' },
  pg_add: {
    needs: ['notebook'],
    gives: ['page'],
    cost: 'medium',
    undo: 'batch',
  },
  pg_tpl: { needs: ['notebook'], gives: ['page'], undo: 'batch' },
  pg_refine: { cost: 'medium' },
  pg_split: { risk: 'inbox' },
  pg_join: { risk: 'inbox' },
  pg_order: { needs: ['notebook'], cost: 'none', undo: 'values' },
  pg_dup: { cost: 'none', undo: 'batch' },
  tab_add: { cost: 'none', undo: 'batch' },
  tab_name: { cost: 'none', undo: 'values' },
  tab_order: { cost: 'none', undo: 'values' },
  tab_default: { needs: [], cost: 'none', undo: 'values' },
  sum_tab: { undo: 'batch' },
  map_new: { needs: ['page'], gives: ['map'], cost: 'medium', undo: 'batch' },
  cards_new: { needs: ['page'], gives: ['cards'], undo: 'batch' },
  cards_cloze: { needs: ['page'], gives: ['cards'], undo: 'batch' },
  cards_quiz: { needs: ['page'], gives: ['cards'], undo: 'batch' },
  db_new: { needs: ['page'], gives: ['database'], undo: 'batch' },
  style_apply: { cost: 'none', undo: 'values' },
  hd_style: { cost: 'none', undo: 'values' },
  style_theme: { needs: ['notebook'], undo: 'values' },
  layout_cols: { cost: 'none' },
  layout_move: { cost: 'none' },
  find_replace: { risk: 'inbox' },
  find_save: { needs: [], cost: 'none', undo: 'batch' },
  rev_weak: { needs: [] },
  rev_remind: { needs: [], cost: 'none', undo: 'batch' },
  io_export: { needs: ['notebook'], w: 'A file', cost: 'none', undo: 'batch' },
  io_share: { needs: ['notebook'], w: 'A file', cost: 'none', undo: 'batch' },
  lib_add: { undo: 'batch' },
  io_pdf: { undo: 'batch' },
  io_link: { undo: 'batch' },
  io_bulk: { undo: 'batch' },
  home_widget: { undo: 'batch', cost: 'none' },
  home_plan: { undo: 'batch', cost: 'none' },
  home_tpl: { undo: 'batch' },
}
TOOLS.forEach((t) => {
  const g = GDEF[t.g],
    o = MOV[t.id] || {}
  Object.assign(t, {
    needs: o.needs || g.needs,
    gives: o.gives || [],
    w: o.w || g.w,
    cost: o.cost || 'small',
    undo: o.undo || 'history',
    risk: o.risk || 'direct',
  })
})
const KIND = {
  notebook: 'a notebook',
  page: 'a notes page',
  map: 'a mind map',
  cards: 'cards',
  database: 'a database',
  section: 'a section',
}
const PROVIDER = {
  notebook: 'nb_new',
  page: 'pg_add',
  map: 'map_new',
  cards: 'cards_new',
  database: 'db_new',
  section: 'nb_section',
}
const COSTW = {
  none: 'Free · no AI needed',
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
}
const UNDOW = {
  batch: 'Removes what it made',
  history: 'Puts the page back from its History',
  values: 'Puts the old settings back',
}
const tdet = (t) =>
  '<dl class="tdet"><dt>Needs first</dt><dd>' +
  (t.needs.length ? t.needs.map((k) => KIND[k]).join(', ') : 'Nothing') +
  '</dd><dt>Makes</dt><dd>' +
  (t.gives.length
    ? t.gives.map((k) => KIND[k]).join(', ')
    : 'A change, nothing new') +
  '</dd><dt>Writes to</dt><dd>' +
  esc(t.w) +
  '</dd><dt>AI cost</dt><dd>' +
  COSTW[t.cost] +
  '</dd><dt>Undo</dt><dd>' +
  UNDOW[t.undo] +
  '</dd><dt>Approval</dt><dd>' +
  (t.risk === 'inbox' ? 'Always waits in your Inbox' : 'Preview, then Apply') +
  '</dd></dl>'
/* destination: where the job writes */
const destHas = (d) =>
  d.kind === 'page' ? ['notebook', 'page'] : d.kind === 'nb' ? ['notebook'] : []
const destName = (d) =>
  d.kind === 'new'
    ? (d.name || '').trim() || 'New notebook'
    : d.kind === 'page'
      ? 'This page'
      : d.nb + (d.sec ? ' › ' + d.sec : '')
const place = (d, t) =>
  t.id === 'nb_new'
    ? 'Notebooks › ' + destName(d)
    : /^(Library|Home|A file)$/.test(t.w)
      ? t.w
      : destName(d) + ' › ' + t.w
/* VALIDATE: pure. Returns one plain error per broken step, a one-tap fix, and what each step depends on. */
function validate(P, dest) {
  const errs = {},
    fix = {},
    deps = {},
    prov = {},
    have = new Set(destHas(dest)),
    on = (P || []).filter((s) => s.on)
  let nb = 0
  on.forEach((s, i) => {
    const t = TOOL[s.t]
    deps[s.id] = []
    const bad = (m, f) => {
      if (!errs[s.id]) {
        errs[s.id] = m
        fix[s.id] = f
      }
    }
    if (!t) {
      bad('This tool is not in the catalog.', { k: 'rm', l: 'Remove' })
      return
    }
    if (isLocked(s.t))
      bad('This is a locked Professional tool.', { k: 'unl', l: 'Unlock' })
    if (s.t === 'nb_new') {
      if (dest.kind !== 'new')
        bad(
          'You chose a notebook you already have, so this step is not needed.',
          { k: 'rm', l: 'Remove' },
        )
      else if (++nb > 1)
        bad('A job makes one notebook.', { k: 'rm', l: 'Remove' })
    }
    t.needs.forEach((k) => {
      if (have.has(k)) {
        if (prov[k]) deps[s.id].push(prov[k])
        return
      }
      const later = on
          .slice(i + 1)
          .find((x) => TOOL[x.t] && TOOL[x.t].gives.includes(k)),
        off = (P || []).find(
          (x) => !x.on && TOOL[x.t] && TOOL[x.t].gives.includes(k),
        )
      if (later)
        bad(
          'Needs ' +
            KIND[k] +
            ' first. It must come after “' +
            TOOL[later.t].n +
            '”.',
          { k: 'move', after: later.id, l: 'Move it down' },
        )
      else if (off)
        bad('Needs “' + TOOL[off.t].n + '”, which is unticked.', {
          k: 'tick',
          id: off.id,
          l: 'Tick it',
        })
      else
        bad('Needs ' + KIND[k] + ' first.', {
          k: 'add',
          tool: PROVIDER[k],
          l: 'Add “' + TOOL[PROVIDER[k]].n + '”',
        })
    })
    t.gives.forEach((k) => {
      if (!have.has(k) || !prov[k]) {
        have.add(k)
        prov[k] = s.id
      }
    })
  })
  const n = Object.keys(errs).length
  return { ok: !n && on.length > 0, errs, fix, deps, n }
}
/* everything that depends on a step, directly or through another step */
function dependants(P, dest, id) {
  const v = validate(P, dest),
    set = new Set([id]),
    out = []
  P.filter((s) => s.on).forEach((s) => {
    if ((v.deps[s.id] || []).some((d) => set.has(d))) {
      set.add(s.id)
      out.push(s)
    }
  })
  return out
}
/* the mock's saved notes: Apply writes here, Undo takes it back */
const DB = { nbs: NBS.map((n, i) => ({ id: 'n' + i, name: n })), recs: [] }
const nbNames = () => DB.nbs.map((n) => n.name)
const DUR = { none: 260, small: 520, medium: 780, large: 1000 }
const Engine = {
  start(o) {
    const v = validate(o.plan, o.dest)
    if (!v.ok) return null
    const steps = o.plan
      .filter((s) => s.on)
      .map((s) => ({
        id: s.id,
        t: s.t,
        d: s.d,
        deps: v.deps[s.id],
        state: 'wait',
        tries: 0,
        ms: 0,
        err: '',
        wait: 0,
        where: place(o.dest, TOOL[s.t]),
      }))
    const j = {
      id: 'job' + ++UID,
      title: o.title,
      dest: Object.assign({}, o.dest),
      steps,
      state: 'running',
      timer: null,
      failId: null,
      failLeft: 0,
      onChange: o.onChange,
      applied: false,
      last: null,
    }
    if (o.fail) {
      const f =
        steps.find((s) => s.t === 'map_new') ||
        steps[Math.min(2, steps.length - 1)]
      if (f && steps.indexOf(f) > 0) {
        j.failId = f.id
        j.failLeft = 3
      }
    }
    return j
  },
  pump(j) {
    clearTimeout(j.timer)
    if (j.state === 'stopped') return
    if (S.demo === 'off') {
      j.state = 'offline'
      j.onChange()
      return
    }
    const s = j.steps.find((x) => x.state === 'wait')
    if (!s) {
      j.state = 'preview'
      j.onChange(true)
      return
    }
    if (
      s.deps.some((d) => {
        const x = j.steps.find((y) => y.id === d)
        return x && (x.state === 'skip' || x.state === 'blocked')
      })
    ) {
      s.state = 'blocked'
      return this.pump(j)
    }
    s.state = 'run'
    s.tries++
    j.state = 'running'
    const t1 = Date.now()
    j.onChange()
    j.timer = setTimeout(() => {
      s.ms += Date.now() - t1
      if (j.failId === s.id && j.failLeft > 0) {
        j.failLeft--
        s.err = 'The AI did not answer in time.'
        if (s.tries < 3) {
          s.state = 'retry'
          s.wait = s.tries === 1 ? 1 : 2
          j.onChange()
          j.timer = setTimeout(() => {
            s.state = 'wait'
            this.pump(j)
          }, s.wait * 900)
          return
        } /* backoff: wait longer each time */
        s.state = 'fail'
        j.state = 'attention'
        j.onChange()
        return
      }
      s.state = 'done'
      s.err = ''
      j.last = s.id
      setTimeout(() => {
        if (j.last === s.id) j.last = null
      }, 500)
      this.pump(j)
    }, DUR[TOOL[s.t].cost])
  },
  retry(j, id) {
    const s = j.steps.find((x) => x.id === id)
    if (!s) return
    s.state = 'wait'
    s.tries = 0
    s.err = ''
    this.pump(j)
  },
  skip(j, id) {
    const s = j.steps.find((x) => x.id === id)
    if (!s) return
    s.state = 'skip'
    this.pump(j)
  },
  willBlock(j, id) {
    const set = new Set([id]),
      out = []
    j.steps.forEach((x) => {
      if (x.deps.some((d) => set.has(d))) {
        set.add(x.id)
        out.push(x)
      }
    })
    return out
  },
  stop(j) {
    clearTimeout(j.timer)
    j.state = 'stopped'
  },
  done: (j) => j.steps.filter((s) => s.state === 'done'),
  /* all or nothing; record ids come from the job and step, so applying twice cannot make copies */
  commit(j) {
    if (j.applied) return
    const recs = this.done(j).map((s) => ({
      id: j.id + '.' + s.id,
      job: j.id,
      t: s.t,
      n: TOOL[s.t].n,
      where: s.where,
    }))
    if (recs.some((r) => r.t === 'nb_new'))
      DB.nbs.push({ id: j.id, name: destName(j.dest), job: j.id })
    DB.recs = DB.recs.filter((r) => r.job !== j.id).concat(recs)
    j.applied = true
  },
  undo(j) {
    if (!j.applied) return
    DB.recs = DB.recs.filter((r) => r.job !== j.id)
    DB.nbs = DB.nbs.filter((n) => n.job !== j.id)
    j.applied = false
  },
  saved: (j) => DB.recs.filter((r) => r.job === j.id),
}
const jobDetail = (j) =>
  '<div class="well jd">' +
  j.steps
    .map(
      (s) =>
        '<div class="jdr"><span>' +
        esc(TOOL[s.t].n) +
        '</span><small>' +
        ({ done: 'Done', skip: 'Skipped', blocked: 'Skipped', fail: 'Failed' }[
          s.state
        ] || 'Not run') +
        (s.tries > 1 ? ' · ' + s.tries + ' tries' : '') +
        (s.ms ? ' · ' + (s.ms / 1000).toFixed(1) + ' s' : '') +
        '</small></div>',
    )
    .join('') +
  '<div class="jdr"><span>Run from</span><small>The app · ' +
  esc(chipLabel()) +
  ' · ₹0</small></div></div>'

function makePlan(goal, page, dest) {
  const g = (goal || '').toLowerCase(),
    ids = [],
    add = (...a) =>
      a.forEach((x) => {
        if (!ids.includes(x) && !isLocked(x)) ids.push(x)
      })
  const num = (g.match(/(\d+)\s*(?:recall\s*)?cards?/) || [])[1]
  if (page) {
    if (/column|layout|side by side/.test(g)) add('layout_cols')
    if (/tidy|clean|polish|fix/.test(g))
      add('pg_refine', 'hd_style', 'style_apply')
    if (/\bnotes?\b/.test(g) && !/summar/.test(g))
      add('pg_refine', 'sum_points')
    if (/summar/.test(g)) add('sum_tab')
    if (/map/.test(g)) add('map_new')
    if (/card/.test(g)) add('cards_new')
    if (/database|table/.test(g)) add('db_new', 'db_rows')
    if (!ids.length) add('pg_refine', 'sum_tab')
  } else {
    if (!dest || dest.kind === 'new') add('nb_new')
    add('pg_add')
    if (/column|layout/.test(g)) add('layout_cols')
    add('sum_tab', 'map_new', 'cards_new', 'tags_add', 'style_apply')
    if (/database|table|track/.test(g)) add('db_new', 'db_rows')
    if (/library/.test(g)) add('lib_add')
  }
  return ids.map((id) =>
    mkStep(
      id,
      id === 'cards_new' && num
        ? 'Makes ' + num + ' recall cards from the notes.'
        : null,
    ),
  )
}
const actN = (P) => (P || []).filter((s) => s.on).length
/* the estimate adds up each step's cost class from the registry */
const CW = { none: 0, small: 1, medium: 2, large: 4 }
const bCost = (P) =>
  Math.round(
    EFF[S.B.eff].c *
      Math.min(
        1.6,
        (P || [])
          .filter((s) => s.on && TOOL[s.t])
          .reduce((a, s) => a + CW[TOOL[s.t].cost], 0) / 7,
      ) *
      10,
  ) / 10
function bEst(P) {
  CUR = P
  const r = costOf('build')
  CUR = null
  if (!r.m) return '<span class="est">No AI connected</span>'
  if (!S.cost.est) return '<span class="est">Estimate off</span>'
  return (
    '<span class="est">Total: about ₹' +
    money(r.c) +
    (r.c === 0 ? ' · <b>free</b>' : '') +
    '</span>'
  )
}
function effNote(P) {
  const r = ((CUR = P), costOf('build'))
  CUR = null
  const paid = bCost(P)
  return r.m && r.c === 0 && paid > 0 && S.cost.est
    ? '<p class="hint">Free through your Claude plan. A paid model would cost about ₹' +
        money(paid) +
        '.</p>'
    : ''
}
const effortCtl = () =>
  '<div class="effrow"><div class="eff" role="group" aria-label="Effort">' +
  Object.keys(EFF)
    .map(
      (k) =>
        '<button type="button" class="effb" data-a="eff" data-v="' +
        k +
        '" aria-pressed="' +
        (S.B.eff === k) +
        '"><b>' +
        EFF[k].n +
        '</b><small>' +
        (EFF[k].c ? '~₹' + EFF[k].c : 'Free') +
        '</small></button>',
    )
    .join('') +
  '</div><button type="button" class="ib sm" data-a="effinfo" aria-label="What do Quick, Standard and Deep mean?" title="What is this?">' +
  IC('help') +
  '</button></div>'
function effInfo() {
  Shell.dialog(
    '<h3>How much effort?</h3><p class="mini" style="margin:0 0 4px">Pick how much thinking the AI puts in. More effort costs more.</p><div class="tierx">' +
      Object.keys(EFF)
        .map(
          (k) =>
            '<div><b>' +
            EFF[k].n +
            ' · ' +
            (EFF[k].c ? 'about ₹' + EFF[k].c : 'free') +
            '</b>' +
            EFF[k].d +
            '</div>',
        )
        .join('') +
      '</div><p class="mini" style="margin:10px 0 0">With your Claude plan connected, every level runs free. The price shown is what a paid model would charge.</p><div class="ft"><button type="button" class="btn pri" data-a="dx">Got it</button></div>',
  )
}
/* plan edits are undoable (the plan, its stage and its destination travel together) */
function planEdit(label, fn, quiet) {
  const B = S.B,
    snap = () => ({
      p: cp(B.plan),
      s: B.stage,
      d: Object.assign({}, B.dest),
      f: B.fromStudio,
    }),
    put = (x) => {
      B.plan = cp(x.p)
      B.stage = x.s
      B.dest = Object.assign({}, x.d)
      B.fromStudio = x.f
    }
  const before = snap()
  let after = null
  commit(
    label,
    () => {
      if (after) put(after)
      else {
        fn()
        after = snap()
      }
    },
    () => put(before),
    quiet,
  )
}
const bTitle = () => destName(S.B.dest)
/* the same destination picker in Build and in Studio: a new notebook, or a notebook (and section) you have */
const destPick = (p, d) =>
  '<div class="seg dseg" role="group" aria-label="Where it goes">' +
  [
    ['new', 'New notebook'],
    ['nb', 'A notebook I have'],
  ]
    .map(
      (x) =>
        '<button type="button" class="' +
        (d.kind === x[0] ? 'on' : '') +
        '" aria-pressed="' +
        (d.kind === x[0]) +
        '" data-a="' +
        p +
        'dest" data-v="' +
        x[0] +
        '">' +
        x[1] +
        '</button>',
    )
    .join('') +
  '</div>' +
  (d.kind === 'new'
    ? '<input class="inp" id="' +
      p +
      'name" value="' +
      esc(d.name || '') +
      '" placeholder="Name of the new notebook" aria-label="Name of the new notebook" maxlength="60">'
    : '<div class="dsel">' +
      sel(p + 'nb', nbNames(), d.nb, 'Notebook') +
      sel(
        p + 'sec',
        [['', 'No section']].concat(SECS.map((s) => [s, 'Section: ' + s])),
        d.sec || '',
        'Section inside the notebook',
      ) +
      '</div>')
const planRows = (P, v, dest) =>
  P.map((s) => {
    const t = TOOL[s.t],
      er = s.on && v.errs[s.id],
      fx = v.fix[s.id]
    return (
      '<div class="pr' +
      (s.on ? '' : ' off') +
      (er ? ' bad' : '') +
      '" data-id="' +
      s.id +
      '"><button type="button" class="gp" aria-label="Move step ' +
      esc(t.n) +
      ' (drag, or use the up and down arrow keys)" title="Drag to move">' +
      IC('grip') +
      '</button><label class="tk"><input type="checkbox" data-a="ptick" data-id="' +
      s.id +
      '" ' +
      (s.on ? 'checked' : '') +
      ' aria-label="Use step: ' +
      esc(t.n) +
      '"></label><span class="ty">' +
      IC(t.ic) +
      '</span><div class="g"><b>' +
      esc(t.n) +
      '</b><small>' +
      esc(s.d) +
      '</small>' +
      (er
        ? '<span class="perr" role="alert">' +
          esc(er) +
          (fx && fx.l
            ? '<button type="button" class="fixb" data-a="pfix" data-id="' +
              s.id +
              '">' +
              esc(fx.l) +
              '</button>'
            : '') +
          '</span>'
        : '<span class="plc">' +
          IC('folder') +
          '<span>' +
          esc(place(dest, t)) +
          '</span></span>') +
      '</div><button type="button" class="ib sm" data-a="prm" data-id="' +
      s.id +
      '" aria-label="Remove step ' +
      esc(t.n) +
      '" title="Remove">' +
      IC('x') +
      '</button></div>'
    )
  }).join('')
const EXAMPLES = [
  'Make a notebook from my ticked sources with a summary, a mind map and 10 cards',
  'Turn this into two-column notes with key ideas',
  'Build a habit tracker database from my notes',
]
function build() {
  const B = S.B
  if (B.view === 'catalog') return catalog()
  const n = ticked().length
  let h =
    '<div class="bld' +
    (S.open.bsrc ? ' srcopen' : '') +
    '"><div class="srcrow"><button type="button" class="btn" data-a="open" data-k="bsrc" aria-expanded="' +
    !!S.open.bsrc +
    '">' +
    IC('folder') +
    'Sources · ' +
    n +
    ' ticked' +
    IC('down') +
    '</button></div><div class="bl">' +
    srcPanel() +
    '</div><div class="br2">'
  if (B.stage === 'running' && B.job) h += running()
  else if (B.stage === 'preview' && B.job) h += bPreview()
  else if (B.stage === 'done' && B.job) h += bDone()
  else {
    h +=
      '<section class="card" aria-label="What should I build?"><div class="ch"><h2>What should I build?</h2><button type="button" class="btn sm" data-a="tcat">' +
      IC('layers') +
      'Tool catalog</button></div>' +
      '<textarea class="inp' +
      (B.plan ? ' cmp' : '') +
      '" id="bgoal" rows="' +
      (B.plan ? 2 : 3) +
      '" placeholder="For example: a notebook with a summary tab, a mind map and 10 recall cards" aria-label="What should I build?">' +
      esc(B.goal) +
      '</textarea>' +
      (B.plan
        ? ''
        : '<div class="sugg" role="group" aria-label="Examples">' +
          EXAMPLES.map(
            (x, i) =>
              '<button type="button" class="tag btn2" data-a="bex" data-i="' +
              i +
              '">' +
              esc(x.length > 48 ? x.slice(0, 46) + '…' : x) +
              '</button>',
          ).join('') +
          '</div>') +
      '<div class="ft2"><span class="gr">' +
      (n
        ? 'The AI will read the ' +
          n +
          ' ticked source' +
          (n === 1 ? '' : 's') +
          '.'
        : 'No source ticked. The AI builds from your idea only.') +
      '</span><button type="button" class="btn pri" id="bplan" data-a="mkplan"' +
      (B.goal.trim() ? '' : ' disabled') +
      '>' +
      IC('wand') +
      (B.plan ? 'Make a new plan' : 'Make plan') +
      '</button></div></section>'
    if (B.plan) h += planCard()
  }
  return h + '</div></div>'
}
function planCard() {
  const B = S.B,
    P = B.plan,
    v = validate(P, B.dest)
  return (
    '<section class="card' +
    (S.fx === 'plan' ? ' stg' : '') +
    '" aria-label="Plan"><div class="ch"><h2>Plan · ' +
    actN(P) +
    ' of ' +
    P.length +
    ' steps</h2><span class="gr"></span><button type="button" class="btn sm" data-a="padd">' +
    IC('plus') +
    'Add step</button><button type="button" class="ib sm" data-a="pclear" aria-label="Clear the plan" title="Clear the plan">' +
    IC('x') +
    '</button></div>' +
    '<span class="lbl">Where it goes</span><div class="dst">' +
    destPick('b', B.dest) +
    '</div>' +
    '<span class="lbl">Steps</span><p class="hint" style="margin:-4px 0 8px">Each step is one tool from the app, and shows where its result will go. Untick, reorder or remove steps before you run.</p>' +
    (P.length
      ? '<div class="plist well" id="plist">' +
        planRows(P, v, B.dest) +
        '</div>'
      : '<div class="empty">No steps. Add one from the Tool catalog.</div>') +
    (P.length
      ? v.n
        ? '<p class="vsum" role="status">' +
          IC('help') +
          v.n +
          ' step' +
          (v.n === 1 ? ' needs' : 's need') +
          ' a fix before this can run.</p>'
        : actN(P)
          ? '<p class="vsum ok" role="status">' +
            IC('check') +
            'Plan checked. Every step has what it needs.</p>'
          : ''
      : '') +
    '<div class="runbar jr"><div class="gr">' +
    effortCtl() +
    '</div><div class="rmeta">' +
    chip() +
    bEst(P) +
    '</div><button type="button" class="btn pri" data-a="brun"' +
    (v.ok ? '' : ' disabled') +
    '>' +
    IC('play') +
    'Run</button></div>' +
    effNote(P) +
    '</section>'
  )
}
/* the job runner: every row shows the real state of that step */
function jobRows(j) {
  return (
    '<ul class="jst">' +
    j.steps
      .map((s) => {
        const t = TOOL[s.t],
          blk = s.state === 'fail' ? Engine.willBlock(j, s.id) : []
        const line = {
          wait: 'Waiting',
          run: s.tries > 1 ? 'Working… try ' + s.tries + ' of 3' : 'Working…',
          retry:
            s.err +
            ' Trying again in ' +
            s.wait +
            ' s (try ' +
            (s.tries + 1) +
            ' of 3).',
          fail: s.err + ' Tried 3 times.',
          done:
            'Done · ' +
            (s.ms / 1000).toFixed(1) +
            ' s' +
            (s.tries > 1 ? ' · worked on try ' + s.tries : ''),
          skip: 'Skipped by you',
          blocked: 'Skipped. It needs a step you skipped.',
        }[s.state]
        return (
          '<li class="' +
          s.state +
          (j.last === s.id ? ' new' : '') +
          '"><span class="st">' +
          (s.state === 'fail'
            ? '!'
            : s.state === 'retry'
              ? IC('clock')
              : s.state === 'skip' || s.state === 'blocked'
                ? '–'
                : IC('check')) +
          '</span><div class="g"><b>' +
          esc(t.n) +
          '</b><small class="' +
          (s.err ? 'e' : '') +
          '">' +
          esc(line) +
          '</small>' +
          (s.state === 'fail'
            ? '<div class="acts"><button type="button" class="btn sm pri" data-a="jretry" data-id="' +
              s.id +
              '">' +
              IC('redo') +
              'Retry</button>' +
              (t.gives.includes('notebook')
                ? ''
                : '<button type="button" class="btn sm" data-a="jskip" data-id="' +
                  s.id +
                  '">Skip this step</button>') +
              '</div>' +
              (blk.length
                ? '<small style="margin-top:6px">Skipping it also skips: ' +
                  blk.map((x) => esc(TOOL[x.t].n)).join(', ') +
                  '.</small>'
                : '')
            : '') +
          '</div></li>'
        )
      })
      .join('') +
    '</ul>'
  )
}
function running() {
  const j = S.B.job,
    tot = j.steps.length,
    dn = j.steps.filter((s) =>
      ['done', 'skip', 'blocked'].includes(s.state),
    ).length,
    pc = Math.round((dn / tot) * 100),
    at = j.state === 'attention',
    off = j.state === 'offline'
  return (
    '<section class="card' +
    (S.fx === 'run' ? ' stg' : '') +
    '" aria-label="Running" role="status"><div class="ch"><h2>' +
    (at
      ? 'One step needs you'
      : off
        ? 'Waiting for internet'
        : 'Building “' + esc(j.title) + '”') +
    '</h2><span class="gr"></span><span class="mini">' +
    dn +
    ' of ' +
    tot +
    '</span><button type="button" class="btn sm" data-a="bstop">' +
    IC('x') +
    'Stop</button></div><div class="bar2" aria-hidden="true"><i class="' +
    (at ? 'warn' : '') +
    '" style="width:' +
    pc +
    '%"></i></div>' +
    (at
      ? '<div class="attn">' +
        IC('help') +
        '<div><b>The other steps are safe.</b><span>Try this step again, or skip it and keep the rest. Nothing is saved yet.</span></div></div>'
      : '') +
    (off
      ? '<div class="attn off">' +
        IC('cloud') +
        '<div><b>You are offline.</b><span>The job is kept and starts by itself when the internet is back. Finished steps are not repeated.</span></div></div>'
      : '') +
    jobRows(j) +
    '<p class="hint">Nothing is saved until you tap Apply.</p></section>'
  )
}
function bPreview() {
  const B = S.B,
    j = B.job,
    A2 = Engine.done(j),
    miss = j.steps.filter((s) => s.state !== 'done'),
    ks = new Set(A2.map((s) => PV[s.t]).filter(Boolean)),
    cs = A2.find((s) => s.t === 'cards_new'),
    cn = cs ? +(cs.d.match(/\d+/) || [8])[0] : 8
  const tabs = [['notes', 'Notes']].concat(
    ks.has('summary') ? [['summary', 'Summary']] : [],
    ks.has('map') ? [['map', 'Mind map']] : [],
    ks.has('cards') ? [['cards', 'Cards']] : [],
    ks.has('db') ? [['db', 'Database']] : [],
  )
  if (!tabs.some((t) => t[0] === B.pv)) B.pv = 'notes'
  const P1 =
      '<p>Small habits stick when they are tied to something you already do. The cue matters more than the goal.</p>',
    P2 =
      '<p>Start with a habit that takes two minutes or less. Review it every Sunday.</p>'
  const body = {
    notes: ks.has('cols')
      ? '<div class="cols2"><div><h4>Why habits stick</h4>' +
        P1 +
        '</div><div><h4>How to start</h4>' +
        P2 +
        '</div></div>'
      : '<h4>Why habits stick</h4>' + P1 + '<h4>How to start</h4>' + P2,
    summary:
      '<h4>Summary</h4><p>Make the habit tiny, tie it to a cue you already have, and review weekly.</p>',
    map: '<div class="mm"><div class="c">Habits that stick</div><div class="br"><div class="n">Make it tiny</div><div class="n">Pick a cue</div><div class="n">Review weekly</div></div></div>',
    cards:
      '<div class="qc"><div><b>What matters more than the goal?</b><span>The cue</span></div><div><b>How long is a tiny habit?</b><span>Two minutes or less</span></div><div><b>When do you review?</b><span>Every Sunday</span></div></div><p class="mini" style="margin-top:8px">+ ' +
      (cn - 3 > 0 ? cn - 3 : 0) +
      ' more cards</p>',
    db: '<table class="tbl"><tr><th>Habit</th><th>Cue</th><th>Streak</th></tr><tr><td>Read one page</td><td>After coffee</td><td>4</td></tr><tr><td>Plan the day</td><td>Before email</td><td>2</td></tr></table>',
  }[B.pv]
  return (
    '<section class="card pv' +
    (S.fx === 'preview' ? ' stg' : '') +
    '" aria-label="Preview"><div class="ch"><h2>Preview</h2><span class="gr"></span><span class="path">' +
    IC('folder') +
    esc((j.dest.kind === 'new' ? 'New notebook › ' : '') + j.title) +
    '</span></div><p class="lead">This is a draft. Nothing is saved until you tap Apply.</p>' +
    '<div class="mock"><div class="mt0">' +
    IC('notebooksB') +
    esc(j.title) +
    '</div><div class="mtabs" role="tablist" aria-label="Preview tabs">' +
    tabs
      .map(
        (t) =>
          '<button type="button" role="tab" aria-selected="' +
          (B.pv === t[0]) +
          '" data-a="pvtab" data-v="' +
          t[0] +
          '">' +
          t[1] +
          '</button>',
      )
      .join('') +
    '</div><div class="mbody">' +
    body +
    '</div></div>' +
    '<span class="lbl">What was built, and where it will go</span><div class="well">' +
    A2.map(
      (s) =>
        '<div class="jdr">' +
        IC('check') +
        '<span>' +
        esc(TOOL[s.t].n) +
        '</span><small>' +
        esc(s.where) +
        '</small></div>',
    ).join('') +
    miss
      .map(
        (s) =>
          '<div class="jdr"><span style="color:var(--muted);padding-left:26px">' +
          esc(TOOL[s.t].n) +
          '</span><small>Skipped</small></div>',
      )
      .join('') +
    '</div>' +
    '<div class="ft2"><span class="gr">' +
    A2.length +
    ' step' +
    (A2.length === 1 ? '' : 's') +
    ' will be saved together' +
    (miss.length ? ' · ' + miss.length + ' skipped' : '') +
    '</span><button type="button" class="btn" data-a="bdiscard">Discard</button><button type="button" class="btn" data-a="bedit">' +
    IC('pen') +
    'Edit plan</button><button type="button" class="btn pri" data-a="bapply">' +
    IC('check') +
    'Apply</button></div></section>'
  )
}
function bDone() {
  const j = S.B.job,
    R = Engine.saved(j)
  return (
    '<section class="card' +
    (S.fx === 'done' ? ' stg' : '') +
    '" aria-label="Applied"><div class="okbox"><span class="mk">' +
    IC('check') +
    '</span><div style="flex:1;min-width:0"><h2>Saved: “' +
    esc(j.title) +
    '”</h2><p>' +
    R.length +
    ' item' +
    (R.length === 1 ? '' : 's') +
    ' saved in one go. One Undo takes all of it back, here or in Activity.</p></div></div>' +
    '<div class="well saved">' +
    R.map(
      (r) =>
        '<div class="jdr">' +
        IC('check') +
        '<span>' +
        esc(r.n) +
        '</span><small>' +
        esc(r.where) +
        '</small></div>',
    ).join('') +
    '</div>' +
    '<div class="row"><button type="button" class="btn" data-a="bundo">' +
    IC('undo') +
    'Undo</button><button type="button" class="btn pri" data-a="bnew">' +
    IC('plus') +
    'Build something else</button></div></section>'
  )
}

/* ---------- Tool catalog ---------- */
function catalog() {
  const B = S.B,
    q = B.q.toLowerCase().trim(),
    L = TOOLS.filter(
      (t) =>
        (!B.cg || t.g === B.cg) &&
        (!q || (t.n + ' ' + t.d + ' ' + t.g).toLowerCase().includes(q)),
    )
  const inPlan = (id) => (B.plan || []).filter((s) => s.t === id).length
  let h =
    '<div class="chead"><button type="button" class="btn sm" data-a="cback">' +
    IC('back') +
    (B.pick ? 'Back to plan' : 'Back') +
    '</button><h2>Tool catalog</h2>' +
    (B.pick ? '<span class="badge">Pick a step</span>' : '') +
    '<button type="button" class="ib" data-a="cback" aria-label="Close the catalog" title="Close">' +
    IC('x') +
    '</button></div>' +
    '<p class="sub" style="margin-bottom:0">' +
    (B.pick
      ? 'Tap Add to plan on any tool. It joins the end of your plan.'
      : 'Everything the AI can do in your app. The AI reads this same list when it makes a plan. Open a tool to see what it needs and makes.') +
    '</p>' +
    '<div class="ctools"><input class="inp" id="tq" type="search" placeholder="Search ' +
    TOOLS.length +
    ' tools" value="' +
    esc(B.q) +
    '" aria-label="Search tools">' +
    sel(
      'tg',
      [['', 'All spaces']].concat(GROUPS.map((g) => [g, g])),
      B.cg,
      'Show one space',
    ) +
    '</div>'
  if (!L.length)
    return (
      h +
      '<div class="empty">No tool matches “' +
      esc(B.q) +
      '”.<br><span class="mini">Try a shorter word, or describe the job in Build and let the AI choose.</span><div class="row" style="justify-content:center;margin-top:12px"><button type="button" class="btn" data-a="cclear">Clear search</button></div></div>'
    )
  GROUPS.forEach((g) => {
    const l = L.filter((t) => t.g === g)
    if (!l.length) return
    h +=
      '<section class="tgrp" aria-label="' +
      g +
      '"><h3>' +
      g +
      ' <span>' +
      l.length +
      ' tool' +
      (l.length === 1 ? '' : 's') +
      '</span></h3><div class="tw">' +
      l
        .map((t) => {
          const lk = t.lock && !S.unl[t.id],
            ip = inPlan(t.id)
          return (
            '<div class="tl"><span class="ty">' +
            IC(t.ic) +
            '</span><div class="g"><b>' +
            esc(t.n) +
            (lk
              ? '<span class="lk">' + IC('lock') + 'Professional</span>'
              : '') +
            (ip
              ? '<span class="inpl">In plan' +
                (ip > 1 ? ' ×' + ip : '') +
                '</span>'
              : '') +
            '</b><small>' +
            esc(t.d) +
            '</small></div>' +
            (lk
              ? '<button type="button" class="btn sm" data-a="tunl" data-id="' +
                t.id +
                '">' +
                IC('lock') +
                'Unlock</button>'
              : B.pick
                ? '<button type="button" class="btn sm pri" data-a="tadd" data-id="' +
                  t.id +
                  '">' +
                  IC('plus') +
                  'Add to plan</button>'
                : '') +
            '<button type="button" class="ib sm" data-a="open" data-k="td' +
            t.id +
            '" aria-expanded="' +
            !!S.open['td' + t.id] +
            '" aria-label="What ' +
            esc(t.n) +
            ' needs and makes" title="Details">' +
            IC('down') +
            '</button>' +
            (S.open['td' + t.id] ? tdet(t) : '') +
            '</div>'
          )
        })
        .join('') +
      '</div></section>'
  })
  return h
}

/* ---------- tabs and render ---------- */
const aiTabs = Shell.tabs('ai3', {
  host: '#aitabs',
  utabs: true,
  catalog: [
    { id: 'build', label: 'Build', icon: 'wand' },
    { id: 'ask', label: 'Ask', icon: 'chat' },
    { id: 'jobs', label: 'Jobs', icon: 'sparkle' },
    { id: 'workflows', label: 'Workflows', icon: 'layers' },
    { id: 'activity', label: 'Activity', icon: 'clock' },
    { id: 'settings', label: 'Settings', icon: 'gear' },
  ],
  defaults: ['build', 'ask', 'jobs', 'workflows', 'activity', 'settings'],
  cur: () => S.tab,
  onPick: (id) => {
    S.tab = id
    render()
    $('#main').scrollTop = 0
  },
  onChange: () => {
    if (!aiTabs.list().some((t) => t.id === S.tab)) S.tab = aiTabs.list()[0].id
    render()
  },
})
function render() {
  const m = $('#main')
  if (!m) return
  const y = m.scrollTop
  const ps = $$('.pb2,.chatlog', m).map((e) => e.scrollTop)
  if (!isPro()) {
    m.innerHTML = beginner()
    Shell.top({
      side: false,
      panel: false,
      crumbs: ['AI'],
      actions: '',
      ai: true,
    })
    m.scrollTop = 0
    return
  }
  const tl = aiTabs.list().find((t) => t.id === S.tab),
    b = budget()
  const body = { build, ask: workspace, jobs, workflows, activity, settings }[
    S.tab
  ]()
  m.innerHTML =
    '<div class="ai' +
    (S.tab === 'ask' ? ' fill' : '') +
    '"><div class="ah"><h1>AI</h1><span class="badge">Professional</span><button type="button" class="bud ' +
    b.cls +
    '" data-a="usage" aria-label="' +
    esc(b.txt) +
    '. Open usage history">' +
    IC('rupee') +
    '<span>' +
    esc(b.txt) +
    '</span><span class="bar" aria-hidden="true"><i style="width:' +
    b.pct +
    '%"></i></span></button></div><p class="sub">Tell the AI what to build. It makes a plan from the app’s own tools, you check it, then it builds. Nothing is saved until you tap Apply.</p><div class="tabsrow" id="aitabs" role="tablist" aria-label="AI sections"></div>' +
    body +
    '</div>'
  aiTabs.draw()
  S.fx = null
  placeToast()
  Shell.top({
    side: false,
    panel: false,
    crumbs: ['AI', tl ? tl.label : ''],
    actions: H.html(),
    ai: true,
  })
  H.sync()
  Shell.clearable(
    m,
    (i) => i.type === 'search' || /^(jnew|bname|stname)$/.test(i.id),
  )
  dragList($('#plist'), '.pr', '.gp', (ids, id) => {
    const B = S.B,
      b = B.plan.map((x) => x.id)
    planEdit(
      'Moved a step',
      () => {
        B.plan = orderBy(B.plan, ids)
      },
      1,
    )
    if (id)
      setTimeout(() => {
        const g = $('.pr[data-id="' + id + '"] .gp')
        if (g) g.focus()
      }, 30)
  })
  $$('.pb2,.chatlog', m).forEach((e, i) => {
    if (ps[i] != null) e.scrollTop = ps[i]
  })
  m.scrollTop = y
  dragList($('#slist'), '.src', '.gp', (ids) => {
    const b = S.src.map((x) => x.id)
    commit(
      'Moved a source',
      () => (S.src = orderBy(S.src, ids)),
      () => (S.src = orderBy(S.src, b)),
      1,
    )
  })
  dragList($('#olist'), '.o2', '.gp', (ids) => {
    const b = S.out.map((x) => x.id)
    commit(
      'Moved an item',
      () => (S.out = orderBy(S.out, ids)),
      () => (S.out = orderBy(S.out, b)),
      1,
    )
  })
}

/* ---------- Add source sheet ---------- */
function openAdd(keep) {
  if (!keep) AS = { type: 'file', val: '', body: '', pick: [] }
  Shell.sheet.open({
    title: 'Add source',
    sub: 'Anything you want Claude to read',
    body: addBody,
    hint: 'Tap Done to add it',
    onClose: (ok) => {
      if (!ok) return
      const s = makeSrc()
      if (!s) {
        T('Add something first')
        setTimeout(() => openAdd(true), 80)
        return
      }
      commit(
        'Added “' + s[0].t + '”',
        () => S.src.push(...s),
        () => (S.src = S.src.filter((x) => !s.includes(x))),
        0,
      )
    },
  })
}
const DEMO = {
  file: ['lecture-slides-2.pdf', 'file'],
  img: ['whiteboard-photo.jpg', 'image'],
  audio: ['voice-memo-12-nov.m4a', 'audio'],
}
function makeSrc() {
  const a = AS,
    id = 's' + Date.now().toString(36)
  if (a.type in DEMO) {
    if (!a.val) return null
    return [
      {
        id,
        t: a.val,
        k: DEMO[a.type][1],
        m:
          { file: 'File', img: 'Image', audio: 'Audio' }[a.type] +
          ' · just added',
        on: true,
      },
    ]
  }
  if (a.type === 'link' || a.type === 'yt') {
    if (!/^https?:\/\/\S+/.test(a.val.trim())) return null
    const u = a.val.trim().replace(/^https?:\/\/(www\.)?/, '')
    return [
      {
        id,
        t: a.type === 'yt' ? 'YouTube video' : u.slice(0, 40),
        k: a.type === 'yt' ? 'video' : 'link',
        m: (a.type === 'yt' ? 'YouTube' : 'Link') + ' · ' + u.slice(0, 28),
        on: true,
      },
    ]
  }
  if (a.type === 'note') {
    if (!a.body.trim() && !a.val.trim()) return null
    return [
      {
        id,
        t: a.val.trim() || 'New note',
        k: 'note',
        m: 'Note · written now',
        on: true,
      },
    ]
  }
  if (a.type === 'text') {
    if (!a.body.trim()) return null
    return [
      {
        id,
        t: a.body.trim().slice(0, 28) + '…',
        k: 'text',
        m: 'Pasted text · ' + a.body.trim().split(/\s+/).length + ' words',
        on: true,
      },
    ]
  }
  if (a.type === 'drive') {
    if (!a.val) return null
    return [
      { id, t: a.val, k: 'cloud', m: 'Google Drive · just added', on: true },
    ]
  }
  if (a.type === 'mine') {
    if (!a.pick.length) return null
    return a.pick.map((n, i) => ({
      id: id + i,
      t: n,
      k: /Atomic|Deep|Reading/.test(n) ? 'book' : 'folder',
      m: 'From your library · just added',
      on: true,
    }))
  }
  return null
}
function addBody() {
  const a = AS
  let h =
    '<div class="stypes" role="group" aria-label="Kind of source">' +
    TYPES.map(
      (t) =>
        '<button type="button" class="tile" data-a="stype" data-v="' +
        t[0] +
        '" aria-pressed="' +
        (a.type === t[0]) +
        '">' +
        IC(t[1]) +
        t[2] +
        '<small>' +
        t[3] +
        '</small></button>',
    ).join('') +
    '</div><span class="lbl">' +
    TYPES.find((t) => t[0] === a.type)[2] +
    '</span>'
  if (a.type in DEMO)
    h +=
      '<div class="drop">' +
      IC('upload') +
      '<b>' +
      (a.val ? esc(a.val) : 'Drop it here or choose') +
      '</b><small>' +
      {
        file: 'PDF, Word, slides, spreadsheets',
        img: 'PNG, JPG, HEIC',
        audio: 'MP3, M4A, WAV',
      }[a.type] +
      '</small><button type="button" class="btn sm" data-a="demofile">' +
      (a.val ? 'Choose another' : 'Choose a file') +
      '</button></div>'
  else if (a.type === 'link' || a.type === 'yt')
    h +=
      '<input class="inp" id="aval" type="url" placeholder="' +
      (a.type === 'yt' ? 'https://youtube.com/watch?v=…' : 'https://') +
      '" value="' +
      esc(a.val) +
      '" aria-label="Link"><p class="mini" style="margin:8px 0 0">' +
      (a.type === 'yt'
        ? 'Claude reads the transcript and picks key frames.'
        : 'Claude reads the page through your connector.') +
      '</p>'
  else if (a.type === 'note')
    h +=
      '<input class="inp" id="aval" placeholder="Title" value="' +
      esc(a.val) +
      '" aria-label="Note title" style="margin-bottom:8px"><textarea class="inp" id="abody" rows="5" placeholder="Write here…" aria-label="Note">' +
      esc(a.body) +
      '</textarea>'
  else if (a.type === 'text')
    h +=
      '<textarea class="inp" id="abody" rows="6" placeholder="Paste text here…" aria-label="Pasted text">' +
      esc(a.body) +
      '</textarea>'
  else if (a.type === 'drive')
    h += S.conn.drive
      ? ['Reading notes 2026', 'Thesis outline', 'Budget sheet']
          .map(
            (n) =>
              '<button type="button" class="mrow" data-a="drivepick" data-v="' +
              n +
              '" aria-pressed="' +
              (a.val === n) +
              '"><span class="rd"></span><span class="g"><b>' +
              n +
              '</b><small>Google Drive</small></span></button>',
          )
          .join('')
      : '<div class="explain">' +
        IC('help') +
        '<p>Google Drive is not connected. Turn it on in Settings › Connectors.</p></div>'
  else
    h += ['Atomic Habits', 'Deep Work', 'Biology 101', 'Product thinking']
      .map(
        (n) =>
          '<label class="chk"><input type="checkbox" data-a="minepick" data-v="' +
          n +
          '" ' +
          (a.pick.includes(n) ? 'checked' : '') +
          '><span>' +
          n +
          '<small>' +
          (/Atomic|Deep/.test(n) ? 'Book' : 'Notebook') +
          '</small></span></label>',
      )
      .join('')
  return h
}
Shell.I.upload =
  Shell.I.upload ||
  '<path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M4 20h16"/>'

/* ---------- Usage page ---------- */
function usage() {
  if (!S.cost.hist) {
    T('Usage history is off. Turn it on in Settings › Cost and limits.')
    return
  }
  Shell.sheet.open({
    title: 'Usage and spend',
    sub: 'This month · resets on 1 December',
    hint: 'Costs are estimates until your provider bills',
    body: () => {
      const free = S.usage.filter((u) => u.c === 0).length,
        by = {}
      S.usage.forEach((u) => {
        by[u.m] = (by[u.m] || 0) + u.c
      })
      return (
        '<div class="stat"><div><b>₹' +
        money(S.spent) +
        '</b><small>Spent</small></div><div><b>₹' +
        money(S.cost.monthly) +
        '</b><small>Monthly limit</small></div><div><b>' +
        free +
        ' of ' +
        S.usage.length +
        '</b><small>Free runs</small></div></div>' +
        '<div class="row" style="margin-top:12px"><button type="button" class="btn sm" data-a="csv">' +
        IC('save') +
        'Export CSV</button></div><span class="lbl">By model</span><table class="tbl"><tr><th>Model</th><th>Spent</th></tr>' +
        Object.keys(by)
          .map(
            (k) =>
              '<tr><td>' + esc(k) + '</td><td>₹' + money(by[k]) + '</td></tr>',
          )
          .join('') +
        '</table><span class="lbl">Every run</span><table class="tbl"><tr><th>When · what</th><th>Cost</th></tr>' +
        S.usage
          .map(
            (u) =>
              '<tr><td>' +
              esc(u.d) +
              ' · ' +
              esc(u.w) +
              '<br><span class="mini">' +
              esc(u.m) +
              ' · ' +
              u.tok +
              ' tokens</span></td><td>' +
              (u.c === 0 ? 'Free' : '₹' + money(u.c)) +
              '</td></tr>',
          )
          .join('') +
        '</table>'
      )
    },
  })
}
function csv() {
  const rows = [['When', 'What', 'Model', 'Cost (INR)', 'Tokens']].concat(
    S.usage.map((u) => [u.d, u.w, u.m, u.c, u.tok]),
  )
  const txt = rows
    .map((r) =>
      r.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(','),
    )
    .join('\n')
  try {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv' }))
    a.download = 'ai-usage-nov-2026.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
  } catch (_) {}
  T('Saved ai-usage-nov-2026.csv')
}

/* ---------- Quick panel (replaces the shell AI bar's content on this page) ---------- */
let qpOpen = false
const QP = { mode: 'change', goal: '', plan: null, stage: 'idea', prog: 0 }
const QCHIPS = [
  ['Notes', 'Write clear notes from this page'],
  ['Summary', 'Add a summary tab to this page'],
  ['Mind map', 'Add a mind map tab to this page'],
  ['Cards', 'Make 10 recall cards from this page'],
  ['Database', 'Turn the tables on this page into a database'],
  ['Tidy up', 'Tidy up this page: fix headings, spacing and style'],
]
function qpChange() {
  const Q = QP
  let h =
    '<span class="lbl" style="margin-top:2px">Change anything on this page</span>'
  if (Q.stage === 'idea') {
    h +=
      '<textarea class="inp" id="qpg" rows="3" placeholder="For example: make this a 2-column page with a summary tab and 10 cards" aria-label="What should change on this page?">' +
      esc(Q.goal) +
      '</textarea>' +
      '<div class="tg" style="margin-top:10px" role="group" aria-label="Quick ideas">' +
      QCHIPS.map(
        (c, i) =>
          '<button type="button" class="tag btn2" data-a="qchip" data-i="' +
          i +
          '">' +
          c[0] +
          '</button>',
      ).join('') +
      '</div>' +
      '<div class="qo">' +
      chip() +
      '<span class="gr"></span></div>' +
      effortCtl() +
      '<div class="ft2"><span class="gr">The plan shows first. Nothing changes yet.</span><button type="button" class="btn pri" id="qplan" data-a="qplan"' +
      (Q.goal.trim() ? '' : ' disabled') +
      '>' +
      IC('wand') +
      'Make plan</button></div>'
  } else if (Q.stage === 'plan') {
    h +=
      '<p class="qg">“' +
      esc(Q.goal) +
      '” <button type="button" class="mt" data-a="qreset">Change</button></p><span class="lbl" style="margin-top:6px">Plan · ' +
      actN(Q.plan) +
      ' of ' +
      Q.plan.length +
      ' steps</span>' +
      Q.plan
        .map((s) => {
          const t = TOOL[s.t]
          return (
            '<div class="qpr' +
            (s.on ? '' : ' off') +
            '"><label class="tk"><input type="checkbox" data-a="qtick" data-id="' +
            s.id +
            '" ' +
            (s.on ? 'checked' : '') +
            ' aria-label="Use step: ' +
            esc(t.n) +
            '"></label><span class="ty">' +
            IC(t.ic) +
            '</span><div class="g"><b>' +
            esc(t.n) +
            '</b><small>' +
            esc(s.d) +
            '</small></div><button type="button" class="ib sm" data-a="qrm" data-id="' +
            s.id +
            '" aria-label="Remove step ' +
            esc(t.n) +
            '" title="Remove">' +
            IC('x') +
            '</button></div>'
          )
        })
        .join('') +
      (Q.plan.length
        ? ''
        : '<div class="empty" style="padding:16px">No steps left.</div>') +
      '<div class="qo">' +
      chip() +
      '<span class="gr"></span>' +
      bEst(Q.plan) +
      '</div>' +
      effortCtl() +
      effNote(Q.plan) +
      '<div class="ft2"><button type="button" class="btn" data-a="qedit">' +
      IC('pen') +
      'Edit plan</button><span style="flex:1"></span><button type="button" class="btn pri" data-a="qrun"' +
      (actN(Q.plan) ? '' : ' disabled') +
      '>' +
      IC('play') +
      'Run</button></div>'
  } else if (Q.stage === 'running') {
    const j = Q.job,
      dn = j.steps.filter((s) => s.state === 'done').length
    h +=
      '<div class="bar2" aria-hidden="true"><i style="width:' +
      Math.round((dn / j.steps.length) * 100) +
      '%"></i></div>' +
      (j.state === 'offline'
        ? '<div class="attn off">' +
          IC('cloud') +
          '<div><b>You are offline.</b><span>It starts by itself when the internet is back.</span></div></div>'
        : '') +
      '<div role="status">' +
      jobRows(j) +
      '</div>'
  } else {
    h +=
      '<div class="qdone" role="status">' +
      IC('check') +
      '<div><b>Page changed</b><small>' +
      actN(Q.plan) +
      ' step' +
      (actN(Q.plan) === 1 ? '' : 's') +
      ' applied to this page.</small></div></div><div class="ft2"><button type="button" class="btn" data-a="qundo">' +
      IC('undo') +
      'Undo</button><span style="flex:1"></span><button type="button" class="btn pri" data-a="qreset">' +
      IC('plus') +
      'Another change</button></div>'
  }
  return h
}
function qpAsk() {
  return (
    '<span class="lbl" style="margin-top:2px">Ask about this page</span><form class="ask" id="qpform"><input class="inp" id="qpq" placeholder="Ask about “AI”…" value="' +
    esc(S.qpq) +
    '" aria-label="Ask about this page"><button type="submit" class="btn pri" aria-label="Send">' +
    IC('send') +
    'Send</button></form><div class="qo">' +
    chip() +
    '<span class="gr"></span>' +
    est('qp') +
    '</div>' +
    '<span class="lbl">Quick actions</span>' +
    [
      ['Summarise this page', 'Three lines in plain words', 'note', 'qsum'],
      ['Make cards', 'Recall cards from what you see', 'layers', 'qcards'],
      ['Suggest tags', 'From the words on this page', 'tag', 'qtags'],
      ['Copy a prompt', 'Paste it into any AI yourself', 'copy', 'qcopy'],
      ['Paste the answer', 'Bring an answer back here', 'paste', 'qpaste'],
    ]
      .map(
        (x) =>
          '<button type="button" class="qa" data-a="' +
          x[3] +
          '">' +
          IC(x[2]) +
          '<span>' +
          x[0] +
          '<small>' +
          x[1] +
          '</small></span></button>',
      )
      .join('')
  )
}
function qpDraw() {
  const p = $('#qp')
  if (!p) return
  const b = budget()
  p.innerHTML =
    '<div class="qh"><span class="mk">' +
    IC('sparkle') +
    '</span><div class="tt"><b>AI</b><small>Claude, through your connector</small></div><button type="button" class="ib" data-a="qpx" aria-label="Close" title="Close">' +
    IC('x') +
    '</button></div>' +
    '<div class="qtabs" role="tablist" aria-label="AI panel">' +
    [
      ['change', 'Change this page'],
      ['ask', 'Ask about this page'],
    ]
      .map(
        (t) =>
          '<button type="button" role="tab" aria-selected="' +
          (QP.mode === t[0]) +
          '" data-a="qmode" data-v="' +
          t[0] +
          '">' +
          t[1] +
          '</button>',
      )
      .join('') +
    '</div>' +
    '<div class="qb">' +
    (QP.mode === 'change' ? qpChange() : qpAsk()) +
    '</div>' +
    '<div class="qf"><span class="gr">' +
    esc(b.txt) +
    '</span>' +
    (isPro()
      ? '<button type="button" class="btn" data-a="qpopen">' +
        IC('ext') +
        'Open AI mode</button>'
      : '<button type="button" class="btn" data-a="qplock">' +
        IC('lock') +
        'AI mode</button>') +
    '</div>'
  Shell.clearable(p, (i) => i.id === 'qpq')
}
function qpPlace(a) {
  const p = $('#qp')
  if (!p) return
  if (innerWidth <= 640) return
  const r = (
      a || document.querySelector('[data-sh-ai]')
    ).getBoundingClientRect(),
    w = Math.min(392, innerWidth - 16)
  p.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.right - w)) + 'px'
  p.style.top = Math.max(8, r.bottom + 6) + 'px'
}
function qpShow(a) {
  if (qpOpen) return qpHide()
  Shell.closePop()
  const sc = document.createElement('div')
  sc.className = 'qpsc'
  sc.id = 'qpsc'
  document.body.appendChild(sc)
  const p = document.createElement('aside')
  p.className = 'qp'
  p.id = 'qp'
  p.setAttribute('role', 'dialog')
  p.setAttribute('aria-label', 'AI quick panel')
  document.body.appendChild(p)
  qpOpen = true
  qpDraw()
  qpPlace(a)
  document.querySelectorAll('[data-sh-ai]').forEach((b) => {
    b.classList.add('on')
    b.setAttribute('aria-expanded', 'true')
  })
  setTimeout(() => {
    const f = $('#qpq')
    if (f) f.focus()
  }, 40)
}
function qpHide() {
  qpOpen = false
  ;['qp', 'qpsc'].forEach((i) => {
    const e = document.getElementById(i)
    if (e) e.remove()
  })
  document.querySelectorAll('[data-sh-ai]').forEach((b) => {
    b.classList.remove('on')
    b.setAttribute('aria-expanded', 'false')
  })
}
/* take over the shell's AI button on this page (capture phase, before the shell hears it) */
addEventListener(
  'click',
  (e) => {
    const b = e.target.closest && e.target.closest('[data-sh-ai]')
    if (!b) return
    e.stopImmediatePropagation()
    e.preventDefault()
    qpShow(b)
  },
  true,
)
addEventListener(
  'keydown',
  (e) => {
    if (e.key === 'Escape' && qpOpen) {
      e.stopImmediatePropagation()
      qpHide()
    }
  },
  true,
)
addEventListener('resize', () => {
  if (qpOpen) qpPlace()
})
const QP_DO = {
  qsum: 'Summarising this page…',
  qcards: 'Making cards from this page…',
  qtags: 'Suggesting tags…',
  qcopy: 'Prompt copied. Paste it into any AI.',
  qpaste: 'Paste the answer from your AI here (demo).',
}

/* ---------- actions ---------- */
const A = {
  dx: () => Shell.dialogClose(),
  open: (b) => {
    S.open[b.dataset.k] = !S.open[b.dataset.k]
    render()
  },
  pane: (b) => {
    S.pane = b.dataset.v
    render()
  },
  gosettings: () => {
    Shell.dialogClose()
    S.tab = 'settings'
    render()
  },
  usefree: () => {
    Shell.dialogClose()
    const a = Object.assign({}, S.model)
    commit(
      'Using the free model',
      () => (S.model = { mode: 'auto', exact: 'conn' }),
      () => (S.model = a),
      0,
    )
  },
  topro: () => {
    Shell.setMode('pro')
  },
  model: () => {
    if (Shell.sheet.isOpen()) return
    const was = qpOpen
    if (qpOpen) qpHide()
    const dlg = $('#sh-dialog') && $('#sh-dialog').classList.contains('on')
    if (dlg) Shell.dialogClose()
    else RUN = null
    openModel(was)
  },
  mode: (b) => {
    MS.mode = b.dataset.v
    Shell.sheet.draw()
  },
  exact: (b) => {
    const m = MODELS.find((x) => x.id === b.dataset.v)
    if (!avail(m)) {
      T('Add a key first in Settings › Keys')
      return
    }
    MS.exact = m.id
    MS.mode = 'exact'
    Shell.sheet.draw()
  },
  tierinfo: () => tierInfo(),
  /* sources */
  addsrc: () => openAdd(),
  stype: (b) => {
    AS.type = b.dataset.v
    AS.val = ''
    AS.body = ''
    AS.pick = []
    Shell.sheet.draw()
  },
  demofile: () => {
    AS.val = DEMO[AS.type][0]
    Shell.sheet.draw()
  },
  drivepick: (b) => {
    AS.val = b.dataset.v
    Shell.sheet.draw()
  },
  minepick: (b) => {
    const v = b.dataset.v
    AS.pick = b.checked ? AS.pick.concat(v) : AS.pick.filter((x) => x !== v)
  },
  tick: (b) => {
    const s = S.src.find((x) => x.id === b.dataset.id),
      v = b.checked
    commit(
      (v ? 'Ticked ' : 'Unticked ') + s.t,
      () => (s.on = v),
      () => (s.on = !v),
      1,
    )
  },
  tickall: (b) => {
    const v = b.checked,
      old = S.src.map((s) => s.on)
    commit(
      v ? 'Ticked all' : 'Unticked all',
      () => S.src.forEach((s) => (s.on = v)),
      () => S.src.forEach((s, i) => (s.on = old[i])),
      1,
    )
  },
  rmsrc: (b) => {
    const s = S.src.find((x) => x.id === b.dataset.id),
      i = S.src.indexOf(s)
    commit(
      'Removed “' + s.t + '”',
      () => S.src.splice(i, 1),
      () => S.src.splice(i, 0, s),
      0,
    )
  },
  /* chat */
  cite: (b) => {
    const s = S.src.find((x) => x.id === b.dataset.s),
      p = PASS[s.id][+b.dataset.i]
    Shell.dialog(
      '<h3>' +
        esc(s.t) +
        '</h3><p class="mini" style="margin:0">' +
        esc(s.m.split(' · ')[0]) +
        ' · ' +
        esc(p.loc) +
        '</p><blockquote class="pas" style="margin-left:0">…' +
        esc(p.pre) +
        '<mark>' +
        esc(p.hit) +
        '</mark>' +
        esc(p.post) +
        '</blockquote><div class="ft"><button type="button" class="btn" data-a="dx">Close</button><button type="button" class="btn pri" data-a="dx">' +
        IC('ext') +
        'Open source</button></div>',
    )
  },
  savechat: (b) => {
    const m = S.chat[+b.dataset.i]
    if (m.saved) return
    const o = {
      id: 'o' + Date.now(),
      k: 'notes',
      t: 'Note from chat',
      x: m.t[0],
      saved: true,
    }
    commit(
      'Saved to notes',
      () => {
        m.saved = true
        S.out.unshift(o)
      },
      () => {
        m.saved = false
        S.out = S.out.filter((x) => x !== o)
      },
      0,
    )
  },
  /* studio */
  make: (b) => {
    const k = b.dataset.k,
      n = ticked().length
    if (!n) {
      T('Tick a source first')
      return
    }
    const d = OUTS[k]
    runDialog({
      title: 'Make ' + d[1].toLowerCase(),
      desc:
        'From ' +
        n +
        ' ticked source' +
        (n === 1 ? '' : 's') +
        '. You can remove it afterwards.',
      key: k === 'map' ? 'map' : k,
      what: d[1] + ' from sources',
      run: () => {
        const o = { id: 'o' + Date.now(), k: d[0], t: d[1] }
        commit(
          'Made ' + d[1].toLowerCase(),
          () => S.out.unshift(o),
          () => (S.out = S.out.filter((x) => x !== o)),
          0,
        )
      },
    })
  },
  rmout: (b) => {
    const o = S.out.find((x) => x.id === b.dataset.id),
      i = S.out.indexOf(o)
    commit(
      'Removed “' + o.t + '”',
      () => S.out.splice(i, 1),
      () => S.out.splice(i, 0, o),
      0,
    )
  },
  saveout: (b) => {
    const o = S.out.find((x) => x.id === b.dataset.id)
    if (o.saved) return
    commit(
      'Saved to notes',
      () => (o.saved = true),
      () => (o.saved = false),
      0,
    )
  },
  /* jobs */
  dest: (b) => {
    S.J.dest = b.dataset.v
    render()
  },
  runjob: () => {
    const J = S.J
    guard('job', 'Job: ' + wfName(J.wf), () => {
      J.running = true
      render()
      setTimeout(() => {
        J.running = false
        const p = buildPreview()
        if (S.auto) {
          S.J.preview = p
          applyJob(p)
        } else {
          J.preview = p
          render()
        }
      }, 600)
    })
  },
  pvtick: (b) => {
    const i = S.J.preview.items.find((x) => x.id === b.dataset.id)
    i.on = b.checked
    render()
  },
  discard: () => {
    const p = S.J.preview
    commit(
      'Discarded the preview',
      () => (S.J.preview = null),
      () => (S.J.preview = p),
      0,
    )
  },
  applyjob: () => applyJob(S.J.preview),
  rmpath: (b) => {
    const i = +b.dataset.i,
      p = S.paths[i]
    commit(
      'Forgot the path for #' + p.tag,
      () => S.paths.splice(i, 1),
      () => S.paths.splice(i, 0, p),
      0,
    )
  },
  /* workflows */
  wtag: (b) => {
    S.wtag = b.dataset.v
    render()
  },
  check: () => {
    if (S.sug.some((g) => g.id === 'g3')) return T('Nothing new yet')
    commit(
      'Prompt checker found 1 idea',
      () =>
        S.sug.push({
          id: 'g3',
          wf: 'w2',
          t: 'Name the author',
          d: 'Ask for the author and date in the first line. Library entries look cleaner.',
        }),
      () => (S.sug = S.sug.filter((g) => g.id !== 'g3')),
      1,
    )
  },
  sugok: (b) => {
    const g = S.sug.find((x) => x.id === b.dataset.id),
      i = S.sug.indexOf(g)
    commit(
      'Updated “' + wfName(g.wf) + '”',
      () => S.sug.splice(i, 1),
      () => S.sug.splice(i, 0, g),
      0,
    )
  },
  sugno: (b) => {
    const g = S.sug.find((x) => x.id === b.dataset.id),
      i = S.sug.indexOf(g)
    commit(
      'Hidden for now',
      () => S.sug.splice(i, 1),
      () => S.sug.splice(i, 0, g),
      0,
    )
  },
  rate: (b) => {
    const w = S.wfs.find((x) => x.id === b.dataset.id)
    Shell.pop(
      b,
      '<div class="lbl" style="padding:0 10px">Rate “' +
        esc(w.n) +
        '”</div><div class="row" style="padding:0 6px;gap:0;flex-wrap:nowrap">' +
        [1, 2, 3, 4, 5]
          .map(
            (n) =>
              '<button type="button" class="starb' +
              (n > w.my ? ' off' : '') +
              '" data-a="setrate" data-id="' +
              w.id +
              '" data-v="' +
              n +
              '" aria-label="' +
              n +
              ' star' +
              (n > 1 ? 's' : '') +
              '">★</button>',
          )
          .join('') +
        '</div>',
    )
  },
  setrate: (b) => {
    Shell.closePop()
    const w = S.wfs.find((x) => x.id === b.dataset.id),
      o = w.my,
      v = +b.dataset.v
    commit(
      'Rated ' + v + ' stars',
      () => (w.my = v),
      () => (w.my = o),
      0,
    )
  },
  runwf: (b) => {
    const w = S.wfs.find((x) => x.id === b.dataset.id),
      n = ticked().length
    runDialog({
      title: 'Run “' + w.n + '”',
      desc:
        'On ' +
        n +
        ' ticked source' +
        (n === 1 ? '' : 's') +
        '. The result opens as a preview in Jobs.',
      key: 'wf',
      what: 'Workflow: ' + w.n,
      run: () => {
        const e = {
            id: 'a' + Date.now(),
            t: 'Ran workflow “' + w.n + '”',
            d: 'On ' + n + ' ticked sources',
            w: 'Just now',
            ico: 'wand',
            un: false,
          },
          u = w.uses
        commit(
          'Ran “' + w.n + '”',
          () => {
            S.act.unshift(e)
            w.uses++
          },
          () => {
            S.act = S.act.filter((x) => x !== e)
            w.uses = u
          },
          0,
        )
      },
    })
  },
  newwf: () => wfDialog(null),
  editwf: (b) => wfDialog(S.wfs.find((x) => x.id === b.dataset.id)),
  /* activity + settings */
  actundo: (b) => {
    const a = S.act.find((x) => x.id === b.dataset.id),
      v = !a.un
    commit(
      (v ? 'Undid: ' : 'Redid: ') + a.t,
      () => (a.un = v),
      () => (a.un = !v),
      0,
    )
  },
  sw: (b) => {
    const k = b.dataset.k,
      on = b.getAttribute('aria-checked') !== 'true'
    const tgt = k === 'auto' ? S : S.cost,
      old = tgt[k]
    commit(
      'Changed a setting',
      () => (tgt[k] = on),
      () => (tgt[k] = old),
      1,
    )
  },
  conn: (b) => {
    const k = b.dataset.k,
      on = b.getAttribute('aria-checked') !== 'true',
      old = S.conn[k]
    commit(
      (on ? 'Connected ' : 'Disconnected ') + k,
      () => (S.conn[k] = on),
      () => (S.conn[k] = old),
      1,
    )
  },
  addkey: (b) => {
    const k = b.dataset.k,
      nm = { or: 'OpenRouter', anthropic: 'Anthropic', google: 'Google AI' }[k]
    Shell.dialog(
      '<h3>Add your ' +
        nm +
        ' key</h3><p class="mini" style="margin:0 0 10px">Paste it once. It stays on this device and is never shown again.</p><input class="inp" id="keyin" type="password" autocomplete="off" placeholder="Paste key" aria-label="' +
        nm +
        ' key" data-noclr><div class="ft"><button type="button" class="btn" data-x>Cancel</button><button type="button" class="btn pri" data-ok>Save key</button></div>',
      (d) => {
        const i = d.querySelector('#keyin')
        setTimeout(() => i.focus(), 60)
        d.querySelector('[data-x]').onclick = Shell.dialogClose
        d.querySelector('[data-ok]').onclick = () => {
          if (i.value.trim().length < 4) {
            T('Paste your key first')
            return
          }
          Shell.dialogClose()
          commit(
            nm + ' key saved',
            () => (S.keys[k] = '••••' + i.value.trim().slice(-2)),
            () => (S.keys[k] = null),
            0,
          )
        }
      },
    )
  },
  rmkey: (b) => {
    const k = b.dataset.k,
      v = S.keys[k]
    commit(
      'Key removed',
      () => (S.keys[k] = null),
      () => (S.keys[k] = v),
      0,
    )
  },
  usage: () => usage(),
  csv: () => csv(),
  /* quick panel */
  qpx: () => qpHide(),
  qpopen: () => {
    qpHide()
    S.tab = 'build'
    S.B.view = 'build'
    render()
    T('Opened AI mode')
  },
  qplock: () => {
    qpHide()
    Shell.dialog(
      '<h3>AI mode is a Professional feature</h3><p class="mini" style="margin:0">Turn it on in Settings › Professional features › AI mode.</p><div class="ft"><button type="button" class="btn pri" data-a="dx">Got it</button></div>',
    )
  },
  qsum: (b) => qpDo(b),
  qcards: (b) => qpDo(b),
  qtags: (b) => qpDo(b),
  qcopy: (b) => qpDo(b),
  qpaste: (b) => qpDo(b),
}
function qpDo(b) {
  const k = b.dataset.a
  qpHide()
  if (k === 'qcopy' || k === 'qpaste') {
    T(QP_DO[k])
    return
  }
  guard('qp', QP_DO[k].replace('…', ''), () => T(QP_DO[k]))
}
function wfDialog(w) {
  const nw = !w
  Shell.dialog(
    '<h3>' +
      (nw ? 'New workflow' : 'Edit workflow') +
      '</h3><label class="sh-flab">Name<input class="inp" id="wn" maxlength="60" value="' +
      esc(w ? w.n : '') +
      '" placeholder="For example, Podcast to notes" aria-label="Workflow name"></label><label class="sh-flab">What should Claude do?<textarea class="inp" id="wp" rows="4" aria-label="Instructions">' +
      esc(w ? w.p : '') +
      '</textarea></label><label class="sh-flab">Tags (comma between)<input class="inp" id="wt" value="' +
      esc(w ? w.tags.join(', ') : '') +
      '" placeholder="video, notes" aria-label="Tags"></label><div class="ft">' +
      (nw
        ? ''
        : '<button type="button" class="btn dng" data-del>Delete</button>') +
      '<button type="button" class="btn" data-x>Cancel</button><button type="button" class="btn pri" data-ok>Save</button></div>',
    (d) => {
      d.querySelector('[data-x]').onclick = Shell.dialogClose
      const del = d.querySelector('[data-del]')
      if (del)
        del.onclick = () => {
          Shell.dialogClose()
          const i = S.wfs.indexOf(w)
          commit(
            'Deleted “' + w.n + '”',
            () => S.wfs.splice(i, 1),
            () => S.wfs.splice(i, 0, w),
            0,
          )
        }
      d.querySelector('[data-ok]').onclick = () => {
        const n = d.querySelector('#wn').value.trim()
        if (!n) {
          T('Give it a name')
          return
        }
        const p = d.querySelector('#wp').value.trim(),
          tg = d
            .querySelector('#wt')
            .value.split(',')
            .map((x) => x.trim().replace(/^#/, ''))
            .filter(Boolean)
        Shell.dialogClose()
        if (nw) {
          const x = {
            id: 'w' + Date.now(),
            n,
            tags: tg.length ? tg : ['new'],
            ai: 'Any',
            jt: 'Any',
            star: 0,
            uses: 0,
            my: 0,
            p,
          }
          x.star = 0
          commit(
            'Added “' + n + '”',
            () => S.wfs.push(x),
            () => (S.wfs = S.wfs.filter((y) => y !== x)),
            0,
          )
        } else {
          const o = Object.assign({}, w)
          commit(
            'Saved “' + n + '”',
            () => Object.assign(w, { n, p, tags: tg }),
            () => Object.assign(w, o),
            0,
          )
        }
      }
    },
  )
}

/* ---------- v3 actions ---------- */
Object.assign(A, {
  eff: (b) => {
    const v = b.dataset.v,
      o = S.B.eff
    if (v === o) return
    commit(
      'Effort: ' +
        EFF[v].n +
        ' (' +
        (EFF[v].c ? 'about ₹' + EFF[v].c : 'free') +
        ')',
      () => (S.B.eff = v),
      () => (S.B.eff = o),
      0,
    )
  },
  effinfo: () => effInfo(),
  bex: (b) => {
    S.B.goal = EXAMPLES[+b.dataset.i]
    render()
    const t = $('#bgoal')
    if (t) t.focus()
  },
  mkplan: () => {
    const B = S.B,
      g = B.goal.trim()
    if (!g) {
      T('Describe what to build first')
      return
    }
    const p = makePlan(g)
    planEdit(
      'Plan ready · ' + p.length + ' steps',
      () => {
        B.plan = p
        B.stage = 'plan'
      },
      0,
    )
    const pc = $('[aria-label=Plan]')
    if (pc) pc.scrollIntoView({ block: 'start' })
  },
  ptick: (b) => {
    const B = S.B,
      s = B.plan.find((x) => x.id === b.dataset.id),
      v = b.checked
    planEdit(
      (v ? 'Step on: ' : 'Step off: ') + TOOL[s.t].n,
      () => {
        B.plan.find((x) => x.id === s.id).on = v
      },
      1,
    )
  },
  prm: (b) => {
    const B = S.B,
      s = B.plan.find((x) => x.id === b.dataset.id)
    planEdit(
      'Removed step “' + TOOL[s.t].n + '”',
      () => {
        B.plan = B.plan.filter((x) => x.id !== s.id)
      },
      0,
    )
  },
  pclear: () => {
    const B = S.B
    planEdit(
      'Plan cleared',
      () => {
        B.plan = null
        B.stage = 'idea'
      },
      0,
    )
  },
  padd: () => {
    const B = S.B
    B.view = 'catalog'
    B.pick = true
    B.q = ''
    B.cg = ''
    render()
    $('#main').scrollTop = 0
  },
  tcat: () => {
    const B = S.B
    B.view = 'catalog'
    B.pick = false
    B.q = ''
    B.cg = ''
    render()
    $('#main').scrollTop = 0
  },
  cback: () => {
    S.B.view = 'build'
    render()
    $('#main').scrollTop = 0
  },
  cclear: () => {
    S.B.q = ''
    render()
    const i = $('#tq')
    if (i) i.focus()
  },
  tadd: (b) => {
    const B = S.B,
      t = TOOL[b.dataset.id],
      d = b.dataset.id
    planEdit(
      'Added “' + t.n + '” to the plan',
      () => {
        B.plan = (B.plan || []).concat(mkStep(d))
        if (B.stage === 'idea') B.stage = 'plan'
      },
      0,
    )
  },
  tunl: (b) => {
    const t = TOOL[b.dataset.id],
      id = t.id
    commit(
      'Unlocked “' + t.n + '”',
      () => (S.unl[id] = true),
      () => delete S.unl[id],
      0,
    )
  },
  unl: (b) => {
    const t = TOOL[b.dataset.id],
      id = t.id,
      on = b.getAttribute('aria-checked') !== 'true'
    commit(
      (on ? 'Unlocked “' : 'Locked “') + t.n + '”',
      () => {
        if (on) S.unl[id] = true
        else delete S.unl[id]
      },
      () => {
        if (on) delete S.unl[id]
        else S.unl[id] = true
      },
      0,
    )
  },
  brun: () => runBuild(),
  bstop: () => {
    const B = S.B
    clearInterval(B.iv)
    B.iv = null
    B.stage = 'plan'
    render()
    T('Stopped')
  },
  pvtab: (b) => {
    S.B.pv = b.dataset.v
    render()
  },
  bedit: () => {
    S.B.stage = 'plan'
    render()
  },
  bdiscard: () => {
    const B = S.B
    planEdit(
      'Discarded the preview',
      () => {
        B.stage = 'plan'
      },
      0,
    )
  },
  bapply: () => {
    const B = S.B,
      n = actN(B.plan),
      e = {
        id: 'a' + Date.now(),
        t: 'Built “' + B.title + '” with ' + n + ' steps',
        d:
          'New notebook › ' +
          B.title +
          ' · ' +
          B.plan
            .filter((s) => s.on)
            .map((s) => TOOL[s.t].n)
            .slice(0, 3)
            .join(', ') +
          (n > 3 ? '…' : ''),
        w: 'Just now',
        ico: 'wand',
        un: false,
      }
    commit(
      'Applied to notebooks',
      () => {
        S.act.unshift(e)
        B.stage = 'done'
      },
      () => {
        S.act = S.act.filter((x) => x !== e)
        B.stage = 'preview'
      },
      0,
    )
  },
  bundo: () => undo(),
  bnew: () => {
    const B = S.B
    B.plan = null
    B.stage = 'idea'
    B.goal = ''
    render()
  },
  /* quick panel */
  qmode: (b) => {
    QP.mode = b.dataset.v
    qpDraw()
  },
  qchip: (b) => {
    const c = QCHIPS[+b.dataset.i]
    QP.goal = c[1]
    A.qplan()
  },
  qplan: () => {
    const g = QP.goal.trim()
    if (!g) {
      T('Describe the change first')
      return
    }
    QP.plan = makePlan(g, true)
    QP.stage = 'plan'
    qpDraw()
    T('Plan ready · ' + QP.plan.length + ' steps')
  },
  qreset: () => {
    QP.stage = 'idea'
    QP.plan = null
    QP.goal = ''
    qpDraw()
  },
  qtick: (b) => {
    const s = QP.plan.find((x) => x.id === b.dataset.id)
    s.on = b.checked
    qpDraw()
  },
  qrm: (b) => {
    QP.plan = QP.plan.filter((x) => x.id !== b.dataset.id)
    qpDraw()
  },
  qedit: () => {
    const B = S.B
    B.goal = QP.goal
    B.plan = cp(QP.plan)
    B.stage = 'plan'
    B.view = 'build'
    S.tab = 'build'
    qpHide()
    render()
    T('Plan moved to AI mode')
  },
  qrun: () => {
    const P = QP.plan
    if (!actN(P)) return
    const A2 = P.filter((s) => s.on)
    CUR = P
    guard('build', 'Change this page', () => {
      QP.stage = 'running'
      QP.prog = 0
      qpDraw()
      const iv = setInterval(() => {
        QP.prog++
        if (QP.prog >= A2.length) {
          clearInterval(iv)
          const e = {
            id: 'a' + Date.now(),
            t: 'Changed this page: “' + QP.goal.slice(0, 48) + '”',
            d:
              A2.map((s) => TOOL[s.t].n)
                .slice(0, 3)
                .join(', ') + (A2.length > 3 ? '…' : ''),
            w: 'Just now',
            ico: 'wand',
            un: false,
          }
          commit(
            'Page changed',
            () => {
              S.act.unshift(e)
              QP.stage = 'done'
            },
            () => {
              S.act = S.act.filter((x) => x !== e)
              QP.stage = 'plan'
            },
            0,
          )
        } else qpDraw()
      }, 400)
    })
    CUR = null
  },
  qundo: () => undo(),
  xopen: () => {
    MS.xo = !MS.xo
    Shell.sheet.draw()
  },
})

/* ---------- v4 actions: everything runs through the framework (validate → Engine → commit → undo) ---------- */
const listWords = (a) =>
  a.length < 2
    ? a.join('')
    : a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]
function placeToast() {
  const t = $('#sh-top')
  if (!t) return
  const r = t.getBoundingClientRect()
  document.documentElement.style.setProperty(
    '--tt',
    Math.max(8, Math.round(r.top + (r.height - 48) / 2)) + 'px',
  )
}
addEventListener('resize', () => {
  placeToast()
  if (FP) fpopDraw()
})
function runBuild() {
  const B = S.B,
    v = validate(B.plan, B.dest)
  if (!v.ok) {
    T('Fix the marked step first')
    return
  }
  CUR = B.plan
  guard('build', 'Build: ' + bTitle(), () => {
    const j = Engine.start({
      title: bTitle(),
      plan: B.plan,
      dest: B.dest,
      fail: S.demo === 'fail',
      onChange: (fin) => {
        if (B.job !== j) return
        if (fin && B.stage === 'running') {
          B.stage = 'preview'
          B.pv = 'notes'
          S.fx = 'preview'
        }
        render()
        if (fin) {
          const pv = $('.pv')
          if (pv) pv.scrollIntoView({ block: 'start' })
        }
      },
    })
    if (!j) return
    B.job = j
    B.stage = 'running'
    S.fx = 'run'
    Engine.pump(j)
  })
  CUR = null
}
Object.assign(A, {
  demo: (b) => {
    S.demo = b.dataset.v
    $$('[data-a=demo]').forEach((x) => {
      x.classList.toggle('on', x === b)
      x.setAttribute('aria-pressed', x === b)
    })
    ;[S.B.job, QP.job].forEach((j) => {
      if (j && j.state === 'offline') Engine.pump(j)
    })
  },
  /* Build */
  mkplan: () => {
    const B = S.B,
      g = B.goal.trim()
    if (!g) {
      T('Describe what to build first')
      return
    }
    const p = makePlan(g, false, B.dest)
    S.fx = 'plan'
    planEdit(
      'Plan made',
      () => {
        B.plan = p
        B.stage = 'plan'
        B.fromStudio = null
      },
      1,
    )
    B.job = null
    const pc = $('[aria-label=Plan]')
    if (pc) pc.scrollIntoView({ block: 'start' })
  },
  ptick: (b) => {
    const B = S.B,
      s = B.plan.find((x) => x.id === b.dataset.id),
      v = b.checked,
      dep = v ? [] : dependants(B.plan, B.dest, s.id).map((x) => x.id)
    planEdit(
      (v ? 'Step on: ' : 'Step off: ') + TOOL[s.t].n,
      () => {
        B.plan.forEach((x) => {
          if (x.id === s.id) x.on = v
          else if (dep.includes(x.id)) x.on = false
        })
      },
      1,
    )
    if (dep.length)
      T(
        'Also unticked ' +
          dep.length +
          ' step' +
          (dep.length === 1 ? ' that needs' : 's that need') +
          ' it',
        undo,
      )
  },
  pfix: (b) => {
    const B = S.B,
      id = b.dataset.id,
      f = validate(B.plan, B.dest).fix[id]
    if (!f) return
    if (f.k === 'unl') {
      A.tunl({ dataset: { id: B.plan.find((x) => x.id === id).t } })
      return
    }
    planEdit(
      'Fixed a step',
      () => {
        const P = B.plan,
          i = P.findIndex((x) => x.id === id)
        if (f.k === 'rm') B.plan = P.filter((x) => x.id !== id)
        else if (f.k === 'tick') P.find((x) => x.id === f.id).on = true
        else if (f.k === 'add') P.splice(i, 0, mkStep(f.tool))
        else if (f.k === 'move') {
          const s = P.splice(i, 1)[0]
          P.splice(P.findIndex((x) => x.id === f.after) + 1, 0, s)
        }
      },
      1,
    )
  },
  bdest: (b) => {
    const B = S.B,
      v = b.dataset.v
    if (B.dest.kind === v) return
    planEdit(
      'Destination changed',
      () => {
        B.dest.kind = v
        if (B.plan) {
          if (v === 'nb') B.plan = B.plan.filter((s) => s.t !== 'nb_new')
          else if (!B.plan.some((s) => s.t === 'nb_new'))
            B.plan.unshift(mkStep('nb_new'))
        }
      },
      1,
    )
  },
  brun: () => runBuild(),
  jretry: (b) => {
    const j = S.B.job
    if (j) Engine.retry(j, b.dataset.id)
  },
  jskip: (b) => {
    const j = S.B.job
    if (j) Engine.skip(j, b.dataset.id)
  },
  bstop: () => {
    const B = S.B
    if (B.job) Engine.stop(B.job)
    B.job = null
    B.stage = 'plan'
    render()
    T('Stopped. Nothing was saved.')
  },
  bedit: () => {
    S.B.stage = 'plan'
    S.fx = 'plan'
    render()
  },
  bdiscard: () => {
    const B = S.B
    planEdit(
      'Discarded the draft',
      () => {
        B.stage = 'plan'
      },
      0,
    )
  },
  bapply: () => {
    const B = S.B,
      j = B.job
    if (!j || j.state !== 'preview') return
    const dn = Engine.done(j),
      n = dn.length
    const e = {
      id: 'a' + ++UID,
      t: 'Built “' + j.title + '” with ' + n + ' step' + (n === 1 ? '' : 's'),
      d:
        destName(j.dest) +
        ' · ' +
        dn
          .map((s) => TOOL[s.t].n)
          .slice(0, 3)
          .join(', ') +
        (n > 3 ? '…' : ''),
      w: 'Just now',
      ico: 'wand',
      un: false,
      job: j,
    }
    const outs = (B.fromStudio || [])
      .filter((k) => dn.some((s) => s.t === STU.find((x) => x[0] === k)[3]))
      .map((k) => ({ id: 'o' + ++UID, k, t: OUTS[k][1], saved: true }))
    S.fx = 'done'
    commit(
      'Saved “' + j.title + '”',
      () => {
        Engine.commit(j)
        S.act.unshift(e)
        e.un = false
        S.out.unshift(...outs)
        B.stage = 'done'
      },
      () => {
        Engine.undo(j)
        S.act = S.act.filter((x) => x !== e)
        S.out = S.out.filter((o) => !outs.includes(o))
        B.stage = 'preview'
      },
      1,
    )
  },
  bundo: () => {
    const B = S.B,
      j = B.job
    if (HST.length && j && j.applied) undo()
  },
  bnew: () => {
    const B = S.B
    B.plan = null
    B.stage = 'idea'
    B.goal = ''
    B.job = null
    B.fromStudio = null
    render()
  },
  actundo: (b) => {
    const a = S.act.find((x) => x.id === b.dataset.id),
      v = !a.un,
      j = a.job,
      B = S.B
    commit(
      (v ? 'Undid: ' : 'Redid: ') + a.t,
      () => {
        a.un = v
        if (j) {
          v ? Engine.undo(j) : Engine.commit(j)
          if (B.job === j && (B.stage === 'done' || B.stage === 'preview'))
            B.stage = v ? 'preview' : 'done'
        }
      },
      () => {
        a.un = !v
        if (j) {
          v ? Engine.commit(j) : Engine.undo(j)
          if (B.job === j && (B.stage === 'done' || B.stage === 'preview'))
            B.stage = v ? 'done' : 'preview'
        }
      },
      0,
    )
  },
  /* Studio: tick several, make one plan */
  make: () => {},
  stsel: (b) => {
    const k = b.dataset.k,
      U = S.stu
    U.sel = U.sel.includes(k) ? U.sel.filter((x) => x !== k) : U.sel.concat(k)
    render()
  },
  stdest: (b) => {
    S.stu.d.kind = b.dataset.v
    render()
  },
  mksel: () => {
    const B = S.B,
      U = S.stu,
      n = ticked().length
    if (!U.sel.length) return
    if (!n) {
      T('Tick a source first')
      return
    }
    if (B.stage === 'running') {
      T('A job is running. Stop it or wait for it first.')
      return
    }
    const P = stuPlan(),
      d = stuDest(),
      names = STU.filter((x) => U.sel.includes(x[0])).map((x) =>
        x[0] === 'notes' ? 'notes' : 'a ' + x[1].toLowerCase(),
      )
    B.goal =
      'Make ' +
      listWords(names) +
      ' from my ' +
      n +
      ' ticked source' +
      (n === 1 ? '' : 's')
    S.tab = 'build'
    B.view = 'build'
    S.fx = 'plan'
    planEdit(
      'Plan made from Studio',
      () => {
        B.plan = P
        B.dest = d
        B.stage = 'plan'
        B.fromStudio = U.sel.slice()
      },
      1,
    )
    B.job = null
    $('#main').scrollTop = 0
  },
  /* Workflows: the filter bar */
  wmore: () => {
    S.W.more = !S.W.more
    render()
  },
  wjt: (b) => {
    const W = S.W,
      v = b.dataset.v
    W.jt = W.jt.includes(v) ? W.jt.filter((x) => x !== v) : W.jt.concat(v)
    render()
  },
  wai: (b) => {
    const W = S.W,
      v = b.dataset.v
    W.ai = W.ai.includes(v) ? W.ai.filter((x) => x !== v) : W.ai.concat(v)
    render()
  },
  wstar: (b) => {
    S.W.star = +b.dataset.v
    render()
  },
  wuses: (b) => {
    S.W.uses = +b.dataset.v
    render()
  },
  wtags: () => {
    S.tq = ''
    fpop('[data-a=wtags]', 'Tags', tagPicker)
  },
  wsort: () => fpop('[data-a=wsort]', 'Sort by', sortPicker),
  fpx: () => fpopClose(),
  tpick: (b) => {
    const W = S.W,
      v = b.dataset.v
    W.tags = b.checked ? W.tags.concat(v) : W.tags.filter((x) => x !== v)
    render()
    fpopDraw()
  },
  tmode: (b) => {
    S.W.tmode = b.dataset.v
    render()
    fpopDraw()
  },
  tpclear: () => {
    S.W.tags = []
    render()
    fpopDraw()
  },
  sortpick: (b) => {
    S.W.sort = b.dataset.v
    fpopClose()
    render()
  },
  wchip: (b) => {
    const W = S.W,
      k = b.dataset.k,
      v = b.dataset.v
    if (k === 'q') W.q = ''
    else if (k === 'tmode') W.tmode = 'any'
    else if (k === 'star' || k === 'uses') W[k] = 0
    else W[k] = W[k].filter((x) => x !== v)
    render()
  },
  wclear: () => {
    Object.assign(S.W, JSON.parse(JSON.stringify(WF0)), { sort: S.W.sort })
    render()
  },
  wview: (b) => {
    const v = S.wviews.find((x) => x.id === b.dataset.v)
    Object.assign(
      S.W,
      JSON.parse(JSON.stringify(Object.assign({}, WF0, v ? v.f : {}))),
    )
    render()
  },
  wsave: () =>
    Shell.ask('Name this view', '', (n) => {
      if (!n) return
      const v = { id: 'v' + ++UID, n: n.slice(0, 30), f: wfF() }
      commit(
        'Saved the view “' + v.n + '”',
        () => S.wviews.push(v),
        () => (S.wviews = S.wviews.filter((x) => x !== v)),
        1,
      )
    }),
  wvrm: (b) => {
    const v = S.wviews.find((x) => x.id === b.dataset.v),
      i = S.wviews.indexOf(v)
    commit(
      'Deleted the view “' + v.n + '”',
      () => S.wviews.splice(i, 1),
      () => S.wviews.splice(i, 0, v),
      0,
    )
  },
  /* quick panel: same checker and engine, the page is the destination */
  qplan: () => {
    const g = QP.goal.trim()
    if (!g) {
      T('Describe the change first')
      return
    }
    QP.plan = makePlan(g, true)
    QP.stage = 'plan'
    QP.job = null
    qpDraw()
  },
  qrun: () => {
    const P = QP.plan
    if (!actN(P)) return
    const d = { kind: 'page' },
      v = validate(P, d)
    if (!v.ok) {
      T(Object.values(v.errs)[0])
      return
    }
    CUR = P
    guard('build', 'Change this page', () => {
      const j = Engine.start({
        title: 'This page',
        plan: P,
        dest: d,
        fail: false,
        onChange: (fin) => {
          if (QP.job !== j) return
          if (fin && QP.stage === 'running') {
            const A2 = Engine.done(j),
              e = {
                id: 'a' + ++UID,
                t: 'Changed this page: “' + QP.goal.slice(0, 48) + '”',
                d:
                  A2.map((s) => TOOL[s.t].n)
                    .slice(0, 3)
                    .join(', ') + (A2.length > 3 ? '…' : ''),
                w: 'Just now',
                ico: 'wand',
                un: false,
                job: j,
              }
            commit(
              'Page changed',
              () => {
                Engine.commit(j)
                S.act.unshift(e)
                QP.stage = 'done'
              },
              () => {
                Engine.undo(j)
                S.act = S.act.filter((x) => x !== e)
                QP.stage = 'plan'
              },
              1,
            )
          } else if (qpOpen) qpDraw()
        },
      })
      if (!j) return
      QP.job = j
      QP.stage = 'running'
      Engine.pump(j)
    })
    CUR = null
  },
})
document.addEventListener('input', (e) => {
  const t = e.target,
    id = t.id
  if (id === 'bname') S.B.dest.name = t.value
  else if (id === 'stname') S.stu.d.name = t.value
  else if (id === 'tpq') {
    S.tq = t.value
    fpopDraw()
  }
})
document.addEventListener('change', (e) => {
  const t = e.target,
    id = t.id
  if (id === 'bnb') S.B.dest.nb = t.value
  else if (id === 'bsec') S.B.dest.sec = t.value
  else if (id === 'stnb') S.stu.d.nb = t.value
  else if (id === 'stsec') S.stu.d.sec = t.value
  else if (id !== 'bname' && id !== 'stname') return
  render()
})
document.addEventListener(
  'pointerdown',
  (e) => {
    if (FP && !e.target.closest('#fpop') && !e.target.closest(FP.sel))
      fpopClose()
  },
  true,
)
document.addEventListener(
  'keydown',
  (e) => {
    if (e.key === 'Escape' && FP) {
      e.stopImmediatePropagation()
      fpopClose()
    }
  },
  true,
)

/* one click / input / change listener for the page, the sheets, the dialogs and the pop-ups */
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-a]')
  if (!b || b.tagName === 'FORM') return
  if (b.type === 'checkbox' || b.classList.contains('tk')) return
  const f = A[b.dataset.a]
  if (f) {
    f(b, e)
  }
})
document.addEventListener('change', (e) => {
  const t = e.target,
    b = t.closest && t.closest('[data-a]')
  if (b && b.type === 'checkbox' && A[b.dataset.a]) {
    A[b.dataset.a](b)
    return
  }
  const id = t.id,
    J = S.J
  if (id === 'tg') {
    S.B.cg = t.value
    render()
    return
  }
  if (id === 'jfrom') J.from = t.value
  else if (id === 'jwf') J.wf = t.value
  else if (id === 'jnb') J.nb = t.value
  else if (id === 'jsec') {
    J.sec = t.value
    render()
  } else if (/^f(monthly|perJobVal|askVal)$/.test(id)) {
    const k = id.slice(1),
      v = Math.max(0, Math.round(+t.value || 0)),
      o = S.cost[k]
    commit(
      'Changed a limit',
      () => (S.cost[k] = v),
      () => (S.cost[k] = o),
      1,
    )
  }
  if (id === 'jnb' || id === 'jfrom' || id === 'jwf') render()
})
document.addEventListener('input', (e) => {
  const t = e.target,
    id = t.id
  if (id === 'bgoal') {
    S.B.goal = t.value
    const bp = $('#bplan')
    if (bp) bp.disabled = !t.value.trim()
  } else if (id === 'qpg') {
    QP.goal = t.value
    const q = $('#qplan')
    if (q) q.disabled = !t.value.trim()
  } else if (id === 'tq') {
    S.B.q = t.value
    const p = t.selectionStart
    render()
    const n = $('#tq')
    if (n) {
      n.focus()
      try {
        n.setSelectionRange(p, p)
      } catch (_) {}
    }
  } else if (id === 'aval') AS.val = t.value
  else if (id === 'abody') AS.body = t.value
  else if (id === 'jnew') {
    S.J.newName = t.value
  } else if (id === 'cq') S.draft = t.value
  else if (id === 'qpq') S.qpq = t.value
  else if (id === 'wq') {
    S.W.q = t.value
    const p = t.selectionStart
    render()
    const n = $('#wq')
    if (n) {
      n.focus()
      try {
        n.setSelectionRange(p, p)
      } catch (_) {}
    }
  }
})
document.addEventListener('submit', (e) => {
  e.preventDefault()
  if (e.target.id === 'cform') {
    const q = S.draft.trim()
    if (!q) return
    if (!ticked().length) {
      T('Tick at least one source first')
      return
    }
    guard('chat', 'Question in chat', () => {
      const c = ticked()
        .slice(0, 2)
        .map((s) => [s.id, 0])
      const ms = S.chat.length
      S.chat.push(
        { r: 'u', t: q },
        {
          r: 'a',
          t: [
            'From your ticked sources: the idea that comes up most is to keep it small and attach it to a cue you already have.',
            'Open a chip below to see the exact passage.',
          ],
          c,
          saved: false,
        },
      )
      S.draft = ''
      render()
      const l = $('#chatlog')
      if (l) l.scrollTop = l.scrollHeight
    })
  } else if (e.target.id === 'qpform') {
    const q = S.qpq.trim()
    if (!q) {
      T('Type a question first')
      return
    }
    qpHide()
    guard('qp', 'Quick question', () => {
      S.qpq = ''
      T('Answer ready (demo): “' + q.slice(0, 40) + '”')
    })
  }
})
document.addEventListener('keydown', (e) => {
  if (
    e.key === 'Escape' &&
    S.tab === 'build' &&
    S.B.view === 'catalog' &&
    !qpOpen &&
    !Shell.sheet.isOpen() &&
    !($('#sh-dialog') && $('#sh-dialog').classList.contains('on'))
  ) {
    A.cback()
    return
  }
  if (e.key === 'Enter' && !e.shiftKey && e.target.id === 'cq') {
    e.preventDefault()
    $('#cform').requestSubmit()
  }
})
document.addEventListener(
  'pointerdown',
  (e) => {
    if (
      qpOpen &&
      !e.target.closest(
        '#qp,[data-sh-ai],#sh-dialog,#sh-pop,#sh-sheet,#sh-toast',
      )
    )
      qpHide()
  },
  true,
)

Shell.mount({
  space: 'ai',
  due: 12,
  onSpace: (k) => {
    if (k === 'ai') return
    T(Shell.SPACES.find((s) => s[0] === k)[1] + ' is a separate mock-up')
    return false
  },
  onCorner: (k) =>
    T(k.charAt(0).toUpperCase() + k.slice(1) + ' is a separate mock-up'),
  onChange: (what) => {
    if (what === 'mode') {
      qpHide()
      render()
    }
  },
})
if (Shell.mode() !== 'pro' && !/beg/.test(location.hash)) Shell.setMode('pro')
render()
