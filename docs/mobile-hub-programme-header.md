# Mobile Hub programme header cleanup

## Changelog

- Replaced the full programme-name capsule with normal programme title and duration metadata.
- Retained only a compact `Active` status chip.
- Flattened the active-programme block into a full-width, left-aligned mobile row within the shared page header.
- Preserved the existing desktop block, programme data, selection logic and dark-mode surfaces.
- Reduced the visual weight of the mobile More control while retaining its label, tap target, accessibility attributes and menu behaviour.

No database or SQL changes are included.

## Smoke-test checklist

- Open Hub at an iPhone-sized width.
- Confirm `TOBIRA Beginning Japanese II` appears as ordinary title text, followed by `12-week foundation`.
- Confirm only `Active` appears as a small status chip.
- Confirm the programme name does not wrap inside a large oval or cause horizontal overflow.
- Confirm the More control remains labelled, easy to tap, and opens/closes the existing menu.
- Repeat in dark mode and at desktop width.

Suggested commit: `fix(mobile): refine Hub programme header`
