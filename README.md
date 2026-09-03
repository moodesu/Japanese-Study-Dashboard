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

### Repository grammar explanations (2026-09-03)

Open a saved entry and click a grammar chip under **Grammar and lessons**.
The chip opens a grammar reference within the Repository. **Back to sentence**
returns to the same entry and restores focus and scroll position. The furigana
toggle works in the guide and its examples as well as in the saved sentence.

The initial local guide library in `grammar-guides.js` covers `〜くらいなら`
(including the distinction between an approximate amount with a condition and
the “rather than” use) and `〜だと思う` / `〜と思う`. Each guide includes meaning,
formation, original examples and links to source explanations. The current
sentence and its saved explanation remain visible separately as context.

Resolution uses explicit aliases and normalizes leading wave/tilde markers,
Unicode width and spaces; it does not guess using substring matching. Guides
can be expanded by adding explicit entries to `grammar-guides.js`. Unknown
labels show an honest “not yet in the guide library” message and a reference
search link, not a generated or unrelated explanation. A search sends only the
grammar label when clicked, never the saved sentence. Textbook matches also
offer a direct link to the specific existing lesson grammar step.

Changelog:

- Replaced non-clickable grammar labels with accessible navigation buttons.
- Added in-app guides for the two latest imported patterns, including aliases.
- Kept existing entries, import schema and Anki export unchanged.
- Preserved textbook connections and linked them to the exact grammar step.
- Added fallback handling, safe text rendering and navigation tests.
- No SQL migration, database writes or re-import required.

Smoke-test checklist:

- Open the price sentence and click each of its two grammar chips.
- Verify the approximation/condition explanation and the separate “rather
  than” use on the `〜くらいなら` page.
- Check formation, examples and reference links on the `〜だと思う` page.
- Toggle furigana, then use Back to sentence; verify the same entry returns.
- Check an unknown label and an exact Tobira grammar label for their respective
  fallback and textbook connection, then check mobile and dark mode.

Automated checks: `node tests/repository-grammar.test.cjs` and
`node tests/lesson-flow.test.cjs`. Browser/import-account verification remains
a manual smoke test.

Suggested commit: `feat: open repository grammar points in explanation views`

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

### Anki deck export for Migaku

Use **Download Anki deck** on one Repository entry, or apply Repository filters
and use **Export filtered Anki** to create `japanese-learning-hub.apkg`. Import
that package as an Anki deck in Migaku. The export creates one recognition card
per Repository entry; it does not add a second SRS or change the entry's Migaku
marker.

The package creates its own **Japanese Learning Hub** note type instead of
trying to match a Migaku-selected Anki note type. Its fields are **Target
Word**, **Sentence**, **Sentence Translation**, **Definition**, **Notes**,
**Sentence Audio**, **Image** and **Source**. Target Word, Sentence Audio and
Image are currently left empty because the Repository does not store those
values yet.

The card front shows the furigana-rendered Sentence when bracket notation is
available, otherwise it shows plain Japanese. Sentence Translation receives
the English meaning, Definition receives the explanation, Notes collects the
personal notes, original Japanese, correction labels and grammar, and Source
includes the source details and Repository ID. Repository tags and grammar
tags are also included. Each note uses a stable ID derived from its Repository
UUID so repeat-import behaviour can be tested without creating a new identity
for the same sentence.

Deck generation happens entirely in the browser using locally hosted MIT
licensed Anki-package and SQLite WebAssembly components under `vendor/`; no
sentence data is sent to another service during export. The TSV export remains
available as a fallback.

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

The lesson path now starts with **できるCheck → Conversation (first pass) →
Vocabulary with pictures → Vocabulary list**. It then follows the existing
mapped textbook sections: kanji, grammar, speaking/application, reading and
listening, with a final lesson wrap-up. The weekly Plan uses the same shared
ordering. Day allocations are study suggestions, not instructions to skip
unfinished textbook sections.

Publisher videos and workbook practice are inside their matching textbook
section, with independent completion, notes and ratings. Grammar points remain
individually tracked inside the grammar section. The Continue button includes
unfinished supporting activities, even when their textbook section is marked
complete. An optional conversation replay belongs after grammar, not in place
of the opening first pass.

Existing task IDs, notes, completion and mastery records are retained. Picture
vocabulary and the final wrap-up are new unchecked tasks; old vocabulary
completion is retained on the vocabulary-list task. Completion percentages and
daily allocations can therefore change without losing earlier work. No SQL
migration is required.

The vocabulary map only supplies a combined page range (Lesson 11: pp. 16–20).
Both vocabulary steps explicitly use that range until their exact boundary
can be verified from the book. Other page ranges are the existing mappings,
not a fresh page-by-page textbook audit. The app remains an organiser for the
books rather than a replacement for the source material.

### Textbook-led path changelog (2026-09-03)

- Shared textbook order for Lessons and Plan; conversation comes first.
- Separate picture-vocabulary and vocabulary-list steps.
- Supporting videos, grammar points and workbook tasks grouped in-section.
- Corrected textbook task lookup to use section page keys rather than falling
  back to the entire lesson range.
- Retained existing record IDs; no SQL or changes to consolidation weeks.

Checks: run `node tests/lesson-flow.test.cjs`, `node --check app.js`, and
`node --check curriculum.js`.

Smoke-test checklist after deploying the changed files:

- Open Lesson 11: goals p. 13, conversation pp. 14–15, then the two vocabulary
  steps using the labelled combined range pp. 16–20.
- Compare the corresponding Plan days; conversation must precede vocabulary.
- Open a textbook section and play its audio without leaving the task.
- Open vocabulary/grammar supporting activities and verify their video links,
  workbook pages, existing notes and completion markers.
- Leave a workbook task unchecked after completing its textbook section;
  Continue should reveal that nested activity, including after a reload.
- Confirm picture vocabulary starts unchecked and old vocabulary completion
  remains attached to the vocabulary list.
- Check Lesson 12, mobile width, dark mode, and consolidation weeks 11–12.

Suggested commit: `fix: align lesson path and weekly plan with textbook order`
