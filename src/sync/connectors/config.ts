/**
 * Public, non-secret settings of the owner's sync accounts (L3). A
 * publishable key and an OAuth client id are meant to be in web pages;
 * access is guarded by the server's rules (RLS) and the sign-in hook. The
 * Google client secret lives only in the Supabase dashboard, never here.
 */
export const SUPABASE_URL = 'https://eludllranljtyasdoyaj.supabase.co'
export const SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_EHra0wlZlbtMRiMpOE5VUg_O7HLCj4O'
export const GOOGLE_CLIENT_ID =
  '278292583025-a3u2gqfea0lp8a4j1nuqf133hseuh12n.apps.googleusercontent.com'
/** The only account allowed (also enforced on the server, see supabase/). */
export const ALLOWED_EMAIL = 'priyanahubadhanalegends@gmail.com'
/** Drive permission: only files this app made. */
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file'
/** The visible Drive folder that holds pictures, backups and the spare key. */
export const DRIVE_FOLDER = 'Learning Notes (encrypted)'
