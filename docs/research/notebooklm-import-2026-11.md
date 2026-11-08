# NotebookLM import research (9 Nov 2026)

What a user can take out of NotebookLM (consumer product) today, so "Bring in from NotebookLM" only uses what really exists.

| Output | What the user can export or copy | Format we can accept |
| --- | --- | --- |
| Audio overview | Download from the player (web only; mobile is offline listening only) | Audio file (usually .m4a or .wav; extension not documented by Google) |
| Video overview | Download from the Studio panel (web); mobile can download and share | Video file (MP4 reported) |
| Slide deck | Three-dot menu: Download PDF or Download PowerPoint (slides are images; text not editable) | PDF, PPTX |
| Mind map | Download from the mind map window (web) | PNG picture only (no outline or JSON from the app) |
| Report / briefing doc | Copy text; Export to Google Docs | Copied text (Markdown-like) |
| Flashcards | Download in the flashcard controls; or copy | CSV (front, back), or copied text |
| Quiz | No download; copy text from the screen | Copied text only |
| Infographic | Three-dot menu: Download | PNG picture |
| Data table | Export to Google Sheets (citations on a second tab); copy; Sheets can then give CSV or Excel | CSV, or copied table (tab-separated) |

Notes
- Google Docs and Sheets exports do not sync back; this is a one-time copy.
- Slide export to Google Slides was not available at the time of the sources.
- Third-party extensions and CLIs offer more (quiz PDF, mind map JSON). They are unofficial; we do not rely on them.
- Confidence: the Google Help pages confirm Sheets and Docs export; the other rows come from third-party guides and should be re-checked in the app by the owner.

## API
The consumer NotebookLM has no public API. Only NotebookLM Enterprise (Google Cloud, paid) has one, and it lacks a chat or query endpoint. So there is no direct link: import is a one-time file or paste. This fits our rule: no accounts or sync before the deep research.

## Sources
- https://exploreaitogether.com/export-download-notebooklm-guide/
- https://support.google.com/notebooklm/answer/16206563
- https://www.nlmtools.com/blog/notebooklm-download-audio-video
- https://www.nlmtools.com/blog/notebooklm-export-quiz
- https://docs.cloud.google.com/agentspace/notebooklm-enterprise/docs
- https://discuss.ai.google.dev/t/notebooklm-api/55950
- https://discuss.google.dev/t/notebooklm-enterprise-api-missing-query-chat-endpoint-for-rag-orchestration/366875
