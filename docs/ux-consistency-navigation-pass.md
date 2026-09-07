# UX consistency and responsive navigation pass

## Changelog

- Corrected Login/Logout presentation so hidden authentication actions cannot be displayed by generic button CSS.
- Made the next unfinished Guided Lesson activity the automatic open workspace; completed activities collapse after completion while remaining manually inspectable.
- Removed repeated page ranges from Guided Lesson textbook buttons and Textbook content-map rows.
- Restyled Hub and Repository headings, controls, statistics and content density using shared application-surface patterns.
- Changed book covers to root-relative production paths and added a deliberate title/series fallback for unavailable assets.
- Replaced the compressed mobile desktop navigation with a compact Learning Hub top bar, fixed Home/Plan/Lessons/Hub bottom navigation and a More menu for Repository, Grammar, Search, WaniKani, Pomodoro, furigana, theme and account access.
- Added iPhone safe-area spacing and raised Pomodoro/toast surfaces above the mobile navigation.

## Smoke test checklist

### Authentication

- Signed in: confirm only Logout and the compact account state are shown.
- Sign out: confirm the private login gate appears and no synced-account state is shown.
- Sign in again and verify navigation and the current route work normally.

### Guided Lesson

- With tasks 1–2 complete and task 3 incomplete, reload the lesson: only task 3 should open.
- Complete task 3: it should collapse and the next unfinished activity should open.
- Manually reopen a completed task and confirm its notes/media remain available.
- Confirm a Guided Lesson textbook task says `Open textbook`, while its header carries the page range.
- Confirm a Textbook content-map row says `View pp.…` without a separate duplicate page badge.

### Hub and Repository

- Compare Hub, Lessons and Repository headings, spacing, buttons and surfaces.
- Verify the five Tobira cover assets render in production with correct filename case.
- Temporarily test a missing cover path and confirm a designed title/series cover appears instead of a broken-image icon.
- Check Repository counts are compact, filters remain usable, and Capture/Import/Grammar/export actions still work.

### Physical iPhone Edge

- Confirm the top bar contains only Learning Hub and More.
- Confirm the fixed bottom bar shows Home, Plan, Lessons and Hub without scrolling or wrapping.
- Open More and exercise Repository, Grammar Library, Search, WaniKani, Pomodoro, furigana, theme and account actions.
- Confirm content, Pomodoro and toasts are not hidden behind the bottom safe area.
- Open task Notes and Repository inputs; confirm there is no iOS focus zoom or horizontal page movement.

## Suggested commit

`fix(ux): unify app surfaces and redesign responsive navigation`
