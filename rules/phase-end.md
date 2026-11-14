# End of a Phase

- A phase ends when the owner has tested it, the full test set is green, and it is switched ON in the live app on the owner's yes.
- Check the phase's Definition of Done: all tests pass, security review done. Then report to the owner (see testing.md) and wait for their visual checks and their answers on "Decisions to review" before the next phase's planning talk.
- Full plain-language explanation of what was built, with examples; also save it into docs/LEARNING.md (one section per phase) so the owner can reread it.
- Short retrospective, including suggested prompt improvements and the measured pace (tasks merged per day, test runs green and red, days from start to the owner's first look and to release).
- Update all project files (README, CLAUDE.md, docs/, `rules/`).
- **Archive:** move active rules to CLAUDE.md or the rule files; move finished history to docs/ARCHIVE.md under a phase heading; start docs/CHANGELOG.md and docs/DECISIONS.md fresh.
- **Rule check:** only if CLAUDE.md passed 5 KB or a rule changed. Find duplicates, contradictions and outdated rules. The owner approves every change; log it in docs/DECISIONS.md. Rules do not change in the middle of a phase.
