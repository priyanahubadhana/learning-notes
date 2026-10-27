const fs = require('fs')
function edit(p, pairs) {
  let s = fs.readFileSync(p, 'utf8')
  for (const [a, b] of pairs) {
    if (!s.includes(a)) throw new Error(p + ': ' + a.slice(0, 70))
    s = s.replace(a, () => b)
  }
  fs.writeFileSync(p, s)
}
edit('README.md', [
  [
    '- **Next:** Phase 6 end checks (tests, speed, security + code review, LEARNING.md, owner report).',
    "- **Phase 6 end checks — done 2026-10-28:** 559 unit + 184 e2e pass; lint, format of code, build clean; `npm audit` 0; security + code review of the phase (router, version history, crypto, Anki import/export, pictures, stash, labels): one hardening made (the Anki zstd file is unpacked in pieces with a 400 MB limit, so a “bomb” is stopped); LEARNING.md has the Phase 6 section.\n- **Next — waiting for the owner:** the Phase 6 check-in (checks below; Hindi screens, plus the 5A/5B re-check the owner asked for), then the planning talk for Phase 7. **Owner task after Phase 6 (not code):** one real user (a friend or café staff) tries the app for a week and reports what confused or annoyed them.",
  ],
  [
    '6. Data safety & reach — plan approved 2026-10-28, local-only',
    '6. Data safety & reach — built 2026-10-28 (waiting for the owner check-in), local-only',
  ],
])
