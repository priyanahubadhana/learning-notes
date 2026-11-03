# Encryption (password-protected files)

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

## Purpose

Lets the user lock a saved file with a password so only someone with the password can read it. It applies to saved files only, not to data stored in the browser.

## How it works

- `src/share/crypto.ts`: AES-GCM (256-bit) with a key made from the password by PBKDF2 (SHA-256, 600,000 rounds, random 16-byte salt, random 12-byte IV, new every time). The password is Unicode-normalised (NFKC).
- File layout: "LNOTESE1", rounds, salt, IV, encrypted bytes. The 40-byte header is also covered by the GCM check, so it cannot be changed unnoticed.
- `isEncryptedFile` / `peekIsEncrypted` recognise a locked file by its first bytes.
- `fileIO.ts`: `fileToSave` locks a blob when a password is given; locked files are named `.learningnotes.locked` (`lockedFileName`). `readImportFile` throws `PasswordNeeded` when no password is given and `WrongPassword` when it does not open.
- `lockState.ts`: `passwordProblem` requires at least 8 characters (`MIN_PASSWORD_LENGTH`) and that both fields match.

- Big files (the zip save) use a chunked layout (`LNOTESE2`, same key and PBKDF2 settings): header with rounds, salt, base IV and chunk size (1 MB), then AES-GCM chunks. Each chunk has its own IV (base IV with the chunk number mixed in) and its check covers the header, the chunk number and a last-chunk flag, so chunks cannot be reordered, dropped or cut off. `encryptBlobChunked` / `decryptBlobChunked` in `crypto.ts`; no single giant buffer. Old `LNOTESE1` files still open (`openSavedFile`). Locked names end `.learningnotes.locked` for both.

## Edge cases

- A forgotten password cannot be recovered; the password is never stored.
- A wrong password and a changed or damaged file give the same `WrongPasswordError`.
- A round count below 100,000 or above 5,000,000 in the header is refused as a damaged file, so a bad file cannot make opening take forever.
- Bytes that are not a locked file give "not locked".
- The file limit (200 MB old JSON, 1 GB zip) is checked before reading.

## Security check

- Input validated: header magic, round range, GCM authentication of header and data.
- Uses the browser's Web Crypto only; no outside library, no network.
- Nothing leaves the device; the password is not stored.
- Deletes: nothing is deleted; a file that does not open is simply not imported.

## Tests

`src/share/crypto.test.ts` (round trip, new salt/IV, wrong password, tampering, silly rounds, 20 MB, chunked round trip, dropped and swapped chunks), `src/share/fileIO.test.ts`; e2e: `sharing.spec.ts` (password-protected file).
