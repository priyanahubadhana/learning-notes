# Library v2 study (step 1: diagnosis + questions, nothing built)

12 Nov 2026. Mock studied: `scratchpad\library-mock.html` in Chrome via Playwright at 1180×820 and 400×820, Beginner and Professional. Screenshots: `scratchpad\library-v2\cur-*.png`. Script: `shot.mjs`.

## 1. What was measured

| Screen                     | First cover starts at                | Controls on screen before the first cover                              |
| -------------------------- | ------------------------------------ | ---------------------------------------------------------------------- |
| iPad 1180×820 Beginner     | 460 px (56% of the screen is chrome) | 44 (about 20 belong to Library itself, the rest is shell + side panel) |
| iPad 1180×820 Professional | 460 px                               | 46                                                                     |
| Phone 400×820 Beginner     | 602 px (73% of the screen is chrome) | 30                                                                     |
| Phone 400×820 Professional | 602 px                               | 32                                                                     |

Beginner and Professional differ by two controls on Books (the Themes tab and Select). Beginner is Professional with two things hidden, not a calm essentials view.

Rows before content in Beginner, Books tab (iPad): (1) title + count + hint + Import + Add, (2) More + search + Tag, (3) tabs + "+", (4) shelf chips with a scroll track, (5) type chips + sort + view. Phone has seven (Tag and Sort wrap to their own rows).

Knowledge tab: stats tiles, view chips (All / Daily / Study prompts / Export), filter row, then the list. Professional adds two more filter rows (Type/Tag/Date/Save, then a saved filter), so five rows before the first highlight.

## 2. Ranked reasons it feels unorganised and unclean

1. **Beginner is not a Beginner view.** 44 vs 46 controls. It breaks quality-standard point 2 and owner pattern 2 (GoodNotes-level simplicity).
2. **The same thing in several places** (breaks "one name, one place"):
   - Shelves: side panel list + chip row (verified). The side panel "Sources" list is a third list, of items rather than shelves, that repeats the cover grid beside it.
   - Adding: Capture (side panel), Import a book (header), Add ▾ (header). The Add menu contains Import a book and Capture again, so all three buttons lead to the same two actions (verified).
   - Search: the shell's top-bar search and the Library's own search field, 150 px apart.
   - The word "Library": side panel heading, breadcrumb, page title.
   - Tag filter: its own chip next to search, away from the other filters.
3. **No hierarchy among filters.** Shelf (where), type (what kind), tag, sort and view are five different ideas shown as three near-identical chip rows. "All" appears twice, one above the other (All shelves, All types), with the same style.
4. **Content starts too low.** More than half of the iPad screen and three quarters of the phone screen is controls. The covers (the hero, per the Muji rule) are an afterthought.
5. **No answer to "what do I do now?"** A reader opening the Library almost always wants to continue the current book. Nothing is featured; seven "Reading now" items are mixed into a flat grid.
6. **Heavy header.** "14 items" plus a full sentence of file-format rules sits permanently under the title. That sentence only matters at the moment of importing.
7. **Card noise.** Placeholder covers print title and author, and the caption prints them again; then status label, progress bar, "% read", and a button. Six pieces of information per card.
8. **Stray controls.** A lone "+" (edit tabs) at the far right of the tab row; "More" detached from what it controls; a sideways-scrolling chip row is needed only because shelves were put in a row at all.
9. **Knowledge repeats the pattern.** Stats tiles + view chips + up to three filter rows before one highlight; the Books side panel (shelves, sources) stays visible on Knowledge where it has no meaning.

The manager's first look is confirmed, with one correction (Sources is a duplicate of the grid, not of the shelves) and five additions (items 1, 3, 5, 7, 9 and the duplicate search).

## 3. What premium libraries do (brief research)

- **Apple Books (iPad):** side panel with Home / Library / My Collections; Home leads with what you are reading; Library has built-in shelves (Want to Read, Finished); sort and view sit in one small menu. Forum reports (unverified) say iPadOS 26 moved collections into a single Collections menu. Lesson: lead with Continue; shelves in one place; sort/view in one menu.
- **Kindle:** one icon opens a single sheet with View and Sort; filters (Read / Unread, collections) in one filter control. Lesson: one button for all "how it is shown" choices.
- **Readwise Reader:** the Library is split by a small fixed set of locations (Inbox / Later / Archive, configurable), with saved filtered views for power users. Lesson: few fixed places for everyone, saved views for professionals.
- **Matter:** three tabs only (Queue, Subscriptions, Discovery); filter and sort tucked into the queue. Lesson: very few top-level choices.
- **Raindrop:** collections and tags live in the side panel; filters are hidden until you search; each collection remembers its own view (list, cards, moodboard). Lesson: filters hidden by default; view remembered per shelf.
- **Zotero 7:** collections + tag selector left, items middle, preview right. Lesson: left = where, middle = what, right = detail. Good for Professional Knowledge.
- **Notion databases:** one row: view tabs left; Filter, Sort, Search icons and New on the right; active filters appear as chips only when set. Lesson: the exact one-row toolbar we need.
- **Craft:** side panel of folders, a clean document grid, one "+" button. Lesson: one add button. (Thin sourcing; third-party guide only.)

Shared pattern: **side panel = where, one toolbar row = how, everything else = content, one add button.**

Sources: [Apple iPad guide: organise books](https://support.apple.com/guide/ipad/organize-books-ipad5ecae3c6/17.0/ipados), [Apple forum on the iPadOS 26 sidebar](https://discussions.apple.com/thread/256088922), [Readwise: Library configuration](https://docs.readwise.io/reader/guides/workflows/library-configuration), [Raindrop 5.0](https://blog.raindrop.io/raindrop-io-5-0), [Raindrop UI help](https://help.raindrop.io/ui), [MacStories on Matter](https://www.macstories.net/reviews/matter-a-fresh-take-on-read-later-apps/), [Kindle sort and filter](https://www.idownloadblog.com/?p=848771), [Zotero reader docs](https://www.zotero.org/support/pdf_reader).

## 4. Proposed structure

Rule for both modes: **one place for where (shelves), one row for how (find, filter, sort, view), one Add button, content first.**

### Beginner: Books

- Side panel: shelves only (All, Reading now, Want to read, Finished, then My collections). On phone the same list opens from the page title ("All ▾").
- One row: More · Books | Knowledge · search icon · + Add.
- Content: a "Continue reading" row (up to three, big), then the cover grid of the chosen shelf.
- Filter, sort, grid/list and tag live in More. A filter chip appears under the row only while a filter is on, with ✕ to clear.
- File-format hint moves into the Add menu and the empty state.
- Card: cover, title, thin progress line. Status and actions under ⋯ and press-and-hold.

```
Rail | Shelves       | Library                         [+ Add]
     | > All      14 | [More] Books | Knowledge            [Q]
     |   Reading   7 | Continue reading
     |   Want      5 | [ cover ]  [ cover ]  [ cover ]
     |   Finished  2 | All
     | My collections| [cov] [cov] [cov] [cov] [cov]
     |   Psychology  | [cov] [cov] [cov] [cov] [cov]
```

### Beginner: Knowledge

- One row: More · tabs · search icon. Under it one quiet line: "All books ▾ · Any colour ▾ · Newest ▾".
- List left, preview right (sheet in portrait and on phone). No stats tiles unless switched on.
- Daily Highlights, Study prompts and Export sit in one "View ▾" menu (kept, per owner decision 11; not a separate tab).

### Professional: Books

- Side panel gains Tags and Saved filters under the collections, plus Recent.
- Tabs: Books | Knowledge | Themes | +.
- A second row is always visible: Type ▾ · Status ▾ · Tag ▾ · Sort ▾ · Grid/List · Select.
- List view with columns; bulk actions; each shelf remembers its own view.

```
Rail | Shelves       | Library                         [+ Add]
     | Collections   | [More] Books | Knowledge | Themes | + [Q]
     | Tags          | Type v  Status v  Tag v  Sort v [=] [Select]
     | Saved filters | Continue reading  [cover] [cover] [cover]
     | Recent        | Title          Author     Progress  Opened
     |               | Atomic Habits  J. Clear   62%       today
```

### Professional: Knowledge

Zotero-style three panes: side panel (books, tags, saved filters) · list · preview. Stats tiles on by default with ✕. One filter row; extra filters wrap into "+ Filter".

### Expected result

iPad Beginner: Library-owned controls before content drop from about 20 to 5; first cover at roughly 200 px instead of 460. Phone: roughly 220 px instead of 602.

## 5. Where every current feature goes (none lost)

| Inventory item                                                                                                                                                   | New home                                                                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| L01 title                                                                                                                                                        | Page title (becomes the shelf name on phone)                                                                                                |
| L02 Import, L03 Capture, L04 Prompts                                                                                                                             | The single + Add menu (Prompts also in the universal AI bar, decision 11)                                                                   |
| L05 hint                                                                                                                                                         | Add menu caption + empty state + drop banner                                                                                                |
| L06 busy status, L09 toasts                                                                                                                                      | Unchanged (banner + toasts)                                                                                                                 |
| L07 type chips                                                                                                                                                   | More › Filter in Beginner; Type ▾ on the second row in Professional                                                                         |
| L08 drag and drop                                                                                                                                                | Unchanged                                                                                                                                   |
| L10 empty states                                                                                                                                                 | Unchanged, one action each                                                                                                                  |
| L11 grid, L12 card                                                                                                                                               | Grid stays default; card simplified, nothing removed (status, % read and author move to list view, ⋯ and the book page; question 7 decides) |
| L13 primary button, L14 cover tap, L15 ⋯ menu, L16 delete                                                                                                        | Question 7 decides the tap; every action stays in ⋯ and press-and-hold                                                                      |
| L17 order, L18 kinds                                                                                                                                             | Unchanged                                                                                                                                   |
| S01 heading                                                                                                                                                      | Side panel heading becomes "Shelves"                                                                                                        |
| S02 Capture                                                                                                                                                      | + Add                                                                                                                                       |
| S03 quick-open list, S04 empty                                                                                                                                   | Side panel "Recent" with "Show all" (question 6)                                                                                            |
| B01–B07 book page                                                                                                                                                | Unchanged                                                                                                                                   |
| O01–O06                                                                                                                                                          | Unchanged                                                                                                                                   |
| Plan A3/A6 additions (shelves, collections, list, sort, search, Knowledge, preview, key star, tags, Jump, Daily Highlights, themes, export, bulk, saved filters) | All kept; placed as in section 4                                                                                                            |
| LB1 export "what to include"                                                                                                                                     | Knowledge › View ▾ › Export, and More shortcut                                                                                              |
| LB2 universal tag picker                                                                                                                                         | Opens from Tag in More (Beginner) and Tag ▾ (Professional)                                                                                  |

## 6. Questions for the owner (⭐ = recommended)

1. **When you open the Library, what do you want first?**
   (a) ⭐ Carry on with the book I'm reading: a "Continue reading" row on top, all covers below.
   (b) Just the wall of covers.
   (c) My highlights first.
   Why: this decides what Beginner is for.

2. **Where should shelves (Reading now, Finished, your collections) live?**
   (a) ⭐ Only in the side panel on iPad; on phone, tap the title "All ▾" to pick one.
   (b) Only as a row of chips above the covers.
   (c) Both, as now.
   Why: today they show twice. One place is cleaner.

3. **How many "add" buttons?**
   (a) ⭐ One "+ Add" that offers: Import a file, Capture a link/video/text, Prompts.
   (b) A big "Import a book" plus a small "+ Add".
   (c) Keep all three as now.
   Why: today three buttons lead to the same two actions.

4. **Filters in Beginner (type, tag, sort, grid/list)?**
   (a) ⭐ Hidden inside "More". A small chip shows only while a filter is on. Example: you pick Videos, a "Videos ✕" chip appears.
   (b) Keep the type chips (All, Books, Videos…) always visible; the rest in More.
   (c) Everything always visible, as now.

5. **Search inside the Library?**
   (a) ⭐ A search icon in the Library row that opens into a box when tapped.
   (b) A search box that is always visible.
   (c) No Library search; use the top-bar search, which looks in the Library when you are there.
   Why: today there are two searches close together.

6. **The side panel's list of every book and video?**
   (a) ⭐ Replace it with "Recent" (last 5) and a "Show all" link.
   (b) Keep the full list, in Professional only.
   (c) Keep the full list for everyone.
   Why: it repeats the covers shown right beside it.

7. **What happens when you tap a cover?**
   (a) ⭐ It opens the book where you stopped. The notes page is under ⋯ and press-and-hold. The card becomes cover + title + progress line.
   (b) It opens the notes page, with a Continue button under each cover, as now.
   (c) You choose in Settings.

8. **Top of the Knowledge tab?**
   (a) ⭐ Straight to your highlights. Number tiles off in Beginner, on in Professional. Daily Highlights, Study prompts and Export in one "View ▾" menu.
   (b) Number tiles on for everyone.
   (c) Keep the row of four chips as now.

9. **How different should Professional look?**
   (a) ⭐ Same layout plus one extra row of filters, a list view with columns, and Tags / Saved filters in the side panel.
   (b) A separate dense, table-first layout (like Zotero).
   Why: (a) means switching modes never moves things around.

## 7. Risks and notes

- Question 7(a) changes an existing behaviour (L14: cover tap opens the notes page). Nothing is removed, but it needs the owner's yes.
- Pattern 3 ("More at the front") is kept: More is the first control on the row.
- Pattern 5 (scroll track under sideways rows) no longer applies to Books because no row scrolls sideways.
- The "every Professional feature is individually unlockable" rule still works: the second row and side panel sections each get a switch.
- Apple Books iPadOS 26 layout and Craft details are from forum or third-party sources; treat as hints, not facts.
