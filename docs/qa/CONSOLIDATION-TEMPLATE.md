# Merged QA sheet: <checkpoint tag>

Written by Claude Code (Opus, medium) from the three reports in `C:\Users\pc\Downloads\learning-notes-qa\<checkpoint>\`. The owner reads this page only. One line per distinct finding; duplicates across engines are merged and counted in "Agree".

Reports received: Codex yes/no · Cursor yes/no · Antigravity yes/no · Minutes the owner spent: <fill after reading>

## Decide (owner marks the last column)

| #   | Finding, in plain words | F-id | Kind                     | Severity | Confidence | Agree      | Claude's view                            | Owner: yes / no |
| --- | ----------------------- | ---- | ------------------------ | -------- | ---------- | ---------- | ---------------------------------------- | --------------- |
| 1   |                         |      | error / gap / preference |          |            | C · Cu · A | fix now / next phase / reject, because … |                 |

Kind: **error** (the app or spec is wrong against a spec, a picture or a rule), **gap** (something the spec never said), **preference** (an opinion with nothing behind it; skip quickly). Agree lists the engines that reported it.

## Disagreements

Where engines contradict each other or Claude's view, one line each: who said what, and why Claude leans one way.

## Security (read in private)

Confirmed vulnerabilities and probable risks, numbered as above. Never on the docs site in detail; the public STATE.md line says only "n security items, handled".

## Not forwarded

Findings Claude marks "reject", with the reason, so the owner can overrule.

## After the owner's yes

Each yes becomes a GitHub Issue with the label `source:<engine>`, the F-id and the checkpoint tag, then a task under the normal method. Nothing else is acted on. The numbers (findings per engine, accepted per engine, owner minutes) go to the weekly card.
