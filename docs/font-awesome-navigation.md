# Font Awesome navigation icons

## Changelog

- Added one pinned Font Awesome Free 6.7.2 SVG-with-JS loader through the existing jsDelivr allowance.
- Standardised destination icons across the desktop navbar, mobile bottom navigation, and mobile More menu.
- Replaced the WaniKani Japanese glyph with `fa-paintbrush` everywhere it appears in navigation.
- Made Furigana, Theme, Account, and Logout icons reflect their current action without applying study-content furigana.
- Kept text labels on primary navigation and accessible labels/tooltips on icon-only controls.
- Added responsive icon sizing and compact desktop utility labels without changing routes or breakpoints.

No icon substitutions were required. No database or SQL changes are included.

## Smoke-test checklist

### Desktop

- Confirm Home, Plan, Lessons, and Hub display the agreed icon and label.
- Confirm Repository, Grammar access, WaniKani, and Pomodoro retain their existing destinations.
- Confirm WaniKani uses a paintbrush and no Japanese-character navigation icon remains.
- Toggle light/dark mode and confirm the moon/sun action icon updates.
- Sign in/out and confirm Account/Logout presentation and authentication behaviour remain correct.

### Mobile

- Confirm the bottom navigation shows house, calendar, open book, and layer group with labels.
- Open More and confirm Repository, Grammar, WaniKani, Pomodoro, Furigana, Theme, and Account use the agreed icons.
- Confirm WaniKani uses a paintbrush and navigation icons never acquire furigana.
- Toggle theme and authentication state and confirm their icons update.
- Check active states, label alignment, tap targets, and absence of horizontal overflow.

Suggested commit: `style(nav): standardize Font Awesome navigation icons`
