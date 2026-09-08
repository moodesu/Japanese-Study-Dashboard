# Authoritative Learning Hub page shell

## Shared primitives

Primary routes now use one page-level design system:

- `app-page` — canonical width and safe shrinking behaviour
- `app-page-header` — compact tinted route header, typography, border and spacing
- `app-page-toolbar` — shared action alignment and wrapping
- `app-page-breadcrumb` — subtle in-header back navigation
- `app-compact-stats` — compact counts, status and filter groups
- `app-content-card` / existing `panel` — standard working surfaces

Route-specific CSS may arrange its actual content, but new primary routes should use these primitives instead of defining another hero, title scale, max-width, or toolbar system.

## Changelog

- Migrated Home, Plan, lesson detail, Hub, book detail, Repository, Grammar Library, Grammar Guide and WaniKani headers to the shared tinted header.
- Reduced Home's Start here area to a compact next-action card without changing scheduling or next-incomplete behaviour.
- Integrated Grammar Library navigation and Import JSON into its header.
- Aligned grammar filters with the compact shared stat/filter treatment.
- Integrated grammar-guide back navigation and pending actions into its shared header.
- Applied the shared toolbar to Repository and WaniKani actions.
- Centralised title scale, page spacing, surface treatment, dark mode and mobile header behaviour.

No data model, route, task, media, authentication, Repository, Grammar, or SQL behaviour changed.

## Smoke-test checklist

Desktop and dark mode:

- Compare Home, Plan, Lesson 11, Hub, Repository, Grammar Library, a Grammar Guide and WaniKani.
- Confirm each has the same compact tinted header rhythm and 30–36px internal-page title scale.
- Confirm Home Start here no longer contains excess empty space.
- Confirm Grammar Library back/import controls are integrated and all filters/search still work.
- Confirm Repository Capture, Import, Grammar Library and both Export actions still work.
- Confirm lesson tasks, media, reference state, Pomodoro and book covers are unchanged.

Mobile/iPhone:

- Repeat the same routes and confirm headers collapse to compact single-column cards.
- Confirm no giant route title, horizontal overflow, bottom-nav regression or More-menu regression.
- Confirm editable controls remain at least 16px where required for iOS focus behaviour.

Suggested commit: `style(ui): make shared Learning Hub shell authoritative`
