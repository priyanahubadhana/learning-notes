# P1.8 first look: must-have update screens (switch update.v2)

Taken 15 Nov 2026 after the last source edit, by `SHOTS=1 npx playwright test e2e/updateScreensShots.spec.ts --project=chromium`.
Name: `<stage>-<light|dark>-<beginner|professional>-<ipad-upright|ipad-sideways|phone>.png` (96 files).
Compare with docs/mockups/phase1-fixes/phase1-fixes.html panel 5.

| Stage (file prefix) | Panel 5 stage |
|---|---|
| 1-countdown | 1 Countdown |
| 2-downloading | 2 Downloading (before 3 s: "Working out the time...") |
| 2b-slow | 2b Really slow (after 8 s; a real stalled line, so the true speed is about 1 KB/s) |
| 3-installing | 3 Installing |
| 4-failed | 4 Did not finish |
| 4b-after-not-now | After "Not now": notes with the "Must-have update waiting" pill |
| 5-offline | Offline note |
| 6-paused | Paused |

Not pictured: a download with real bytes (percent and "about 5 seconds left"); those numbers are covered by src/app/updateSpeed.test.ts.
