# Phase 6B — Supabase security hardening

This migration has already been applied directly to the connected Japanese Study Dashboard Supabase project.

## Fixed

- `public.set_updated_at()` now has a fixed empty `search_path`.
- `public.rls_auto_enable()` is no longer executable by `public`, `anon`, or `authenticated`.
  It remains usable as the internal DDL event-trigger function.
- `public.resolve_canonical_grammar_label(text)` now runs as `SECURITY INVOKER`,
  allowing existing RLS to remain the authority for row access.

## Verified

The canonical resolver still works after switching to invoker rights:

- `〜たら` resolves as an exact canonical.
- `〜てたら` correctly resolves to both `〜たら` and `〜ている`, because it is a
  stored combined form contributing both constructions.
- an unknown label resolves to no canonical.

## Remaining Supabase advisor notices

The remaining `SECURITY DEFINER` warnings are the application RPCs that are
intentionally called by authenticated users. They all derive the caller from
`auth.uid()` and are part of the current app API. They should be reviewed as a
separate RPC-hardening task rather than mechanically converted.

`private.app_owner` has RLS and no policy by design; authenticated clients have
no direct access to the table.

Leaked-password protection is an Auth project setting rather than a database
migration.

Performance advisors currently report RLS init-plan opportunities and missing
foreign-key indexes. Those are suitable for a later performance pass and are
not required for Phase 6 canonical resolution.
