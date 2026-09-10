-- Phase 2E — allow the authenticated Learning Hub client to read reviewed
-- canonical ↔ DOJG reference mappings.
--
-- Phase 2B created RLS policies but omitted the table-level SELECT grant.
-- PostgreSQL requires both the GRANT and a passing RLS policy, so the browser
-- could not read grammar_dictionary_references even though SQL Editor queries
-- worked as the database owner.
--
-- Rerunnable.

begin;

alter table public.grammar_dictionary_references enable row level security;

drop policy if exists grammar_dictionary_references_owner_select
  on public.grammar_dictionary_references;

create policy grammar_dictionary_references_owner_select
  on public.grammar_dictionary_references
  for select
  to authenticated
  using (
    user_id = auth.uid()
    and private.is_app_owner()
  );

revoke all on public.grammar_dictionary_references from anon, authenticated;
grant select on public.grammar_dictionary_references to authenticated;

commit;

-- SQL Editor verification: should show authenticated has SELECT.
select
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema='public'
  and table_name='grammar_dictionary_references'
  and grantee in ('anon','authenticated')
order by grantee, privilege_type;
