# Owner feedback on the mock-ups (11 Nov 2026, evening)

## Toolbar (v2/v3)

- T1: tool option bars (pill, Insert, picture bar…) cover the page and cause mis-taps. Every bar gets a **minimise** control (collapses to a small chevron chip at the right edge, tap to bring back). Default position must not cover the top of the page.
- T2: All tools › Draw repeats Pen/Pencil/Highlighter. Remove the repeats and keep only things not on the main bar (shapes, ruler, tape, magnifier…). Rename the tab. Remove "Drawing" from Insert.
- T3: remove Print (Export covers it).
- T4: no feature duplicated between the main bar/pills and All tools; keep All tools minimal.
- T5/T14: the Pen ▾ advanced features (from the real app) are missing in v3. Bring them back, organised by the design principles (like Eraser/Text).
- T6: "Use for new boxes" becomes a switch.
- T7 (bug): a new text box wraps letter by letter. It must keep one line until near the right margin, then wrap.
- T8: add a Mic (dictation) button to the selection bar.
- T9: the box style bar looks out of place. Make it premium; Beginner = minimal box options, Professional = full.
- T10: Beginner was friendlier in the earlier version. Keep Beginner minimal; put the complexity in Professional.
- T11: the "Box style" button doesn't show its purpose. Show the current style and a clear label/preview.
- T12: border/corner/fill options must preview live on the box.
- T13: the options bar must be draggable and snap to edges (left/right/bottom) as in the real app.

## Book annotations / reader

- A1: Professional gets advanced annotation features (edit options etc.), imported from the app and researched, following the principles.
- A2: tap counts (2 word, 3 line, 4 paragraph, 5 page) only while a tool is selected. Plus a reader **lock** with modes (no selection at all / selection only through a tool / full lock, while zoom and view still work). The owner wants research + questions first.
- A3: add the Eraser to the reader tools.
- A4: highlight must mark the text itself (real highlight), not an overlay.
- A5: add Notes as a tab in the reader's left panel (with Pages, Outline, Audio) for uniformity.
- A6: a sticky note moves only after a long hold, then drags anywhere with auto-scroll.
- A7: explain "Finger: draws" (finger draws vs scrolls).

## A2: reader lock research (11 Nov)

GoodNotes has a Read Only Mode (a toggle that hides tools) plus object locking. No app offers graded lock levels, so this would set us apart. Apple editors: 2 taps = word, 3 = paragraph.
Proposal: a "Reading lock" padlock in the reader top bar with 3 modes:

1. Select with a tool (default): tap counts only while a tool is active.
2. No selection.
3. Full lock: no edits/selection/drawing; zoom, scroll, page turns, search and links still work.
   Unlock with one tap. The mode is remembered per book, with a calm popover, icon states and a subtle shake on an ignored tap.
   Owner questions (picks): 3 modes; default "Select with a tool"; single-tap unlock; remembered per book; in Full lock a highlight still opens its note read-only.

### A2 owner answer (11 Nov)

Four modes:

1. **Everything works** (default): every tool and feature.
2. **Reading mode**: like Kindle; text can't be selected for editing, but highlight, notes, bookmarks and basic reader features work.
3. **View only**: no edits or highlights; only zoom, scroll, page turns, search and basic viewing.
4. **Frozen**: nothing at all responds (a page left on display).
   Unlock with a long press, and a Netflix-style ring fills around the padlock while you hold. The mode is remembered per book.

## Home (owner, 11–12 Nov)

- H1: Home = a personal organisation hub and dashboard for daily life:
  - time tracking, tasks and important tasks, routines;
  - progress dashboard (how learning AI is going, what's pending, plans);
  - occasional finance records.
    Purpose-first: fewer things at once, more useful.
- H2: a fully customisable dashboard builder:
  - add/remove/drag sections and tabs (e.g. a "Morning" tab);
  - templates: create your own, multiple built-ins, import/export, preview + edit before applying, start a new template from old presets.
- H3: time blocks with a duration slider (10 min … 10 h).
- H4: Top 3: tapping ticks (done) and stays; only ✕ removes it.
- H5: a smaller Beginner view.
- H6: Daily Highlight, customisable like Apple Photos "Memories": a full settings section choosing sources (knowledge bank, notebooks, books, cards…), frequency, etc.
- H7: Continue as a sideways row ✓. Tasks/Plan/Routines/Reports tabs ✓.

### Home answers (owner, 12 Nov)

- Q1 summary widgets: unclear; explained again (see chat).
- Q2 time tracking: BOTH a live timer and logging afterwards.
- Q3 progress: all measures (hours, goal topics, cards mastered), with user-set WEIGHTS per activity (e.g. reading one book counts more than 100 flashcards).
- Q4 finance: built ENTIRELY from existing app tools (databases, views, formulas, charts…) to show what the app can do:
  - an expense/income log with categories and a monthly total;
  - a Notion-style budget dashboard;
  - replicable by users, with easy settings.
- Q5 personal only (no Work/Life split). Work hours are logged as time only; no work data.
- Q6 templates:
  - ONE planner covering daily/weekly/yearly (routines inside it, no separate routine tab);
  - a Learning tracker;
  - a Finance log/dashboard.
  - All are built with the app's own tools; users must be able to build the same UI themselves.
- Q6b list what the app can't yet build for these templates, and add those building blocks.
- Q7 Daily Highlight with a full settings page ✓, plus sharing in multiple formats.
- Research: Notion dashboards, Tableau and pro dashboard makers; build Home as a user-buildable dashboard.

## Notebooks (owner, 12 Nov) + uniformity

- U1: ALL mock-ups must share one app shell (rail, top bar, bottom bars, icons, panels) with no contradictions between mocks. One shared shell spec.
- U2: rail icons: Home and Light are good. Redesign Recall/Review, Library and Notebook icons to be meaningful.
- N1: restore the Notion-like sidebar that opens all notebooks, plus the small side bar with Pages · Outline · (Audio) tabs.
  - Pages: the current page is highlighted and centred, scroll, tap to open, drag to reorder (Acrobat-like organise).
  - Outline: the whole notebook outline centred on where you are.
  - Audio: remove it; replace with a flexible "Resources" tab (add images, references, links, anything to reuse).
- N2: a one-click "Collapse all notebooks" toggle (existed before).
- N3: notebook settings: pick the notebook from a list/toggle at the top, then edit its settings in one shared panel (not a separate page per book). Apply this pattern in ALL mocks where sensible.
- N4: the More sheet must open at a fixed place/height (full height), scrolling inside, not jumping with content size.
- N5: covers: many more cover styles (patterns, gradients, illustrated), plus a custom photo upload with the right proportions shown and a crop.
- N6: never remove existing features; the Notebooks tab looked blank-ish. Research everything existing first, then improve it.

### Home dashboard answers (owner, 12 Nov)

- Summary widgets: numbers + streaks.
- Q1: fixed sizes by default, but resizable, and different per device (e.g. bigger on iPad than iPhone).
- Q2: move the planner/timer data into normal databases ✓.
- Q3: an Activity-types list with points ✓. Plus each dashboard chooses WHICH data sources count (e.g. pages read count, cards reviewed don't), Notion-like.
- Q5, Q6: unclear; explained again in chat.
- Q7: ask "use existing or new" ✓.
- Q8: template export may include data freely (the user decides). Export formats incl. PDF now.
- Q9: highlight sharing: image card + text + PDF now.
- Q10: highlight defaults as proposed + more default options.
- Q11: build order: FIRST a mock-up of the templates themselves (Planner, Learning tracker, Finance) for approval, THEN the building tools so users can make them.

## Notebooks v2 review + shell decisions (owner, 12 Nov): APPROVED with these notes

- Rail icons: Home the same; Library = A (books on a shelf); Notebooks = B (ruled notebook); Review = B (repeat arrows around a card); the others A.
- On a page inside a notebook, HIDE the notebook tab row (More · Notes · Summary · Cards · Revise · Mind map): that space belongs to the editing tools. A small arrow can bring it back, plus an on/off option in Settings.
- Pages tab: full organise customisation (add, delete, reorder, duplicate, extract — like the PDF organiser).
- The left panel/sidebar is a bit bigger (easier to tap).
- Notebook search gets an ✕ clear button (apply to every search field).
- "Share layers": explained (exports the notebook's add-on Layers as a file a friend can import).
- The More sheet docked right at full height (full screen on phone): OK for now; REMIND the owner to test it on the iPad.
- Phone: bottom tab bar, full width ✓.
- Settings: keep the 3 experience levels (incl. Standard) inside Settings only. The VIEW switch has only 2: Beginner / Professional, shown as a toggle at the top of EVERY space. Users can later re-map these two toggles to their own custom layouts; the defaults are Beginner and Professional.
- Execute only after all planning is done.
