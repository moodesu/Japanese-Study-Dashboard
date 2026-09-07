# Guided Lesson daily-use audit

## Issues found and fixed

- Completion sat outside the expanded task workspace, separated from Notes, study time and Pomodoro controls. It now lives in the Task record action row.
- A manually opened workspace was DOM-only state. Opening or closing it now updates the lesson route, and the routed activity remains the single current workspace through renders and browser history.
- Completion advancement could leave the final activity selected or overlook earlier unfinished work. Advancement now follows the flattened curriculum order, including nested grammar, video and workbook activities, then returns to any earlier unfinished activity.
- Guided Lesson note saves could issue overlapping cloud writes. Input remains locally immediate, cloud writes are debounced, and pending saves flush on blur, completion, tab backgrounding and page exit.
- Current, completed and upcoming activities were not consistently labelled. The workspace summary and current-card treatment now use factual completion state only.
- Section cards previously inherited only the main task's completion state, which hid unfinished workbook, video or grammar support when collapsed. Section styling and summaries now use aggregate completion while the main task keeps its own saved state.
- Mobile Notes and audio selectors used sub-16px text, risking iOS focus zoom. Editable controls now compute to at least 16px at phone widths, and primary task/audio controls have 44px touch targets.
- Nested supporting tasks accumulated card, workspace and body padding on phones. Mobile support now uses one compact accent border, removes redundant nested boxes and gives instructions, Notes and controls nearly the full available task width.
- The desktop numbered-step column continued down the full card on phones. Mobile section cards now place the smaller badge in the resource header and return the title, progress, instructions and workspace to the full card width.
- Lesson reference was a long DOM-only disclosure, so re-renders could collapse it and audio controls were buried among unrelated maps. Its open state and active resource tab now persist for the lesson; compact tabs foreground one resource, while the shared audio player retains track, position and speed and pauses task audio when necessary.
- Study time by activity inherited a desktop track column on phones. Its mobile card now fills the available width and uses a readable activity/duration row without page overflow.
- Lesson video links previously left the study workspace. Guided tasks and Lesson reference now use one lazy, responsive YouTube embed at a time, with the original link retained as a fallback.
- Textbook page mappings previously identified the paper pages but could not open the private book. Textbook tasks and the Textbook reference tab now open the matching signed lesson PDF in a separate browser tab; the Hub keeps its task/reference state and printed page labels remain unchanged.
- Obsolete task-rating styles remained after removal of Mastery and Confidence. Those unused selectors were removed.

## Deferred

- Grammar Library navigation, lesson-to-grammar integration and WaniKani-aware kanji tasks remain later roadmap work.
- Physical-device behaviour still requires a final check in Microsoft Edge on an iPhone; automated source tests cannot reproduce iOS visual-viewport and media-policy behaviour.
- The existing signed-audio URL cache and inline audio lifecycle were retained because the current regression tests confirm the intended state model and no new defect was identified.

## Desktop smoke test

- Open Lesson 11 and confirm the first unfinished activity is labelled Current task and opened.
- Verify the task shows its page/resource, instructions, Notes, studied time, Pomodoro and completion control without opening a modal.
- Edit Notes, blur the field, reload and confirm the text persists.
- Complete a top-level task, nested grammar item and supporting workbook/video item; each should advance to the correct next unfinished activity and update the `step` URL.
- Complete only a section's main task, collapse it and confirm the card says a supporting task remains rather than appearing complete; complete the support and confirm the section then receives completed styling.
- Leave an earlier activity unfinished, complete the last activity and confirm Continue returns to the earlier unfinished activity.
- Start a linked Pomodoro and complete its task; elapsed time should be logged and the timer should become idle.
- Open inline audio, select a track, pause after several seconds, switch tabs and return; the same task, panel, track and approximate position should remain.
- Use browser Back/Forward between lesson activities and confirm the routed workspace remains current.
- Open a mapped publisher video from both a Guided task and Lesson reference. Confirm it plays inline, only one lesson embed is active, and **Open on YouTube ↗** still works.
- Open Lesson reference → Textbook → Kanji and Grammar. Confirm each opens the current lesson PDF in a new tab at the converted local page; switching back should reveal the unchanged lesson/reference state and scroll position.

## iPhone Edge smoke test

- Repeat the Lesson 11 flow in portrait and landscape; confirm no page-level horizontal scrolling.
- Focus Notes and audio selectors; the keyboard must not change the visual viewport scale.
- Confirm Notes, Pomodoro and Mark complete remain easy to reach and have comfortable tap targets.
- Open audio and verify the player and seek controls remain within the task card.
- Open Lesson 11 → Kanji → Workbook 1 · Kanji practice and confirm the supporting workspace is wide, its hierarchy remains clear, and its instructions and Notes do not sit inside repeated bordered boxes.
- Check Conversation, Kanji, Grammar, Reading and Listening cards: the step number should sit beside the resource line without leaving a blank gutter beneath it or colliding with the back-to-top control.
- Open Lesson reference → Audio, select Listening 2, pause around 20 seconds, switch tabs/apps and return; confirm the reference and Audio tab remain open with the same track and position. Switch to Videos and repeat, then explicitly close the reference and confirm it stays closed.
- Switch to another tab/app and return; confirm the task and open media are retained.
- Complete the task and confirm the next unfinished activity opens without an unexpected sideways movement or navigation jump.
- On Study history, confirm Study time by activity spans the full card, labels wrap naturally, durations align right and the page cannot be dragged sideways.
- Open a lesson video and confirm its 16:9 player uses nearly the full available width without leaving the lesson.
- Open the Kanji textbook range, confirm the PDF opens in a new Edge tab, then switch back and confirm the same task/reference tab is still selected.

## Database setup for the private textbook

- Apply `migrations/20260908_private_textbook_pdf.sql` to an existing Supabase project.
- Upload only the private PDF object described in `README.md`; never add it to Git.
- Upload the exact `lesson-11.pdf` through `lesson-20.pdf` filenames into the bucket root; their printed boundaries are centrally mapped in `textbook-pdf.js`.

## Suggested commits for this media pass

- `fix(mobile): align study activity history`
- `feat(media): embed lesson youtube videos`
- `feat(reference): add private textbook page viewer`
- `fix(textbook): use lesson-specific Tobira II PDFs`
- `fix(textbook): open private lesson PDFs in new tab`
