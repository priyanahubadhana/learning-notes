# Home productivity panel: research and recommendation (5 Nov 2026)

Honesty note: only three claims were checked live (marked [V]). The rest is from my background knowledge of these tools and is marked [U] (unverified). Re-check before quoting. Third-party review sites are often affiliate content, and their prices conflict.

## Part 1. Research

**Eisenhower matrix.** Core idea: sort tasks by urgent and important into Do now, Schedule, Delegate, Drop. The money quadrant is "important, not urgent". UI: a 2x2 grid. TickTick has a built-in matrix view that fills itself from due date (urgent) and priority (important) [U]. Todoist has no matrix; people fake it with priority P1-P4 and filters [U]. Notion uses community templates with a Board or a 2x2 of linked databases, driven by two select fields [U]. Loved: it forces a "what can I drop" moment. Hated: manual sorting becomes a chore; everything lands in "urgent+important"; no delegate lane for a solo user. Beginner-friendly: mid. Best if quadrants are derived from fields, not dragged by hand.

**Time tracking (Toggl Track).** Core: one running timer, tagged with project, client and tags; reports show where time went. [V] Projects and clients are unlimited on the free plan; sub-projects and estimates are paid; reports filter by project, client and tag; there is a Pomodoro mode (Chrome extension and mobile, not the web app) ([Toggl iOS listing](https://apps.apple.com/app/toggl/id1291898086), [review](https://www.softwarepundit.com/node/288), checked Nov 2026). UI: a big start/stop button, a "what are you working on" box, a day list of entries, a calendar view, and a pie plus bar report. Loved: one-tap start, the free tier, clean reports. Hated: forgetting to stop the timer; setup (clients/projects) feels like work; business-focused. Beginner-friendly: yes if the project is optional.

**Pomodoro.** Core: 25 minutes focus, 5 break, a long break every 4. TickTick Focus: a timer tied to a task, with white noise and a stats heatmap [U]. Forest: a tree grows while you stay off the phone, and it dies if you leave. It is gamified and popular [U]. Session (Apple): focus timer with tags and stats, calm design [U]. Loved: a clear start and end, the focus log, the gentle game. Hated: fixed 25-minute blocks interrupt flow; web timers die when the phone sleeps; guilt streaks. Beginner-friendly: yes. Make lengths editable.

**Time blocking.** Core (Cal Newport): give every hour of the day a job, and re-plan when the day slips; a paper version uses a block of lines per day [U]. Sunsama: drag a task onto a calendar timeline, with estimates shown per task [U]. Akiflow and Motion: Akiflow is a manual inbox plus a calendar. Motion auto-schedules by AI, which is expensive and sometimes shuffles your day in a way users dislike [U]. Amie and Structured: tasks and calendar on one timeline; Structured uses a visual vertical day with icons, very beginner-friendly [U]. Loved: realism about how long things take; seeing the day is full. Hated: re-planning fatigue; auto-schedulers that change plans silently. Beginner-friendly: Structured style, drag a task to a slot.

**Daily planning rituals.** Sunsama's official help describes a morning (or evening-for-tomorrow) planning ritual with a review step; unfinished tasks can roll over automatically or after a prompt, chosen in settings. Shutdown is a short evening flow: review what you did, reflect, roll forward, disconnect [V] ([Sunsama evening planning](https://help.sunsama.com/docs/evening-daily-planning), [shutdown changelog](https://roadmap.sunsama.com/changelog/daily-shutdown), checked Nov 2026). Top 3 / MIT: pick 1-3 must-do tasks (Zen to Done, Leo Babauta, and others) [U]. Loved: closure, the "done for today" feeling, small lists. Hated: guilt from repeated rollover (task shows "rolled 9 times"), rituals that take too long. Beginner-friendly: yes. Limit the day to 3 tasks first, then "also if time".

**Notion Life OS / second brain.** Core: a Home page with linked database views over the same few databases: Tasks, Projects, Notes, Areas (PARA by Tiago Forte [U]), Journal, Goals. Typical Home: a greeting, "Today" (tasks filtered by date), quick-add buttons, a projects gallery, recent notes, a habits strip. Loved: it is yours and flexible. Hated: over-engineering; build time beats use time; mobile is slow; empty dashboards feel like a failure. Beginner-friendly: only with a fixed template. Lesson: few databases, many views.

**Evening review and journaling.** Core: 3-5 min at the end of the day: what went well, what did not, tomorrow's first step. Day One and Journey: a daily prompt, streaks, mood [U]. Loved: low friction, a prompt, mood tracking. Hated: streak pressure; a blank page. Beginner-friendly: yes with one to three prompts and skip allowed. In our app the journal is just a daily page.

**Weekly review (GTD).** Core (David Allen): once a week, get clear (empty inboxes), get current (review projects and next actions, calendar), get creative (someday list) [U]. UI: a checklist. Loved: trust that nothing is lost. Hated: long (1 hour), skipped when tired. Beginner-friendly: only a short version: 10 minutes, five prompts.

**Time and focus reports.** Core: where did time go, by project, by day. Patterns: a daily total, a week bar chart stacked by project, a project donut, planned vs actual (estimate vs tracked), a focus heatmap (TickTick style) [U]. Loved: planned vs actual teaches estimating. Hated: dashboards nobody opens; guilt. Beginner-friendly: one "This week" card plus a drill-down.

## Part 2. Recommendation for our Home

Principle: Home is a layer, not another app. Tasks are database rows. The Home shows saved views of them. Default is calm: 4 cards and nothing else. Everything else is an optional card to add.

### (1) Default layout

Cards in priority order: **Today** (Top 3 plus the rest), **Timer** (one bar), **Plan** (the time-block day), **Matrix** (small). Optional: Journal prompt, Week, Reports.

- **Phone** (one column, bottom tab or scroll): greeting + date; Timer bar (sticky at the top once running); Top 3; Today list; "Plan the day" and "Matrix" behind a tab strip (List / Day / Matrix). Evening (after a set time) a "Shut down" card moves to the top.
- **iPad** (two columns, portrait stacks like the phone): left 60%: Top 3 + Today list. Right 40%: the day timeline (time blocks), with the Timer bar above it. Matrix and Week sit under a "More" row.
- **PC** (three columns): left: Today list with the Top 3; centre: the day timeline; right: Timer, Matrix (2x2 small), and Journal prompt. Weekly and reports in a collapsed second row.

Customisation: cards can be hidden, reordered by drag, and resized between S/M. "Reset to default" always visible. No blank canvas by default.

### (2) Task fields

| Field | Type | Note |
|---|---|---|
| title | text | required, the only required field |
| project | relation | optional; default "No project" |
| importance | high / normal | one toggle (star) |
| urgency | derived | urgent = due within 2 days or overdue; editable threshold; manual override allowed |
| quadrant | derived | from importance + urgency; never stored as truth |
| due | date | |
| scheduled_start, scheduled_end | UTC datetime | the time block |
| estimate_min | number | |
| status | todo / doing / done / dropped | |
| carry_count | number | +1 each time rolled over |
| page_id | relation | link to the page; checklist lines convert with a back-link |
| top3_date | date | which day it is a "Top 3" for |
| created_at, done_at | UTC datetime | |

"Dropped" is a first-class status so drop is guilt-free (Eisenhower "delete").

### (3) Three views, one set of tasks

All three are saved queries over the same rows. Nothing is copied.

- **List:** filter `status in (todo, doing)` and (due <= today or scheduled today or top3_date = today); sort Top 3 first.
- **Matrix:** same rows grouped by the derived quadrant. Dragging a card between quadrants edits the fields (importance, due), not a hidden "quadrant" value. Show a small hint: "moved to Urgent: due set to today".
- **Time blocks:** rows with `scheduled_start` placed on the timeline; unscheduled ones in a side tray. Dragging from the tray sets `scheduled_start/end`, using `estimate_min` as the default length.

Because edits are field changes, the three views never disagree.

### (4) Pomodoro + timer merged

One timer, two modes: **Free** (Toggl-like, counts up) and **Focus** (Pomodoro, counts down 25/5, long break every 4, lengths editable). Start from a task, a project, or blank.

`time_entries` table:

| Field | Note |
|---|---|
| id | |
| task_id (nullable) | |
| project_id (nullable) | copied from the task at start; stays correct if the task changes |
| kind | focus / break / free |
| started_at, ended_at | UTC; null `ended_at` = running |
| planned_sec | target for focus mode |
| cycle_no | 1-4 in a Pomodoro set |
| interrupted | bool |
| note | optional |

Rules: only one running entry. The clock is `now - started_at` computed from stored timestamps, never from counting ticks (this survives sleep and background throttling). On open, if an entry has run far too long, ask "still working?" and offer to set the end time. Breaks are not counted as work in reports. Entries can be edited and added manually.

Reports (all from `time_entries`): Today total + by project; Week bars stacked by project; project share; estimate vs actual per task; Pomodoros completed per day; focus heatmap (later). Show the numbers, avoid streaks or guilt.

### (5) Daily flow

1. **Morning plan** (3 min, a card, skippable): yesterday's carried tasks listed; pick Top 3; optionally drag to the timeline; the card shows total estimated minutes vs free hours, with a gentle "that is a lot" warning.
2. **Work:** tap play on a task, the timer runs; finish = tick, the entry closes.
3. **Evening shutdown** (shown at a set time, 3 steps): (a) review today: done / not done; (b) for each unfinished task choose Tomorrow / Pick a date / Drop / Someday; (c) journal: 1 to 3 prompts (what went well, what to improve, tomorrow's first step) writing into today's journal page.
4. **Carry-over:** the choice in (b) increments `carry_count`. At 3 or more, show a quiet nudge: "Rolled 3 times. Split it, schedule it, or drop it?" No auto-rollover by default (it hides decisions); offer an option to turn it on.
5. **Weekly review** (optional card on Sunday): 5 prompts, 10 minutes: inbox empty? projects each have a next action? last week's report; carry-over tasks; one thing to improve.

### (6) MVP vs later

**MVP:** Home with Today list + Top 3; tasks as database rows with title, project, due, status, importance; checklist-line to task; Matrix view (derived); free timer + project; basic Today report; evening shutdown with carry-over and carry_count; journal page for today.
**Next:** time-block timeline with estimates; Pomodoro mode; week report; weekly review checklist; customisable cards.
**Later:** estimate vs actual insights; heatmap; calendar import (read-only first); notifications on native; AI suggestions (needs owner approval of cost); widgets.
Skip: auto-scheduling, team features, clients and invoicing.

### (7) Web vs native

- **Free on the web:** all data and views; timer (using timestamps); in-app sounds and title-bar countdown; installable PWA; Wake Lock (keep the screen on, support on iOS Safari 16.4+ is [U]); local notifications while the tab is open; export of reports; keyboard shortcuts.
- **Web with limits:** Push notifications on iPhone and iPad only work when the site is installed to the home screen (iOS/iPadOS 16.4+) and the user taps to allow [V] ([OneSignal](https://documentation.onesignal.com/docs/safari-web-push-for-ios), [Pushly](https://documentation.pushly.com/integration/web-push/safari/safari-on-mobile-ios-ipados), checked Nov 2026). Push needs a server and a push service (cost and privacy design). Android Chrome and desktop are easier [U].
- **Timer in background on iOS:** I could not find official docs. [U] Treat browser timers as throttled or suspended when the page is hidden, so the design above (timestamps, recalculate on return) is a must. A reliable "ding" at the end of a focus block while the phone is locked is native only (a scheduled local notification).
- **Native only:** Health data (HealthKit, Apple Watch focus/mindfulness) [U]; home-screen and lock-screen widgets and Live Activities for the running timer [U]; Siri/Shortcuts; app-blocking focus modes (Forest-like blocking) [U]; reliable background alarms.
- **Rule of thumb:** build the timer so it is correct without background code, and treat native notifications and widgets as a later, optional upgrade.

## Sources
- Sunsama help, evening planning: https://help.sunsama.com/docs/evening-daily-planning
- Sunsama shutdown changelog: https://roadmap.sunsama.com/changelog/daily-shutdown
- Toggl Track App Store listing: https://apps.apple.com/app/toggl/id1291898086
- Toggl review: https://www.softwarepundit.com/node/288
- OneSignal, web push for iOS: https://documentation.onesignal.com/docs/safari-web-push-for-ios
- Pushly, Safari iOS: https://documentation.pushly.com/integration/web-push/safari/safari-on-mobile-ios-ipados
- All other tool descriptions: from background knowledge, no link checked [U].
