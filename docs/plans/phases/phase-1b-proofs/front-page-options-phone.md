# Proof B: front page, the row of options, the phone (26 Nov 2026)

> One of the four reports behind [the proofs for the notebook spec](README.md) (26 Nov 2026). Read-only; made by a helper; the main claims were checked against the code by Fable.

Read only. Working tree `C:\Users\pc\Downloads\learning-notes`. Nothing changed, nothing run. Every claim has a `file:line` that was opened. Sizes are estimates.

## The findings that change or contradict a spec line

1. **A notebook already has its own screen that is not a page.** `src/notebooks/NotebookScreen.tsx` (route `#/notebook/<id>/<tab>`, `src/app/router.ts:13`). It has its own row of tabs: Notes, Summary, Database (the Study tracker), Cards, Revise (`src/databases/notebookTabs.ts:19-31`). The front page (NB-50) can be one more tab kind on this screen, not a new kind of page. The spec does not mention this screen.
2. **A tap on a notebook's name does not open that screen by default.** It opens the last page that was open in the notebook on this device, or else the first page. The device setting "Open notebook at" (last / first / tabs) decides, and its default is "last" (`src/settings/builtinSettings.ts:661-677`, `src/App.tsx:489-502`). NB-92 must override this setting for a notebook that Claude wrote.
3. **In the default style of the address row, the notebook's name cannot be tapped.** In the "Simple" style it is plain text (`src/pages/PagePath.tsx:85-87`). "Simple" is the default (`src/settings/builtinSettings.ts:649`). Only the "Full" and "Page only" styles make it a link. That link goes straight to the notebook screen and skips the setting (`PagePath.tsx:23-25`, `App.tsx:652-653`). NB-92 needs the name to become a link in "Simple" too.
4. **The notebook screen remembers the last tab per notebook** (`NotebookScreen.tsx:81-88`). NB-92 says the front page opens "each time", so the remembered tab must not win for a notebook that Claude wrote.
5. **NB-91 note "today its order is fixed" is right for the row under a page, but there is more to it.** Settings v3 already has an editor for the page tabs. It can add, rename, remove and reorder them (`src/settings/v3/PageTabsEditor.tsx:11-18`). But the row under a page ignores that order and those names. It always uses Notes · Summary · Review and then the extra tabs in a fixed order (`src/app/summary/PageTabs.tsx:14-21, 43-46`, `src/notebooks/pageTabs.ts:26-30`). The editor's order and names are only kept in the browser storage of one device (`src/design/parts/tabSets.ts:29-53`). Only "which extra tabs are on" reaches new notebooks (`src/settings/v3/pageTabsStore.ts:38-45`).
6. **The Study tracker listing "only the top pages" fits NB-57 if a chapter is a top-level page.** One row is one top-level page (`src/databases/databaseService.ts:886-895`). Its numbers count the cards of that page together with its sub-pages (`src/databases/trackerStats.ts:7-8`). So "one row for a chapter" exists already. It is not a gap.
7. **"Continue where you stopped" stays on one device.** The last page of each notebook is kept on that device only and is not synced (`src/notebooks/lastPage.ts:6-9`). A front page on the iPad will not show where the owner stopped on the PC.
8. **"The four levels" are not the Study tracker's "Levels" column.** The owner defined them on 16 Nov as Notebook → Subject → Topic → Page (`docs/archive/plans/user-story-study-pack.md:67`). The talk file guesses the column (`docs/plans/phases/phase-1b-notebook-talk.md:211`). That guess is wrong.
9. **The phone needs more than a sign-in.** After signing in, a new device must type the sync passphrase or the recovery code before anything syncs (`src/sync/syncService.ts:94-106`). There is no guest mode yet (issue #52 is open).

---

## Point 1. NB-50, NB-92: tapping the notebook's name, and the front page

### What exists

- **Side list.** A tap on a normal notebook's name opens the tree and calls `onOpenNotebook` (`src/notebooks/Sidebar.tsx:631-641`). Special notebooks (journal and so on) only fold (`Sidebar.tsx:635-637`). `onOpenNotebook` is `openNotebook` (`src/App.tsx:1468`).
- **`openNotebook`** (`App.tsx:489-502`) reads the device setting `general.openNotebookAt` (`builtinSettings.ts:661-677`). The values are `last`, `first` and `tabs` (`src/notebooks/lastPage.ts:12`), and the default is `last`. With `last` or `first` it opens a page (`lastPage.ts:45-58`). With `tabs`, or when the notebook has no pages, it opens the notebook screen (`App.tsx:493-495`).
- **Home.** The Notebooks home calls the same `openNotebook`: `NotebooksHome onOpen` (`App.tsx:1876-1879`), and with flag `notebooks.v2` the `HomeV2` screen (`src/notebooks/NotebooksHome.tsx:78-88`). The "Notes" overview also calls it (`App.tsx:1663-1666`).
- **Library.** The Library screen shows no notebook names. `src/library/LibraryScreen.tsx` has no match for "notebook", and `src/library/` has no call that opens a notebook. So nothing in the Library opens a notebook.
- **The address row (breadcrumb)** is in `src/pages/PagePath.tsx`.
  - Style "Simple" (the default, `builtinSettings.ts:649`): the notebook's name is a `<span>` and cannot be tapped (`PagePath.tsx:85-87`).
  - Styles "Full" and "Page only": the name is a button. It sets the address to `#/notebook/<id>` (`PagePath.tsx:23-25, 63-66, 151-166, 303-316`). The app then shows the notebook screen (`App.tsx:652-653`).
- **The left panel v2** (flag `notebooks.v2`) shows the notebook's name as a plain heading that cannot be tapped (`src/app/panel/v2/PanelV2.tsx:135-136`).
- **A view that belongs to the notebook itself: yes.** `NotebookScreen` (`src/notebooks/NotebookScreen.tsx:66-339`) shows the notebook's name, its tab row and one panel. Its tabs come from `Notebook.tabs` (`src/core/types.ts:93-98`). A new notebook gets Notes, Summary, Database (the Study tracker), Cards and Revise (`notebookTabs.ts:19-31`). A bundle import gives the same tabs (`src/share/importBundle.ts:249`). The open tab comes from the address, else from a per-device memory `notebookTab:<id>`, else the first tab (`NotebookScreen.tsx:81-88`). On a phone the screen covers the whole width and has a close button (`NotebookScreen.tsx:190, 198-205`).

### What a front page needs (new work)

- **Data model.** `NotebookTab.kind` is an open string "so new tab kinds need no core change" (`types.ts:116-124`). A front-page tab (for example `kind: 'front'`) fits there, so the screen needs no new kind of record. A front page made of boxes, like a page, would need a body. Today a notebook record has no blocks, and only pages hold boxes (`types.ts:198-211`). This choice is open (see "cannot be settled").
- **A mark on the notebook** that it was written by Claude (see point 3).
- **Routing.**
  - `openNotebook` must send a marked notebook to the notebook screen on its front tab, whatever the device setting says (`App.tsx:489-502`).
  - The notebook screen must open the front tab each time, not the remembered tab (`NotebookScreen.tsx:81-88`).
  - In the "Simple" style the address row must make the name a link for marked notebooks (`PagePath.tsx:85-87`).
  - Maybe the heading of left panel v2 too (`PanelV2.tsx:136`).
  - The route itself exists (`router.ts:13`).
- **Not among the chapters.** Today the screen is not a page, so it is not in the page list and not a row of the Study tracker (`databaseService.ts:894`). That matches NB-50 as written.

### Contradictions

- NB-92 "a tap on its name does what it does today" for a hand-made notebook means: open the last page (the default). For a Claude notebook it means the screen. So one tap does two different things depending on the notebook. That is a design point to show the owner, not a code block.
- NB-92 "the notebook in the address row": in the default style there is nothing to tap today.

### Size (estimate): medium

The routing changes are small and sit in about 4 known places. A front-page tab that shows the Dashboard, the continue line and the due count is medium, because it puts together parts that exist. A front page made of free boxes, like a page, would be large: it needs a body for a non-page, or a hidden page.

### Cannot be settled from the code

- Whether the owner wants the front page to look like a tab of the notebook screen or like a page of boxes. Only the approved picture can settle this.
- What the side list looks like on the iPad when a tap opens the notebook screen. Check in the running app.

---

## Point 2. NB-57: the Study tracker, the "/database" block, continue, due cards

### What exists

- **The Study tracker is a database of the notebook**, with the id `tracker:<notebookId>` (`notebookTabs.ts:14-16`). It is made the first time its tab opens (`NotebookScreen.tsx:341-371`, `databaseService.ts:138-183`). It is not a page of its own: it shows in the Database tab of the notebook screen (`NotebookScreen.tsx:276-284`). The spec's words "a database on a page of its own" are loose. It is a tab of the notebook screen, and also "All databases".
- **Rows.** The live top-level pages of the notebook that are not rows of another database, sorted by the page order (`databaseService.ts:886-895`). You cannot add rows by hand; they are the notebook's pages (`databaseService.ts:993-995`).
- **Columns.** The title column is named "Lesson" (`databaseService.ts:156`). Then Status, Last revised, Cards due, Correct, Confidence (stars, 1 to 5) and Levels (`databaseService.ts:160-167`). They are filled from the cards (`trackerStats.ts`).
  - Status: Not started, Learning, Review, Mastered (`trackerStats.ts:26-33, 99-112`).
  - Levels: counts of New, Learning, Familiar and Mastered cards (`trackerStats.ts:13-20, 172-177`).
  - The numbers count a top page together with its sub-pages (`trackerStats.ts:7-8`).
- **Views.** Table, Dashboard and Board (`databaseService.ts:85-100`). It opens on the Dashboard once it has rows and on the Table while it is empty (`databaseService.ts:197-199`). The Dashboard shows charts: tiles, bars, lines, donuts, progress and heatmaps. It starts with suggested charts. For the tracker it also loads the review history of the notebook (`src/databases/dashboard/DashboardView.tsx:32-48, 57-65`).
- **Sub-pages.** The tracker does not list them as rows (`databaseService.ts:894`). Their cards count in their top page's row (`trackerStats.ts:7`).
- **A database inside a page: yes.** The "/database" block shows any database inside a note, with its own view: Table, List, Dashboard, Board, Calendar or Gallery, with its own sorts and filters (`src/databases/DatabaseBlockView.tsx:11-27`, `src/databases/blockViews.ts:8-13`). The block's picker lists all live databases of the workspace (`src/databases/DatabasePicker.tsx:45-64`, `databaseService.ts:63-72`). The Study tracker is one of them once it has been made. So it can already be placed in a page. Whether it renders well there was not checked in the running app.
- **Continue where you stopped.** `ContinueStrip` (`src/notebooks/v2/ContinueStrip.tsx:13-27`) gives one card per notebook, namely that notebook's last page (`src/notebooks/v2/homeLogic.ts:32-51`). It is used only in `HomeV2` (`src/notebooks/v2/HomeV2.tsx:322`), so the Notebooks home with flag `notebooks.v2`. For one notebook, the same data is `lastPageOf(notebookId)` (`lastPage.ts:37-39`). That data is per device and not synced (`lastPage.ts:6-9`).
- **Due cards for one notebook.** The review scope `{ kind: 'notebook', notebookId }` exists (`src/recall/reviewService.ts:48-50`). `scopeCounts` counts new, learning and due cards for any scope (`reviewService.ts:730`). It is used per page in `PageReview` (`PageTabs.tsx:108-111`). The address `#/review/notebook/<id>` exists (`router.ts:172-176`). The notebook screen also has a Cards tab and a Revise tab (`NotebookScreen.tsx:285-301`).

### What is missing (new work)

One front panel that puts together: the continue line for one notebook, the due count with a Start button, and the tracker (Dashboard first, the other views one tap away). Each piece exists. The way they sit together does not.

### Contradictions

- NB-57 and NB-51 "where to continue reading": it would show only what this device last opened.
- NB-57 "lists only the top pages" is written as a gap. For chapters that are top-level pages, it is exactly "one row for a chapter".

### Size (estimate): small to medium

Small if the front tab reuses `DatabaseView`, `scopeCounts` and `lastPageOf`. Medium if "continue" must follow across devices, because it would need a new synced field.

### Cannot be settled from the code

- How the tracker looks inside a "/database" block on the iPad.
- Whether the Dashboard's suggested charts read well for a Claude notebook. Look in the running app.

---

## Point 3. NB-53, NB-91, NB-07: the row of options under a page's name

### What exists

- **Defined.** Every page has Notes, Summary and Review (`PageTabs.tsx:10-21`). The extras are Mind map, Slides, Audio and video, and Database (`src/notebooks/pageTabs.ts:7-21`). The row shows only when the page is in a notebook, is not a template and is not a database row (`src/pages/PageView.tsx:182`).
- **Stored.** The extras that are on are kept on the notebook, `Notebook.pageTabs` (`types.ts:99-100`, `pageTabs.ts:32-35`). They are switched on and off by the ⋯ menu beside the row (`PageTabs.tsx:69-92`, `PageView.tsx:697-710`), through `setNotebookPageTab` (`pageTabs.ts:44-62`). A new notebook starts from the device default `pageTabs.default` (`pageTabs.ts:37-42`).
- **Per page or per notebook.** Only per notebook. The `Page` record has no tab field (`types.ts:134-212`).
- **Order.** Fixed. `cleanTabs` always returns the fixed order (`pageTabs.ts:26-30`). The row puts the three core tabs first (`PageTabs.tsx:43-46`).
- **What the user can do today on the page row:** switch an extra tab on or off for the whole notebook. They cannot rename, reorder, hide Notes, Summary or Review, or add their own tabs.
- **Settings v3** (flag `settings.v3`) has a "page tabs" editor. It can add, rename, remove and reorder (`PageTabsEditor.tsx:11-18`, `src/design/parts/tabSets.ts:157-218`). It keeps all of that only in local storage for one device (`tabSets.ts:29-53`). Only the list of extras goes into `pageTabs.default` (`pageTabsStore.ts:38-45, 74-81`). The row under a page does not read the editor's order or names (`PageTabs.tsx:14-21, 43-46`; `PageView.tsx:220`). So the editor can be used today, but the row under a page does not change.
- **The notebook screen's own tab row** can rename a tab, and hide and show it again (`NotebookScreen.tsx:122-143, 179-186`, `notebookService.ts:195`). It cannot reorder tabs or add new ones (no such function in `src`).
- **Which tab opens first.** `PageView.tsx:215-219`: "every page opens on its notes". This is local state that is not stored; a different page starts on Notes again (`PageView.tsx:221`). An extra tab that is switched off falls back to Notes (`PageView.tsx:222-224`).
- **A place for a "written by Claude" mark.**
  - `Notebook` has optional flags of the same shape, such as `sample?: true`, `readFirst?: true` ("always opens in Reading mode") and `allowAi?: true` (`types.ts:81-92`). There is no origin field today.
  - A new optional field needs no Dexie version (precedent: `types.ts:87, 105`).
  - It syncs, because notebooks sync as whole records (`src/sync/tables.ts:18`) and every field is sent (`src/sync/wire.ts:35-40`).
  - The file checker copies only the fields that are listed, and a missing line stops the build (`src/share/checkRows.ts:40-48, 83-113`). So the field also needs one line there. `pageTabs` is already taken from a file (`checkRows.ts:103`), so a file can switch on Mind map today.

### What is missing (new work)

- The mark field (with its line in `checkRows.ts`).
- The first tab chosen from the mark: Summary for a Claude notebook (`PageView.tsx:219`).
- Per-page options (NB-53) would be a new field on `Page`, unless "per page" is read as "for the chapters of this notebook".
- A row the owner can reorder and rename (NB-91) means joining the existing `TabRow` and `tabSets` editor to the page row. Its data would then have to be stored on the notebook or synced, not in local storage.
- A Dashboard option for the front page (NB-53) is new.

### Contradictions

- NB-53 "Database is not in the row by default; the owner can add it": true today. But adding it adds it to every page of the notebook, not to one chapter.
- NB-91 "add, edit, remove and reorder" exists only in the Settings v3 preview, and it has no effect on pages.

### Size (estimate)

- Mark plus first tab: small (3 to 4 files).
- Reorder and rename on the page row, stored on the notebook: medium.
- Per-page tabs: medium.

### Cannot be settled from the code

- Whether the owner reads "a chapter has the options…" as "for this notebook" or "for this one page". Ask with a picture.

---

## Point 4. NB-55, NB-10: cards on the phone

### What exists

- **Sign-in.** Accounts are required (`CLAUDE.md`, "Things we said no to"). The sign-in options are Google, an email code (6 digits) and email with a password (`src/sync/SignInPanel.tsx:9-13`).
- **Without a sign-in** the device is read-only: reading, search and export work, and edits are refused (`src/sync/gateRule.ts:4-18`, `src/core/editLock.ts:21-33`). The refusal is called in the page, notebook, trash and organise services. No call was found in `src/recall` or `src/review` (a search for `assertSignedIn|isReadOnlyGate` lists 18 files, none of them review files). So rating a card may not be refused while signed out. This was not checked in the running app.
- **No guest mode.** Issue #52 is open: a guest profile on the test version, "planned at the 1B boundary", which needs a short spec. The owner's definition (22 Nov) is a fresh empty profile for the guest, and signing in brings back the owner's notes.
- **Issue #50 is open.** After Welcome is closed with Escape, the gate bar's "Sign in" button does nothing until a reload. The cause is not proven. The plan is to write a test first. It waits for 1B planning.
- **Key step on a new device.** After sign-in, if no key is on the device, the phase is `needsKey` (`syncService.ts:94-106`). The person must type the passphrase or the recovery code (`src/sync/UnlockForm.tsx:14-19`). Only then does sync run.
- **What syncs.** Notebooks, pages, blocks, cards, review logs (only ever added), decks, summary items, ink, databases and their columns and views, images and more (`src/sync/tables.ts:16-49`). So cards, the review state (on the card) and the pages all sync.
- **What does not sync:** the last page of each notebook (`lastPage.ts:6-9`), the feature switches (`src/app/flags.ts:8-9`), and the tab-row editor (`tabSets.ts:29-31`).
- **Switches.** Review v2 is behind `review.v2` (`App.tsx:429, 1862-1863`). It is on by default on the preview and on the live site (`flags.ts:71-87, 99-103`), but a device that has ever saved its own choice keeps it (`flags.ts:151-158`). `study.v2` is not on by default (`flags.ts:132`).
- **Phone Review screen** (`src/review/v2/`):
  - Home shows "Today", the number of cards ready and one Start button. Professional adds New, Learning and Due, and "Practice anyway". With no cards it shows "Open notebooks" (`Home.tsx:20-133`). Home always uses the scope "all" (`ReviewV2.tsx:27, 53-66`).
  - The session has a Show answer button, rating buttons, open-the-note, suspend, undo, and a Done screen with Practice (`Session.tsx`, test ids at lines 129-385).
  - Phone layout: under 640 px there is narrower padding and stacked Done buttons. On touch the key hints are hidden (`reviewV2.css:443-467`).
  - There are phone screenshots for the visual tests (`e2e/visual/__screenshots__/win32/review-*-phone.png`).

### What is missing (new work)

Nothing in the code blocks NB-55 once the phone is signed in and unlocked. The open items are #50 (a bug) and, if wanted, #52 (guest mode).

### Contradictions

- NB-55 "signed in and in step" leaves out the unlock step (passphrase or recovery code). The spec should name it.
- Review v2 Home has no per-notebook choice. A notebook's cards are reached through `#/review/notebook/<id>`, or from the notebook's Cards and Revise tabs.

### Size (estimate)

Small (fix #50 if it is real). Guest mode (#52) is medium and needs its own spec.

### Cannot be settled from the code

- Whether due cards actually show and can be answered on the owner's phone.
- Whether that phone's switches have `review.v2` on.
- Whether rating works while signed out.

These need a real-device test.

---

## Point 5. NB-52: the order of pages

### What exists

- Each page has `order`, a fractional key among its siblings (`types.ts:39-44, 144-145`). Moving a page changes only that page's key (`types.ts:41-43`).
- The tracker's rows sort by the same key (`databaseService.ts:895`, `byOrder`).
- The notebook's Database tab lists pages by the same key (`NotebookScreen.tsx:386-391`).
- The page list shown in the side panel was not opened in this proof (not checked), but the `order` field is the only order on `Page`.

### What is missing (new work)

None if the front page lists the chapters through the tracker or by `order`.

### Contradictions

None. "The page list holds their order" is true in the data: one field, and the tracker reuses it.

### Size (estimate)

Nothing to build.

### Cannot be settled from the code

Whether a Table view sorted by another column confuses the owner, since a sort in a view does not change the page order. Look in the running app.

---

## Point 6. "The four levels"

### What exists

- **In the docs, the four levels are Notebook → Subject → Topic → Page.** Each opens and closes like a toggle (owner, 16 Nov, `docs/archive/plans/user-story-study-pack.md:67`). A page may sit under a Subject without a Topic (`user-story-study-pack.md:77`). The same is in `docs/archive/plans/app-user-story.md:207-218`. The line in STATE that names them is `docs/STATE.md:164` ("Connector upgrade (owner, 16 Nov)").
- **In the code,** no Subject or Topic level exists. `src/core` has no match for "subject" or "topic". Today the depth comes from pages under pages (`types.ts:136-137`).
- **The tracker column "Levels" is something else.** It holds card levels: New, Learning, Familiar, Mastered (`trackerStats.ts:13-20`).

### Contradictions

`docs/plans/phases/phase-1b-notebook-talk.md:211` says the column is "the likely meaning". The docs show it is not.

### What is missing (new work)

If the four levels are wanted, they are new: either named levels in the tree, or the rule "a chapter = Subject, a sub-page = Topic, a page under it = Page" written by Claude as pages under pages. NB-03 already allows the second without new code.

### Size (estimate)

None if pages under pages are enough. Medium if the levels need their own names and looks in the side list.

### Cannot be settled from the code

Whether the owner still wants named levels after NB-03. Ask the owner.
