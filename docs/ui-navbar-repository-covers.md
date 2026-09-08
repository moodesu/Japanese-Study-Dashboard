# Navbar, Repository, and library-cover cleanup

## Changelog

- Changed desktop navigation items to a consistent icon-above-label layout with 20px Font Awesome icons.
- Kept primary labels visible and added an intermediate-width fallback that hides secondary utility labels before collisions occur.
- Removed the full account email from the crowded header while retaining signed-in state and authentication actions.
- Replaced the Repository hero-like heading with a compact workspace heading and aligned action toolbar.
- Grouped the existing Anki and TSV actions beneath one Export menu without changing either export implementation.
- Preserved compact Repository status counts and the existing filter panel.
- Restored the library renderer's known-good relative cover paths after confirming the named Tobira assets exist and are tracked.
- Kept the designed cover fallback and suppressed browser broken-image symbols when an asset genuinely fails.

No database or SQL changes are included.

## Smoke-test checklist

### Desktop and tablet

- At a wide desktop size, confirm every navbar icon is centred above its label and no labels overlap.
- Confirm Repository, Grammar, WaniKani, and Pomodoro remain separate controls.
- At an intermediate width, confirm secondary labels hide while Home, Plan, Lessons, and Hub remain labelled.
- Confirm Furigana, Theme, Account/Login, and Logout still work.

### Repository

- Confirm the compact Japanese Repository heading and action row fit without oversized whitespace.
- Open Export and test both Export Anki and Export TSV.
- Confirm Capture, Import JSON, Grammar Library, filters, and status-count filters behave as before.
- Check the action row and Export menu in light and dark modes and at mobile width.

### Hub covers

- Confirm real artwork appears for Beginning Japanese II, Intermediate Japanese I, Gateway, Grammar Power, and Kanji Power.
- Confirm covers are centred and fully visible without stretched artwork.
- Confirm a deliberately unavailable cover shows the designed fallback and never a browser broken-image icon.

Suggested commit: `fix(ui): clean navbar, repository header and library covers`
