# Conversation shadowing update

## Changelog

- Added **会話 · Conversation shadowing** to Tobira Beginning II Lessons 11–20, after grammar and its supporting workbook practice, before 話しましょう.
- Scheduled the same task on day 5 of weeks 1–10. It shares completion, notes, mastery and confidence with its lesson workspace.
- Added a 15–20-minute routine: understand the passage, choose 20–30 seconds, listen/pause/repeat to prepare, then speak just behind the audio without pausing for 3–5 passes. Reduce reliance on the text and try normal speed when comfortable.
- Reused each lesson’s existing conversation page range and private 会話 audio. Track selection, speed, seeking and −10s remain available inside the task. This does not add automatic A–B looping or recording.
- New stable task IDs: `b2-l11-textbook_conversation_shadowing` through `b2-l20-textbook_conversation_shadowing`. Existing IDs, notes and completion remain untouched. The new task starts incomplete, including in previously completed lessons; progress totals therefore increase by one task per lesson.
- The initial conversation pass, optional shadowing habits, listening tasks and consolidation weeks 11–12 remain unchanged. Existing day time targets are unchanged; allow another 15–20 minutes for this new core step or use part of your optional-input time.

## Install

This update builds on the current working app, including the preceding navigation update.

1. Extract the changed-files ZIP into the repository, preserving its folders.
2. Replace `app.js` and `curriculum.js` together. The ZIP also includes the updated `tests/lesson-flow.test.cjs` and this guide.
3. Commit and deploy through the usual Netlify workflow, then hard-refresh the browser.

No SQL/database migration, new dependency, audio upload or dictionary upload is required. Existing progress uses the normal task-state saving mechanism. No deployment has been performed by this update.

## Smoke-test checklist

- [ ] Open Lesson 11. Confirm the new shadowing step follows grammar/supporting practice and precedes speaking.
- [ ] Confirm its page range matches the opening conversation, not the grammar section.
- [ ] Open its workspace and check the six instructions and conversation audio controls.
- [ ] Play the audio; test track selection, 0.75×/1× speed, −10s and seeking. Confirm playback stays within the task.
- [ ] Switch between the first-pass and shadowing audio controls; confirm only the selected player plays.
- [ ] Add a shadowing note and mark it complete. Check the same record in Plan week 1, day 5, then reload and check persistence.
- [ ] Confirm the opening conversation retains its separate notes and completion.
- [ ] Open a previously completed lesson: the new shadowing task should be unfinished and offered by Continue.
- [ ] Repeat the page/audio check in Lesson 20 and confirm week 10, day 5 includes its task.
- [ ] Open a shadowing task through a lesson link, refresh it, and test browser Back/Forward.
- [ ] Confirm optional Shadowing and consolidation weeks 11–12 still work as before.

## Validation

Local automated checks cover Lessons 11–20: ordering, Plan parity, exact conversation pages, real audio-control markup, stable progress IDs, independently incomplete shadowing, Continue behavior and unchanged consolidation scheduling. The routing regression suite and JavaScript syntax checks also pass. Live audio playback, cloud persistence and deployed-browser checks remain manual checks above.

## Suggested commit message

```text
feat(lessons): add conversation shadowing after grammar study
```
