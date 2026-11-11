# Home Dashboard Plan (12 Nov 2026)

Goal: Home becomes a dashboard **people build themselves** from the app's own building blocks. Three flagship templates (Planner, Learning tracker, Finance) are made **only** from those same blocks, so anyone can copy or remake them. Source: [mock-feedback-2026-11-11.md](mock-feedback-2026-11-11.md) (Home + Home answers).

## What the research says (short)

- **Notion** budget and "life OS" dashboards are just databases + linked views + charts on one page. Charts are new and partly paid, so many templates paste in outside charts ([Notion budget templates roundup](https://clickup.com/blog/notion-budget-templates/), [Notion financial dashboard how-to](https://www.thebricks.com/resources/how-to-create-a-financial-dashboard-in-notion), [Notion charts help](https://www.notion.com/help/charts)). **Our chance:** charts built in and free.
- **Coda** puts tables, buttons and formulas on one page; a "Pack"-free doc can still be a small app ([Coda gallery](https://coda.io/gallery)).
- **Obsidian** Homepage plugin + Dataview + Bases turn notes into live tables/cards ([Bases, 1.9.0](https://obsidian.md/changelog/2025-05-21-desktop-v1.9.0), [20,000 notes as live dashboards](https://www.dsebastien.net/how-i-turned-20-000-notes-into-live-dashboards-with-obsidian-bases/)). Lesson: the dashboard is just _saved queries_.
- **Sunsama / Akiflow / Things 3**: a daily plan with time-boxed tasks, a calm "Today", a weekly review ([Sunsama](https://www.sunsama.com/), [Akiflow](https://akiflow.com/), [Things 3](https://culturedcode.com/things/)).
- **Apple widgets / Smart Stack**: few fixed sizes (small, medium, large), one job per widget, stacks that rotate ([Apple: widgets on iPad](https://support.apple.com/guide/ipad/add-and-edit-widgets-ipad1b9e9d7d/ipados)).
- **Grafana**: 24-column grid, resizable panels, collapsible rows and tabs, "Stat" tile = one big number + sparkline + colour thresholds ([Grafana Stat panel](https://docs.aws.amazon.com/grafana/latest/userguide/v12-panels-stat.html), [Grafana dashboards guide](https://oneuptime.com/blog/post/2026-01-24-grafana-custom-dashboards/view)).
- **Tableau / Power BI / Looker Studio**: KPI cards on top, a date-range control that filters every chart, click a bar to filter the rest ("cross-filter"), drill into details ([Tableau dashboards](https://help.tableau.com/current/pro/desktop/en-us/dashboards.htm), [Power BI drillthrough](https://learn.microsoft.com/en-us/power-bi/create-reports/desktop-drillthrough), [Looker Studio controls](https://support.google.com/looker-studio/answer/6312144)).

**Takeaway:** fixed widget sizes (Apple) on a simple grid (Grafana), KPI tiles on top, one date control for the whole page (Looker), click-to-open details (Power BI). Not a free-form canvas; that gets messy on iPad.

## A) Building blocks we HAVE today (checked in code)

| Block                                                                                                                                                                                        | Where                                  | Notes                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------- |
| Databases with column types: text, number (plain/currency/percent), date, checkbox, choice, choices/tags, stars, url, relation, rollup, formula                                              | `src/databases/columnTypes.ts`         | Rollup = summary of linked rows (count, sum…)                                         |
| Formulas: IF, AND/OR/NOT, SUM, AVERAGE, MIN/MAX, ROUND, MOD, POWER, DATE, DATEADD, DAYS, TODAY, NOW, text tools                                                                              | `src/databases/formula/`               | Enough for weighted sums inside one row                                               |
| Views: Table, Board, List, Gallery, Calendar (incl. Year), Dashboard                                                                                                                         | `src/databases/views/viewTypes.ts`     | Registry: new views plug in                                                           |
| Dashboard view charts: number, bar, line, donut, progress, heatmap; measures count/sum/average/min/max; sizes small/medium/wide; group by column; period day/week/month; simple filters      | `src/databases/dashboard/chartSpec.ts` | **Only inside one database**, not on Home                                             |
| Tracker history and stats (streaks)                                                                                                                                                          | `trackerStats.ts`, `trackerHistory.ts` |                                                                                       |
| Starter databases (books, habits, vocabulary…)                                                                                                                                               | `starterDatabases.ts`                  | A mini template idea already                                                          |
| CSV import/export                                                                                                                                                                            | `csv.ts`, `CsvImportDialog.tsx`        |                                                                                       |
| Database block inside a note                                                                                                                                                                 | `DatabaseBlockView.tsx`                |                                                                                       |
| Home: Top 3, tasks, quick add, plan time blocks (15-min snap), routines/habits, live timer + time entries per project, reports (hours per project), briefing, evening review, due cards tile | `src/home/`                            | Hard-coded screens, **not** user-arrangeable; data lives in own tables, not databases |

## B) Gap analysis: blocks to ADD

| #   | Block                                 | Why needed                                  | Scope                                                                                                                                                                                                         | Effort              |
| --- | ------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| 1   | **Home grid**                         | Users arrange their own Home                | 4-column grid on iPad (2 on phone); widgets in sizes S (1×1), M (2×1), L (2×2), Wide (4×1); drag to move, pick size from menu; tabs ("Morning", "Money"); edit mode with "Done"                               | L                   |
| 2   | **Widget registry**                   | One way to add any widget                   | Like the view registry: each widget has type, settings, size list; "+ Add widget" sheet                                                                                                                       | M                   |
| 3   | **Chart widget on Home**              | Reuse existing charts outside the database  | Points to _database + saved view_ (its filters/sort) + a `ChartSpec`; reuses `ChartBody`                                                                                                                      | M                   |
| 4   | **KPI tile**                          | "₹12,400 spent this month" at a glance      | One number from a database (sum/count/avg) or a rollup, with compare ("vs last month ▲8%"), goal and colour thresholds                                                                                        | S                   |
| 5   | **Progress ring**                     | Goals and budgets                           | Value ÷ target; target fixed or from a column                                                                                                                                                                 | S                   |
| 6   | **View widget**                       | Show a live list/table/board on Home        | Embed any saved view, compact, tap row → opens it                                                                                                                                                             | M                   |
| 7   | **Timer + time-log block**            | Planner and Learning both need time         | Move timer entries into a "Time log" database (start, end, minutes, activity, project) so charts can read them; live timer button + "log after the fact" form                                                 | M                   |
| 8   | **Time blocks with slider**           | Owner H3                                    | Duration slider 10 min–10 h (snap 5/15 min), blocks stored as database rows with date + start + length                                                                                                        | M                   |
| 9   | **Weighted progress**                 | Owner Q3: a book counts more than 100 cards | An "Activity types" database with a **Weight** number; a rollup "sum of points" where points = amount × weight. Needs a new rollup function **sum-product** (or a formula that reads a related row's column). | M                   |
| 10  | **Budget vs actual**                  | Finance dashboard                           | "Budget" database (category, monthly limit) related to "Transactions"; rollup "sum this month" needs **date-scoped rollups** (only rows in the current month)                                                 | M                   |
| 11  | **Page date control (linked filter)** | One "This month ▾" for all widgets          | A Home tab has one period (today/week/month/year/custom); each widget may follow it. Click a bar → filter other widgets: **later**                                                                            | M (cross-filter L)  |
| 12  | **Buttons**                           | Quick add "Expense", "Start timer"          | Widget that adds a row with preset values or starts a timer                                                                                                                                                   | S                   |
| 13  | **Template system**                   | Gallery, preview, edit, import/export       | See D                                                                                                                                                                                                         | L                   |
| 14  | **Daily Highlight engine**            | Owner H6, Q7                                | Picks N items a day from chosen sources; settings page; share as image/text/PDF/link-free card                                                                                                                | M                   |
| 15  | **Top 3 as a block**                  | Owner H4                                    | Tap = tick (stays), ✕ removes; backed by tasks                                                                                                                                                                | S (exists, wrap it) |
| 16  | **Routine block**                     | Routines inside the Planner                 | Wrap habits as a widget (checks + streak)                                                                                                                                                                     | S                   |

Not needed now: free canvas, maps, gauges, pivot tables, formulas across databases beyond rollups.

## C) The 3 templates (made only from blocks)

### 1. ONE Planner (Today / Week / Year tabs)

Data: **Tasks** db (title, date, done, Top 3 flag, project), **Time blocks** db (date, start, minutes, task link), **Time log** db, habits.

- _Today tab:_ Top 3 (S/M) · Time blocks day strip with slider (L) · Timer button (S) · Routines checklist (M) · KPI "Focused today 3h 20m" (S) · Tasks due today view (M).
- _Week tab:_ Calendar week view of time blocks (Wide) · Bar chart hours per day (M) · KPI tasks done this week vs last (S) · Routine heatmap (M).
- _Year tab:_ Year calendar (existing CalendarYear) of done tasks (Wide) · Line chart hours per month (M) · Goals board view (M).

### 2. Learning tracker (e.g. "Learning AI")

Data: **Activity types** db (Reading book = 50 pts, Course hour = 10, Card mastered = 0.5, Project = 30), **Learning log** db (date, activity type, amount, topic, minutes), **Topics** db (goal topics, status, target points), cards from the app.

- KPI hours this month (S) · KPI cards mastered (S, from cards) · Progress ring "Points vs goal" (S, weighted rollup) · Bar points per topic (M) · Line hours per week (M) · Topics board view Not started/Learning/Done (L) · Timer button tagged "Learning" (S).

### 3. Finance log + budget

Data: **Transactions** db (title, date, amount, type income/expense, category relation), **Categories / Budget** db (name, monthly limit, rollup spent this month, formula left = limit − spent, formula % used).

- Page date control "This month" · KPI income, expenses, net (3× S) · Progress ring total spent vs total budget (S) · Bar budget vs actual per category (Wide, two series) · Donut spending by category (M) · Line net per month, 12 months (M) · Recent transactions view (M) · Button "+ Expense" (S).

## D) Template system UX

- **Gallery:** Home → "+ Add tab" or Settings → Templates. Cards with a picture, name, one-line "what it does", tags (Plan, Learn, Money). Sections: Built-in, Mine, Imported.
- **Preview:** a live look-through filled with sample rows (marked "Sample"), swipe through tabs. Nothing saved yet.
- **Edit before apply:** a short checklist: name, currency, which widgets to keep, link to an _existing_ database instead of making a new one (e.g. your current Tasks), include sample data yes/no.
- **Apply:** creates the databases + views + Home tab; one Undo.
- **Save as template:** from any Home tab: "Save as template", choose include data or structure only.
- **Start from a preset:** duplicate a built-in, then edit.
- **Import/export:** one `.lntemplate.json` file: version number, databases (columns, views, charts), widgets with grid places, optional rows. IDs remapped on import; checked against a schema; size cap (e.g. 2 MB); no code, only data (safe).
- **Sharing:** export file now (AirDrop, email). Public link gallery only after sync and owner OK.

## E) "Summary widgets", simply

A summary widget is a small card that **squeezes many rows into one answer** so you don't open the list.

- 40 expense rows → card says **"₹12,400 spent in November"**.
- 120 learning logs → ring says **"68% of this month's goal"**.
- Time log → bar chart **"Mon 2h, Tue 3h, Wed 1h"**.
- Budget → **"Food: ₹3,000 of ₹4,000"**.
  Tap it to see the rows behind it. Same idea as a phone's battery widget: one glance, details on tap.

## F) Owner questions

1. **Grid style?** (a) fixed sizes on a simple grid (like iPhone widgets) (b) free canvas (place anywhere). **Pick (a)**: always neat, works on phone too.
2. **Where do planner/timer data live?** (a) move them into normal databases ("Tasks", "Time log") so charts can read them (b) keep separate tables. **Pick (a)**: one system; users can add columns.
3. **Weights:** (a) one "Activity types" list with a points number (Book = 50, Card = 0.5) (b) weight typed on each log row. **Pick (a)**: change once, everything updates.
4. **Page date control:** (a) one "This month ▾" per tab that all widgets follow (b) each widget has its own period (c) both, widget can opt out. **Pick (c)**.
5. **Click a chart to filter others** (cross-filter) now or later? **Pick later**: nice but costly.
6. **Time-block slider steps:** (a) 5 min (b) 15 min (c) 5 min below 1 h, 15 min above. **Pick (c)**: 10 min to 10 h feels smooth.
7. **Applying a template when you already have a "Tasks" database:** (a) always make new (b) ask "use existing or new?" **Pick (b)**.
8. **Template file:** (a) structure only (b) structure + optional sample/your data. **Pick (b)**, data off by default for privacy.
9. **Daily Highlight sharing formats:** (a) image card (b) plain text (c) PDF (d) all three. **Pick (a)+(b)** now, PDF later: images share best.
10. **Daily Highlight defaults:** sources = cards + notebooks + books, 3 items, 8:00 am, no repeats for 30 days. **Pick these**, all editable in settings.
11. **Build order:** (a) grid + KPI/chart/view widgets first, then templates (b) Planner first as a fixed screen. **Pick (a)**: the templates then come almost free.
