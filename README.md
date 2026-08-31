# Japanese Learning Hub

## Japanese Repository (v1.1)

The **文** navigation button opens the sentence-first personal repository. It
stores useful or encountered sentences, personal Japanese corrections, context,
grammar links, lesson/resource links, learning status and correction labels.

Before using it, run `migrations/20260830_japanese_repository.sql` separately in
the Supabase SQL Editor. The migration adds two user-owned tables with Row Level
Security and does not change the existing v1.0 curriculum or progress tables.

Use **Capture** for manual entries. Use **Import JSON** to paste one object or an
array of sentence/correction objects from a ChatGPT conversation. Editing an
entry saves its previous wording in correction history. The correction-pattern
panel counts recurring error labels; it becomes useful as corrected sentences
accumulate.

Repository furigana uses safe bracket notation rather than stored HTML:
`[日本語|にほんご]を[勉強|べんきょう]しています。`. Keep the plain sentence in
`japanese` and put the annotated version in `japanese_furigana`. Corrections may
also include `original_japanese_furigana`. The app validates that removing the
readings exactly reproduces the corresponding plain Japanese, preventing
duplicated or mismatched text. Use **振 Furigana on/off** to control display;
the setting is remembered on the device.

### Migaku handoff

The Repository remains the source record; Migaku remains the SRS. Open an entry
and choose **Migaku handoff** to expose a clean, plain-Japanese sentence for the
Migaku browser extension. The same panel can copy the Japanese, copy all card
fields, or download a UTF-8 tab-separated row containing Japanese, furigana
notation, English, explanation, grammar, tags, source and Repository ID.

Use **Mark added to Migaku** only after the card exists in Migaku. This stores a
timestamp in `migaku_exported_at`; it does not schedule reviews or claim that
Migaku accepted a card. The Repository list can filter entries by **Not added**
or **Added**, and **Export filtered TSV** downloads the current filtered result
without automatically marking those rows as added.

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

## Private lesson-video links

The publisher's vocabulary, grammar and dialogue videos remain hosted on
YouTube. Their protected or unlisted URLs are stored in Supabase rather than in
the public frontend source.

1. Run the complete updated `supabase-schema.sql` in the Supabase SQL Editor.
2. Fill `lesson-videos-import-template.csv`, adding one row for each video.
3. In Supabase, open **Table Editor → lesson_videos → Insert → Import data from
   CSV** and upload the completed CSV once.
4. Do not add the generated `id` or `created_at` columns to the CSV. Supabase
   creates those values automatically.
5. Reload the signed-in app. Imported links appear at the correct point in the
   lesson's numbered Guided lesson path. The complete grouped video library is
   also retained inside **Lesson reference**.

For grammar videos, `grammar_index` is the one-based position of the grammar
item in the lesson's Target grammar list. Leave `grammar_index` empty for
vocabulary and dialogue videos. `sort_order` must be unique within each lesson
and video type. Only HTTPS URLs on `youtube.com` or `youtu.be` are accepted.

Example rows (replace the titles and URLs with the publisher's actual values):

```csv
lesson,video_type,grammar_index,title,youtube_url,sort_order
11,vocabulary,,Lesson 11 vocabulary,https://www.youtube.com/watch?v=VIDEO_ID,1
11,grammar,1,First grammar item,https://www.youtube.com/watch?v=VIDEO_ID,1
11,dialogue,,Lesson 11 dialogue,https://www.youtube.com/watch?v=VIDEO_ID,1
```

The browser has read-only access to this table, protected by the same sole-owner
check used for private audio. Add and update video mappings only through the
Supabase dashboard.

### Recommended daily flow

**Dashboard → Open path → complete the next numbered lesson step → mark it
complete → continue downward**. Each step presents its book/page, publisher
video and private audio shortcut at the point where it is needed. The full
Can-do list, video library, textbook map, audio browser and workbook maps remain
available in the collapsed **Lesson reference** section.

The weekly plan follows the same sequence: vocabulary, kanji, grammar,
dialogue/speaking, reading/writing, listening/comprehensive practice, then
catch-up and review. The app remains an organiser for the books rather than a
replacement for the source material.
