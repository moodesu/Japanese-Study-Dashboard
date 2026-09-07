# Guided Lesson daily-use audit

## Issues found and fixed

- Completion sat outside the expanded task workspace, separated from Notes, study time and Pomodoro controls. It now lives in the Task record action row.
- A manually opened workspace was DOM-only state. Opening or closing it now updates the lesson route, and the routed activity remains the single current workspace through renders and browser history.
- Completion advancement could leave the final activity selected or overlook earlier unfinished work. Advancement now follows the flattened curriculum order, including nested grammar, video and workbook activities, then returns to any earlier unfinished activity.
- Guided Lesson note saves could issue overlapping cloud writes. Input remains locally immediate, cloud writes are debounced, and pending saves flush on blur, completion, tab backgrounding and page exit.
- Current, completed and upcoming activities were not consistently labelled. The workspace summary and current-card treatment now use factual completion state only.
- Section cards previously inherited only the main task's completion state, which hid unfinished workbook, video or grammar support when collapsed. Section styling and summaries now use aggregate completion while the main task keeps its own saved state.
- Mobile Notes and audio selectors used sub-16px text, risking iOS focus zoom. Editable controls now compute to at least 16px at phone widths, and primary task/audio controls have 44px touch targets.
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

## iPhone Edge smoke test

- Repeat the Lesson 11 flow in portrait and landscape; confirm no page-level horizontal scrolling.
- Focus Notes and audio selectors; the keyboard must not change the visual viewport scale.
- Confirm Notes, Pomodoro and Mark complete remain easy to reach and have comfortable tap targets.
- Open audio and verify the player and seek controls remain within the task card.
- Switch to another tab/app and return; confirm the task and open media are retained.
- Complete the task and confirm the next unfinished activity opens without an unexpected sideways movement or navigation jump.

## Suggested commit

`fix(study): polish guided lesson daily workflow`
