# Research: settings that follow you across devices (Nov 2026)

Question: how do the best apps sync settings, keep some per device, and handle secrets? What should Learning Notes copy?

## What we have today (code check, 9 Nov 2026)

- Registry (`src/settings/registry.ts`) already has `scope: 'synced' | 'device'`. 13 settings are `synced` (Revise labels, review limits and scheduler, `ai.currency`), 43 are `device`.
- **Gap:** `synced` settings are stored in the `settings` table, but `src/sync/tables.ts` marks `settings: 'local'`. So "synced" settings do **not** sync today. They live only in this device's database.
- AI on/off, provider, model order, model-key map, spending cap and privacy OK (`AI_KEYS` in `src/ai/route.ts`) are localStorage prefs: per device, outside the registry.
- `ai.currency` is synced-scope with a localStorage mirror (`costCurrency.ts`).
- AI keys (R6-2): opt-in (`ai.keysSync` device pref), one encrypted record in the synced `secrets` table, never in backups. This works and is the model for a "secret" scope.
- The sync engine already has a hybrid logical clock (`src/sync/hlc.ts`, `nextHlc`) and a `record` merge mode (newer edit wins), with every record end-to-end encrypted.

## How the best apps do it

| App | Model | Per device | Choice UI | Secrets |
|---|---|---|---|---|
| VS Code Settings Sync | One synced settings file; each setting declares a scope; `machine` and `machine-overridable` settings never sync | `settingsSync.ignoredSettings`; "Don't sync this setting" action on each setting | Turn on, pick categories (Settings, Keybindings, Extensions, UI state, Snippets, Profiles) | Not synced by default |
| Obsidian Sync | Config folder synced by category | The sync choices never upload; separate config folders per device type (mobile vs desktop) | Per-category switches; main settings, appearance, themes, hotkeys, core plugins on by default; community plugins off by default | Vault E2E |
| JetBrains Backup and Sync | Categories UI / Code / System / Plugins | Sync can be off for one IDE | Category checkboxes; "this IDE only" or all JetBrains IDEs | Separate |
| Chrome Sync | Data types | n/a | "Sync everything" or "Customize sync" per type | Optional sync passphrase so Google cannot read; needed on every new device |
| Apple iCloud key-value store | Small key/value store (about 1 MB, 1024 keys per archived docs) | App decides | n/a | Apple: conflicts are rare but the app must pick a winner |
| Raycast Cloud Sync | Per-category toggles (quicklinks, snippets, notes, AI chats, themes, extension settings) | Category off = device only | Category switches | Encrypted on device, in transit and on server |
| 1Password | All vault data E2E; a new device needs password + Secret Key, or approval from a signed-in device | n/a | n/a | Server can never read keys |
| Notion | Settings are server-side account data (not E2E); theme follows "system" per device | Theme | None | Not E2E (unverified, see Sources) |

## Lessons for us

1. **Scope is declared by the developer, per setting** (VS Code `machine` scope). Hardware-bound things (Pencil, device mode, toolbar layout, bar size, zoom) never sync. The user does not need to know.
2. **Groups with switches and sensible defaults** (Obsidian, Raycast, Chrome, JetBrains). Most groups on; risky ones (secrets) off.
3. **Per-setting escape hatch** (VS Code "Don't sync this setting"): a small menu on each setting is the clearest way to override one value on one device.
4. **The sync choices themselves stay on the device** (Obsidian, VS Code). Otherwise turning a group off on the iPad turns it off on the PC.
5. **Conflicts:** settings are tiny and rarely edited at the same moment, so last-writer-wins per key is what all of these use; Apple simply says "pick a winner". A CRDT is overkill. Our hybrid clock already orders fairly even with wrong device clocks.
6. **Secrets:** sync only end-to-end encrypted, opt-in, and a new device must prove itself (1Password: password + Secret Key; Chrome: passphrase). Our passphrase-unlocked master key already does this. The server and backups never see them.
7. **Theme** is an honest split: sync the choice and make "System" the default, which already behaves per device.

## Sources

- VS Code Settings Sync: https://code.visualstudio.com/docs/configure/settings-sync
- Pylance discussion on machine-scoped settings: https://github.imc.re/microsoft/pylance-release/discussions/6475
- Obsidian Sync settings: https://help.obsidian.md/sync/settings and https://www.mintlify.com/obsidianmd/obsidian-help/sync/settings
- JetBrains Backup and Sync: https://www.jetbrains.com/help/idea/sharing-your-ide-settings.html.md and https://www.jetbrains.com/help/rider/Sharing_Your_IDE_Settings.html
- Chrome sync and passphrase: https://support.google.com/chrome/answer/165139?hl=en and https://support.google.com/chrome/answer/1181035
- Chrome sync privacy critique (opinion): https://palant.info/2023/08/29/chrome-sync-privacy-is-still-very-bad/
- Apple key-value store: https://developer.apple.com/documentation/foundation/nsubiquitouskeyvaluestore.md and https://developer.apple.com/library/archive/documentation/General/Conceptual/iCloud101/NextSteps/NextSteps.html
- Raycast Cloud Sync: https://manual.raycast.com/cloud-sync and https://manual.raycast.com/teams/cloud-sync-control
- 1Password Secret Key and new devices: https://support.1password.com/secret-key-security/ and https://agilebits.github.io/security-design/1Password_Security_Design.pdf
- Notion: no official page on per-device settings found; the row is general product knowledge, not verified.
