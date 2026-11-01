# Languages

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

Show the whole app in the user's language, with dates and numbers in the style of their region.

## How it works

- `src/i18n/en.ts` holds every English text; `t(key, params)` in `t.ts` looks it up. `{name}` placeholders are filled (numbers formatted for the language); `count` picks a plural form (`key_one`, `key_other`) using the browser's plural rules. A missing key returns the key itself, so nothing crashes.
- `languages.ts`: English, Hindi (`hi`) and Spanish (`es`). Only English is built in; the others load as separate files when chosen (`applyLanguage`). Missing texts fall back to English. The page's `lang` attribute is set. Spanish also loads BlockNote's Spanish editor texts; Hindi has none (the editor stays English).
- `dateLocale()` combines the app language with the region of the browser's first language; Settings › Date style can force day-first or month-first for English only.
- `defaultNames.ts`: the app's own names (starter templates, "New notebook") are stored in English and shown translated (`displayName`); sample-notebook titles are translated only for records marked `sample` and still unchanged (`sampleName`).
- The language choice is a device setting (see settings.md).

## Edge cases

- A title the user wrote is shown as written; only the exact English default names are translated.
- A browser language without a region keeps the app language.

## Security check

- Texts come from files shipped with the app, not from user input or imports.
- Nothing leaves the device.
- Deletes: none.

## Tests

`src/i18n/t.test.ts`, `translations.test.ts` (no unknown keys, same placeholders as English, no empty texts, every text translated), `defaultNames.test.ts`, `dateStyle.test.ts`; e2e: `language.spec.ts`.
