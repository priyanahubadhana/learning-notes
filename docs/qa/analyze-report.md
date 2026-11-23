# Analyze report

Written by `npm run analyze` (scripts/analyze.mjs). Never edited by hand.

## How to read it

- One row per spec or part card on template v2. Pages on the old template are listed at the bottom and skipped, not failed.
- **Page says** is the status cell of the page. **Computed** is what the checks allow: Draft if any check fails; Confirmed if the page says Confirmed and every check passes. Built, Verified and Live are set by later parts, so they show "not computed". The page's own status cell is never changed.
- **Failed checks** use these numbers: 1 a rule id is in no scenario; 2 a scenario id is in no test file that names the spec; 3 a task row has no task id; 4 "Builds on" is missing or empty.
- Check 5 is global: private placement functions outside the part files may only go down against docs/metrics/ratchet.json. Lower the stored number with `npm run analyze -- --update-ratchet` after removing a copy.
- To fix a row: open the page, do what the failing line says, run `npm run analyze` again.

## Result

0 of 2 pages pass; 2 fail. Private placement copies: 2 (stored limit 2).

| Page                        | Page says | Computed | Failed checks |
| --------------------------- | --------- | -------- | ------------- |
| docs/features/action-bar.md | Confirmed | Draft    | 1, 2          |
| docs/features/update-v2.md  | Confirmed | Draft    | 1, 2          |

## Old template, skipped

- docs/features/ai-framework.md
- docs/features/ai-notes-format.md
- docs/features/ai.md
- docs/features/anki.md
- docs/features/audio.md
- docs/features/backup-and-files.md
- docs/features/calendar-day.md
- docs/features/capture.md
- docs/features/claude-connector.md
- docs/features/claude-skill.md
- docs/features/control-panel.md
- docs/features/copy-paste.md
- docs/features/csv-import-export.md
- docs/features/dashboards.md
- docs/features/data-model.md
- docs/features/database-views.md
- docs/features/database.md
- docs/features/databases.md
- docs/features/device-modes.md
- docs/features/editor-and-blocks.md
- docs/features/embeds.md
- docs/features/encryption.md
- docs/features/export.md
- docs/features/files-table-camera.md
- docs/features/foundation-input.md
- docs/features/foundation-selection-overlay.md
- docs/features/foundation.md
- docs/features/help-and-tips.md
- docs/features/home-v2.md
- docs/features/home.md
- docs/features/ink.md
- docs/features/journal.md
- docs/features/keyboard-shortcuts.md
- docs/features/languages.md
- docs/features/lasso.md
- docs/features/library-v2.md
- docs/features/library.md
- docs/features/links.md
- docs/features/lock.md
- docs/features/maths.md
- docs/features/media-v2.md
- docs/features/mind-map.md
- docs/features/navigation.md
- docs/features/new-page-start.md
- docs/features/notebooklm-import.md
- docs/features/notebooks-and-pages.md
- docs/features/notebooks-search-v2.md
- docs/features/notion-import.md
- docs/features/offline-and-install.md
- docs/features/page-history.md
- docs/features/page-menus.md
- docs/features/page-objects.md
- docs/features/paper-page.md
- docs/features/parts/bar-place.md
- docs/features/parts/bar-shell.md
- docs/features/parts/colour-picker.md
- docs/features/parts/customiser.md
- docs/features/parts/drag-and-dock.md
- docs/features/parts/font-picker.md
- docs/features/parts/hold-menu.md
- docs/features/parts/hover-names.md
- docs/features/parts/keys-and-shortcuts.md
- docs/features/parts/more-menu.md
- docs/features/parts/size-picker.md
- docs/features/pictures.md
- docs/features/prompt-library.md
- docs/features/quiet-recorder.md
- docs/features/reader-v2.md
- docs/features/reading-mode.md
- docs/features/recall-cards.md
- docs/features/review-and-scheduling.md
- docs/features/review-v2.md
- docs/features/revise.md
- docs/features/safety-v2.md
- docs/features/search.md
- docs/features/security-m1.md
- docs/features/selection-bar.md
- docs/features/settings-v3.md
- docs/features/settings-v5-stories.md
- docs/features/settings.md
- docs/features/shared-parts.md
- docs/features/spaces.md
- docs/features/study-tracker.md
- docs/features/study-v2.md
- docs/features/summary.md
- docs/features/sync.md
- docs/features/system-v2.md
- docs/features/tags.md
- docs/features/templates.md
- docs/features/text-select.md
- docs/features/textbox-v2.md
- docs/features/tool-registry.md
- docs/features/toolbar-ribbon.md
- docs/features/toolbar-v8.md
- docs/features/toolbar.md
- docs/features/trash.md
- docs/features/undo-history.md
- docs/features/views-and-layers.md
- docs/features/write-pad.md
