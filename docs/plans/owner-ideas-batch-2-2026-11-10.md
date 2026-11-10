# Owner ideas, batch 2 (10 Nov 2026)

Noted while batch 1 is being built. Test batch 1 first, then decide which of these are needed.

1. **Update progress as a thin top bar** (alternative to the corner pill of item 24): a slim bar at the top of the app showing "Updating 62% · about 10 s left", never covering the page. Compare with the pill after batch 1 ships and keep one.
2. **Acrobat-style PDF tools (owner asked what to add).** Recommendation:
   - Add: Organize pages (reorder, rotate, delete, extract, insert blank), Combine files into one PDF, Scan to PDF (camera → pages, already have camera), Recognize text / OCR for scanned PDFs (free Tesseract.js, lazy-loaded, on device), Fill & Sign (type into fields, saved signature drawn once, uses our ink), Export with my notes (PDF with highlights/ink flattened), Summarise/Ask (already have).
   - Skip for now: full Edit PDF text (heavy, fragile), Compress (little value), Set password (weak support in free libraries), Request e-signatures from others (needs a server and legal terms).
