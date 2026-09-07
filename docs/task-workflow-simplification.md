# Task workflow simplification

## Changelog

- Removed Mastery and Confidence controls from Guided Lessons and the task modal.
- Made task and lesson status depend only on completion.
- Removed rating-driven attention lists, counts, badges, and review priority.
- Kept the ordinary elapsed-time review queue for completed work.
- Limited task-state cloud writes and cloud hydration to completion timestamps and notes.
- Preserved historical Supabase columns and values; no SQL migration is included.
- Retained task-linked Pomodoro controls, accumulated study time, and automatic timer settlement when its task is completed.

## Smoke-test checklist

- Open Lesson 11 and expand a task: Notes, study time, Pomodoro, and completion remain; no Mastery or Confidence controls appear.
- Edit task notes, reload, and confirm the notes persist.
- Complete a task and confirm lesson and programme progress update from completed tasks only.
- Start a task-linked Pomodoro, complete that task, and confirm elapsed time is logged and the timer becomes idle.
- Complete another task while a different or unlinked timer is active and confirm that timer is unaffected.
- Load an account with historical Mastery/Confidence values and confirm the values are neither displayed nor used.
- Check Dashboard, Plan, Lessons, task modal, Continue, and the time-based review queue for obsolete rating labels or behaviour.

## Suggested commit

`refactor(tasks): remove mastery and confidence workflow`
