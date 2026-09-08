# Programme lifecycle

## Changelog

- Added per-user `planned`, `active` and `completed` programme records.
- Enforced at most one active programme per user at the database level.
- Added transactional activate, switch, complete-and-activate, and complete
  operations.
- Made Hub the explicit programme chooser and lifecycle manager.
- Added completion suggestions without automatically completing or selecting
  a programme.
- Added no-active-programme states for Home, Plan and Lessons.
- Preserved completed programme progress, notes and study history, with a
  historical lesson entry point from Hub.
- Added an explicit Reopen action for completed programmes; reopening changes
  lifecycle state only and retains existing task progress and study history.
- Kept books separate from programmes; incomplete programme mappings cannot
  be activated.

## Data safety

Programme transitions only update `user_programmes`. Existing task IDs and the
rows that store completion, notes and Pomodoro sessions are not copied, reset
or deleted. `completed` is the historical archive state.

## Smoke test

1. Apply `migrations/20260908_programme_lifecycle.sql` in Supabase.
2. Sign in and confirm Beginning Japanese II appears under Active programme.
3. Confirm existing task completion, notes and study time are unchanged.
4. Complete a few tasks and verify Home, Plan and Lessons still follow the
   active programme.
5. With all required tasks complete, confirm the completion suggestion appears
   but the programme remains active until confirmed.
6. Complete the active programme and confirm Hub shows it under Completed and
   shows the explicit next-programme chooser.
7. Confirm Home, Plan and Lessons show a choose-programme state rather than old
   scheduled work.
8. Open the completed programme's lessons from Hub and inspect its preserved
   completion, notes, media and study time.
9. Reopen the completed programme and confirm its existing progress is still
   present and it becomes active again.
10. With Intermediate I available, test Activate, Switch
   without completing, and Complete current & activate.
11. On mobile, confirm lifecycle cards and confirmation actions fit without
    horizontal overflow; repeat in dark mode.

Suggested commit: `feat(programmes): add explicit programme lifecycle`
