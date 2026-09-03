# Browser navigation update

Adds URL-based navigation to the existing Learning Hub without a framework migration. No SQL changes, dictionary conversion, image upload or furigana upload are required. This is a changed-files overlay for your current version; it has not been deployed to your live site.

## Install

1. Back up your current files or commit your current working version.
2. Extract **Japanese-Learning-Hub-navigation-changed-files.zip** into the repository, preserving the folder structure. The app changes are `router.js`, `app.js`, `repository.js`, `dictionary.js`, `index.html`, `styles.css`, `_headers` and `_redirects`. The ZIP also includes the routing test and this guide. Preserve any unrelated local edits.
3. Deploy through your existing GitHub/Netlify workflow. **Include `_redirects` beside `index.html` in the published directory.** It makes Netlify serve the app for nested page addresses while still serving existing assets normally. If you have added other rewrite rules locally, merge them and keep this app fallback last.
4. Refresh with Ctrl+Shift+R after deployment. The URL should now change as you navigate.
5. Run the smoke tests below, especially opening a nested address directly and refreshing it. If that produces a Netlify 404, check that `_redirects` was deployed to the correct directory.

The root `<base href="/">` keeps existing relative script, stylesheet and cover-image paths working from nested URLs. This package assumes the existing site is hosted at its domain root, as on your current Netlify site. It is not intended for opening `index.html` directly as a local file or serving from a subdirectory without adaptation.

## Addresses

| Screen | Route |
| --- | --- |
| Home | `/` |
| Study plan | `/plan/week/3` |
| Hub/book library | `/books` |
| Individual book | `/books/tobira-beginning-ii` |
| Active curriculum lesson | `/books/tobira-beginning-ii/lessons/11` |
| Specific lesson activity | Lesson URL with `?step={activity-id}` |
| Task dialog | Parent page URL with `?task={task-id}` |
| WaniKani | `/wanikani` |
| Repository list | `/repository` |
| Repository filters | `/repository?q=...&status=learning` |
| Saved sentence | `/repository/entries/{entry-id}` |
| New sentence / JSON import | `/repository/new` / `/repository/import` |
| Edit saved sentence | `/repository/entries/{entry-id}/edit` |
| Known grammar meaning | `/grammar/{guide-id}` |
| Grammar with sentence context | `/grammar/{guide-id}?entry={entry-id}` |
| Grammar label without a guide | `/repository/entries/{entry-id}/grammar/{encoded-label}` |
| Dictionary reader | `/dictionary/{dictionary-entry-id}` |
| Dictionary search / setup | `/dictionary` / `/dictionary/setup` |

Dictionary links opened from a grammar page carry the relevant sentence/guide/label context in query parameters. Search text can appear as `q`. An independent dictionary link is read-only with respect to grammar linking: no context-free reference is saved. A grammar guide can be opened without a sentence; the saved-sentence panel is omitted in that case.

IDs keep links stable when sentence wording changes and distinguish grammar meanings. An unknown or inaccessible entry shows a recoverable **Page unavailable** screen or a dictionary loading error, rather than silently displaying another record. Private links still require login and the existing account permissions. Sending somebody a URL does not grant them access.

Mapped books retain their existing book maps; this update does not invent scheduled lesson workspaces for books outside the active curriculum. Books without a map get a simple book page rather than falling back to the Hub. The current Beginning II book page links to its existing lesson workspaces.

## Expected browsing behaviour

- Browser Back/Forward follows the pages you actually visited. Back can still leave the site once you reach the beginning of your visit; the app does not trap you there.
- Navigation controls are real links where appropriate, supporting Ctrl/Cmd-click, middle-click, copying link addresses and opening another tab.
- A bookmark or pasted URL loads the requested screen. If signed out, sign in and continue to that route.
- Returning through browser history restores Repository filters, remembered scroll position and expanded details where recorded. Guided activity links open/scroll to their activity.
- Repository search/filter changes update the current history entry rather than adding one for every keystroke. Furigana toggles and ordinary repaints do not add history entries.
- Navigation away from a changed sentence form or edited JSON import asks before discarding it. Browser refresh/close uses the browser's own unsaved-change warning where supported. Draft contents are not stored in URLs or history; accepting discard does not create a recoverable draft.
- Navigation is blocked during a Repository save/import or dictionary upload/reference save, with a message to wait. Task notes retain their existing auto-save behaviour.
- Page titles identify the current section, lesson, week, grammar label or dictionary entry. The search dialog and Pomodoro remain tools, not extra pages.

Search phrases and record identifiers are visible in the address bar/browser history. Do not put secrets in search fields or assume a copied private URL conceals its parameters. History state itself stores only navigation metadata, scroll/focus/details positions—not sentence bodies, dictionary content, draft text, auth tokens or signed image URLs.

## Changelog

- Added `router.js` for route parsing, history integration, direct-link loading, navigation guards, page titles and UI-position restoration.
- Connected existing app, Repository and dictionary views to the router while keeping their existing data and rendering flows.
- Added real navigation links for main navigation, weeks, lessons, books, task links, Repository entries, grammar guides, dictionary entries and search results.
- Added independent grammar/dictionary reading routes and optional sentence context. Explicit grammar guide IDs select the requested meaning.
- Added a simple page for books that previously had no map destination.
- Added login-aware route restoration, stale-navigation checks, cache clearing on account changes, and a missing-page fallback.
- Added Netlify SPA fallback and root asset resolution, plus revalidation headers for app/router scripts.
- Added a routing test that boots the actual app renderers in a local DOM/history harness. No database schema or private-data changes.

## Smoke-test checklist

- [ ] Deploy all changed runtime files, including `_redirects` and `_headers`.
- [ ] Navigate Home → Plan → a week → Lessons → Hub → a book; verify addresses and browser tab titles change.
- [ ] Open the Beginning II book page and follow Lesson 11. Confirm the existing lesson activities still work.
- [ ] Navigate Repository → sentence → grammar → dictionary. Press browser Back three times, then Forward three times; verify the correct sentence, grammar meaning and dictionary entry each time.
- [ ] Filter/search the Repository, scroll down, open a sentence, then go Back. Verify filters and position are restored.
- [ ] Copy a lesson activity URL into a new tab. Verify its matching activity opens and is brought into view.
- [ ] Open/close a task dialog; verify Back/Forward handles it without creating a navigation loop.
- [ ] Ctrl/Cmd-click or middle-click a sentence/lesson/grammar link and verify it opens the matching page in another tab without changing the original tab.
- [ ] Refresh a nested lesson, sentence, grammar and dictionary URL. Check there is no Netlify 404 and scripts, covers and images load.
- [ ] Open a private deep link while signed out. Sign in and verify you return to that page. Sign out and confirm private dialogs/content are no longer visible.
- [ ] Where a test second account exists, verify a first-account private link does not expose the first account's cached content.
- [ ] Edit a sentence or paste changed JSON without saving. Navigate away and choose Cancel; verify text and URL remain. Repeat and choose Discard; verify navigation completes.
- [ ] Try browser Back with an unsaved edit and cancel; verify it does not duplicate history or discard the edit.
- [ ] Toggle furigana, then use Back once. Verify toggles did not add extra history steps.
- [ ] Confirm dictionary search, saved references, furigana and signed reference images still work.
- [ ] Re-test a JSON import, an Anki export, a lesson audio control and the Pomodoro.
- [ ] Try a nonexistent entry/invalid week URL and verify there is a usable error page with Home/Repository/Retry controls.

## Validation

Local automated checks passed for route parsing, real app rendering/navigation, initial deep links, sign-in return, sentence/grammar/dictionary context, standalone readers, Back/Forward, filter history, scroll restoration, edit protection, modifier links, task dialogs, book/lesson/activity URLs, invalid routes, account-cache isolation and history privacy. Existing lesson-flow, Repository grammar/import and dictionary/furigana tests passed. JavaScript syntax and whitespace checks passed.

The tests use a DOM harness and mocked History/Supabase APIs; they do not constitute a live Netlify deployment or real-browser end-to-end test. The manual refresh/auth/media checks above remain important.

Run locally:

```sh
npm install --prefix /tmp/jlh-dictionary-furigana --no-save linkedom@0.18.12
node tests/router.test.cjs
node tests/lesson-flow.test.cjs
node tests/repository-grammar.test.cjs
node tests/repository-grammar-import.test.cjs
node tests/dictionary.test.cjs
node --check router.js
node --check app.js
node --check repository.js
node --check dictionary.js
git diff --check
```

The routing test accepts `LINKEDOM_MODULE` for an alternative installed package. The older dictionary test's default dependency path is documented at its top; set the same `LINKEDOM_MODULE` when using a shared installation. No test package is shipped to app visitors.

Implementation references: [MDN History API](https://developer.mozilla.org/en-US/docs/Web/API/History_API/Working_with_the_History_API) and [Netlify rewrites](https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/).

## Suggested commit and rollback

```text
feat(navigation): add deep links and browser history across Learning Hub
```

No separate SQL commit is needed. To roll back, restore the backed-up runtime files through your usual Git workflow and remove the new routing integration/rewrite as part of that rollback. Saved study data, grammar links, dictionary entries and furigana annotations are not altered by this update.
