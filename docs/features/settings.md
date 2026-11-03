# Settings

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

One place for the user's choices (theme, language, help, date style, day start, review options, Revise labels), defined once each and shown by a generic screen.

## How it works

- `src/settings/registry.ts`: `createSettingsRegistry` holds categories and settings. A setting has an id, text keys, a home category, optional extra categories (`alsoIn`), a scope, a default, an `isValid` check and a control (number, segmented/select, labels, steps). Adding a setting means registering a definition; the screen and storage need no change.
- `builtinSettings.ts` registers the built-in ones in categories General, Review, Journal and an empty APIs category.
- Scope: `synced` settings live in the database `settings` table; `device` settings live in the browser (`app/uiPrefs.ts`, keys prefixed `learning-notes:`).
- `settingsService.ts`: `getSetting` / `setSetting` / `resetSetting` (synced; reset saves the default as a value) and `readDeviceSetting` / `writeDeviceSetting` (device, cached, with listeners). `useSetting.ts` gives the hooks.
- A device setting can have `onChange`, run after the user changes it on the screen (the device mode uses it to write its presets).
- Categories now also include Advanced (the formatting bar options, per device). Device mode lives in General and Advanced; see [device-modes.md](device-modes.md).
- Validators: `isIntInRange`, `isOneOf`, `isRisingSteps` (strictly rising whole numbers, 1 to maxCount items).

## Edge cases

- A stored value that is no longer valid reads as the default.
- `shownWhen` hides a setting while another synced setting has another value; the value is kept.
- Registering a duplicate id, an unknown category or an invalid default throws.
- Browser storage that is blocked or full: reads give defaults, writes are skipped silently.
- The theme keeps its old storage key (`storageKey`).

## Security check

- Invalid values are never saved: both `setSetting` and `writeDeviceSetting` throw first.
- Using a synced setting as a device one (or the reverse) throws.
- Stored values are JSON-parsed and validated before use.
- Nothing leaves the device.
- Deletes: nothing is deleted; Reset writes the default.

## Tests

`src/settings/settings.test.ts`, `src/app/uiPrefs.test.ts`, `src/app/theme.test.ts`; e2e: `settings.spec.ts`.
