# Decisions

Current phase only. Older decisions are in [ARCHIVE.md](ARCHIVE.md).

## Phase 7 decisions

| Date       | Decision                                                                                                                                         |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-11-01 | Roadmap order: Cleanup + CI, Research, Hosting, Sync, then the rest (owner)                                                                      |
| 2026-11-01 | All questions at once per phase (owner); replaces the old "one at a time"                                                                        |
| 2026-11-01 | Item 7 closed as is: "Save file" stays in its own box (owner)                                                                                    |
| 2026-11-01 | Code move to `tools/` waits for tool 2 or cross-platform work, whichever comes first; new code adds no new direct links between features (owner) |
| 2026-11-01 | Tests: that feature's tests each sub-step; full unit tests if data, security or shared code changed; full suite before every push (owner)        |
| 2026-11-01 | Feature specs for all existing features now (owner)                                                                                              |
| 2026-11-01 | Claude Code runs the deep research (owner)                                                                                                       |
| 2026-11-01 | Hosting may start fresh: current data is mostly test data (owner)                                                                                |

| 2026-11-01 | CI: Chrome tests must pass on each push; WebKit runs weekly as a warning (about 30 minutes) until the Phase 9 iPad work |

## Decisions to review

Picked by Claude. Anything can be changed.

| Date       | Step     | Picked                                                                                                                                                              | Other options                            |
| ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| 2026-11-01 | 7 CI     | WebKit failures (16 on Windows, 7 on Linux) are not real Safari; they are parked for checking on a real iPad in Phase 9, not fixed now                              | Fix them all now                         |
| 2026-11-01 | 7 docs   | `gdrive notes\src` stays and keeps being updated, because a frozen copy would mislead voice chats; the owner kept the folder but chose "context files only" earlier | Stop updating it and leave it frozen     |
| 2026-11-01 | 7 docs   | Phases 1–6 are one archive section, not split per phase: the old log was not grouped by phase                                                                       | Split them by hand                       |
| 2026-11-01 | 7 docs   | ARCHIVE is not copied to Drive (large, never read in work)                                                                                                          | Copy it too                              |
| 2026-10-28 | 6-4      | Anki export was tested by reading it back with this app, **not with the real Anki program**. Import skips schedules, review history, pictures, sounds and tags      | Test once in real Anki; import schedules |
| 2026-10-28 | re-check | Gallery finger hold (0.4 s) is not tested on a real phone or iPad                                                                                                   | Check during iPad work                   |
| 2026-10-28 | 6-3      | A locked file is encrypted in memory in one piece; a very big file may be slow on a phone                                                                           | Encrypt in parts                         |
| 2026-10-28 | 6-2      | History preview shows text only; copies cost space (30 per page)                                                                                                    | Drawn preview; fewer copies              |
| 2026-10-27 | 5A-6     | The browser backup keeps only the newest copy                                                                                                                       | Keep several                             |
| 2026-10-27 | 5A-6     | Card levels and lesson statuses share two names (Learning, Mastered) with different meanings                                                                        | Rename card levels                       |
| 2026-10-27 | 5A-6     | "Show help" is per device, not synced                                                                                                                               | Sync it; decide in the Sync phase        |

The other older decisions stand as built (owner, 2026-11-01); they are in [ARCHIVE.md](ARCHIVE.md).
