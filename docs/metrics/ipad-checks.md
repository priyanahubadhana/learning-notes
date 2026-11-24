# The owner's iPad checks

One row each time the owner has tried an `@ipad` scenario of a feature file (e2e/features) on the real iPad. Until a row exists, the report shows that scenario as "needs the owner's iPad check", whatever its computer stand-in says (B0, SC-04).

Format: one table row per check, newest last. Scenario = the scenario's number (S2, not the name). Date = YYYY-MM-DD. Build = the short code of the build that was tried (the preview's number or the commit). Result = `pass` or `fail`. The newest row of a scenario counts. `npm run check:spec` fails on a row it cannot read.

| Scenario | Date | Build | Result |
| -------- | ---- | ----- | ------ |
