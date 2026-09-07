# Compact Learning Hub application shell

## Changelog

- Replaced the global `TOBIRA Foundation` hero and separate navigation row with one compact, sticky Learning Hub application header.
- Kept Home, Plan, Lessons, Hub, Repository, Search, WaniKani, Pomodoro, furigana, theme and authentication controls in the unified shell.
- Condensed account status and retained mutually exclusive Login/Logout behaviour.
- Changed the lesson summary to a compact course/title region with lightweight completion metrics and a low-height progress bar.
- Simplified the Guided Lesson header and progress summary so lesson tasks appear substantially earlier in the viewport.
- Added a two-row compact shell at tablet/mobile widths without restoring a hero header or compromising the existing mobile task layout.
- Preserved the existing visual tokens, resource buttons, task behaviour and dark mode.

## Smoke test

### Desktop — 1920×1080

- Open Lesson 11 and confirm the Learning Hub header is one compact sticky navigation row.
- Confirm `TOBIRA Foundation` is not displayed as a global hero.
- Confirm the lesson title, both progress metrics, progress bar and the beginning of the Guided Lesson path are visible with materially less scrolling.
- Exercise every navigation item and confirm route/back-forward behaviour is unchanged.
- Toggle furigana and theme; sign out and sign back in.
- Open Pomodoro and WaniKani from the compact header.

### Physical iPhone Edge

- Open Lesson 11 and confirm the header remains compact, with utilities on the first row and navigation contained on the second.
- Confirm the header, navigation and lesson title do not cause horizontal document scrolling.
- Scroll the Guided Lesson and confirm the sticky header remains usable without obscuring task controls.
- Open a task, enter Notes and verify the existing 16px editable-control rule still prevents focus zoom.
- Toggle furigana/theme, open Pomodoro and return to the current lesson task.
- Confirm existing nested-task, media and textbook resource layouts remain intact.

## Suggested commit

`style(shell): adopt compact Learning Hub app header and navigation`
