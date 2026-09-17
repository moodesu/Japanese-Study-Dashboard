-- Phase 6B — Safe Supabase security hardening
-- Mirrors the migration already applied directly to the connected project.
--
-- Changes:
--   * immutable search_path for set_updated_at()
--   * rls_auto_enable() no longer callable through the API
--   * canonical resolver uses SECURITY INVOKER so table RLS remains authoritative

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end $$;

revoke all on function public.rls_auto_enable() from public, anon, authenticated;

alter function public.resolve_canonical_grammar_label(text) security invoker;
revoke all on function public.resolve_canonical_grammar_label(text) from public, anon;
grant execute on function public.resolve_canonical_grammar_label(text) to authenticated;
