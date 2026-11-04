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
- Categories now also include Advanced (the formatting bar options, per device). Device mode lives in General and Advanced; see [device-modes.md](device-modes.md). Advanced also holds Auto switch (Pencil only, Both ways, Off; per device).
- Batch 2e: a setting can also carry `keywords` (English words that find it in the Settings and control-panel search: "tool bar", "ribbon", "path" …), be `derived` (a device setting whose value is worked out from, and written back to, other state: Show tool bar, Layout, Ribbon display, size and position) and use the `action` control (a button, no value: Edit bar…, Reset tool bar). New category **Tool bar** (order 70) with `toolbarSettings.ts` (registered on import by the Settings screen and the control panel); Device mode, Formatting bar position, Bar size and Auto switch also show there (`alsoIn`). New General setting **Page address** (was Page path style; Short, Full or Name only) (`general.pathStyle`, device): Simple, Full path or Page only (see navigation.md). Full list and behaviour: [toolbar-ribbon.md](toolbar-ribbon.md).
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

## Batch 3: Lock and Reading

- Two new categories: **Lock** (order 45) and **Reading** (order 40), registered by `settings/lockSettings.ts` and `settings/readingSettings.ts` (imported by the Settings screen and the control panel, like the Tool bar ones).
- **Reading** holds device settings only: The Read button opens (page itself / full-screen reader), Reading theme, Reading font, Text size, Line spacing, Margin, Line width, Scrolling or pages, Line focus, Blanks and hidden words, Read aloud speed, Keep the screen awake. All have search words ("reading", "dyslexia", "ruler", "kindle" …) and show in the control panel. The same values change from the Look panel while reading.
- **Lock** has one plain device setting (Lock again after: 1, 2, 5, 10, 15, 30 minutes) and the Lock part of the screen (`app/lock/LockSection.tsx`): the plain explanation, the three ways to unlock (set, change, remove), what is locked now (remove one lock) and Remove the lock completely. Changes ask for the current code or the device check first. Details: [lock.md](lock.md), [reading-mode.md](reading-mode.md).
