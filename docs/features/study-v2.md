# Study tabs v2 (slice 15, flag `study.v2`)

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

In plain words: everything for studying a notebook lives in one calm set of tabs that all look the same. A card is the same thing everywhere: a card you make in a page uses the Review editor and its 8 card types. "All cards" moves into the Review space, so there is one place for "what should I study". "My summary" lives only in the Summary tab. The Prompt library and AI workflows become one library. Slides and Memory helpers are Professional, off until unlocked.

Sources: audit batch 4 (S1 to S8, S10, A14, A15, A18, A19); build plan 2.3 row 4 and 3.4 row 15; Running principle 2 (this spec replaces a mock-up). Card editor and its 8 types come from the approved Review mock-up ([review-v2] slice 8).

## How it works

- **One tab header** on every study tab (Cards, Revise, Summary, Review, Slides): title, count, Filter ▾, Sort ▾, "⋯". Uses the tab row and card / ▾ frame.
- **Cards in a page:** "/card" and "Make card" open the Review card editor (Sheet, docked right on iPad and PC, bottom on phone). Beginner sees Question / answer and Blanks; Professional unlocks the other 6 types. Old card and blank blocks open unchanged (data shape kept).
- **Cards tab:** list with status chip (New, Due, Learned, Paused); tap opens the editor; Practise at the top.
- **Review space home** gains the old Study hub (Notes, Summary, Review segments) and daily highlights; the "All cards" screen opens as the Review space's Browse.
- **Summary tab** is the only place for "In your own words" (the Revise "My summary" box becomes a link "Edit in Summary").
- **One library** for prompts, skills and AI workflows: Pick on top (visual tiles, favourites ★), Manage below (edit, versions, duplicate, delete with Undo).

## When I do X → Y (each line = one e2e test)

Beginner:

- **ST1** When I open a notebook's Cards tab → I see its cards, each with a status chip; the header shows the count.
- **ST2** When I tap a card in the Cards tab → the same card editor as in Review opens beside the list (Sheet, 376 px).
- **ST3** When I select text and tap "Make card" → a Question / answer card appears under the text with the selection as the answer; the new block glows once and a toast offers Undo.
- **ST4** When I tap Undo on that toast → the card is gone and the text is as before.
- **ST5** When I type "/card" → the card editor opens with Question / answer picked; Beginner sees only Question / answer and Blanks.
- **ST6** When I open an old page with a card block or blanks → it shows and reviews exactly as before.
- **ST7** When I tap "Add to Summary" → the text is linked into the page Summary and the Summary tab count glows once (700 ms).
- **ST8** When I open the Summary tab → I see summary lines and "In your own words"; typing there saves with the usual "Saved" feedback.
- **ST9** When I open the Revise tab → I see marks grouped by label and Practise; "My summary" shows as one line "Edit in Summary" that opens the Summary tab at that field.
- **ST10** When I open the page Review tab → I see Due, New and Learned counts and one "Practise" button.
- **ST11** When I open the Review space → the Study hub segments (Notes, Summary, Review) and today's highlights are there; the sidebar "All cards" opens Review › Browse.
- **ST12** When I open the Prompt library → I see 6 starter prompts as tiles and "Run"; nothing else.
- **ST13** When I run a prompt with AI off → I get the free path: "Copy prompt", then a box to paste the answer back, then "Add to page" with Undo.
- **ST14** When AI would spend money for the first time → "Before you use AI" appears once, with the cost limit shown; Cancel changes nothing.
- **ST15** When I open Capture → I can paste a link and save it; YouTube links keep their start time.
- **ST16** When I tap Today in the sidebar → today's journal page opens (as today).
- **ST17** When a study list is empty → the Empty state says what goes here, with one button (Cards: "Make your first card").

Professional (each with its unlock switch; ids marked "new" are proposed for `docs/mockups/pro-features.md`):

- **ST18** (`study.cardTypes`, new) When I open the card editor → all 8 Review card types are offered.
- **ST19** (`study.cardList`, new) When I type "/card list" → the Card list block is inserted (count, Review, show all).
- **ST20** (`rev.browse`) When I use Filter ▾ in the Cards tab → status, label and tag filters apply, an active-filter chip shows with ✕.
- **ST21** (`study.savedFilters`, new) When I tap "Save filter" → it appears as a chip ("Hard ones") in the header; ✕ removes it with Undo.
- **ST22** (`rev.sessionExtras`) When I long-press a card in the list → Pause / Resume and Open note are in the Context menu strip.
- **ST23** (`review.reviseLabels`) When I tap "Labels" in Revise → I can rename and recolour labels (max 24); counts by label show.
- **ST24** (`study.summaryScopes`, new) When I switch the Summary tab to Notebook or All notes → the notebook or app summary shows, with Export.
- **ST25** (`study.slides`, new; off until unlocked) When the Slides tab is unlocked → I can present full screen, swipe, pick a theme, and save.
- **ST26** (`study.memoryHelpers`, new; off until unlocked) When unlocked → Memory helpers (Major system, Acronym builder) open from "⋯".
- **ST27** (`ai.prompts`) When I open the library → all prompts, the editor with versions and restore, skills with preview (keep / drop points), and the AI mode workflows are one list.
- **ST28** (`ai.capture`) When I open Capture → the bookmarklet, the iOS Shortcut recipe and "Notes from your own AI" are there.
- **ST29** (`study.anki`, new) When I open Cards "⋯" → Anki import and export are there (same files as Save & restore).

## Shared parts used (plan 3.2 row 0g)

Tab row, card / ▾ frame (304 / 376 px), Sheet, Tag picker, Context menu strip, Command list ("/" menu), Empty state, Toast queue, Dialog set, Drag with drop-line (card list order), Arrange sheet ("+" on the page tab row).

## Sizes, spacing, motion

- Tab header 52 px tall, 16 px side padding; title 17 px semibold, count 13 px muted pill.
- Card rows 56 px min, 12 px gap, radius 14 px tonal well; status chip 22 px.
- Library tiles 160 × 112 px, 12 px gap, picture on top, name below; selected = accent tint + 1.5 px ring.
- Motion from the design study: cards open 200 ms cubic-bezier(.2,.8,.2,1), close 130 ms; glow 700 ms; new tile pops .93 → 1 in 280 ms spring; reduced motion = instant.

## States

- Empty: each tab has its Empty state (ST17).
- Error: a card that fails to save keeps the editor open with "Not saved yet · Try again".
- Offline: everything works; AI runs show "Offline: use the free path" (ST13).
- Phone: the Sheet docks at the bottom (max 90% height); tab row scrolls with a thin track; tiles 2 per row.
- Dark: tokens only; label colours keep 3:1 against the surface.
- Locked page: its cards stay out of lists and Review (as [lock.md](lock.md)).

## Nothing lost

| Today's feature                                                | Where today (`src/`)                                                             | New home                             |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------ |
| Card block (Q/A)                                               | `editor/schema.tsx:93-109`                                                       | same block, Review editor (ST5, ST6) |
| Card list block (count, Review, show all)                      | `editor/schema.tsx:112`, `recall/CardListView.tsx:17-88`                         | Professional ST19                    |
| Blanks                                                         | `editor/schema.tsx:126-133`, `editor/blankActions.ts`                            | Blanks type (ST5)                    |
| Cards tab: search, notebook filter, sort, Practise             | `recall/CardsTab.tsx:27-158`                                                     | tab header (ST1, ST20)               |
| Sort remembered                                                | `recall/CardsTab.tsx:51`                                                         | unchanged                            |
| All cards screen                                               | `recall/AllCardsScreen.tsx:14-74`                                                | Review › Browse (ST11)               |
| Study hub segments, overflow tab menu                          | `app/summary/PageTabs.tsx:16-86`                                                 | Review space home (ST11)             |
| Daily highlights                                               | `recall/highlightReview.ts:18-44`                                                | Review space home                    |
| Review home (due line, per notebook)                           | `notebooks/ReviewHome.tsx:15`                                                    | unchanged, joined with the hub       |
| Revise: lessons, practice, marks by label                      | `revise/ReviseTab.tsx:23-144`                                                    | Revise tab (ST9)                     |
| Mark labels, 24 limit, edit                                    | `revise/reviseMarks.ts:14-80`                                                    | ST23                                 |
| Revise "My summary"                                            | `revise/ReviseTab.tsx:175-190`                                                   | Summary tab only, link (ST9)         |
| Summary page / notebook / app; open from line                  | `app/summary/SummaryView.tsx:30-133`, `AppSummary.tsx:10`                        | ST8, ST24                            |
| Add to Summary (selection bar, actions)                        | `editor/addToSummary.ts:23`, `SelectionToolbar.tsx:122`, `summaryActions.tsx:10` | ST7                                  |
| Page Review tab counts, Practise                               | `app/summary/PageTabs.tsx:98-125`                                                | ST10                                 |
| Slides tab: grid, count, save, empty, failed                   | `pages/tabs/SlidesTab.tsx:60-188`                                                | ST25                                 |
| Memory helpers (Major, Acronym)                                | `memory/MemoryHelpers.tsx:15-157`                                                | ST26                                 |
| Prompt list, seeds once                                        | `prompts/PromptsDialog.tsx:31-110`, `libraryDb.ts:286`                           | library (ST12, ST27)                 |
| Prompt editor, versions, restore                               | `prompts/PromptEdit.tsx:26,250-271`                                              | ST27                                 |
| Run prompt (privacy step, copy, add, rate, Undo)               | `prompts/RunPrompt.tsx:50,169-184`                                               | ST13, ST27                           |
| Run skill, skill preview                                       | `prompts/RunSkill.tsx:47`, `SkillPreview.tsx:63`                                 | ST27                                 |
| Free paste-in path                                             | `prompts/PasteIn.tsx:19`                                                         | ST13                                 |
| Prompt picker button, entry                                    | `prompts/PromptPickerButton.tsx`, `PromptsEntry.tsx`                             | library entry points                 |
| AI page buttons, consent, preview, card approval, Undo         | `ai/AiActions.tsx:41-427`                                                        | ST14 (unchanged flow)                |
| Capture: URL, YouTube, bookmarklet, iOS Shortcut, own-AI notes | `capture/CaptureScreen.tsx:15-184`, `NotesPanel.tsx:27`                          | ST15, ST28                           |
| Journal Today button                                           | `notebooks/Sidebar.tsx:390-399`                                                  | ST16                                 |
| Anki import / export                                           | `share/DataScreen.tsx:264,306,628-636`                                           | Save & restore + Cards ⋯ (ST29)      |

## Won't do

- New study modes (parked), summary layers (parked), collaboration.
- AI that skips the consent or the cost limit; any paid call while the limit is ₹0.
- Changing the stored shape of card or blank blocks.

## Sub-slices (one commit each)

1. **15a tab header + Cards tab** (S2): `src/recall/CardsTab.tsx`, `src/pages/tabs/StudyTabHeader.tsx` (new). ST1, ST2, ST17, ST20 to ST22.
2. **15b cards in a page** (S1): `src/editor/schema.tsx` (render only), `src/recall/CardListView.tsx`, `src/editor/makeCard.ts`. ST3 to ST6, ST18, ST19.
3. **15c Summary + Revise** (S3, S4): `src/app/summary/SummaryView.tsx`, `AppSummary.tsx`, `src/revise/ReviseTab.tsx`, `src/editor/addToSummary.ts`. ST7 to ST9, ST23, ST24.
4. **15d page Review + Review home** (S5, A14, A15): `src/app/summary/PageTabs.tsx`, `src/notebooks/ReviewHome.tsx`, `src/recall/AllCardsScreen.tsx`. ST10, ST11.
5. **15e Slides + Memory helpers** (S6, S7): `src/pages/tabs/SlidesTab.tsx`, `src/memory/MemoryHelpers.tsx`. ST25, ST26.
6. **15f library + AI buttons** (S8, S10): `src/prompts/*`, `src/ai/AiActions.tsx`. ST12 to ST14, ST27.
7. **15g Capture, journal, Anki entry** (A18, A19, S9): `src/capture/*`, `src/notebooks/Sidebar.tsx` (Today only). ST15, ST16, ST28, ST29.

## Tests

- Unit: card type mapping old block → editor type; summary single field; library merge (prompts + workflows, no duplicates).
- e2e (Chromium + `ipad-webkit`): ST1 to ST29; flag off = today.
- Screenshots: each tab Beginner / Professional × light / dark × iPad landscape / portrait / phone / PC.
- Nothing-lost probe on every row above.

## Owner iPad check (3 steps)

1. Turn on `study.v2`; in a page select a sentence and tap "Make card": the card appears with the Review editor; Undo removes it.
2. Open the notebook's Cards, Summary and Review tabs: each has the same header; "My summary" is only in Summary.
3. Open the Review space: the Study hub and "All cards" (Browse) are there; run a prompt with AI off and paste an answer back.

## Decisions to review

- Seven new unlock ids proposed: `study.cardTypes`, `study.cardList`, `study.savedFilters`, `study.summaryScopes`, `study.slides`, `study.memoryHelpers`, `study.anki`.
- Card list block becomes Professional (it was for everyone); existing card list blocks in notes still show for Beginners (no feature hidden from old pages).
- Anki stays in Save & restore and is added to Cards ⋯ in Professional (two doors, one feature) because Cards is where people look for it.
- Capture's bookmarklet and iOS Shortcut become Professional (`ai.capture`); pasting a link stays for everyone.
- No new visual pattern: all screens use existing parts.
