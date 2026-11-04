# Code Map

## Today

Business logic has no UI code, so it can be reused later. Tests sit next to the code as `*.test.ts`; browser tests are in `e2e/`.

| Folder           | What's inside                                                                                                                                                                                         |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/core/`      | Data model, database, ids, order, records, workspace and block services, block type registry, upgrades, storage; `core/lock/`: the privacy lock (hashing, codes, locked things, device lock)          |
| `src/app/`       | Preferences, themes, small UI parts, upgrade screen, the shared pop-up rule (`popups.ts`), sidebar groups; `app/lock/`: lock screens and Settings › Lock; `app/reading/`: Reading mode and read aloud |
| `src/i18n/`      | `t()` and the text files (English, Hindi, Spanish)                                                                                                                                                    |
| `src/help/`      | Hover tips, help lines and their registry                                                                                                                                                             |
| `src/settings/`  | Settings registry, service and screen                                                                                                                                                                 |
| `src/notebooks/` | Notebook service and the sidebar                                                                                                                                                                      |
| `src/pages/`     | Page service, tree and page view                                                                                                                                                                      |
| `src/editor/`    | BlockNote integration; `mapping.ts` is the only file that knows BlockNote's format                                                                                                                    |
| `src/blocks/`    | Built-in block types                                                                                                                                                                                  |
| `src/trash/`     | Trash                                                                                                                                                                                                 |
| `src/journal/`   | Daily journal and dates                                                                                                                                                                               |
| `src/templates/` | Templates                                                                                                                                                                                             |
| `src/links/`     | Links and Linked from                                                                                                                                                                                 |
| `src/tags/`      | Tags                                                                                                                                                                                                  |
| `src/search/`    | Word index, search, saved searches                                                                                                                                                                    |
| `src/recall/`    | Cards, schedulers, review                                                                                                                                                                             |
| `src/revise/`    | Revise tab and marks                                                                                                                                                                                  |
| `src/databases/` | Databases, views, dashboards, Study tracker                                                                                                                                                           |
| `src/history/`   | Page version history                                                                                                                                                                                  |
| `src/images/`    | Pictures from the device                                                                                                                                                                              |
| `src/share/`     | Backups, files, encryption                                                                                                                                                                            |
| `src/anki/`      | Anki import and export                                                                                                                                                                                |

## Future layout (not built yet)

```text
src/
  shared/          login, UI, data, i18n: the only way tools connect
  tools/
    notes/         everything the app does today
    chatbot/       the second tool, when it exists
```

- **When:** when tool 2 starts or before cross-platform work, whichever comes first.
- **How:** GitHub backup, branch, docs, code move, full tests + Playwright, merge only if all pass.
- **From today:** new code adds no new direct links between features. Shared things go through `core`, `app`, `i18n`, `help` or `settings`.
- A change to shared code runs the full tests. Connection tests check that tools work together.
