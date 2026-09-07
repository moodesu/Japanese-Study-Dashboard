# Guided Lesson task Pomodoro

## Changelog

- Added a compact task-linked Pomodoro control to every expanded Guided Lesson task workspace.
- Added live Start, Pause, Resume, remaining-time, and “linked elsewhere” states using the existing global Pomodoro.
- Added accumulated `Studied` time from the existing task session records.
- Prevented an active or paused timer from being silently reassigned to another task.
- Starting from a lesson task now opens the existing widget and begins/resumes a work session for the exact Guided Lesson task ID.
- Kept the global tomato navigation, widget, session logging, task completion, notes, audio, and task IDs unchanged.

## Smoke-test checklist

- Open Lesson 11 → Conversation — first pass and expand its task workspace.
- Confirm `🍅 Start Pomodoro` and `Studied: 0m` (or existing time) appear under Task record.
- Start the timer and confirm the floating widget opens with “Conversation — first pass.”
- Confirm the inline control shows the remaining time and Pause.
- Pause and resume from the inline control.
- Complete or skip focus and confirm the recorded time appears after reopening the task.
- While one task is running, open another task and confirm its control says the timer is linked elsewhere and does not reassign it.
- Finish/reset the first timer, then start from the second task and confirm its exact task ID is linked.
- Check the control wraps cleanly on a narrow mobile screen.
- Confirm the global tomato button and unlinked/habit timer workflows still work.
