# Recipe: notes with key frames from a video (on your PC, free)

For the owner's Claude Code on the PC. It makes a zip the iPad (or the PC) imports with Capture › "Or choose a zip with notes.md and images". Needs two free tools: `yt-dlp` and `ffmpeg`. The app itself fetches nothing; this runs on your computer.

## What the zip holds

```text
notes.zip
  notes.md          the notes in the ln-notes/1 format (docs/features/ai-notes-format.md)
  images/           key frames: 00-45.jpg, 12-34.jpg … (png, jpg, webp or gif)
```

In `notes.md` a frame is used as `![the oval guide](images/00-45.jpg)` inside a card answer or any section. Each picture may be at most 25 MB; the zip at most 200 MB, 500 files.

## Steps for Claude Code

1. Ask for the video link and any extra instructions (for example "name every tool icon").
2. Get the transcript and the video:
   - `yt-dlp --skip-download --write-auto-subs --sub-langs "en.*" --convert-subs srt -o transcript "<link>"`
   - `yt-dlp -f "bv*[height<=720]+ba/b[height<=720]" -o video.mp4 "<link>"`
3. Read the transcript and write `notes.md` in the ln-notes/1 format (the prompt text is in `src/capture/promptBuilder.ts`, `NOTES_FORMAT_PROMPT`). In `## Screenshots` write `[m:ss] what to capture` for each moment worth a picture (a tool, a diagram, a result).
4. Cut a frame at each of those times: `ffmpeg -ss <seconds> -i video.mp4 -frames:v 1 -q:v 3 images/<mm-ss>.jpg`.
5. Where a frame explains a card or a step, add `![caption](images/<mm-ss>.jpg)` in `notes.md`.
6. Zip so that `notes.md` and `images/` are at the top of the zip (not inside a folder): `zip -r notes.zip notes.md images`.
7. Tell the owner where `notes.zip` is. Delete `video.mp4` and the transcript if the owner does not want them.

## Notes

- Respect the video's licence and the platform's terms; keep the files for your own study.
- Automatic frames inside the app wait for a native app or a server; this recipe gives the same result today.
