# Learning Hub visual-system refresh

## Changelog

- Extended the existing light/dark variables with reusable interaction, status, radius, control-height and spacing tokens.
- Standardised textbook actions as compact teal icon-and-label controls using the exact printed page or range.
- Retained quiet secondary controls, green completion metadata and the existing warm Pomodoro treatment as separate visual roles.
- Flattened Guided Lesson steps, task workspaces and textbook-map rows with subtle tinted surfaces and restrained borders.
- Strengthened the established title, body, secondary and uppercase teal metadata hierarchy.
- Restyled page badges and supporting tags as metadata rather than competing actions.
- Preserved the existing mobile task flattening while allowing resource controls and content rows to wrap safely.
- Added deliberate dark-mode equivalents rather than colour inversion.

## Desktop smoke test

- Open Lesson 11 and confirm current, upcoming and completed steps are distinct without heavy nested outlines.
- Open Can-do goals, Grammar and Kanji workspaces; confirm Notes, completion, Pomodoro and media controls remain functional.
- Confirm textbook actions use the same teal book-icon treatment and show `p.13` or the exact printed range.
- Open Lesson reference → Textbook and confirm rows are compact, page badges are secondary, status is quiet and the resource action is dominant.
- Toggle dark mode and confirm teal actions, green completion states, muted metadata and warm Pomodoro controls remain distinct.

## iPhone Edge smoke test

- Check Can-do goals and Grammar; the resource controls must fit without sideways scrolling.
- Confirm `View pp.23–34` wraps only as a unit and does not break Japanese or page text character-by-character.
- Check the Textbook content map in portrait and landscape; rows should become one column without restoring desktop gutters.
- Focus Notes and selectors and confirm the existing no-focus-zoom behaviour remains intact.
- Open a PDF, audio and video resource and confirm the visual refresh has not changed their state or navigation behaviour.

## Suggested commit

`style(ui): refine Learning Hub visual system and resource actions`
