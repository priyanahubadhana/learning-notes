# Decisions

Current phase only. Older decisions are in [ARCHIVE.md](ARCHIVE.md).

## Phase 9 decisions

| Date       | Decision                                                                                        |
| ---------- | ----------------------------------------------------------------------------------------------- |
| 2026-11-01 | Address: learning-notes.pages.dev (owner)                                                       |
| 2026-11-01 | New versions go live after all tests pass; the app offers the update (owner)                    |
| 2026-11-01 | Week trial: owner and one other tester; Hindi reviewer available; Spanish review parked (owner) |
| 2026-11-01 | Owner creates the free accounts and stops if a card is asked (owner)                            |

## Decisions to review

Picked by Claude. Anything can be changed.

| Date       | Step       | Picked                                                                                                                                                              | Other options                            |
| ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| 2026-11-01 | 9 offline  | vite-plugin-pwa added (MIT, developer tool). It raises developer-tool audit warnings from 12 to 21; the app itself still has 0                                      | Hand-written service worker              |
| 2026-11-01 | 9 security | Pictures linked by web address are still allowed, so old notes keep working; those sites can see when a picture loads                                               | Block all outside pictures               |
| 2026-11-01 | 7 CI       | WebKit failures (16 on Windows, 7 on Linux) are not real Safari; they are parked for checking on a real iPad in Phase 9, not fixed now                              | Fix them all now                         |
| 2026-11-01 | 7 docs     | `gdrive notes\src` stays and keeps being updated, because a frozen copy would mislead voice chats; the owner kept the folder but chose "context files only" earlier | Stop updating it and leave it frozen     |
| 2026-11-01 | 7 docs     | Phases 1–6 are one archive section, not split per phase: the old log was not grouped by phase                                                                       | Split them by hand                       |
| 2026-11-01 | 7 docs     | ARCHIVE is not copied to Drive (large, never read in work)                                                                                                          | Copy it too                              |
| 2026-10-28 | 6-4        | Anki export was tested by reading it back with this app, **not with the real Anki program**. Import skips schedules, review history, pictures, sounds and tags      | Test once in real Anki; import schedules |
| 2026-10-28 | re-check   | Gallery finger hold (0.4 s) is not tested on a real phone or iPad                                                                                                   | Check during iPad work                   |
| 2026-10-28 | 6-3        | A locked file is encrypted in memory in one piece; a very big file may be slow on a phone                                                                           | Encrypt in parts                         |
| 2026-10-28 | 6-2        | History preview shows text only; copies cost space (30 per page)                                                                                                    | Drawn preview; fewer copies              |
| 2026-10-27 | 5A-6       | The browser backup keeps only the newest copy                                                                                                                       | Keep several                             |
| 2026-10-27 | 5A-6       | Card levels and lesson statuses share two names (Learning, Mastered) with different meanings                                                                        | Rename card levels                       |
| 2026-10-27 | 5A-6       | "Show help" is per device, not synced                                                                                                                               | Sync it; decide in the Sync phase        |

The other older decisions stand as built (owner, 2026-11-01); they are in [ARCHIVE.md](ARCHIVE.md).
