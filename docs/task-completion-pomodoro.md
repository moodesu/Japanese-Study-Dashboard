# Stop a task Pomodoro on completion

## Changelog

- Added Pomodoro settlement to the shared task-completion path used by Guided Lessons, Plan tasks, dashboard tasks, and the task modal.
- Completing the task linked to a running or paused work timer now records its actual elapsed time using the existing session logger.
- The matching timer is reset to an idle work session and its task link is cleared without automatically starting a break.
- An idle timer still linked to the completed task is detached so the widget cannot continue showing a completed task.
- Unlinked timers and timers linked to other tasks remain untouched.
- Added regression coverage for running, paused, matching, and different-task cases.

## Smoke-test checklist

- Start a Pomodoro for Lesson 11 → Conversation and let it run for 30–60 seconds.
- Mark Conversation complete and confirm the timer immediately becomes idle.
- Confirm the widget no longer names Conversation and no further time accumulates.
- Confirm the elapsed time appears against Conversation after completion.
- Repeat after pausing the linked timer; confirm elapsed work is saved and the link is cleared.
- Start a timer for another lesson task, then complete Conversation; confirm the other timer continues unchanged.
- Start an unlinked Pomodoro, complete Conversation, and confirm the timer continues unchanged.
- Confirm task notes, completion, inline media, and global Pomodoro controls still behave normally.
