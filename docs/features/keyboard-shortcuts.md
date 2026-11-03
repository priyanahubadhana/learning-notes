# Keyboard shortcuts

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

Fast, full keyboard use on PC, Mac and iPad keyboards.

## How it works

| Shortcut                                      | Action                                |
| --------------------------------------------- | ------------------------------------- |
| `Alt+N` (`Option+N` on Mac)                   | New page in the current notebook      |
| `Alt+Shift+N`                                 | New sub-page of the open page         |
| `Alt+R` (`Option+R` on Mac)                   | Review the open page                  |
| `Ctrl+\` (`⌘\` on Mac)                        | Hide or show the menu                 |
| `Alt+T` (`Option+T` on Mac)                   | Open today's journal page             |
| `Ctrl+K` (`⌘K` on Mac)                        | Search everything                     |
| Search popup: `↑` `↓` / `Enter` / `Esc`       | Move / open / close                   |
| Review: `Space` or `Enter`                    | Show answer                           |
| Review: `1` `2` `3` `4`                       | Again / Hard / Good / Easy            |
| Review: `Esc`                                 | Close review                          |
| `Enter` in a page title                       | Jump into the page                    |
| Double-click a sidebar name                   | Rename (`Enter` saves, `Esc` cancels) |
| `/` in the editor                             | Block menu                            |
| Code block: `Enter` or `Shift+Enter`          | New line                              |
| Code block: `Enter` on an empty last line     | Leave the block                       |
| Code block: `Ctrl+Enter` (`Cmd+Enter` on Mac) | Leave the block from anywhere         |

On Apple devices, including an iPad with a Magic Keyboard, the app shows ⌘ and ⌥ instead of Ctrl and Alt. Shortcuts read the physical key, so they work on any keyboard layout.

The docked formatting bar shows shortcut hints (BlockNote's own, e.g. Ctrl+B) when Settings › Advanced › Shortcut hints is On or after a real keyboard has been used, even in Touch mode.

Ctrl/Cmd+Shift+V pastes the clipboard as plain text (see [copy-paste.md](copy-paste.md)).

## Edge cases

Shortcuts must not fire where the key is normal typing.

## Security check

No data leaves the device; shortcuts only call existing actions.

## Tests

Covered by the e2e specs for these flows.
