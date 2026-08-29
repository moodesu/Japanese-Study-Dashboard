# Japanese Learning Hub

## Current product roadmap

The dashboard includes a living **Learning Hub improvements** checklist. It tracks the refinements being implemented as the app is used. The current v1 work includes:

- [x] Tighten Today / Start Here
- [x] Improve task completion with useful time/confidence/notes context
- [x] Mobile-first study flow improvements
- [x] Lightweight review queue
- [x] Reusable Learning Hub / library structure
- [x] Global search across lessons, tasks, books and task notes
- [x] Study history based on logged focus time
- [x] Clearer task purpose and study guidance
- [x] Focus mode for individual tasks
- [x] Cross-resource architecture for future books and tools
- [ ] Advanced analytics — deliberately deferred until real study data shows what is useful

The roadmap is stored locally so checking or unchecking an item does not require another database table.

## Private lesson audio

TOBIRA Beginning Japanese II Lessons 11–20 are mapped to the publisher's
original MP3 filenames. The files are not committed to GitHub.

1. Run the updated `supabase-schema.sql` in the Supabase SQL Editor. This creates
   the private `lesson-audio` bucket and authenticated-user policies.
2. Upload `L11-13.zip`, `L14-16.zip`, `L17-20.zip`, and
   `reading_L11-20.zip` as extracted folders inside the `lesson-audio` bucket.
3. Keep the four folder names and all 259 original MP3 filenames unchanged.
4. Open a lesson while signed in and select a track. The app requests a
   temporary six-hour signed playback URL; no permanent public audio URL or
   publisher password is stored in the project.

Expected object paths include `L11-13/L11-01.mp3`,
`L14-16/L14-01.mp3`, `L17-20/L17-01.mp3`, and
`reading_L11-20/L11.mp3`.

### Recommended daily flow

**Dashboard → Start here → physical textbook/workbook → complete task → next task**. The app remains an organiser for the books rather than a replacement for the source material.
