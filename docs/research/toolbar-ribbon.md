# Toolbar and ribbon research (4 Nov 2026)

Scope: how other apps organise tools, then a plan for ours. Only three web searches were run. Anything marked **(unverified)** comes from my background knowledge, not a source I checked this session.

## What the sources confirmed

- **Office ribbon modes.** Microsoft's page [Show or hide the ribbon](https://eus.prod.support.services.microsoft.com/en-us/office/show-or-hide-the-ribbon-in-office-d946b26e-0c8c-402d-a0f7-c6efa296b527) (checked 4 Nov 2026) lists Classic Ribbon (full, as in older Office) and Simplified Ribbon (compact, takes less space). It also lists "Show tabs only", which hides commands until you click a tab.
- **Ctrl+F1** toggles the ribbon between tabs-only and full. Double-clicking a tab does the same ([Trump Excel](https://trumpexcel.com/show-hide-ribbon-excel/), [MS blog on the minimized ribbon](https://learn.microsoft.com/fr-fr/archive/blogs/jensenh/taking-the-minimized-ribbon-to-the-max)). Common complaint: in tabs-only mode, commands vanish when you click back into the document. Whether Ctrl+F1 behaves the same under Simplified Ribbon is **unverified**.
- **GoodNotes.** Users can hide, show and reorder tools, and move the floating pen menu ([GoodNotes feedback forum](https://feedback.goodnotes.com/forums/191274-customer-suggestions-for-goodnotes/suggestions/45980212-toolbar-editor), plus secondary Korean guides). Forum posts still ask for a compact or auto-hiding toolbar, so a compact mode is **unconfirmed**. Some sources call the current app version 7, so "GoodNotes 6" menus may differ.
- **Touch targets.** 44x44 points is the widely quoted iOS minimum, with about 8 points between targets ([Deque](https://dequeuniversity.com/rules/attest-ios/1.0/touch-target-size), secondary). I could not open Apple's own Human Interface Guidelines page, so toolbar-specific wording is **unverified**. WCAG 2.2: 24x24 CSS px minimum (AA, 2.5.8), 44x44 enhanced (AAA, 2.5.5) ([Adrian Roselli](https://adrianroselli.com/2019/06/target-size-and-2-5-5.html)).
- Not researched this session: Microsoft's Simplified Ribbon rationale article, Google Docs, Notion, Apple Notes, Freeform, VS Code and Linear docs. The table below is from memory.

## Patterns from memory (all unverified)

| App                                | Pattern                                                                                                                                                                                            |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Word / Excel / OneNote desktop     | Tabs: File, Home, Insert, Draw, View, Review and more, each with groups. Simplified Ribbon is one row with a "..." overflow. A search box finds any command. Quick Access Toolbar is customisable. |
| Office on iPad                     | Shorter ribbon under the title. Tap a tab to open, tap again to collapse. Draw tab holds Pencil tools. Phone shows a single "Edit" sheet.                                                          |
| GoodNotes                          | One top bar: pen, eraser, highlighter, shapes, lasso, text, image. Tapping the active tool opens its options. Pencil writes, finger scrolls. Keyboard appears only with the text tool.             |
| Google Docs                        | Menu bar (File, Edit, View, Insert, Format, Tools) plus one centred toolbar. Alt+/ searches menus. Mobile: a bottom formatting bar above the keyboard.                                             |
| Notion                             | Almost no chrome. "/" opens the block menu, selecting text shows a small floating bar, Cmd+K is search and jump.                                                                                   |
| Apple Notes / Freeform             | Notes: small bar above the keyboard (Aa, checklist, table, camera, pencil). Freeform: a tool strip whose options change with the active tool.                                                      |
| VS Code / Linear / Notion palettes | One shortcut opens a search box listing every command, with its shortcut shown beside it.                                                                                                          |

Lessons: (1) Microsoft added Simplified because the full ribbon takes too much screen. (2) Everyone pairs a small visible set with a search-everything box. (3) Pencil apps swap the bar by tool, not by menu.

## Recommendation for our app

**Rule: the compact bar is the default. The ribbon is a one-tap upgrade.**

### 1. Compact bar (always visible, top, every device)

One row, 44 px buttons, 8 px gaps, 6 to 8 tools plus two fixed buttons: **Ribbon** (left) and **Search** (right, opens the control panel). It changes with context:

- **Typing (Home tools):** Bold, Italic, Text colour, Highlight, Bullet list, Checklist, Picture, More.
- **Pencil (Draw tools):** Pen, Highlighter, Eraser, Lasso, Shapes, Colour, Thickness, Undo.
- **Reading mode:** Font size, Font, Paper/Theme, Find, Audio, Review, Lock, Exit reading.
- **Recall card editing:** Bold, Hide-text (cloze), Picture, Audio, List, Colour, Flip card, Add card.
- **Review screen:** Show answer, Again, Hard, Good, Easy, Undo, Edit card, Exit (large, 48 px).

Switching is automatic: Pencil touch shows Draw, keyboard focus shows Home. The user can pin a set so it stops switching.

### 2. Full ribbon (one tap on the Ribbon button)

It replaces the compact bar. Default is **minimised: tab names only**. Tapping a tab shows its groups; tapping elsewhere closes it (the Office "Show tabs" model). Ctrl+F1 / Cmd+F1 toggles pin-open.

| Tab        | Groups and tools                                                                                                                                                                                |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **File**   | Save & restore (backup, restore, undo restore), Share / Export, Anki import, Lock, Print, Settings                                                                                              |
| **Home**   | Text (font, size, bold, italic, underline, strike), Colour (text, highlight), Paragraph (headings, bullets, numbers, checklist, align, indent), Clipboard (copy, paste, paste plain), Undo/Redo |
| **Insert** | Picture, Audio, Table, Callout, Mind map, Link, Divider, Recall card, Summary block                                                                                                             |
| **Draw**   | Tools (pen, highlighter, eraser, lasso), Shapes, Colour and thickness, Paper (blank, lined, grid, dots), Pencil-only drawing toggle                                                             |
| **View**   | Reading mode, Fonts and text size, Theme, Zoom, Show/hide compact bar, Focus mode                                                                                                               |
| **Review** | Recall cards (make, edit, study), Summary (view, write), Start review, Due today, Card stats                                                                                                    |

### 3. Customisation

- Compact bar: pick and order tools per context (Typing, Draw, Reading, Cards, Review). Drag to reorder, tap to hide, "Reset to default" always present.
- Ribbon: hide whole tabs; pin any command to the compact bar.
- Settings are stored per device, so a phone and a Mac can differ.

### 4. First-run device picker

Three big cards: **Phone, iPad, Computer**, pre-selected from screen size and touch support, changeable later. It sets button size, whether the ribbon is tabs-only, whether Pencil is expected, and whether shortcuts are shown. It builds on our existing Computer / Touch / Pencil modes.

- **Phone:** compact bar only; ribbon opens as a bottom sheet.
- **iPad:** compact bar on top, ribbon tabs-only, Pencil draws and finger scrolls.
- **Computer:** compact bar plus tabs-only ribbon, shortcuts in tooltips.

### 5. Control panel (search every feature)

Opened from the Search button, Ctrl/Cmd+K, or "/" on an empty line. One search box over every feature, grouped like the ribbon; each row shows its tab, shortcut and a "pin to compact bar" action. It also holds Settings. A plain filter over a static list is fast enough.

### Accessibility checklist

- Targets 44x44 px for touch, at least 24x24 for mouse, 8 px spacing.
- Every button has a text name (tooltip and screen reader) and works by keyboard; ribbon tabs use arrow keys.
- Active state is never colour-only.
- Contrast 4.5:1 for text, 3:1 for icons.
- Respect reduced motion. The bar never moves while the Pencil is down.

### Honest notes

- Two bars plus a panel is a lot for a beginner product. Build the compact bar and the panel first, the ribbon after. The owner should decide which phase this belongs to, given the "no building beyond the current phase" rule.
- Audio, mind maps and Pencil-only drawing depend on the editor and platform. Confirm each is possible before listing it as shipped.
- Automatic switching can feel jumpy, so keep the pin option.
