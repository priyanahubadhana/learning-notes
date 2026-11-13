# Review v2: study screen and the More sheet (slice 8, flag `review.v2`)

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

Sources: mock `docs/mockups/review-mock.html` (cited as RM line; approved "okay to pass", 12 Nov), PENDING "Review mock: owner note" and 251 (picks), build-master-plan 3.3 row 8, `docs/design/shell-spec.md` section 6 (More sheet, N3 pick on top), `docs/features/shared-parts.md`, `docs/mockups/pro-features.md` (Review, 11 ids). Today's logic stays in `review-and-scheduling.md`, `recall-cards.md`, `study-tracker.md`, `anki.md`. This file only adds the new screen.

## Purpose

### Plain-words summary

Review is where you practise your cards. Today it is a long page with decks, a card list and settings spread around. The new Review is calm and small.

Beginner sees one thing: "Today, 12 cards are ready" and a big **Start review** button. Tap it, see the question, tap **Show answer**, then say how well you knew it: Again, Hard, Good or Easy. Each button tells you when the card will come back.

Professional adds a **More** button. It opens one sheet with everything else: Decks, Browse, Editor, Make cards, Stats, Scheduler and Anki. You pick the deck at the top of the sheet and edit below it.

Nothing is removed. Every feature of today's Review has a new home (see Nothing lost). The "Again comes back after..." row in More › Scheduler is fixed so its picture and its words never overlap.

### Flag

`review.v2`. OFF = today's Review exactly (`ReviewScreen.tsx`, `notebooks/ReviewHome.tsx`, `recall/ReviewHome.tsx`, `AllCardsScreen.tsx`). ON = this spec. Cards, decks, review log and settings are the same data either way, so switching the flag back loses nothing. No Dexie version is needed (see D1, D2).

### Unlock switches used (exact ids from `docs/mockups/pro-features.md`)

| id                  | Name                            | What it unlocks here                                                     |
| ------------------- | ------------------------------- | ------------------------------------------------------------------------ |
| `rev.moreSheet`     | Review More sheet               | The **More** button and the sheet shell (all tabs below need it as well) |
| `rev.sessionExtras` | Open note, Suspend, Undo rating | The three buttons under a card during a session                          |
| `rev.keyHints`      | Keyboard hints                  | The one-line key teacher under the card                                  |
| `rev.decks`         | Decks                           | More › Decks tab, the deck chips on the home, deck picker                |
| `rev.browse`        | Card browser                    | More › Browse tab                                                        |
| `rev.editor`        | Card editor                     | More › Editor tab (the 8 card types)                                     |
| `rev.makeCards`     | Make cards                      | More › Make cards tab                                                    |
| `rev.stats`         | Stats                           | More › Stats tab (counts, answers per day, forecast, study tracker)      |
| `rev.scheduler`     | Scheduler                       | More › Scheduler tab                                                     |
| `rev.anki`          | Anki import                     | More › Anki tab (import and export)                                      |
| `rev.coverage`      | Coverage                        | Not built (mock-only page, owner pick). See D5 and Won't do              |

Also used, owned by Settings: `review.targetMemory`, `review.nestedCard`, `review.reviseLabels` (they stay in Settings › Review, same setting ids as the Scheduler tab; see D4).

## How it works

### Screen map

```
Rail (Review, due badge) > top bar (crumbs "Review", Undo / Redo SH-05, view toggle SH-06)
 Home view
  Beginner : hero [Today / big number / "cards are ready" / Start review]  (RM 4577)
  Professional: row [More] [chips: All cards . deck chips . Got wrong (n)]  (RM 4599)
               hero [scope name / number / New . Learning . Due / Start review / Practice anyway]
               line "Limits today: n new left . n reviews left. Paused: n."
 Session view (replaces Home; Close x top left; "n left")
  card (flip 3D) > Show answer  >  Again Hard Good Easy (+ next gap under each)
  Professional + rev.sessionExtras: [Open note] [Suspend] [Undo rating]
  Professional + rev.keyHints: key line
 Waiting view : "n cards coming back soon" + countdown
 Done view    : "All done / You reviewed n cards" + Practice anyway
 More sheet (SH-09, 440, right edge; phone full width)
  header > picker row (Decks tab only) > tabs > body > footer
```

The Review space is still one route family: `#/review`, `#/review/deck/<id>`, `#/review/wrong`, `#/review/notebook/<id>`, `#/review/page/<id>?sub=1`, `#/review/custom` (`app/router.ts:83-91, 165-189`). They keep working with the flag on or off.

### Session rules (kept from today, `review-and-scheduling.md`)

- Queue: due cards most overdue first, then new cards, limited by new per day, max reviews per day and the study-day start (`getReviewQueue`, `reviewService.ts:241`).
- A card rated Again waits hidden for "Again comes back after" minutes, then returns first (`reviewSession.ts:52`). In Practice it returns 3 cards later.
- Practice anyway: up to 50 cards, soonest due or shuffled; logged as `cram`, schedule unchanged (`reviewService.ts:384, 409`).
- Rating writes one append-only `ReviewLog` and updates the card in one transaction (`rateCard`, `reviewService.ts:545`).

### New in v2 (added by the approved mock)

| New thing                                       | Mock id | Where it lives                                             |
| ----------------------------------------------- | ------- | ---------------------------------------------------------- |
| Undo last rating                                | S13     | Session extras button + Ctrl/Cmd+Z while in a session (D3) |
| Forecast: cards due in the next 7 days          | T04     | More › Stats                                               |
| Card editor inside Review                       | T05     | More › Editor; edits the same Card block as the note (D2)  |
| True / False, Reverse, Image occlusion, Drawing | K06-K09 | Editor type buttons and the card face (D1)                 |
| Pick a deck on top of the More sheet            | N3      | More › Decks picker row (shell-spec section 6)             |
| Keyboard hint line                              | T06     | `rev.keyHints`                                             |

### The 8 card types (kept and completed)

The mock's Editor offers eight types (RM 5166-5175, names RM 4497-4506). Four exist today; four are new. Highlight cards are Cloze cards made by a tool, not a ninth type.

| #   | Type (mock key)          | Mock id | In the app today (file:line)                                                                                                                                                                               | Build                              |
| --- | ------------------------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| 1   | Q&A (`qa`)               | K01     | Card block with nested answer: `cardService.ts:18` (`CARD_BLOCK_TYPE`), `:51` (`cardParts`, part `main`), `:124` (`hasQuestion`); make: `editor/cardActions.tsx:35` (`makeCard`), `:102` (`cardSlashItem`) | keep                               |
| 2   | Cloze (`cloze`)          | K02     | One card per blank: `cardService.ts:51` (`cardParts`), `editor/mapping.ts:242` (`blankIds`), `editor/blankActions.ts:54` (`toggleBlank`), `:25` (`snapToWords`), `cardService.ts:93` (`maskedText`)        | keep                               |
| 3   | Picture (`picture`)      | K05     | Picture in the answer, shown after Show answer: `ReviewScreen.tsx:496` (`AnswerPicture`), `reviewService.ts:484` (`CardFace.answer[].image`), `recall-cards.md` (E2)                                       | keep                               |
| 4   | Vocabulary (`vocab`)     | K04     | Word + sentence: `recall/vocabulary.ts:15` (`vocabWord`), `:24` (`vocabContext`), `:33` (`addVocabulary`)                                                                                                  | keep                               |
| 5   | True / False (`tf`)      | K06     | not in the app                                                                                                                                                                                             | new, `cardType: 'tf'` (D1)         |
| 6   | Reverse (`reverse`)      | K07     | not in the app                                                                                                                                                                                             | new, two cards from one block (D1) |
| 7   | Image occlusion (`occl`) | K08     | not in the app                                                                                                                                                                                             | new, one card per mask (D1)        |
| 8   | Drawing (`draw`)         | K09     | not in the app (`recall-cards.md`: ink in answers "not yet", G0)                                                                                                                                           | new, last in the order (D1)        |

Also kept, as ways to MAKE cards (not types): highlight cards with the key word hidden `cardFromAnnotation.ts:28` (`keyTerms`), `:59` (`clozeRuns`), `:121` (`makeCardsFromAnnotations`), `:158` (`undoMakeCards`); Daily highlights `highlightReview.ts:44` (`pickDaily`).

Rule: all 8 types appear in the Editor type row (one line, scrolls sideways with the thin track, SP-03 style). The type name shows as a small pill on the card face (RM 1910). Every type is reviewed with the same four buttons and the same scheduler.

## Sizes, spacing, motion (from the mock)

| Thing                 | Value                                                                                                                                                                                | Mock line    |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| More sheet            | 440 wide, 12 px from top, bottom, right; phone full width from 8 px below the top; position never depends on content (shell-spec 6)                                                  | RM 66, 4796  |
| Hit area              | 44 px everywhere; chips are 36 high with a 4 px extender above and below                                                                                                             | RM 1603-1612 |
| Chip                  | 36 high, 14 px side padding, pill, 13.5 / 500; selected = accent-soft + accent text; deck chip has a colour dot                                                                      | RM 1603      |
| Deck picker tile (N3) | min 48 high, 4 / 12 / 4 / 10 padding, radius `--r-md`, 1.5 px border, 13 / 600, max 170 wide, text ellipsis; selected = accent border + accent-soft; sideways scroll with thin track | RM 1721-1760 |
| Hero                  | radius `--r-lg`, surface-1, 1 px line, padding 22 / 18, centred; label 13 muted; big number; button full width                                                                       | RM 1778      |
| Flip card             | min height 290, radius `--r-lg`, padding 18, centred; question 20 / 28 / 600; answer 17 / 25; flip 420 ms ease-out, 3D, perspective 1200                                             | RM 1862-1935 |
| Progress line         | 3 px, accent, width transition `--dur-3`                                                                                                                                             | RM 1855      |
| Rate buttons          | 4 equal columns, gap 6, min height 56, 14 / 600 with a 11.5 muted next gap below; Again red, Good accent border                                                                      | RM 1962-1999 |
| Setting row           | min height 48, gap 10, padding 4 0, hairline between; label column grows with `min-width: 0` (the overlap fix, see Overlap rule)                                                     | RM 2095-2116 |
| Number input          | min height 44, radius `--r-md`, 15 px                                                                                                                                                | RM 2130      |
| Charts                | 84 high bars, 3 px gap, radius 3 3 0 0; forecast bars in ink-soft                                                                                                                    | RM 2223-2240 |
| Level bar             | 10 high, pill, segments New / Learning / Familiar / Mastered                                                                                                                         | RM 2212      |
| Phone breakpoint      | 640 (shell); no other                                                                                                                                                                | RM 1771      |
| Motion                | 120 / 180 / 240 ms ease-out; reduced motion makes flip and bars instant                                                                                                              | shell-spec 8 |

### Overlap rule for "Again comes back after..." (owner condition, PENDING 262-265)

The row in More › Scheduler (RM 5087, mock id P04) has a small picture (a clock face that shows the minutes) beside the words and a number box. In the real app the picture and the words overlapped.

- Layout: CSS grid `grid-template-columns: 40px minmax(0, 1fr) auto`, `column-gap: 12px`, `align-items: center`. Picture cell is 40 x 40 and `flex: none`. Words cell has `min-width: 0` and wraps (`overflow-wrap: anywhere`), never `position: absolute` and never negative margin.
- On the 440 sheet and on phone (<= 640) the number box drops under the words when the row is narrower than 360 px (grid areas "pic text" / ". input").
- Same rule for every Scheduler row that has a picture (live preview per row, PENDING "visible feedback").
- A shared test (RV-B33) measures the three bounding boxes: picture, words, number. They must not intersect at widths 320, 390, 440, 820, 1180, with text size 100 / 150 / 200 %, in English, Hindi and Spanish.

## When I do X → Y (each line = one e2e test)

Flag `review.v2` ON for all. "Beginner" = default view. Professional lines name their unlock switch; test with the switch ON and OFF (OFF = the control is absent and the rest of the screen is unchanged).

### Home view

| Id     | When I do X                                                                      | Y                                                                                                                                                  |
| ------ | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| RV-B01 | open Review (Beginner) with 12 cards due                                         | I see "Today", the number 12, "cards are ready" and one big **Start review**; no chips, no More, no counts line                                    |
| RV-B02 | open Review with 1 card due                                                      | the label reads "card is ready" (singular)                                                                                                         |
| RV-B03 | open Review with nothing due                                                     | **Start review** is disabled; an empty state (SP-08) says "Nothing to review today" and a **Practice anyway** button shows                         |
| RV-B04 | open Review with no cards at all                                                 | empty state "No cards yet. Make one in a note" with a button that opens Notebooks                                                                  |
| RV-B05 | tap **Start review**                                                             | the session opens on the first card (most overdue first, then new); the sheet and home are gone; "n left" shows                                    |
| RV-B06 | tap **Practice anyway** (Beginner: shown after Done; Pro: also on home)          | up to 50 cards open; a "practising" note shows; ratings do not change the schedule (log row kind `cram`)                                           |
| RV-B07 | switch to Professional, open Review                                              | the **More** button, the chips row, New / Learning / Due counts, Practice anyway and the "Limits today" line appear. The unlocks below still apply |
| RV-B08 | have more than 10 new cards and a limit of 20                                    | the counts line shows "20 new left" minus what was done today; after finishing 3 new cards it shows 17                                             |
| RV-B09 | open `#/review/deck/<id>`, `#/review/wrong`, `#/review/page/<id>?sub=1` directly | each opens the right scope with the right title ("Review . name", "Cards I got wrong"); the old addresses keep working                             |
| RV-B10 | tap the Review icon in the rail                                                  | the rail icon is selected and shows the due count badge; the badge counts the same as `countDue`                                                   |
| RV-B11 | tap the due card on Home (S tile)                                                | Review opens on the same count                                                                                                                     |

### Session

| Id     | When I do X                                                    | Y                                                                                                                                                         |
| ------ | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RV-B12 | press Space or Enter, or tap **Show answer**                   | the card flips in 420 ms; the four buttons replace Show answer, each with its next gap (for example "10 min", "3 d")                                      |
| RV-B13 | press 1, 2, 3 or 4 after the flip                              | rates Again, Hard, Good, Easy; the next card shows face up; "n left" drops by one (not for Again)                                                         |
| RV-B14 | press 1 before the flip                                        | nothing happens                                                                                                                                           |
| RV-B15 | rate a card Again                                              | it leaves the queue, waits the "Again comes back after" minutes, and returns first; the wait view shows "n cards coming back soon" with a mm:ss countdown |
| RV-B16 | rate the last card                                             | the Done view shows "All done" and "You reviewed n cards"                                                                                                 |
| RV-B17 | tap x or press Esc                                             | the session closes and Home shows the new counts; Esc inside a text box does not close                                                                    |
| RV-B18 | rate a card; reload the page                                   | the rating is saved (one log row, card moved); the session restarts from the live queue                                                                   |
| RV-B19 | open a Cloze card                                              | blanks show as hidden words; after the flip the words show in accent colour                                                                               |
| RV-B20 | open a Picture card, a True / False card, a Reverse card       | the face matches the type (picture under the answer, "True or false" statement, answer side shown first for Reverse)                                      |
| RV-B21 | open an Image occlusion card, then flip                        | masks cover the parts; the flip shows them uncovered                                                                                                      |
| RV-B22 | open a Drawing card                                            | the question shows; the flip shows the stored drawing                                                                                                     |
| RV-B23 | open a card that came from a highlight                         | the source line shows "From page"; tapping it opens the annotation                                                                                        |
| RV-B24 | phone (<= 640): rate a card with the on-screen keyboard closed | the rate buttons stay above the tab bar and the safe area; nothing is cut off                                                                             |
| RV-P01 | `rev.sessionExtras` on: tap **Open note**                      | the note opens at the card's block; Review is kept in history so Back returns                                                                             |
| RV-P02 | `rev.sessionExtras` on: tap **Suspend**                        | the card leaves the queue; a toast "Card suspended" with **Undo** shows 6 s; Undo puts it back as the current card                                        |
| RV-P03 | `rev.sessionExtras` on: rate Good, then tap **Undo rating**    | the card returns as current, face down; schedule, counts and "n left" go back; no extra log row counts (D3)                                               |
| RV-P04 | `rev.sessionExtras` on, nothing rated yet                      | **Undo rating** is disabled                                                                                                                               |
| RV-P05 | `rev.keyHints` on                                              | one line shows "Space show . 1 Again . 2 Hard . 3 Good . 4 Easy . Esc close"; off = no line                                                               |

### Home chips and scope (Professional)

| Id     | When I do X                     | Y                                                                                                                     |
| ------ | ------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| RV-P06 | `rev.decks` on: tap a deck chip | the hero changes to that deck's name and counts; Start opens that deck only                                           |
| RV-P07 | tap the **Got wrong** chip      | it shows "(n)" of cards rated Again in the last 7 study days; Start reviews them; there is no Practice for this scope |
| RV-P08 | `rev.decks` off                 | only "All cards" and "Got wrong" chips remain                                                                         |

### More sheet (all need `rev.moreSheet`)

| Id     | When I do X                                          | Y                                                                                                                                                        |
| ------ | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RV-P09 | `rev.moreSheet` on: tap **More**                     | a 440 sheet opens at the right edge (phone: full width) with header "More", subtitle, x, tabs and footer Cancel / Done; the page stays visible beside it |
| RV-P10 | open More with only `rev.moreSheet` on               | no tabs show other than the ones whose own switch is on; if none are on, an empty state says "Turn on more tools in Settings › Professional features"    |
| RV-P11 | switch tabs, scroll, then switch back                | each tab opens at the top; edits keep the scroll place while on the same tab                                                                             |
| RV-P12 | edit a setting, press Cancel / x / Esc / tap outside | a small dialog "Discard changes?" shows when something changed; Discard closes and nothing is saved (draft model)                                        |
| RV-P13 | edit a setting, press **Done**                       | all edits save at once; one toast "Review settings changed . Undo"; Undo restores all of them                                                            |

### Decks tab (`rev.decks`, N3 pick on top)

| Id     | When I do X                                 | Y                                                                                                                                                                                     |
| ------ | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RV-P14 | open More › Decks                           | the picker row shows "All decks" and one tile per deck (colour dot + name); "All decks" is selected; the row scrolls sideways with the thin track                                     |
| RV-P15 | tap a deck tile                             | the tile is selected (accent) and the body below shows that deck: counts, Study, Edit, Delete                                                                                         |
| RV-P16 | with "All decks" selected                   | the body shows the All cards tile, every deck tile with New / Learning / Due, saved searches, and the Paused list                                                                     |
| RV-P17 | tap **Study** on a deck                     | the sheet closes and the session opens for that deck                                                                                                                                  |
| RV-P18 | tap **New deck**                            | a 3-step wizard replaces the picker: Where, Which cards (tags with the Tag picker SP-05, any / all, states, Walk the route), Name and colour; a live match count updates at each step |
| RV-P19 | in the wizard, type a name and tap **Done** | the deck is created, selected in the picker, and a toast "Deck created . Undo" shows                                                                                                  |
| RV-P20 | tap **Delete** on a deck                    | a small dialog in danger red with "You can undo this."; confirming removes the deck, the picker falls back to "All decks"; Undo restores it                                           |
| RV-P21 | tap **Edit** on a deck                      | the wizard opens filled in, on step 1; the same ✕ fields; Cancel leaves it unchanged                                                                                                  |
| RV-P22 | tap **Make deck** on a saved search         | a deck is created from the search; a first-time offer "Turn all saved searches into decks?" shows once                                                                                |
| RV-P23 | tap **Resume** in the Paused list           | the notebook or page leaves the list and its cards return to the queue; toast with Undo                                                                                               |
| RV-P24 | the picker has 30 decks on a phone          | the row stays one line, scrolls sideways, tiles never overlap, the selected tile scrolls into view                                                                                    |

### Browse, Editor, Make cards, Stats, Scheduler, Anki

| Id     | When I do X                                                                                      | Y                                                                                                                                                                        |
| ------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| RV-P25 | `rev.browse` on: open Browse, type in the search                                                 | cards filter as I type (a ✕ clears, SP-04); a notebook filter and a sort (Soonest due / Most failed / Newest) work; the count updates                                    |
| RV-P26 | in Browse, scroll past 50                                                                        | **Show more** loads the next 50                                                                                                                                          |
| RV-P27 | in Browse, tap **Review n due** (or **Practice** when none due)                                  | the sheet closes and the session opens for exactly the listed cards                                                                                                      |
| RV-P28 | in Browse, tap a suspended card's status                                                         | **Unsuspend** shows; tapping it returns the card to the queue                                                                                                            |
| RV-P29 | `rev.editor` on: tap a card in Browse, then Edit                                                 | the Editor opens with its question, answer, type row and tags (SP-05); a live preview shows the face                                                                     |
| RV-P30 | in the Editor, change the type to each of the 8                                                  | the form changes to fit (Cloze: "Hide selected words"; True / False: statement and why; Reverse: answer side first; Occlusion: picture with masks; Drawing: pencil area) |
| RV-P31 | in the Editor, edit text and tap **Done**                                                        | the same Card block in the note changes (open the note to see it); one Undo step; the review log and schedule stay                                                       |
| RV-P32 | in the Editor, turn an empty Card into text (Undo it)                                            | history and schedule are kept (as `recall-cards.md` Edge cases)                                                                                                          |
| RV-P33 | `rev.makeCards` on: open Make cards                                                              | rows: From highlights (bulk, `BulkCardsDialog`), From a page (/card help), Remove empty cards, Daily highlights; each opens the existing tool                            |
| RV-P34 | run Remove empty cards, then tap Undo in the toast                                               | empty Cards are soft-deleted; Undo restores them and their answer lines                                                                                                  |
| RV-P35 | run bulk Make cards from highlights, then Undo                                                   | the new cards are made (key word hidden); Undo removes exactly those                                                                                                     |
| RV-P36 | `rev.stats` on: open Stats                                                                       | I see New / Learning / Due, "Answers per day" for 15 days with the streak and percent correct, "Next 7 days" forecast, and the Study tracker per lesson                  |
| RV-P37 | in Stats with no history                                                                         | each part shows an empty state, no zeros drawn as bars                                                                                                                   |
| RV-P38 | `rev.scheduler` on: open Scheduler                                                               | sections When cards come back / Daily limits / Practice and cards, "Good to know", Reset to defaults, Keyboard list                                                      |
| RV-B33 | open Scheduler at 320, 390, 440, 820, 1180 px, text 100 / 150 / 200 %, English / Hindi / Spanish | in the "Again comes back after..." row the picture, the words and the number box never overlap (bounding boxes do not intersect)                                         |
| RV-P39 | switch Scheduler to **FSRS**                                                                     | Target memory slider (70-97, step 1) shows with "90% is recommended"; Good steps is hidden                                                                               |
| RV-P40 | switch Scheduler to **Fixed steps**                                                              | Good steps text box shows (rising numbers, each longer than the last); Target memory is hidden; a bad list shows an inline error and Done is disabled                    |
| RV-P41 | type 0 or 1441 in "Again comes back after"                                                       | the box shows an inline error; valid range is 1-1440 minutes                                                                                                             |
| RV-P42 | set New cards per day to 5 and Done                                                              | the Home counts line and the next queue use 5; clearing "Maximum reviews per day" means no limit                                                                         |
| RV-P43 | change Study day start to 3:00 and Done                                                          | doneToday uses 3:00; a card done at 02:30 counts for the day before                                                                                                      |
| RV-P44 | change Practice order to Shuffle and Done                                                        | Practice anyway shuffles; "Soonest due" restores the order                                                                                                               |
| RV-P45 | change "Card inside another card" to Ask me / Nest it / Next line                                | /card inside an answer behaves as chosen (same setting `review.nestedCard` as Settings)                                                                                  |
| RV-P46 | change the scheduler and Done                                                                    | each card is rebuilt from the review log and keeps its due date (`readyFor` / `adopt`)                                                                                   |
| RV-P47 | `rev.anki` on: open Anki, choose a .apkg                                                         | a progress bar shows; a summary line follows ("n cards in n pages"); every card arrives New; files over 400 MB are refused with a clear message                          |
| RV-P48 | in Anki, choose a notebook and tap **Export notebook**                                           | an .apkg downloads; blanks become Cloze; every card arrives New                                                                                                          |

### Everywhere

| Id     | When I do X                            | Y                                                                                                                         |
| ------ | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| RV-B25 | change any Review setting              | the changed row glows for 600 ms; a toast with Undo shows (visible feedback rule); Undo and Redo in the top bar also work |
| RV-B26 | tap x on any dialog or sheet           | it closes; focus returns to the button that opened it                                                                     |
| RV-B27 | turn the flag OFF                      | the old Review, Review home and All cards screens show with the same data                                                 |
| RV-B28 | turn dark, light and sepia on          | the card face, the rate buttons, charts and chips keep readable contrast (axe)                                            |
| RV-B29 | iPad portrait: open More               | the sheet docks right at 440 and the session stays visible and tappable beside it                                         |
| RV-B30 | phone: open More                       | the sheet is full width from 8 px below the top; Done and Cancel sit in the footer above the safe area                    |
| RV-B31 | go offline, rate five cards, go online | ratings are saved locally; they sync later; no error toast                                                                |
| RV-B32 | set reduced motion                     | flip, progress and sheet are instant; nothing slides                                                                      |
| RV-B34 | use only the keyboard on PC            | Tab reaches Start, chips, More, tabs, every row; Enter and Space work; focus is always visible                            |
| RV-B35 | use a screen reader on the session     | the card face is read; "Answer shown" is announced after the flip; each rate button reads "Good, comes back in 3 days"    |

## Shared parts used

Names from `docs/features/shared-parts.md` (never private copies):

- Parts: tokens (SP-01), Card ▾ frame (the pop-ups for chip options), Tab row (SP-03, More tabs and the Editor type row), ✕ field (SP-04, all search and name boxes), Tag picker (SP-05, deck tags and card tags), Drag drop-line + ▲▼ (SP-06, not used on this screen except deck order in the picker, see D6), Arrange sheet (SP-07, not used), Empty state (SP-08), Time range bar (SP-10, Stats range, see D7).
- Shell: rail (SH-02, due badge), phone tab bar (SH-03), top bar (SH-04), Undo / Redo (SH-05), view toggle (SH-06), More sheet 440 (SH-09), small dialog (SH-10), pop menu (SH-11), toast (SH-12), layers and breakpoints (SH-14).
- Not used: left panel (SH-08), minimise chip (SH-13), Object bar (SP-09).
- New shared part needed: none. The deck picker row ("pick on top") is built as a variant of the More sheet's N3 picker row that shell-spec section 6 already defines; if the shell slice has not built it, 8b builds it in `design/parts/` and the shell slice reuses it (see D8).

## States

| State                | Behaviour                                                                                                                                                                     |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Empty (no cards)     | RV-B04 empty state with a button to Notebooks                                                                                                                                 |
| Empty (nothing due)  | RV-B03; Practice anyway offered                                                                                                                                               |
| Loading              | queue loads in under 150 ms for 10,000 cards (counts under 300 ms as today); a quiet skeleton hero until then                                                                 |
| Error                | a queue that fails to load shows "Could not load your cards. Try again" with a button; nothing is lost; the error is logged to the console only (today `ReviewScreen.tsx:80`) |
| Offline              | works fully (local data); no banner needed                                                                                                                                    |
| Phone (<= 640)       | tab bar; More sheet full width; rate buttons 4 columns still fit at 320; the Overlap rule wraps the number box under the words                                                |
| iPad portrait        | sidebar closed by default; More docks right at 440                                                                                                                            |
| iPad landscape       | same as PC; the session is centred (max width 640)                                                                                                                            |
| Dark / Light / Sepia | tokens only; no colour is the only signal (Again also says "Again", status has words)                                                                                         |
| Reduced motion       | flip, progress, sheet and glow are instant                                                                                                                                    |
| Reduced transparency | the sheet uses a solid surface                                                                                                                                                |

## Edge cases

- All of `review-and-scheduling.md` Edge cases still apply (damaged FSRS data, purged log entries, a block that is gone, lapses, 36500-day cap, rating a missing card).
- A card shown while its note is edited elsewhere: the face reads from the live block (`getCardFace`); if the block was deleted the card is skipped.
- Undo rating after the card was suspended in another tab: Undo is refused with a toast "That card changed. Nothing was undone."
- Two decks with the same name: allowed; the picker shows both (colour dots differ).
- A deck whose notebook was deleted: it shows 0 and a quiet "Notebook missing" note; Edit lets me fix it (no crash).
- A Reverse card on a block with no answer: only the main card is made (see D1).
- Drawing card on a device without a pencil: the drawing area still accepts finger and mouse.
- A very long question (5,000 characters): the face scrolls inside its card; the buttons stay visible.
- Changing the study-day start while a session is open: takes effect on the next queue.
- Scheduler Good steps like "1, 3, 3" are refused with an inline message (each must be longer than the last; max 20 steps, 1-36500 days).
- Flag turned off in the middle of a session: the session closes cleanly; no card is half-rated.

## Nothing lost (today's Review/recall in `src/` → new place)

| Today (file:line)                                                                                                                                                                                                                                           | New place                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `ReviewScreen.tsx:56` the session screen                                                                                                                                                                                                                    | Session view (same data calls)                                                                                                             |
| `ReviewScreen.tsx:75-86` load queue by scope key; `:91` shown-at timer                                                                                                                                                                                      | same logic, moved into `review/v2/useSession.ts`                                                                                           |
| `ReviewScreen.tsx:96-108` waiting-cards countdown (1 s) and release                                                                                                                                                                                         | Waiting view (RV-B15)                                                                                                                      |
| `ReviewScreen.tsx:110-125` live face and live next-gap preview (`previewCard`, `countsAsReview`)                                                                                                                                                            | face + gap under each button (RV-B12)                                                                                                      |
| `ReviewScreen.tsx:163` suspend with Undo toast                                                                                                                                                                                                              | Suspend button (RV-P02)                                                                                                                    |
| `ReviewScreen.tsx:175` practice anyway                                                                                                                                                                                                                      | Practice anyway (RV-B06)                                                                                                                   |
| `ReviewScreen.tsx:183-205` keys Esc, Space / Enter, 1-4, ignored inside inputs and with Ctrl/Cmd/Alt                                                                                                                                                        | same keys (RV-B12-B14, B17); `keysPaused` kept                                                                                             |
| `ReviewScreen.tsx:213-224` titles (all, wrong, deck, notebook, page)                                                                                                                                                                                        | hero label + crumbs (RV-B09)                                                                                                               |
| `ReviewScreen.tsx:244-266` "Which cards" switch All / Got wrong                                                                                                                                                                                             | chips All cards / Got wrong (RV-P07)                                                                                                       |
| `ReviewScreen.tsx:277` Close                                                                                                                                                                                                                                | x (RV-B17)                                                                                                                                 |
| `ReviewScreen.tsx:286-303` source line, `onOpenAnnotation` (`SourceLine.tsx:9`)                                                                                                                                                                             | source line on the face (RV-B23)                                                                                                           |
| `ReviewScreen.tsx:306` Open note                                                                                                                                                                                                                            | session extras (RV-P01)                                                                                                                    |
| `ReviewScreen.tsx:312` Suspend                                                                                                                                                                                                                              | session extras (RV-P02)                                                                                                                    |
| `ReviewScreen.tsx:328` waiting copy "Keep this open; they appear by themselves" (`review.waitingHint`)                                                                                                                                                      | Waiting view                                                                                                                               |
| `ReviewScreen.tsx:334-342` empty messages (nothing due, no cards, wrong empty)                                                                                                                                                                              | empty states RV-B03/B04 + wrong empty line                                                                                                 |
| `ReviewScreen.tsx:357` Show answer with key chip                                                                                                                                                                                                            | RV-B12                                                                                                                                     |
| `ReviewScreen.tsx:370-385` four rating buttons + `intervalLabel` (`:413`)                                                                                                                                                                                   | rate buttons (RV-B13)                                                                                                                      |
| `ReviewScreen.tsx:400` `HelpLine` (key teacher)                                                                                                                                                                                                             | `rev.keyHints` line (RV-P05)                                                                                                               |
| `ReviewScreen.tsx:425` `countdown` m:ss                                                                                                                                                                                                                     | Waiting view                                                                                                                               |
| `ReviewScreen.tsx:433` `CardView`, `:483` `asRuns`, `:516` `Runs`, `:558` hidden-word span                                                                                                                                                                  | card face renderers (all 8 types)                                                                                                          |
| `ReviewScreen.tsx:496` `AnswerPicture`                                                                                                                                                                                                                      | Picture type (type 3)                                                                                                                      |
| `ReviewScreen.tsx:582` `Finished` (done count, Practice, Back to notes), `:636` practice help line                                                                                                                                                          | Done view (RV-B16)                                                                                                                         |
| `reviewSession.ts:17-86` in-memory session (wait, return first, 3-later in practice, skip, put back)                                                                                                                                                        | kept unchanged; Undo rating uses `putBack` (`:83`)                                                                                         |
| `reviewService.ts:241` `getReviewQueue`; `:157` page + sub-pages; `:173` `reviewable`; `:222` `doneToday`; `:295` route order                                                                                                                               | unchanged                                                                                                                                  |
| `reviewService.ts:328, 341` wrong cards (Again in 7 days); `:360` `failCounts`                                                                                                                                                                              | Got wrong chip; Browse sort "Most failed"                                                                                                  |
| `reviewService.ts:384` `countsAsReview`; `:409` `getPracticeCards`; `:432` soonest due                                                                                                                                                                      | Practice anyway                                                                                                                            |
| `reviewService.ts:489` `getCardFace`; `:545` `rateCard`; `:614-686` rebuild from log                                                                                                                                                                        | unchanged; Scheduler switch uses it (RV-P46)                                                                                               |
| `reviewService.ts:687, 695` suspend / unsuspend                                                                                                                                                                                                             | Suspend button; Browse unsuspend (RV-P28)                                                                                                  |
| `reviewService.ts:704` `countDue`; `:723` `scopeCounts`; `:735` `dueByNotebook`; `reviewLazy.ts:10-22`                                                                                                                                                      | rail badge, hero counts, Notebooks / sidebar counts (call sites `notebooks/Sidebar.tsx:207, 213`, `NotebooksHome.tsx:100`, `App.tsx:1875`) |
| `scheduler.ts` fixed steps; `fsrsScheduler.ts` FSRS (`ts-fsrs`)                                                                                                                                                                                             | Scheduler tab (RV-P39-P46)                                                                                                                 |
| `notebooks/ReviewHome.tsx:15-100` Review space screen: due total, Start, per-notebook list, `onAllCards`                                                                                                                                                    | Home view (hero); per-notebook list moves into Browse "Notebook" filter and the Notebooks tab badges                                       |
| `recall/ReviewHome.tsx:23` Review home at the top of All cards: All cards tile, deck tiles, New deck, saved searches, Paused                                                                                                                                | More › Decks body (RV-P14-P24)                                                                                                             |
| `ReviewHome.tsx:203` `DeckTile` Study / Edit / Delete; `:189` delete confirm                                                                                                                                                                                | RV-P15, P17, P20, P21                                                                                                                      |
| `ReviewHome.tsx:100-145` saved searches, Make deck, one-time offer (`deckFromSearch.ts:11, 30`)                                                                                                                                                             | RV-P22                                                                                                                                     |
| `ReviewHome.tsx:155-171` Paused list + Resume (`pauseService.ts:24-107`, `app/pauseMenu.ts`)                                                                                                                                                                | RV-P23; the ⋯ menu entries Pause / Resume on notebooks and pages stay                                                                      |
| `DeckEditor.tsx:29-370` 3-step wizard: where (notebooks, pages, sub-pages), tags any / all, states, Walk the route, name, colour, live count                                                                                                                | New deck / Edit wizard (RV-P18, P21)                                                                                                       |
| `deckService.ts:19-205` list / get / create / update / delete / `cardState` / `deckCards` / tag filter with sub-tags                                                                                                                                        | unchanged                                                                                                                                  |
| `AllCardsScreen.tsx:14` full-screen All cards with close                                                                                                                                                                                                    | More › Browse (RV-P25). The route `#/cards` (if used) opens Review with More › Browse                                                      |
| `CardsTab.tsx:39` card browser: search (`:115`), notebook filter (`:120`), sort (`:25-33`, 3 sorts), Review n due / Practice (`:158`), Show more (`PAGE_SIZE` 50, `:22`)                                                                                    | Browse tab (RV-P25-P28). The notebook "Cards" tab (`NotebookScreen`) keeps using `CardsTab` unchanged                                      |
| `CardListView.tsx:17` card rows; `CardStatusLabel.tsx:10` status + unsuspend; `cardList.ts` status/dueLabel                                                                                                                                                 | Browse rows                                                                                                                                |
| `cardService.ts:18-129` Card block, parts, `syncCardRecords`, `hasQuestion`, `maskedText`                                                                                                                                                                   | types 1-2, unchanged                                                                                                                       |
| `editor/cardActions.tsx:35, 102` make a card, `/card`, nested choice; `editor/blankActions.ts:25, 54` blanks                                                                                                                                                | unchanged in notes; the Editor tab adds a second way (RV-P29)                                                                              |
| `emptyCards.ts` remove / restore empty cards                                                                                                                                                                                                                | Make cards tab (RV-P34)                                                                                                                    |
| `cardFromAnnotation.ts:28-167`, `reader/annotations/BulkCardsDialog.tsx`, `DailyHighlights.tsx`, `highlightReview.ts:44`                                                                                                                                    | Make cards tab (RV-P33, P35)                                                                                                               |
| `vocabulary.ts:15-60`                                                                                                                                                                                                                                       | Vocabulary type (type 4); reader "add to vocabulary" unchanged                                                                             |
| `settings/builtinSettings.ts:204` day start; `:219` new per day; `:231` max per day; `:247` Again minutes; `:260` Good steps; `:280` scheduler; `:297` target memory; `:313` nested card; `:334` practice order; `SettingsScreen.tsx:295` new-per-day extra | Scheduler tab and Settings › Review show the same settings (D4); ids unchanged                                                             |
| `databases/trackerHistory.ts`, `databases/dashboard/*` study tracker, streak, percent correct (`study-tracker.md`)                                                                                                                                          | Stats tab (RV-P36); the lesson tracker in `NotebookScreen` stays                                                                           |
| `revise/ReviseTab.tsx`, `reviseService.ts` (Revise sheet, labels)                                                                                                                                                                                           | unchanged in the notebook; Revise labels stay in Settings (`review.reviseLabels`)                                                          |
| `anki/importApkg.ts:65` `importAnki`; `anki/exportApkg.ts:271` `exportApkg`                                                                                                                                                                                 | Anki tab (RV-P47, P48); the import / export entries in Settings › Save & restore stay                                                      |
| `home/DueTile.tsx:9` due tile on Home; `search/SearchScreen.tsx:343` "Review these n"; `App.tsx:546, 1752` open review of given blocks                                                                                                                      | unchanged; open the same session (scope `blocks`, not an address)                                                                          |
| `app/router.ts:83-91, 165-189` review addresses                                                                                                                                                                                                             | unchanged                                                                                                                                  |
| `i18n/en/recall.ts:183-225` Review strings                                                                                                                                                                                                                  | reused; new strings added next to them                                                                                                     |
| Today's "Coverage" list does not exist in `src/`                                                                                                                                                                                                            | not built (D5)                                                                                                                             |

The last row of the test list turns this table into a probe (see Tests).

## Won't do

- Coverage tab (mock-only page of exists / added marks). Not shipped; the mock's coverage idea is covered by this table and the probe (D5).
- A second card store: the Editor writes the same Card block. No separate "deck of cards" table.
- Paid AI card writing (limit is ₹0; belongs to AI slices).
- Collaboration or shared decks.
- Changing the scheduler maths (FSRS and fixed steps stay as they are).
- Sound effects, streak badges, points or any game layer.
- A new chart library: Stats uses plain divs and SVG as in the mock.
- Pinch-zoom on pictures in cards, ink in nested answers beyond the one Drawing type (see D1).
- Moving the Revise sheet or the Study tracker out of the notebook screens.
- Native-app features.

## Security check

- Input: card text, deck names and search words are plain text and pass through the existing typed saves; names are cut to 200 characters. Scheduler numbers go through the existing `isValid` (`builtinSettings.ts`). `.apkg` files are limited to 400 MB and read locally (`importApkg.ts`).
- Drawing and occlusion data are stored as validated JSON in the block (point arrays capped at 20,000 points; masks capped at 50 per picture). Pictures use the existing `lnimg:` store.
- Data leaving the device: none. FSRS is local; Stats are computed locally.
- Deletes: deleting a deck removes only the deck (never cards) and can be undone; Undo rating restores the card and marks the log row, it does not delete it (D3). Removing empty cards is a soft delete with Undo.
- No new network calls, no new secrets, no HTML injection: card text renders as text nodes (runs), never as HTML.
- Checked against `rules/security.md` at the end of 8g.

## Tests

Unit (Vitest):

- `undoRating`: restores card fields, queue and counts for each of the 4 ratings; refuses when the card changed; the log row is marked and skipped by "last answer".
- New card faces: `cardFace` for tf, reverse, occl, draw (what shows before and after the flip); reverse makes two parts; occlusion makes one part per mask.
- `cardType` read / write on the block: missing type = `qa`; unknown type falls back to `qa`.
- Forecast: due counts for the next 7 study days, with study-day start 0, 3, 4.
- Deck picker model: all / one deck, selected survives a deck delete, 30 decks.
- Scheduler form validation: Again minutes 1-1440, Good steps rising and max 20, limits empty = no limit.
- Overlap helper: `rectsOverlap(pic, text, input)` is false for the grid layout (also a CSS snapshot test of the grid template).
- All existing recall tests keep passing: `reviewService.test.ts`, `scheduler.test.ts`, `reviewSession.test.ts`, `decks.test.ts`, `cardService.test.ts`, `cardList.test.ts`, `emptyCards.test.ts`, `highlightCards.test.ts`, `reviewLock.test.ts`, `dueCount.test.ts`.

E2E (chromium and ipad-webkit), one per id above: RV-B01 to RV-B35, RV-P01 to RV-P48. Notes: RV-B13 uses real key events on chromium and taps on ipad-webkit; RV-B33 loops over widths, text sizes and 3 languages; reduced-motion run repeats RV-B12, B32, P09; offline run repeats RV-B13 and B31.

Screenshots (Beginner and Professional x light and dark x iPad landscape, iPad portrait, phone, PC; sepia on PC): Home (Beg, Pro with chips), session front, session back with rates, Pro session with extras and hints, Waiting, Done, More tabs (Decks with picker, Browse, Editor for each of the 8 types, Make cards, Stats, Scheduler with the fixed row, Anki), the New deck wizard, a delete dialog, empty states.

A11y: axe on every screenshot state; tabs are a tablist; the picker is a radiogroup; rate buttons carry names with the next gap; 44 pt targets; focus returns after the sheet closes; colour is never the only signal.

Size budget: the Review chunk (lazy) grows by at most 30 KB gzip over today; Drawing and Occlusion editors load only when their type is chosen; first paint of Home under 150 ms with 10,000 cards; session start under 300 ms.

Nothing-lost probe: the table above, automated. A script lists each exported function and each i18n key in `src/recall/*` and `src/notebooks/ReviewHome.tsx`, and fails when one is neither referenced by the v2 code nor listed on a "kept elsewhere" allow-list. Also: with `review.v2` OFF the old screens pass the existing `e2e/review.spec.ts`, `e2e/decks.spec.ts`, `e2e/cards.spec.ts`, `e2e/blanks.spec.ts`, `e2e/cardTools.spec.ts` unchanged.

## Sub-slice build order (one surface group per commit)

| #   | Commit                                                                                                                    | Files owned (proposed)                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 8a  | Flag, Home view (hero, rail badge, empty states), Session view (4 existing types), Waiting and Done views, keyboard, a11y | `src/review/v2/ReviewV2.tsx`, `Home.tsx`, `Session.tsx`, `useSession.ts`, `faces/*.tsx`    |
| 8b  | Professional home: More button, chips, counts line; More sheet shell on SH-09 with tabs, draft model, picker row (N3)     | `src/review/v2/MoreSheet.tsx`, `Chips.tsx`, `design/parts/PickerRow.tsx`                   |
| 8c  | Session extras: Open note, Suspend, Undo rating (+ `undoRating`), key hints                                               | `src/review/v2/Session.tsx` (extras inline), `undoRating.ts`                               |
| 8d  | Decks tab: picker, body, wizard on the Tag picker, saved searches, Paused list                                            | `src/review/v2/tabs/Decks.tsx`, `DeckWizard.tsx` (logic reuses `recall/deckService.ts`)    |
| 8e  | Browse tab and Make cards tab (reuse `CardsTab`, `CardListView`, `emptyCards`, bulk tools)                                | `src/review/v2/tabs/Browse.tsx`, `Make.tsx`                                                |
| 8f  | Scheduler tab with the Overlap rule and RV-B33; Stats tab (counts, answers per day, forecast, tracker); Anki tab          | `src/review/v2/tabs/Scheduler.tsx`, `SchedRow.tsx`, `Stats.tsx`, `forecast.ts`, `Anki.tsx` |
| 8g  | Editor tab with the four existing types; `cardType` on blocks; the face for them                                          | `src/review/v2/tabs/Editor.tsx`, `recall/cardType.ts`                                      |
| 8h  | The four new types: True / False, Reverse, Image occlusion, Drawing (faces, editor forms, parts)                          | `src/review/v2/faces/{Tf,Reverse,Occlusion,Drawing}.tsx`, `recall/cardParts.ts`            |
| 8i  | Screenshots, a11y, size budget, nothing-lost probe, security check                                                        | `e2e/review-v2.spec.ts`, `src/review/v2/nothingLost.test.ts`                               |

Each commit ships behind `review.v2`, with its RV tests and screenshots. 8a to 8f drop nothing; 8g and 8h only add.

## Owner iPad check (3 steps)

1. Open Review. You should see "Today", a number and one big **Start review** button, nothing else. Tap it, tap **Show answer**, then tap **Good**. The next card should appear and the number of cards left should go down by one.
2. Switch to Professional and open **More**. A panel slides in from the right. Tap **Decks** and check the row of deck tiles at the top: slide it sideways, tap one, and its details show below. Then open **Scheduler** and find "Again comes back after". The little picture, the words and the number box must sit side by side, never on top of each other. Turn the iPad upright and check again.
3. Do a review in Professional. Rate a card **Good**, then tap **Undo rating**: the card should come back. Tap **Open note**: the note opens. Go back and tap **Suspend**: a message with **Undo** appears for a few seconds.

## Decisions to review

| #   | Where sources disagree or are silent                                                 | My pick (safest, drops nothing)                                                                                                                                                                                                                                                                                                                               | Other options                                            |
| --- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| D1  | "The 8 card types kept": only 4 exist in `src/`; the mock adds 4 (K06-K09)           | Keep the 4 and add the 4 as the mock shows. Store the type as `cardType` inside the Card block's own props (no Dexie version); missing = Q&A. Drawing ships last (8h) because ink in nested answers is "not yet" (G0); if the ink block cannot sit in an answer, Drawing stays hidden behind the flag until it can, and this is listed in the morning report. | Only the 4 existing types; or add types in a later slice |
| D2  | Card editor inside Review (T05) vs editing cards in the note                         | Both. The Editor tab edits the same Card block, so there is one source of truth and the note always matches.                                                                                                                                                                                                                                                  | A separate card table (rejected: two copies)             |
| D3  | Undo last rating vs the append-only review log                                       | Undo restores the card and marks that log row skipped (the same way `purgedAt` rows are already skipped); the row is not deleted. Only the last rating of the open session can be undone.                                                                                                                                                                     | Add a compensating log row; allow several undos          |
| D4  | Scheduler settings exist in Settings › Review and in More › Scheduler                | Show both, same setting ids and same values. Beginner reaches them in Settings. The sheet uses the draft model (Done saves), Settings keeps saving live.                                                                                                                                                                                                      | Remove them from Settings (rejected: could drop a path)  |
| D5  | `rev.coverage` is in `pro-features.md`, but the owner picked "Coverage is mock only" | Do not build it in this slice. Keep its row in `pro-features.md` (never drop a feature); the switch shows "Coming later" until the owner decides.                                                                                                                                                                                                             | Build a read-only list generated from the inventory      |
| D6  | Deck order in the picker                                                             | Decks keep their saved `order`; no drag in the picker (the mock has none). Reordering stays where it is today (not offered today either).                                                                                                                                                                                                                     | Drag with SP-06                                          |
| D7  | Stats range                                                                          | Fixed: 15 days of answers and 7 days forecast as in the mock. The Time range bar (SP-10) is not added in this slice.                                                                                                                                                                                                                                          | Add SP-10 to Stats later                                 |
| D8  | The N3 picker row is described in shell-spec but may not be built yet                | If missing when 8b starts, 8b builds it in `design/parts/PickerRow.tsx` as the shared part and the shell slice reuses it.                                                                                                                                                                                                                                     | Wait for the shell slice                                 |
| D9  | Beginner has no More button, so no Browse, Decks or Stats                            | Correct per the mock and `pro-features.md`. Beginner can still reach all-cards browsing in the notebook's Cards tab (unchanged) and settings in Settings.                                                                                                                                                                                                     | Show a "Turn on more" hint on Home                       |
| D10 | Per-notebook due list on the old Review space (`notebooks/ReviewHome.tsx`)           | The new Home has no list. The same counts live in the Browse notebook filter and as badges in Notebooks and the sidebar (unchanged).                                                                                                                                                                                                                          | Keep a list under the hero                               |
| D11 | Practice anyway for Beginner                                                         | Shown on Home when nothing is due (RV-B03) and on the Done view; not next to Start when cards are due (calm).                                                                                                                                                                                                                                                 | Always show it                                           |
| D12 | Wording "Again" vs plain words                                                       | Keep Again / Hard / Good / Easy (Anki users know them) and add the gap under each; plain-words help pop-up explains them.                                                                                                                                                                                                                                     | Rename to "Forgot / Hard / Good / Easy"                  |
