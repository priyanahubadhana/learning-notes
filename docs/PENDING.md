# Pending (rebuilt 14 Nov 2026)

The one short list of open work. The plan: [plans/phase-plan.md](plans/phase-plan.md). What the owner decided and approved: [design/owner-decisions.md](design/owner-decisions.md). The old 530-line list is kept in plans/archive/PENDING-until-2026-11-14.md.

## Needs you

- **BUILD PAUSED (owner, 14 Nov 11:10 IST).** After the two final audits, say "restart" and switch this chat to Opus with `/model` (medium effort). Nothing restarts before that.
- **When you have the iPad:** re-check F1 (stays signed in), F5 (✕ in search), F9 (Settings search on every page) and BUG-006 (the ⚙ gear) at the preview address. They are in the preview now.
- **Small, not urgent:**
  - Unlock switch "about.updateDetails" (open since 13 Nov): keep it, or keep using "about.version". Asked again in the Phase 1 page.
  - Decisions to review: docs/DECISIONS.md "Decisions to review" (items from 12 to 14 Nov).
  - One check before the strict security header is switched on: Google sign-in, Drive and fonts still work. Until then the strict rule only reports.
  - AI test key: you said you typed it into Settings › AI with a cap. On the device, check it shows masked and that Test passes. Never paste it in chat.
  - Supabase, Phase 8: the online Claude connector needs its job tools deployed (list in docs/features/ai-framework.md "Needs the owner"). Needs your OK then.
- **Decided on 14 Nov (nothing to do):** work in phases, in the order of the phase plan, Settings with the frame; restart lean (Opus chat, one or two builders); Sonnet builds, Opus reviews code and look, Fable only plans and solves what Opus could not; the reviewer fails a task only for real problems; helpers may push normally; the preview's code goes into the real app at the end of Phase 1; a one-tap test preset; the real app's check was fixed.
- Done lately: Claude connector A tested (13 Nov); refresh-token rotation on, 10 s (14 Nov); email limits fine (14 Nov); Drive function redeployed with the strict website list (14 Nov).

Preview address: https://build-next.learning-notes-app.pages.dev (the parts you test start ON there). The live app has had no new code since 12 Nov.

## Phase board

| Phase | What                                                    | State                                                       |
| ----- | ------------------------------------------------------- | ----------------------------------------------------------- |
| 0     | Reset: clean rules, the real app check, the test preset | rules cleaned 14 Nov; tasks 0.4 to 0.6 wait for the restart |
| 1     | The frame and Settings                                  | built; owner's first look started 14 Nov (F1 to F9)         |
| 2A    | Writing tools: tool bar, page menus                     | built; two parts parked                                     |
| 2B    | Text box and Pencil                                     | not built                                                   |
| 3     | Notebooks                                               | built                                                       |
| 4     | Search                                                  | built                                                       |
| 5     | Home and Library                                        | built                                                       |
| 6     | Review and Study                                        | mostly built; two parts parked                              |
| 7     | Reader                                                  | built, parked                                               |
| 8     | AI and the Claude connector                             | partly built                                                |
| 9     | Things inside a page; pictures, PDF, audio              | needs its artifact                                          |
| 10    | Safety and data; system layer; welcome and tours        | needs its artifact                                          |

Branches and commit ids of every parked part: docs/BUILD-STATE.md.

## Open problems (each one has a phase)

| ID      | Problem                                                                                                                                     | Phase | State                                                                                       |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------- |
| F1      | Sign-in asked again after every reopen in Safari                                                                                            | 1     | fixed, in the preview; owner to re-check                                                    |
| F2      | Sidebar list hard to scroll from empty space                                                                                                | 1     | fixed and reviewed; merge is Phase 0 task 0.5                                               |
| F3      | Scroll bar too faint; show position and ends                                                                                                | 1     | same fix                                                                                    |
| F4      | Remove Review, All cards, All summaries rows from the Notebooks sidebar                                                                     | 3     | same fix                                                                                    |
| F5      | Search pop-up: ✕ to clear and ✕ to close, no "Esc"                                                                                          | 4     | fixed, in the preview; owner to re-check                                                    |
| F6      | One scrolling behaviour and one scroll bar everywhere                                                                                       | 1     | same fix as F2; four small follow-ups listed in docs/design/owner-decisions.md "Priority 4" |
| F7      | The screen sometimes freezes                                                                                                                | 1     | cause unknown; a recorder runs on the preview; tell Claude what you did just before         |
| F8      | Layout breaks after turning the iPad sideways and back                                                                                      | 1     | same fix as F2                                                                              |
| F9      | Settings search on every Settings page, finds every switch                                                                                  | 1     | fixed, in the preview; owner to re-check                                                    |
| BUG-001 | Checklist block shows "Not saved yet"; "Try again" does nothing; typing lags                                                                | 2B    | not fixed; needs a way to reproduce                                                         |
| BUG-002 | Format bar leaves the screen                                                                                                                | 2A    | automatic test added; owner's iPad check waits                                              |
| BUG-003 | Tool bar should hide while writing, with a "Show toolbar" pill                                                                              | 2A    | built, parked with tool bar 1e, 1f                                                          |
| BUG-004 | Must-have update flow                                                                                                                       | 1     | built, in the live app, switched off; owner's check waits                                   |
| BUG-005 | Settings previews, guided tour, first-launch welcome                                                                                        | 10    | not built; needs its artifact                                                               |
| BUG-006 | ⚙ gear not reachable on iPad upright                                                                                                        | 1     | fixed, in the preview; owner to re-check                                                    |
| TB      | Text box and Pencil list (cursor jumps, double-tap select, whole-box selection look, handles, drag, wrapping, glide, two hints overlapping) | 2B    | not built; full list in the phase plan and owner-decisions.md                               |
| T3      | Three iPad tests fail on this PC every time (textBoxFree:461, toolsRefresh:60, undoHistory:210)                                             | 0     | cause unknown; task 0.9                                                                     |
| RD      | Reader: sidebar covers the ✕, blurry top bar, bars hide on their own, Listen long-press                                                     | 7     | in the parked Reader part or its 8 follow-ups                                               |
| S1      | Settings preview picture too loud (mock condition)                                                                                          | 1     | to do                                                                                       |
| TA      | "More tools" arrow sits over Backspace                                                                                                      | 2A    | to check in the new tool bar                                                                |

## Your tests waiting

- **First preview checklist:** [plans/ipad-checklist-first-preview.md](plans/ipad-checklist-first-preview.md). Parts 1 and 2 done on 14 Nov. Each phase page will carry only its own steps.
- **Older tests (9 to 12 Nov):** [plans/owner-checks-pending.md](plans/owner-checks-pending.md). Owner, 14 Nov: tests for screens the redesign replaces are dropped when that phase is planned; tests for things that stay are folded into the test list of their phase (most are text box and Pencil, so Phase 2B).

## Decide before public launch

- Supabase paid plan (about US$25 a month). No cost now.

## Later (in no phase yet)

- Reader presets (Read, Light study, Deep study) and the cross-book Highlights database.
- Study modes (summary layers, theme pages, links between notes, quiz and teach-back).
- Custom Views (parked 12 Nov). Layers, rotation, shrink a box to scale its text, snapshot Lasso (with Phase 9's artifact).
- Old carried-over items from HANDOFF (archived 14 Nov): looked at when the phase they belong to is planned.
- Voice replies (the "voicemode" add-on): switched off on 14 Nov because it fails to start on this PC. The owner wants it working, with its on/off switch, as a small job after Phase 1 on a day when no build runs. Likely cause to check first: Windows blocks the unsigned Python it needs.
