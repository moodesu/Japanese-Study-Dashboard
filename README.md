# TOBIRA Foundation — private Japanese study dashboard

A small Netlify-friendly web app backed by Supabase Auth + Postgres.

## Setup
1. Create a Supabase project.
2. In Supabase SQL Editor, run `supabase-schema.sql`.
3. Create your one user under Authentication → Users.
4. Put your Project URL and publishable/anon key in `supabase-config.js`.
5. Push this folder to Git and publish the repository with Netlify.

Never put the Supabase service-role/secret key in client-side files.

## App structure
- `index.html` — app entry point.
- `app.js` — authentication, dashboard, weekly plan, lesson workspace and persistence.
- `curriculum.js` — Beginning II lesson/page mapping and task instructions.
- `styles.css` — responsive UI.
- `supabase-config.js` — your public Supabase project URL + publishable/anon key.
- `supabase-schema.sql` — tables and RLS policies.

## Curriculum
Beginning Japanese II Lessons 11–20 are the core 10-week course, followed by two consolidation weeks.

Each lesson links the assigned Workbook 2 vocabulary/particle/grammar/comprehensive/listening pages and Workbook 1 kanji/reading/writing pages supplied from the contents pages.

The lesson workspace is the main place to study: open a lesson, work through the mapped pages, record notes, mark completion, and run a mastery check. A mastery check should let you skip repetitive practice only when the skill is genuinely automatic.
