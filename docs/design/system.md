# Design system (proposal, 9 Nov 2026)

The single source for how the app looks. Research and sources: docs/research/premium-design-2026-11.md. Today's tokens live in `src/index.css` (`@theme`, `[data-theme]`). Step 1 of the design plan maps this file onto them. The Tailwind names stay where they exist (`bg`, `side`, `ink`, `muted`, `line`, `accent`...) so screens migrate gradually.

Open questions for the owner:

1. Sepia stays as a third theme? (proposal: yes, as a paper tint only.)
2. Load Inter, or keep the system font first? (proposal: system first, Inter on non-Apple.)
3. Accent: today's blue becomes violet. Chart colour 1 also moves to violet.

## 1. Colour tokens

Neutrals carry a faint violet tint (hue about 285) so the whole palette reads as one. Write the tokens as `oklch()` with the hex below as a fallback.

| Token                | Use                               | Light                | Dark                  |
| -------------------- | --------------------------------- | -------------------- | --------------------- |
| `canvas`             | behind everything, under the wash | #F4F3F8              | #0F0E13               |
| `surface-0` / `bg`   | paper, page                       | #FFFFFF              | #16151B               |
| `surface-1` / `side` | cards, sidebar fallback           | #FAFAFC              | #1D1C23               |
| `surface-2`          | menus, popovers fallback          | #FFFFFF              | #25242C               |
| `surface-3`          | dialogs, palette fallback         | #FFFFFF              | #2E2D36               |
| `ink`                | main text                         | #18171C              | #ECEBF2               |
| `ink-soft`           | secondary text                    | #4D4B55              | #B8B6C3               |
| `muted`              | hints, meta                       | #6B6976              | #8F8D9B               |
| `line`               | hairline dividers (decorative)    | #ECEAF1              | #2A2931               |
| `line-strong`        | input/control borders (≥3:1)      | #8A8796              | #6E6C7A               |
| `hover`              | hover fill                        | rgba(24,23,28,.05)   | rgba(255,255,255,.06) |
| `pressed`            | active fill                       | rgba(24,23,28,.09)   | rgba(255,255,255,.10) |
| `accent`             | primary button, focus, selection  | #6941E0              | #A08CFF               |
| `on-accent`          | text on accent                    | #FFFFFF              | #16112E               |
| `accent-soft`        | selected row, chip                | rgba(105,65,224,.10) | rgba(160,140,255,.16) |
| `success`            | Good/Easy, saved                  | #1D7A50              | #4CC28B               |
| `warn`               | Hard, due soon                    | #8F5200              | #E8A541               |
| `danger`             | Again, delete                     | #C0352B              | #FF7A6B               |
| `select`             | copy selection (kept)             | #C2410C              | #FFB454               |

Semantic soft fills = the colour at 10 % (light) or 16 % (dark) opacity, with the text in the full colour.

Glass tints (frame only):

- Light: `rgba(255,255,255,.72)` fill, hairline `rgba(255,255,255,.6)` inside plus `rgba(24,23,28,.08)` outside.
- Dark: `rgba(29,28,35,.70)` fill, hairline `rgba(255,255,255,.08)`.

Gradient wash (on `canvas`, fixed, never scrolls):

- Light: `radial-gradient(at 15% 0%, oklch(0.92 0.06 290 / .55), transparent 55%), radial-gradient(at 90% 10%, oklch(0.93 0.05 250 / .45), transparent 50%)`
- Dark: the same shapes using `oklch(0.35 0.12 290 / .45)` and `oklch(0.32 0.10 255 / .35)`.
- With reduced transparency: plain `canvas`.

Charts: keep the six-colour rule. Chart 1 becomes the accent. Heatmap: 5 steps of the accent at 15 / 35 / 55 / 75 / 100 % over surface-1, plus an empty step (`line`).

### Contrast check (WCAG 2.2, computed 9 Nov)

| Pair                               | Ratio           | Need  |
| ---------------------------------- | --------------- | ----- |
| L ink / paper                      | 17.8            | 4.5 ✓ |
| L ink-soft / paper                 | 8.6             | 4.5 ✓ |
| L muted / paper                    | 5.4             | 4.5 ✓ |
| L muted / canvas                   | 4.9             | 4.5 ✓ |
| L accent / paper (links)           | 6.1             | 4.5 ✓ |
| L on-accent / accent               | 6.1             | 4.5 ✓ |
| L success / warn / danger on paper | 5.3 / 6.2 / 5.6 | 4.5 ✓ |
| D ink / surface-0                  | 15.3            | 4.5 ✓ |
| D ink-soft / surface-1             | 8.5             | 4.5 ✓ |
| D muted / surface-0                | 5.6             | 4.5 ✓ |
| D muted / surface-2                | 4.7             | 4.5 ✓ |
| D accent / surface-0               | 6.7             | 4.5 ✓ |
| D on-accent / accent               | 6.7             | 4.5 ✓ |
| D success / warn / danger          | 8.1 / 8.6 / 7.1 | 4.5 ✓ |

`line` is decorative and exempt. `line-strong` must reach 3:1 against its surface: it was picked for that, and step 1 re-runs the check script on it. Glass text is checked over the worst backdrop (pure white and pure black behind the fill). The fill opacities above were picked to pass; step 1 verifies them with a test.

## 2. Spacing (4-pt)

`--space-0.5: 2` · `1: 4` · `2: 8` · `3: 12` · `4: 16` · `5: 20` · `6: 24` · `8: 32` · `10: 40` · `12: 48` · `16: 64` · `20: 80` (px). These are Tailwind's own steps (1 = 4 px), so use them as they are. Arbitrary values like `p-[13px]` are not allowed.

- Inside a control: 8-12. Between related items: 8. Between groups: 16-24. Between sections: 32-48. Page side margin: phone 16, tablet 24, desktop 32+.

## 3. Radius (soft round)

`xs 6` (chips inside rows, kbd) · `sm 8` (inputs, small buttons) · `md 12` (cards, menus) · `lg 16` (panels, sidebar, dialogs, palette) · `xl 24` (sheets on phone, hero cards) · `pill 999` (buttons, chips, segmented). Nested rule: inner radius = outer radius - padding.

## 4. Type scale

Family: `-apple-system, 'SF Pro Text', 'Inter Variable', Inter, system-ui, sans-serif`. Turn on `font-feature-settings: 'cv11','ss01'` for Inter only. Numbers in stats use `tabular-nums`.

| Token   | Size / line                | Weight | Tracking         | Use                           |
| ------- | -------------------------- | ------ | ---------------- | ----------------------------- |
| display | 40 / 48                    | 700    | -0.02em          | Home greeting, onboarding     |
| title   | 32 / 40                    | 700    | -0.02em          | page title                    |
| h1      | 24 / 32                    | 650    | -0.015em         | in-page heading, screen title |
| h2      | 20 / 28                    | 600    | -0.01em          | section                       |
| h3      | 17 / 24                    | 600    | -0.005em         | card title                    |
| body    | 15 / 24 (16 / 26 on paper) | 400    | 0                | text                          |
| small   | 13 / 20                    | 500    | 0                | meta, labels, buttons-sm      |
| micro   | 11 / 16                    | 600    | 0.04em uppercase | group labels, kbd             |

UI chrome uses only 4 sizes (h3, body, small, micro). Paper content uses title / h1 / h2 / h3 / body. Line length on the paper is 72ch at most.

## 5. Elevation and glass recipes

| Level | Light shadow                                                | Dark (lightness + shadow)               | Used by                           |
| ----- | ----------------------------------------------------------- | --------------------------------------- | --------------------------------- |
| 0     | none                                                        | surface-0                               | paper                             |
| 1     | 0 1px 2px rgba(24,23,28,.06)                                | surface-1 + hairline                    | cards, tiles                      |
| 2     | 0 4px 16px rgba(24,23,28,.08), 0 1px 2px rgba(24,23,28,.06) | surface-2 + 0 8px 24px rgba(0,0,0,.4)   | menus, popovers, floating sidebar |
| 3     | 0 16px 48px rgba(24,23,28,.14)                              | surface-3 + 0 16px 48px rgba(0,0,0,.55) | dialogs, palette                  |

Glass recipe (`.glass`, frame only):

```css
.glass {
  background: var(--glass-fill);
  border: 1px solid var(--glass-line);
  box-shadow: var(--elev-2);
}
@supports (
  (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))
) {
  .glass {
    -webkit-backdrop-filter: blur(20px) saturate(160%);
    backdrop-filter: blur(20px) saturate(160%);
  }
}
@media (prefers-reduced-transparency: reduce) {
  .glass {
    background: var(--surface-2);
    backdrop-filter: none;
  }
}
:root[data-glass='lite'] .glass {
  backdrop-filter: none;
  background: var(--surface-2);
}
```

- Blur: bars 16 px, sidebar 20 px, menus 24 px, palette 24 px plus a dimmed backdrop (`rgba(0,0,0,.24)` light, `.48` dark, no blur on the dim).
- Budget: at most 3 blurred elements visible at once. Never blur the paper. Never animate the blur.
- `data-glass='lite'` turns on automatically when the frame-time probe (`src/design/glass.ts`) sees more than half of 30 frames over 20 ms during a scroll or pointer (Pencil) burst; it is kept for the session. Big pages and ink are covered by the same probe, not separate triggers (the paper never blurs). The manual switch is Settings > General > "Reduce glass" (Automatic / Solid; Solid is kept across reloads).

## 6. Motion tokens

| Token        | Value                                                   | Use                                        |
| ------------ | ------------------------------------------------------- | ------------------------------------------ |
| `--dur-1`    | 120ms                                                   | hover, press, colour                       |
| `--dur-2`    | 180ms                                                   | menus, tooltips, chips                     |
| `--dur-3`    | 240ms                                                   | dialogs, sidebar collapse, card flip       |
| `--ease-out` | cubic-bezier(.2,.8,.2,1)                                | enter                                      |
| `--ease-in`  | cubic-bezier(.4,0,1,1)                                  | exit (exit is about 2/3 of the enter time) |
| `--spring`   | `linear()` spring, about 0.9 damping, no visible bounce | toggles, card flip, drag drop              |

- Press: scale .97 at dur-1. Menus: fade + 4 px rise. Dialogs: fade + scale .98→1.
- Reduced motion: every transform becomes a 120 ms opacity fade; no shimmer, no flip (crossfade), no smooth scroll.
- Never animate while the user is typing or drawing.

## 7. Icons

One set: Lucide (already open-source, ₹0; if the app uses another set, keep that one and drop the rest). 1.75 px stroke, 20 px in the UI (16 in dense rows, 24 in the rail), `currentColor`, rounded caps. An icon-only button always has an aria-label and a tooltip. Icon tiles (slash menu, Home cards): a 32 px square, radius 8, `accent-soft` or a neutral fill.

## 8. Component states

All controls are at least 44 px tall in comfortable density (36 px in compact, with the hit area kept by `hit-grow`). Focus = 2 px accent ring, 2 px offset, on every control. Disabled = 40 % opacity, `cursor: not-allowed`, no hover, and `aria-disabled` used when the control should still be reachable for a tooltip.

| Button    | Default                                    | Hover                                            | Active                       | Focus | Disabled | Loading                                                          |
| --------- | ------------------------------------------ | ------------------------------------------------ | ---------------------------- | ----- | -------- | ---------------------------------------------------------------- |
| Primary   | accent fill, on-accent text, pill          | accent 8 % lighter (light) / 8 % brighter (dark) | scale .97, accent 8 % darker | ring  | 40 %     | spinner replaces the icon, label stays, width fixed, `aria-busy` |
| Secondary | surface-1 fill + `line-strong` 1 px border | hover fill on top                                | pressed fill                 | ring  | 40 %     | same                                                             |
| Tertiary  | `accent-soft` fill, accent text            | +4 % fill                                        | +8 % fill                    | ring  | 40 %     | same                                                             |
| Ghost     | transparent, ink-soft text                 | hover fill, ink text                             | pressed fill                 | ring  | 40 %     | same                                                             |
| Danger    | danger fill (or ghost-danger)              | as primary                                       | as primary                   | ring  | 40 %     | same                                                             |

- Inputs: height 44, radius 8, surface-0 fill, `line-strong` border. Hover: ink-soft border. Focus: accent border + ring. Error: danger border + message under it (not colour only, an icon too). Disabled: surface-1 fill. Label above, hint below in `muted` small.
- Cards: surface-1, radius 12, elev-1, padding 16. Hover (pointer): elev-2 + hover fill. Pressed: scale .99. Selected: accent 1.5 px ring. Drag: elev-3 + 2° tilt off under reduced motion.
- Menus: glass, radius 12, padding 4, rows 36 (compact 32) / 44 on touch, radius 8 rows, group label micro, shortcut right in muted, danger items last after a divider.
- Tabs / segmented: a pill track (surface-1), the selected pill on surface-0 + elev-1 that slides at dur-2; underline tabs only inside pages.
- Chips: pill, 28 high, small text, accent-soft or a neutral fill, an optional × with a 44 px hit area.
- Toasts: bottom centre (phone) or bottom right (wide), solid surface-3 (no glass), radius 12, one action + close, 5 s, paused on hover or focus, `role=status`.
- Dialogs: surface-3, radius 16, max 480 wide, title h2, actions bottom right (primary last; on phone full-width stacked), Esc closes, focus is trapped and returns to the trigger.
- Command palette: glass, radius 16, 640 wide, input 56 high (h3 size), result rows 44, footer 36 with kbd hints.
- Skeletons: surface-1 blocks at the content's real size, radius matches the content, shimmer 1.2 s (none under reduced motion), shown after 300 ms, `aria-busy` on the region.

## 9. Layout and breakpoints

| Name    | Width                   | Layout                                                               |
| ------- | ----------------------- | -------------------------------------------------------------------- |
| phone   | < 640 (or height < 512) | single column, bottom sheets, sidebar is a drawer, side gutter 16    |
| tablet  | 640 - 1023              | floating sidebar overlays or a 72 px icon rail, gutter 24            |
| desktop | ≥ 1024                  | floating sidebar 260 (resizable 220-360) with a 12 px gap, gutter 32 |
| wide    | ≥ 1440                  | content max 1200 for dashboards; paper max 72ch + margins            |

These keep the existing `phone` / `wide` custom variants (640/512). Dashboards use a 12-column grid with 16 px gutters (24 on desktop). Tiles span 3 / 4 / 6 / 12 columns.

## 10. Density

- Comfortable (default): 44 controls, 44 rows, base spacing as above.
- Compact (Settings switch, `data-density='compact'`): 36 controls, 32 rows on pointer devices only (touch stays 44), spacing steps one down inside lists. Type does not shrink.

## Proposed rules (for rules/architecture.md "Design", needs owner OK)

> ## Design System
>
> - The design system is docs/design/system.md; screens follow docs/design/screens.md.
> - Use tokens only: colours, spacing (4-pt), radius, type, shadow, motion come from `src/index.css` tokens. No raw hex, no arbitrary px values in components.
> - Glass is for the frame only (bars, sidebar, menus, pop-ups, palette, floating panels), at most 3 blurred layers on screen, with a solid fallback for no support, reduced transparency and `data-glass='lite'`. The paper is always solid.
> - Every text and colour pair passes WCAG AA (4.5:1 text, 3:1 large text and controls) in light and dark; dark uses near-black and lighter surfaces for elevation.
> - Accent (violet) only for primary actions, selection and focus. Colour is never the only signal.
> - Every control has default, hover, active, focus, disabled and (if async) loading states; 44 px hit areas; visible focus ring.
> - Motion 120-240 ms with the shared easings; under reduced motion, fades only; no animation while typing or drawing.
> - One icon set, one stroke, labelled icon buttons.
> - Each screen is checked against the quality audit list (screens.md) in light and dark, on phone, tablet and desktop, before it is called done.
