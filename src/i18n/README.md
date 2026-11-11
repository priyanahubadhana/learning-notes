# Texts (i18n)

Every word on screen is a key in a feature file. Show it with `t('key')`.

## Where do I add a text?

1. Pick the file of the feature, by the first part of the key
   (`library.title` goes in `library.ts`, `sync.error` in `sync.ts`).
   No file fits: use `common.ts`. Many keys for a new area: add a new file
   and list it in the `index.ts` of the folder.
2. Add the English text in one of two places:
   - `en/<feature>.ts`: loaded in the first download. **The first-load size
     limit is tight; add here only text the first screen needs.**
   - `en/late/<feature>.ts`: loaded just after the first screen. Use this
     for everything else (almost all new texts).
3. Add the same key in `es/<feature>.ts` and `hi/<feature>.ts`
   (one file per feature holds both kinds). A missing translation shows
   the English text, but `translations.test.ts` fails until it is added.
4. Plurals: `key_one` and `key_other`, then `t('key', { count })`.
   Placeholders like `{name}` must be the same in every language.

## Folders

| Folder     | Holds                                       |
| ---------- | ------------------------------------------- |
| `en/`      | English, first download (`index.ts` = `en`) |
| `en/late/` | English, loaded after start (`enLate`)      |
| `es/`      | Spanish, all keys (`index.ts` = `es`)       |
| `hi/`      | Hindi, all keys (`index.ts` = `hi`)         |

No English in JSX: `hardcodedText.test.ts` checks it.
