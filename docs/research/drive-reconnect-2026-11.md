# Why the app keeps asking "Reconnect Drive" (9 Nov 2026)

## Finding

The Drive pass is a Google **access token**: it lives 1 hour. The app got it two ways, and neither ever held a **refresh token**:

1. At sign-in, Supabase hands over `provider_token` (`connectors/supabase.ts`, `toSession`: `expiresAt = now + 59 min`). Supabase does not keep or renew Google's token.
2. After that, `connectors/google.ts` `renewDriveToken` uses the Google Identity Services **token client** (`initTokenClient`, `prompt: 'none'`). Google's own guide says this "token model" has no refresh tokens: each hour a new token is asked for in the browser, and the quiet (`prompt: none`) answer depends on Google's session cookie being readable from our page.

So the quiet renewal works while Google's cookies are fresh and fails when they are not: Safari/iPad cookie blocking (ITP) and the browser clearing site data, a long idle period (a closed tab for days), a Google sign-out or password change. Then the code correctly shows the one **Reconnect Drive** tap (`drivePass.ts` → `NeedsTapError`). The code is doing what it was built to do; the design (browser-only token flow) is the cause, not a bug in the timers.

Not the cause: the 7-day expiry of refresh tokens for apps in **Testing** status. The OAuth app is "In production", and that expiry never applied because the app never had a refresh token.

## Fix

Use the **authorization-code flow with offline access** (Google's "web server" flow). It returns a refresh token that lasts until the user removes access, changes the password (for some scopes), or it goes unused for 6 months. It must be exchanged and used with the **client secret**, which can never be in a web page, so a server step is needed.

- Supabase Auth already does the code exchange (it holds the client secret). Asking Google with `access_type=offline` (and `prompt=consent` once, because Google sends a refresh token only after a consent screen) makes Supabase return `provider_refresh_token` at sign-in.
- A Supabase **Edge Function** `drive-token` (free tier) stores that token locked (AES-GCM, key in a Supabase secret, account id bound in) in a table no browser can read, and trades it for a fresh 1-hour pass when the signed-in owner asks. The client secret is a Supabase secret.
- `invalid_grant` from Google = access was revoked: the row is deleted and the app shows one calm Reconnect bar; its tap signs in with consent again.
- Sign-out revokes the token at Google and deletes the row.

Cost: ₹0 (Edge Functions free tier is far above one user's few calls per hour).

## Sources

- Google Identity Services, token model (no refresh tokens, 1-hour tokens, `prompt` behaviour): https://developers.google.com/identity/oauth2/web/guides/use-token-model
- Using OAuth 2.0 for web server apps (`access_type=offline`, refresh tokens, `prompt=consent`, revoke): https://developers.google.com/identity/protocols/oauth2/web-server
- Refresh token expiry (Testing 7 days, unused 6 months, password change, revoked access, 100 tokens per account per client): https://developers.google.com/identity/protocols/oauth2#expiration
- Revoking a token: https://developers.google.com/identity/protocols/oauth2/web-server#tokenrevoke
- Supabase Google login (`access_type: offline`, `prompt: consent`, `provider_refresh_token`): https://supabase.com/docs/guides/auth/social-login/auth-google
- Supabase Edge Function secrets: https://supabase.com/docs/guides/functions/secrets
- Safari third-party cookie blocking (ITP): https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/

Note: these links were written from knowledge of the documents; the builder could not open them in this session. Check them when convenient.
