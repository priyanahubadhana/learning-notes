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
