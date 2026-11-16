# C22 pictures (restart notice)

Made with `SHOTS=1 npx playwright test e2e/updateStuckShots.spec.ts` after the last source edit. Beginner and Professional look the same (the notice has no level).

- `restart-now-<day|night>-<ipad-upright|ipad-sideways|phone>.png`: after 5 s of waiting the notice (bottom left) shows "Restart now".
- `couldnt-restart-<day|night>-<device>.png`: the reload was ignored twice; the notice shows "Couldn't restart. Tap to try again".
