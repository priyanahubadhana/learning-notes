# New-page start (N2)

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

A new page opens blank and ready to type. Under the cursor sits a short template list, **Study (Recommended)** after Blank, so a learner can fill the page in one tap. Typing makes the list go away. A setting, **Always start new pages as Study**, skips the list and fills every new page with Study.

## How it works

- `NewPageStart` (`src/templates/NewPageStart.tsx`) shows under the editor only when the page was just made by the user (PageView's `autoFocusTitle`, so not journal days, database rows, template pages or the first page of a new notebook), is not in Reading mode, and is still blank (`isPageBlank`: no blocks, or only empty lines; live, so it goes away after the first words are saved).
- Rows: **Study (Recommended)** = the starter template titled "Study notes" (`getStudyTemplate`; if the owner renamed or deleted it, the row and the checkbox are not shown), then every other template except the Daily journal, each with its first headings as a preview.
- Tapping a row calls `applyTemplateToPage`: in one transaction it checks the page is still blank (otherwise nothing changes and a toast says so), soft-deletes the empty lines, and copies the template's blocks, cards and sub-pages (same copier as "New page from template"). The editor is then reloaded (`onReload`).
- **Always start new pages as Study** (checkbox in the list, and Settings › General › "Start new pages as Study"): synced setting `general.newPageStudy` ('on'/'off', default off). `App.createPageIn` reads it and, when on, creates the page from the Study template instead of a blank one (no toast). A page made from the "New page from this template" menu keeps the template the user chose.
- No new table and no Dexie version: it uses `settings`, `pages`, `blocks` and `cards`, which already sync.

## Template chooser at start

- First row **Blank page** only closes the list (the page stays blank). Also shown on the first page of a new notebook (App `startOfferPageId` to PageView `offerStart`).
- **Don't show this again** sets synced `general.newPageChooser` to off (default on; Settings › General › "Template list on new pages"); a toast says how to turn it back on. Off: `NewPageStart` renders nothing.

## Edge cases

- Study template missing: the list shows the other templates; the setting does nothing.
- Two quick taps: the second finds the page no longer blank and only shows the toast.
- Offline, locked notebooks: same as any new page.

## Security check

No new inputs; the template copier is the existing one.

## Tests

- Unit: `src/templates/newPageStart.test.ts` (Study lookup, blank test, fill, no overwrite, setting).
- E2E: `e2e/newPageStart.spec.ts` (Study first, fills, goes away on typing, none on the notebook's first page, Always checkbox, phone fit).
