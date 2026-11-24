// Builds docs/mockups/storage-safety-mock.html: shell.css pasted whole + the board.
const fs = require('fs')
const root = process.argv[2]
const css = fs.readFileSync(root + '/docs/mockups/shell.css', 'utf8')

const sv = (d) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`
const I = {
  x: sv('<path d="M6 6l12 12M18 6 6 18"/>'),
  undo: sv('<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>'),
  redo: sv('<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>'),
  add: sv('<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/>'),
  share: sv(
    '<path d="M12 15V3M8 7l4-4 4 4"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/>',
  ),
  down: sv('<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 19h16"/>'),
  disk: sv(
    '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
  ),
  reload: sv('<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>'),
}

const top = (phone, crumbs) =>
  `<header class="sh-top"><div class="sh-crumbs">${
    phone
      ? `<b>${crumbs[crumbs.length - 1]}</b>`
      : crumbs
          .map((c, i) => (i < crumbs.length - 1 ? `<button>${c}</button>›` : `<b>${c}</b>`))
          .join('')
  }</div>${
    phone
      ? ''
      : `<button class="ib" aria-label="Undo" disabled>${I.undo}</button><button class="ib" aria-label="Redo" disabled>${I.redo}</button>`
  }</header>`
const page = `<div class="pg"><h3>Cell division</h3><i style="width:92%"></i><i style="width:78%"></i><i style="width:85%"></i></div>`
const NOTE = ['Notebooks', 'Biology', 'Cell division']
const banner = (kind, icon, text, action) =>
  `<div class="fb-banner" role="region" aria-label="Notice" data-kind="${kind}">
            <span class="fb-banner__icon" aria-hidden="true">${icon}</span>
            <span class="fb-banner__text">${text}</span>
            <button class="fb-banner__action">${action}</button>
            <button class="ib" aria-label="Close">${I.x}</button>
          </div>`
const frame = (phone, cap, inner, tall) =>
  `<div class="frame ${phone ? 'ph' : 'pad'}${tall ? ' tall' : ''}">
          ${inner}
          <span class="cap">${cap}</span>
        </div>`
const both = (fn, capPad = 'iPad / PC', capPh = 'Phone', tall = false) =>
  `<div class="bd-row">
        ${frame(false, capPad, fn(false), tall)}
        ${frame(true, capPh, fn(true), tall)}
      </div>`
const sec = (id, title, sub, body) =>
  `<section class="bd-sec" id="${id}">
      <h2>${title}</h2>
      <p>${sub}</p>
      ${body}
    </section>`

const dialog = `<div class="sh-scrim on hi"></div>
          <div class="sh-dialog on" role="dialog" aria-label="Add to Home Screen">
            <button class="ib sh-dx" aria-label="Close">${I.x}</button>
            <h3>Add to Home Screen</h3>
            <ol class="st">
              <li><b class="n">1</b><span>Tap <b>Share</b> ${I.share} in Safari's bar.</span></li>
              <li><b class="n">2</b><span>Choose <b>Add to Home Screen</b>, then <b>Add</b>.</span></li>
              <li><b class="n">3</b><span>Open <b>Learning Notes</b> from its new icon and sign in.</span></li>
            </ol>
            <p class="sub">Why: Safari can clear notes kept in a tab when the device runs low on space. The Home Screen app keeps them. It starts empty, so back up first.</p>
            <div class="ft">
              <button class="btn">Back up first</button>
              <button class="btn pri">Done</button>
            </div>
          </div>`
const srow = (phone) =>
  `<div class="srow">
            <div class="gr"><b>Backup file</b><span>Last backup: 2 days ago</span></div>
            <button class="btn">${phone ? '' : I.down}Back up now</button>
          </div>`
const toast = (text, action) =>
  `<div class="sh-toast on" role="status"><span>${text}</span>${action ? `<button>${action}</button>` : ''}</div>`

const SAFARI = 'Keep your notes safe: add this app to your Home Screen.'
const FULL = 'This device is full. New changes may not save.'
const LOST = 'Saving is paused. Reload to carry on; your notes are safe.'

const body = [
  sec(
    'ss-01',
    '1 · Safari tab notice (SS-01)',
    'Only in Safari on iPad or iPhone, in a normal tab. Calm tint. ✕ hides it for 7 days.',
    both((p) => top(p, NOTE) + banner('install', I.add, SAFARI, 'Show how') + page),
  ),
  sec(
    'ss-02',
    '2 · "Show how" pop-up (SS-02)',
    'Three steps and one safe extra: Back up first. ✕, Esc and a tap outside close it.',
    both((p) => top(p, NOTE) + page + dialog, 'iPad / PC', 'Phone', true),
  ),
  sec(
    'ss-03',
    '3 · One-tap backup (SS-03)',
    'One tap saves a backup file. A toast says where it went. The same button lives in Settings › This device.',
    both(
      (p) =>
        top(p, ['Settings', 'This device']) +
        srow(p) +
        (p ? toast('Backup could not be saved.', 'Try again') : toast('Backup saved to Downloads.')),
      'iPad / PC · saved',
      'Phone · failed',
    ),
  ),
  sec(
    'ss-04',
    '4 · Storage full (SS-04)',
    'Warm tint, no red, no pop-up. The one button is the safe action: Back up.',
    both(
      (p) =>
        top(p, NOTE) +
        banner('storage', I.disk, FULL, 'Back up') +
        page +
        (p ? '' : toast('Backup saved.', 'Free up space')),
      'iPad / PC · after Back up',
    ),
  ),
  sec(
    'ss-05',
    '5 · Connection lost (SS-05)',
    'Safari let go of the saved notes. Reload fixes it. Words being typed are kept across the reload.',
    both((p) => top(p, NOTE) + banner('storage', I.reload, LOST, 'Reload') + page),
  ),
].join('\n\n    ')

const board = `
      /* ==== end shell.css (all) ==== */
      /* ==== storage safety: board-only styles (everything shared lives in shell.css) ==== */
      html,
      body {
        height: auto;
      }
      body {
        overflow: auto;
        padding: 16px 16px 48px;
      }
      .bd-head {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 12px;
        max-width: 1147px;
        margin: 0 auto 8px;
      }
      .bd-head h1 {
        font-size: 20px;
        margin: 0;
        flex: 1;
        min-width: 200px;
      }
      .bd-note,
      .bd-sec {
        max-width: 1147px;
        margin: 0 auto 28px;
      }
      .bd-note {
        margin-bottom: 20px;
        color: var(--ink-soft);
        font-size: 13.5px;
      }
      .bd-sec h2 {
        font-size: 15px;
        margin: 0 0 2px;
      }
      .bd-sec > p {
        margin: 0 0 10px;
        color: var(--muted);
        font-size: 13px;
      }
      .bd-row {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        align-items: flex-start;
      }
      /* a frame = one small screen; overlays stay inside it */
      .frame {
        position: relative;
        overflow: hidden;
        border-radius: var(--r-xl);
        border: 1px solid var(--line);
        background: var(--surface-0);
        min-height: 240px;
        flex: none;
        max-width: 100%;
      }
      .frame.pad {
        width: 740px;
      }
      .frame.ph {
        width: 375px;
      }
      .frame.tall {
        min-height: 480px;
      }
      .frame .cap {
        position: absolute;
        right: 12px;
        bottom: 6px;
        font-size: 11px;
        color: var(--muted);
      }
      .frame .sh-top {
        border-bottom: 1px solid var(--line);
        padding: 0 8px;
      }
      .frame .sh-scrim,
      .frame .sh-dialog,
      .frame .sh-toast {
        position: absolute;
      }
      .frame .sh-dialog {
        width: min(420px, calc(100% - 24px));
      }
      .frame .sh-toast {
        bottom: 28px;
        max-width: calc(100% - 24px);
        white-space: nowrap;
      }
      .pg {
        padding: 6px 24px 28px;
      }
      .pg h3 {
        margin: 8px 0 12px;
        font-size: 20px;
      }
      .pg i {
        display: block;
        height: 10px;
        border-radius: 5px;
        background: var(--hover);
        margin: 0 0 10px;
      }
      /* Banner = the shared part src/design/parts/Banner.css (SP-56), written with the mock's token names.
         The warm tint is the app token --color-warn-soft (warn at about 12%). No new colour. */
      .fb-banner {
        box-sizing: border-box;
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 44px;
        margin: 12px;
        padding: 0 4px 0 12px;
        border-radius: var(--r-md);
        background: var(--accent-soft);
        box-shadow: 0 0 0 1px var(--line);
        color: var(--ink);
        font-size: 14px;
        line-height: 20px;
      }
      .fb-banner[data-kind='storage'] {
        background: color-mix(in srgb, var(--warn) 12%, transparent);
      }
      .fb-banner__icon {
        flex: none;
        display: grid;
        place-items: center;
        color: var(--accent);
      }
      .fb-banner[data-kind='storage'] .fb-banner__icon {
        color: var(--warn);
      }
      .fb-banner__icon svg {
        width: 18px;
        height: 18px;
      }
      .fb-banner__text {
        flex: 1;
        min-width: 0;
        padding: 8px 0;
      }
      .fb-banner__action {
        flex: none;
        min-height: 44px;
        padding: 0 12px;
        border: 0;
        border-radius: var(--r-md);
        background: transparent;
        color: var(--accent);
        font: inherit;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
      }
      .fb-banner__action:hover {
        background: var(--hover);
      }
      .fb-banner .ib svg {
        width: 16px;
        height: 16px;
      }
      /* numbered steps inside the pop-up */
      .st {
        list-style: none;
        margin: 0;
        padding: 0;
        display: grid;
        gap: 10px;
      }
      .st li {
        display: flex;
        gap: 12px;
        align-items: flex-start;
        font-size: 14.5px;
      }
      .st b.n {
        flex: none;
        width: 26px;
        height: 26px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        background: var(--accent-soft);
        color: var(--accent);
        font-size: 13px;
      }
      .st span {
        padding-top: 2px;
      }
      .st svg {
        width: 16px;
        height: 16px;
        vertical-align: -3px;
        color: var(--ink-soft);
      }
      .sh-dialog p.sub {
        margin: 14px 0 0;
        color: var(--ink-soft);
        font-size: 13px;
      }
      .sh-dialog .ft {
        flex-wrap: wrap;
      }
      /* Settings row (This device) */
      .srow {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 16px;
        padding: 12px 12px 12px 16px;
        border-radius: var(--r-lg);
        background: var(--surface-1);
        border: 1px solid var(--line);
      }
      .srow .gr {
        flex: 1;
        min-width: 0;
      }
      .srow b {
        display: block;
        font-size: 15px;
      }
      .srow span {
        color: var(--muted);
        font-size: 13px;
      }
      .srow .btn svg {
        width: 18px;
        height: 18px;
      }`

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Storage safety: mock-up (static)</title>
    <style>
${css}${board}
    </style>
  </head>
  <body>
    <div class="bd-head">
      <h1>Storage safety</h1>
      <div class="seg sm" role="group" aria-label="Theme" id="th">
        <button data-t="light">Light</button>
        <button data-t="dark">Dark</button>
        <button data-t="sepia">Sepia</button>
      </div>
    </div>
    <p class="bd-note">
      Static mock-up for <b>docs/features/storage-safety.md</b> (flag <code>storage.safety</code>).
      Every message uses a part that already exists: the Banner (one line, one button, ✕), the small
      pop-up and the toast. Beginner and Professional look the same. Each state is shown at iPad / PC
      width and at phone width. Only one banner ever shows at a time.
    </p>

    ${body}

    <script>
      // board only: theme switch (Light / Dark / Sepia); ?theme=dark opens in that theme
      const th = document.getElementById('th')
      const set = (t) => {
        document.documentElement.dataset.theme = t
        th.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.t === t))
      }
      th.addEventListener('click', (e) => e.target.dataset.t && set(e.target.dataset.t))
      set(new URLSearchParams(location.search).get('theme') || 'light')
    </script>
  </body>
</html>
`
fs.writeFileSync(root + '/docs/mockups/storage-safety-mock.html', html)
console.log('written', html.length)
