# Home cockpit (Phase F)

Security rules: [rules/security.md](../../rules/security.md). Check them before building. Plan: [master plan](../plans/master-plan-2026-11.md) Phase F.

## Purpose

Run a whole day on the iPad: a short Briefing, tasks with an inbox and a matrix you fill yourself, a Top 3, a project timer with a Focus (Pomodoro) mode, a day plan, routines and habits, affirmations, an evening review that writes into the journal, and reports. Built in three steps (F1 tasks, F2 time, F3 routines). The Home space (`src/home/`, opened from the strip or the running timer chip) replaces the old "Today" placeholder.

## How it works

- **Data (Dexie 19, tables only added, in `TABLE_ONLY_VERSIONS`):** `tasks`, `projects`, `timeEntries`, `dayPlans`, `habits`, `habitChecks`, `files` (types in `core/homeTypes.ts`). All are `record` tables in `sync/tables.ts` (`files` is `file`: its `data` bytes go to Drive); every write sets `updatedAt`, deletes are soft. Rows are validated in `share/checkRows.ts`; backups and "notes only" files include them (the bytes of `files` are left out of "notes only").
- **Days:** local `YYYY-MM-DD` that roll over at Settings › "Day starts at" (`core/homeDays.ts`, default 4 am). Times are UTC ms. The Journal still uses the calendar date, so between midnight and the day-start hour the journal's "today" and Home's "today" differ by one day.
- **Tasks (F1, `core/taskService.ts`, UI `home/TasksTab.tsx`):** Inbox with one-line quick add (a day word at the start or end, in English, Hindi or Spanish: "Call Sam tomorrow", `home/quickAdd.ts`). The matrix has four boxes (Do, Schedule, Delegate, Drop) filled only by you: drag a task by its title (mouse or Pencil at once; a finger after a 0.4 s press; `home/useTaskDrag.ts`) or use its "…" menu (the keyboard and VoiceOver way). Tick moves a task to Completed (by day, kept for good). Unfinished tasks stay where they are; **Tomorrow** and **Pick a day** carry them (the history is kept, and a quiet "carried 3×" shows from the third carry); **Move to list…**, **Project…** and Delete (soft, with Undo) are in the same menu. Upcoming lists open tasks planned after today, by day. Projects filter the lists and are what the timer tracks.
- **Day record:** a read-only `dayRecord` block (`editor/dayRecord/`, prop `day`) shows the tasks done, carried and still open for a day, read live from the tasks. `openJournalDay` adds it as the last block of every new journal day; `/day record` inserts it by hand.
- **Tasks from notes:** the tool **Send to Home** (Insert, also found in Search › Features) turns the checklist line at the cursor into a linked task (`app/taskLink.ts`). Ticking either side ticks both: the editor saving the line ticks the task (`core/taskService.ts` `syncTasksFromBlocks`, called after `saveBlockChanges` in its own transaction); Home ticking the task ticks the line through the open editor when that page is open, else by writing the block record and patching any kept unsaved copy (`editor/pendingStash.ts` `patchStashedBlock`).
- **Top 3 (F2):** up to three open tasks chosen by you for today, a "1 of 3" counter, and yesterday's three with a tick or a red cross. A fourth is refused, never swapped.
- **Timer (F2, `home/timer.ts`, `timerService.ts`, `TimerCard.tsx`):** one big Start/Stop and a project. The time shown is always now minus the stored start, so a reload, sleep or a closed app loses nothing. **Free** counts up; **Focus** runs 25 focus / 5 break with a long break of 15 after every 4th (lengths editable on this device; the lengths used are stored on the entry). A running chip (`TimerChip.tsx`, beside the Now playing pill) shows on every screen. After 2 hours it asks "Still working?": Keep going, or Stop at a time you pick (never before the start). A short chime plays at the end of a stretch only while the app is open (no notifications). The screen stays awake only while a Focus run is on (Wake Lock).
- **Plan (F2, `home/planService.ts`):** today's timeline (05:00 to midnight). Drag a task onto an hour, or choose a time with **Add at** (no drag needed), or add a free block; blocks snap to 15 minutes and have earlier, later, shorter, longer and Remove buttons. One plan per day, with a fixed record id so two devices merge.
- **Reports (F2, `home/reports.ts`, pure):** hours per project for today or this week, and the day's timeline with the plan and the tracked time side by side. A Focus run counts its focus stretches only. Only tracked time is counted: no streaks, no scores.
- **Routines (F3, `home/habitService.ts`, `Routines.tsx`):** Morning, Night and Daily tick lists. Each habit has a 7-day strip: done, a red cross for a missed day (any earlier day since the habit began without a tick, using the day-start hour), a dot for today or before the habit existed. One check per habit per day with a fixed id. No reminders or notifications (the web cannot, without a server).
- **Affirmations (F3, `home/affirm.ts`):** a habit with a page of bullet points (read aloud by the B4 reading voice, so Now playing applies) and/or your own recording (MediaRecorder, `audio/mp4` on Safari; stored in `files` on this device; the microphone permission was already `self`). No timer and no cards.
- **Evening review (F3, `home/EveningReview.tsx`):** offered after a time you set (default 20:00; "Start now" any time): done and not done today, a choice for every unfinished task (tick, Tomorrow, Pick a day, or leave it), and three journal prompts whose answers are written into today's journal page before its task record (`journal/journalService.ts` `appendJournalNotes`).
- **Briefing (F3, `home/briefing.ts` pure, `BriefingCard.tsx`):** short lines at the top of Today: Top 3 left, tasks planned for today, habits left, tasks carried from yesterday, cards due (link to Review), and yesterday's missed habits (red cross). It is one data shape (`Briefing`), so a later AI step can add a `summary` line without any screen changing.
- **Search:** the Tasks chip of the one Search finds tasks by the words in their title (`search/TaskResults.tsx`, matched in memory) and opens Home › Tasks.

## Edge cases

- Nothing is ever deleted or moved by the app on its own: a Drop-box task is kept; an unfinished task simply stays; deleting is a soft delete with Undo.
- Two devices: tick and plan records have fixed ids; a task or entry edited on both keeps the newer edit (`record` merge). A running timer on two devices at once is possible (each device sees its own); stopping one does not stop the other until sync brings it.
- The timer started before a reload keeps its start time. A clock set back counts as 0 elapsed.
- Habits made today have no "missed" days before today. A habit made at 1 am belongs to the day before when the day starts at 4.
- A linked task whose note line was deleted stays a normal task. An unticked kept copy of a page never brings an old tick back (patched when Home ticks).
- Health data and reminders are not on the web (later, native).

## Security check

- Inputs: titles are trimmed and capped (500 characters for tasks, 200 for habits, 100 for projects and lists); day strings are checked with a pattern on import; the time field is a native time input; recorded audio types are limited to `audio/*` and checked again on import; imported rows go through `share/checkRows.ts` field by field.
- Data leaving the device: none (sync, when on, sends locked copies like any table; `files` bytes go to Drive encrypted).
- Deletes: soft only. No new network access, no new dependency, no permission change (the microphone was already allowed for this site).

## Tests

- Unit: `core/taskService.test.ts` (days, tasks, carry, upcoming, day record, notes link both ways), `home/quickAdd.test.ts`, `home/timer.test.ts` (sleep, Pomodoro cycle, focus time), `home/homeServices.test.ts` (timer service, reports, 20,000-entry speed test, plan, Top 3), `home/habits.test.ts` (missed-day logic with the day-start hour, briefing, evening journal), `core/migration.test.ts` (18 to 19).
- E2E: `e2e/home.spec.ts` (add, drag to a box, tick, Completed, menu moves, carry, day record on the journal, → Home both ways, projects), `e2e/homeTime.spec.ts` (Top 3, timer after reload, reports, Still working, Focus with a fake clock, plan), `e2e/homeRoutines.spec.ts` (habit strip and red cross, recording with a fake microphone, evening review into the journal, Briefing), `e2e/homeSearch.spec.ts`.
- Owner (iPad, installed app): see [owner-checks-pending.md](../plans/owner-checks-pending.md) (Wave 4 part A).
