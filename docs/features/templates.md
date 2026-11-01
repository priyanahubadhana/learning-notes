# Templates

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

Reusable page layouts. Using a template copies it into a new page.

## How it works

- Templates are normal pages in a special Templates notebook (kind `templates`), so they are edited like any page. It is hidden from the normal notebook list.
- `src/templates/templateService.ts`: `ensureTemplates`, `listTemplates`, `listTemplateSummaries` (first few headings as preview), `getDailyTemplate`, `createPageFromTemplate`, `saveAsTemplate`, `createTemplate`.
- `starterTemplates.ts` defines the starters: Daily journal, Study notes, Meeting notes, Reading notes, Project plan, Lesson, Lesson (large topic).
- `ensureTemplates` seeds the notebook once and records `starterVersion`; older workspaces get only starters added since (so a deleted starter never returns).
- A copy keeps blocks, live sub-pages (any depth, with titles and tags) and the source's tags. Links to pages inside the copied tree point at the copies; other page links are left out.

## Edge cases

- Copying a template into its own sub-page stops (pages made by the copy are never copied again).
- `createPageFromTemplate` throws "Template not found"; `saveAsTemplate` throws "Page not found".
- The Daily journal template is marked and protected from deletion (pageService).
- Copied cards get a schedule when `withCards` is used.

## Security check

- Validated: the template or page must exist.
- Data leaving the device: none.
- Deletes: none here; templates are pages and use the normal soft delete.

## Tests

- `src/templates/templateService.test.ts`
