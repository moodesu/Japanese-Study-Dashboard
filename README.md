# Japanese Learning Hub

## Security setup

1. Revoke the WaniKani token that was previously stored in
   `wanikani-config.js`. Treat it as compromised even if the repository is
   private, because deployed JavaScript is readable in the browser.
2. In Supabase Authentication settings, turn off **Allow new users to sign up**.
3. Run the complete updated `supabase-schema.sql` in the Supabase SQL Editor.
   It adds RLS for Pomodoro sessions and limits lesson-audio reads to the sole
   existing Supabase Auth user. If the project has more than one Auth user,
   remove unwanted accounts first and rerun the script.
4. In Netlify, open **Project configuration → Environment variables** and add
   the following values with the Functions scope:
   - `WANIKANI_API_TOKEN`: a newly generated WaniKani v2 token
   - `SUPABASE_URL`: the same project URL used in `supabase-config.js`
   - `SUPABASE_PUBLISHABLE_KEY`: the same publishable key used in
     `supabase-config.js`
   - `ALLOWED_USER_ID`: your Supabase Auth user UUID
5. Redeploy the site. The WaniKani token now remains server-side; the function
   validates the signed-in Supabase session and exact user ID before proxying
   an allowlisted WaniKani request.

Do not place secret tokens in frontend JavaScript, `netlify.toml`, `_headers`,
or any file committed to the repository. The Supabase URL and publishable key
are intentionally public and remain safe only while RLS is enabled and tested.

## Private lesson audio

TOBIRA Beginning Japanese II Lessons 11–20 are mapped to the publisher's
original MP3 filenames. The files are not committed to GitHub.

1. Run the updated `supabase-schema.sql` in the Supabase SQL Editor. This creates
   the private `lesson-audio` bucket and single-owner read policy.
2. Upload `L11-13.zip`, `L14-16.zip`, `L17-20.zip`, and
   `reading_L11-20.zip` as extracted folders inside the `lesson-audio` bucket.
3. Keep the four folder names and all 259 original MP3 filenames unchanged.
4. Open a lesson while signed in and select a track. The app requests a
   temporary one-hour signed playback URL; no permanent public audio URL or
   publisher password is stored in the project.

Expected object paths include `L11-13/L11-01.mp3`,
`L14-16/L14-01.mp3`, `L17-20/L17-01.mp3`, and
`reading_L11-20/L11.mp3`.

### Recommended daily flow

**Dashboard → Start here → physical textbook/workbook → complete task → next task**. The app remains an organiser for the books rather than a replacement for the source material.
