# Write pad: research brief (2026-11-07)

Goal: the user writes with Apple Pencil in a large pad, and the result lands in the BlockNote note as typed text with a handwritten feel. It goes in at the cursor or replaces the selection. Budget ₹0.
Confidence: **[V]** = checked in a source this session; **[K]** = known from earlier knowledge (to mid-2026), not re-checked today; **[T]** = must be tested on a real iPad.

## 1. Free handwriting-to-text on the web

### iPadOS Scribble

- WebKit supports Scribble in standard editable web content: `<input>`, `<textarea>` and `contenteditable` (WWDC20 "Meet Scribble for iPad", developer.apple.com/videos/play/wwdc2020/10106) [V]. This includes PWAs, which run in WebKit.
- **Reading the result:** Scribble inserts plain text into the focused field, so the app sees ordinary `beforeinput`/`input` events. We read the field value like typed text [K]. There are no stroke or confidence data, and no candidate list.
- **Large pad:** Scribble writes into the field under the pen. A big `<textarea>` works as a write surface, but Apple's UI decides when to commit (short pause) and shows its own ink [K][T]. We can't style that ink, set colour or zoom it.
- **Reliability:** good for English print and cursive. It sometimes inserts into the wrong field and reacts badly to custom gesture handlers. Our palm guard and pointer handlers on the pad must stay off while Scribble is used [K][T].
- **Hindi:** no evidence of Hindi/Devanagari support. Languages added so far: EN and Chinese (iPadOS 14), then DE/FR/ES/IT/PT (14.5) (MacRumors 2021-02-19) [V], with later additions such as Japanese/Korean/Cantonese [K]. An Apple Community thread (2023) has no Hindi [V]. Check Apple's Feature Availability page before promising it.
- **Pressure while Scribble is active:** no. Scribble takes the Pencil events before the page gets `pointermove`, so `PointerEvent.pressure` is unavailable during Scribble [K][T]. If we want pressure, we need our own canvas, and Scribble must not be active there.
- Scribble can be switched off by the user in Settings → Apple Pencil. It only exists on iPad, not on the PC.

### W3C Handwriting Recognition API (`navigator.createHandwritingRecognizer`)

- Shipped in Chromium 99, but only on **ChromeOS**, where the recognizer is backed by Google's on-device model [V: developer.chrome.com/docs/web-platform/handwriting-recognition; K for the platform limit].
- Safari/iPadOS: no. Firefox: no. Chrome on Windows/Mac: the method is missing or reports no languages [K]. It's still a W3C/WICG draft.
- Use it only as an optional engine behind feature detection: `'createHandwritingRecognizer' in navigator` + `queryHandwritingRecognizer({languages:['hi']})`.

### Open-source engines that run in a browser

| Option                                                         | What it is                                              | Size                                                   | Accuracy                                                   | Licence                                                    |
| -------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------- | ---------------------------------------------------------- |
| Tesseract.js (v5)                                              | Offline OCR in WASM, run on a rendered image of the pad | ~2 MB core + 1–10 MB per language (`eng`, `hin` exist) | Poor on handwriting (built for print); fine for neat print | Apache-2.0                                                 |
| TrOCR-small/base via Transformers.js (ONNX, WebGPU/WASM)       | Image-to-text transformer for handwritten lines         | ~60–300 MB (quantised ~60–120 MB)                      | Good for English lines (IAM CER ~4%); no Hindi model       | MIT (model card)                                           |
| Custom TF.js line model (CRNN+CTC)                             | Train our own                                           | 5–20 MB                                                | Depends on data; months of work                            | Ours                                                       |
| $1/$P/$Q recognisers                                           | Template gesture matchers                               | tiny                                                   | Single symbols/gestures only, not words                    | BSD                                                        |
| MyScript iink JS / Cloud                                       | Best-in-class ink recognition                           | Cloud                                                  | Excellent, Hindi supported                                 | **Commercial** (free dev tier has limits). Not ₹0 at scale |
| [K: sizes and figures are from memory; check before choosing.] |

- **Google ML Kit Digital Ink Recognition**: Android/iOS SDKs only. There is no web/JS build, and its models are not licensed for use outside the SDK [K]. Confirmed as not usable for a web PWA, except indirectly through the ChromeOS Handwriting API above. The old Google Input Tools endpoint is undocumented and unofficial, so it should not be used.
- Reality: no free, small, on-device web engine reads **Devanagari handwriting** well today.

### Fallback through the user's own AI key (later AI phase)

- Render the pad strokes to PNG, then send them to a vision model with the prompt "transcribe exactly, keep the language". Claude, GPT-4o-class and Gemini models read both English and Hindi handwriting well [K].
- This costs the user per call (fractions of a cent), needs a network connection, and sends handwriting to a third party. It needs the owner's AI approval and consent text, the key kept only in local secure storage, and never logged.

## 2. Handwritten feel for typed text

### Free OFL fonts that are handwriting-style

- Latin + Devanagari in **one** family (OFL, Google Fonts): **Kalam** (Indian Type Foundry, 300/400/700), **Laila** (semi-formal), **Amita** (calligraphic), **Sarala**, **Yatra One** (display), **Kurale**. The best handwriting pick is **Kalam**, and next **Amita** [K].
- Latin only, handwriting style: Caveat (variable, wght 400–700), Patrick Hand, Kalam, Shadows Into Light, Indie Flower, Gochi Hand, Architects Daughter (all OFL) [K].
- Self-host via `@fontsource/*` (OFL, no Google CDN call). Subset to Latin + Devanagari. Kalam is about 3 × ~150 KB per weight, so it should load late (lazy).

### Weight that follows pen pressure

- Kalam has static 300/400/700 weights only. **Caveat** is variable (`wght` 400–700) but has no Devanagari [K]. No OFL **variable** Devanagari handwriting font is known. **Noto Sans Devanagari** is variable (wght 100–900) but isn't handwriting [K].
- Mapping: get `PointerEvent.pressure` (0–1) per stroke on our canvas. Average it per word, with the bounding box from the recogniser, or per line. Pressure on Apple Pencil is reported as 0–1 in Safari [K][T].
  - Normalise to the user's own range: p' = (p − p10)/(p90 − p10), clamped to 0–1, with p10 and p90 learned from the last N strokes.
  - Then `weight = wMin + p'^0.8 × (wMax − wMin)`, snapped: Kalam {300,400,700}, Caveat 400–700 smooth.
  - Store it as a BlockNote text style mark (e.g. `inkWeight: 550`), rendered as `font-variation-settings:'wght' 550`, or as `font-weight` for static fonts.
- Per-letter weight is possible (a span per letter) but makes the doc heavy and breaks search/copy styling. Use **per word** with a cap. Size can follow stroke height, but only as an optional extra.
- Honest flag: with static fonts, pressure becomes "light / normal / bold" words. That's subtle, and some users may find it noisy. Make it an off-by-default toggle.

### "Your own handwriting" fonts

- **Calligraphr** (web): print a template, write the letters, upload, get a TTF/OTF. The free tier has limits (≈75 glyphs, 1 font), and the result is made on the server, not on the device. You can't redistribute it in our app unless the user uploads their own file [K].
- **iFontMaker** (iPad, paid ~US$8): draw letters on the iPad and export a TTF. On-device, but paid [K].
- **Apple Smart Script** (iPadOS 18, 2024): Notes learns the user's handwriting from what they write and synthesises ink in their style. It covers pasted text, auto-straightening and spell-correct. This is a generative ink model, not a font. It is private and not exposed to the web [K]. **Math Notes** (iPadOS 18) writes answers in your handwriting the same way.
- A free on-device web path exists: let the user write each glyph once in our pad, then vectorise with **opentype.js** (MIT) to build a font in the browser and store it in IndexedDB. It's feasible but large: kerning, Devanagari conjuncts/matras need shaping tables (GSUB/GPOS), which is very hard. Latin only would be realistic, later.

## 3. How others do it (UX)

- **GoodNotes 6**: write ink → lasso → "Convert" → text box (or "Copy as text"). Text boxes accept **Scribble**, so the user writes inside the box and it becomes typed text in the system font [K]. Undo works through the normal undo stack. Hindi: recognition is on-device via MyScript-like engines, and the language is chosen in settings.
- **Nebo (MyScript)**: the leader. In "Document" mode, ink is recognised live, with a word bar on top. Double-tap converts. Gestures: scratch-out = delete, vertical line = split/join, caret = insert, loop = select. Replace works by writing over selected text. It supports 60+ languages, **including Hindi** [K]. Converted text uses a clean font, with no handwriting look.
- **Notability**: write → lasso → "Convert to text" opens a sheet with the recognised text to edit, then insert. Its handwriting search is on-device [K].
- **Apple Notes + Smart Script**: ink stays ink but gets tidied. Typed or pasted text can be converted _into_ your handwriting. Spell-check works on ink. Scribble in text fields gives typed text in the system font [K].
- Shared patterns worth copying: (a) a **preview strip** with the recognised words and alternatives before inserting; (b) scratch-out to delete; (c) a single **Insert / Replace** button that follows the editor selection; (d) one undo step per insert; (e) the pad stays open to keep writing (continuous mode).

## 4. Recommended design for our app

### MVP (free, no new risky deps)

1. **Write pad sheet** reusing the magnifier pad frame: drag to size, zoom, palm guard, and the existing ⋯ rows.
2. **Two input modes, picked automatically:**
   - **iPad: "Scribble mode"**: the pad contains a large plain `<textarea>` (no custom pointer handlers on it). Scribble turns writing into text there. The text shows in a preview line, and the user taps **Insert** (at the cursor) or **Replace** (when the editor had a selection; we save the selection before opening). Space/new line/delete buttons edit the preview. This is free, works offline and covers EN + major European languages.
   - **Chromebook: Handwriting API** on our own canvas, if `queryHandwritingRecognizer` supports the language.
   - **Elsewhere (PC Chrome, Hindi, Scribble off)**: show the pad as ink only, plus a clear message: "Handwriting-to-text needs iPad Scribble (or the AI add-on later)". Optional: "Insert as drawing" (image), which already fits our ink features.
3. **Handwritten feel:** the inserted text gets a font mark. **Kalam** is the default (Latin + Devanagari), with Caveat as a Latin option and the normal font. Colour, highlight and size use the existing BlockNote styles. Fonts are lazy-loaded via self-hosted Fontsource.
4. **Pressure:** not available under Scribble. So in the MVP, "pressure feel" = a fixed weight the user picks (Light/Regular/Bold). Real pressure comes only with our own canvas (AI phase or Chromebook).
5. **Undo:** one BlockNote transaction per Insert, so Ctrl/⌘Z removes the whole insert. The pad's own delete edits only the preview.
6. Store inserted text as normal text + style marks (searchable, synced, exportable), never as images.

### Later (AI phase, the user's own key, needs owner approval)

- Our canvas captures strokes + pressure, then a PNG goes to a vision model, which returns text. Map per-word pressure (from stroke boxes; ask the model for word boxes, or split by gaps) to weight, using Noto Sans Devanagari / Caveat variable `wght`.
- This brings Hindi + any script, and the same flow on PC with a pen tablet.
- Optional later: "My handwriting font" (Latin) built in-browser with opentype.js.

### Risks

- Scribble is Apple-controlled: there's no API, behaviour changes per iPadOS release, it may commit at odd times, and it may fight our palm guard. **No Hindi.**
- Users expect Nebo-level gestures. We can't do scratch-out etc. on top of Scribble.
- Pressure-to-weight with static fonts looks noisy, and variable fonts lack Devanagari.
- Fonts add weight (keep them lazy and subset). Kalam at small sizes in long notes hurts readability, so limit it to inserted text and let the user switch fonts.
- AI fallback: cost, privacy and network. Keys must never be logged.
- Tesseract/TrOCR: big downloads, weak on handwriting, no Hindi handwriting. **Not recommended.**

### Must test on a real iPad [T]

1. Scribble in a `<textarea>` inside our pad sheet: in Safari and installed as a PWA, with sizes 300–900 px and zoom applied (CSS transform may break Scribble hit-testing).
2. Does Scribble still work with our palm guard / `touch-action` / pointer listeners on parent elements?
3. Saving the editor selection, opening the sheet, then Replace: does focus moving to the textarea lose the BlockNote selection?
4. `PointerEvent.pressure` values from Pencil on our canvas (range, per-event rate); confirm none arrive while Scribble is active.
5. Hindi keyboard set as the language: does Scribble refuse or guess Latin?
6. Kalam rendering of Devanagari conjuncts in iPad Safari; font load time on slow 4G.
7. Undo after Insert and after Replace; on-screen keyboard popping up when the textarea gets focus (use `inputmode="none"`? Check that Scribble still works with it).
8. Scribble turned off in Settings: the fallback message shows.

## Sources

- Chrome docs, Handwriting Recognition API: https://developer.chrome.com/docs/web-platform/handwriting-recognition (checked 2026-11-07)
- Explainer: https://github.com/wacky6/handwriting-recognition/blob/main/explainer.md
- WWDC20 Meet Scribble for iPad: https://developer.apple.com/videos/play/wwdc2020/10106
- MacRumors, iPadOS 14.5 Scribble languages (2021-02-19): https://www.macrumors.com/2021/02/19/ipados-14-5-scribble-language-support/
- Apple Community, Hindi Scribble (2023): https://discussions.apple.com/thread/255074679
- Other facts are marked [K]: re-check Apple Feature Availability, MDN compat data, the Google Fonts pages for Kalam/Caveat and the Transformers.js TrOCR model cards before building.
