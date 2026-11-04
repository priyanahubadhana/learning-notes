# Help and tips

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

Hover tips and short help lines that explain features in plain words, which the user can switch off.

## How it works

- `src/help/helpRegistry.ts`: `TIPS` and `HELP_LINES` list every tip and line by id, with a "where it shows" note. Texts live in `src/i18n/en.ts` as `help.tip.<id>.meaning`, `.example` and `help.line.<id>`. A tip can name an `image` under `public/help/`.
- `Help.tsx`: `Tip` wraps a feature with a hover tip (opens after 450 ms; on keyboard focus only after Tab; on touch screens a small ⓘ opens it, unless `touchInfo` is off). `HelpLine` shows a line under a harder feature.
- `useShowHelp.ts`: true while the device setting `general.showHelp` is "on" (the default). With it off, both disappear but the wrapper is kept so layout does not move.
- `HELP-TEXTS.md` is generated from the registry and `en.ts` for the owner to review; `UPDATE_HELP=1 npx vitest run src/help` refreshes it.

## Edge cases

- A tip chosen by a variable is written as a template id (for example `tracker.level.${l}`); the "used somewhere" test accepts that.
- Tips in other languages fall back to English if a text is missing (see languages.md).

## Security check

- No user input or files are involved; the texts are fixed in the app.
- Nothing leaves the device.
- Deletes: none.

## Tests

`src/help/helpRegistry.test.ts` (every id is used, has both texts, no stray texts, meaning at most 130 characters, `HELP-TEXTS.md` matches); e2e: `help.spec.ts`.

Batch 3 added the tip `topBar.deviceMode` (2g) and the help lines `lock.privacy` (lock screen, Settings › Lock) and `reading.aloud` (Read aloud panel).
