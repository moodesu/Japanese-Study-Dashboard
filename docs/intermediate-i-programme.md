# TOBIRA Intermediate Japanese I programme

The Hub registers TOBIRA Intermediate Japanese I as a fully mapped, **planned** 12-week programme. It does not become active during deployment or data loading; activation remains an explicit per-user action in Hub.

## Programme structure

- Weeks 1–3: Lessons 1–3
- Week 4: Unit 1 Project and consolidation
- Weeks 5–7: Lessons 4–6
- Week 8: Unit 2 Project and consolidation
- Weeks 9–10: Lessons 7–8
- Week 11: Unit 3 Project and consolidation
- Week 12: unfinished work, full-course consolidation and final production

Lessons use a reading-led sequence: orientation, Before Starting, Reading 1, Reading 2, dialogue listening and close study, shadowing, conversation practice, grammar/expression work, contextual kanji, culture/language notes and production.

## Resource rules

- Printed textbook page numbers remain visible in the UI.
- Private split PDFs use the existing `textbook-pdfs` bucket and signed new-tab flow. Expected object names are `lesson-01.pdf` through `lesson-08.pdf` and `unit-01-project.pdf` through `unit-03-project.pdf`.
- Official publisher MP3s, video worksheets and other web resources remain direct external resources.
- The 111 MP3 tracks are grouped by their actual task. Vocabulary groups are attached to Before Starting, Reading or Dialogue work rather than exposed as one generic playlist.
- Grammar entries retain publisher lesson/number/heading/gloss metadata and open a filtered canonical Grammar Library search. Importing the programme does not create canonical guide duplicates.
- WaniKani remains the kanji SRS; Hub kanji tasks are contextual reinforcement only.

## Lifecycle and preservation

The existing programme transaction still enforces one active programme per user. Switching or completing a programme does not alter task rows, notes, Pomodoro sessions, Repository data or grammar data. Completed programmes expose an explicit **Reopen programme** action and retain their existing study progress.

No new database table is required for this content map. Apply the updated programme-lifecycle SQL separately if the earlier version that prohibited reopening completed programmes has already been installed.
