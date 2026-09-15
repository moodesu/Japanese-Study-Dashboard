-- Phase 6A — Canonical grammar resolver
-- Provides a read-only, owner-scoped resolver for translation/capture tooling.
--
-- Resolution rules:
--   1. exact canonical pattern key match
--   2. saved variant / contraction / combined-form match
--   3. no fuzzy guessing
--
-- A variant may legitimately map to more than one canonical guide. Callers
-- must treat multiple rows as ambiguous and must not silently choose one.

begin;

create or replace function public.resolve_canonical_grammar_label(p_label text)
returns table (
  grammar_id uuid,
  canonical text,
  slug text,
  match_type text,
  matched_form text,
  variant_type text,
  variant_explanation text
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select auth.uid() as user_id
  ),
  query_key as (
    select public.repository_grammar_key(coalesce(p_label,'')) as key
  ),
  canonical_matches as (
    select
      g.id as grammar_id,
      g.pattern as canonical,
      g.slug,
      'canonical'::text as match_type,
      g.pattern as matched_form,
      null::text as variant_type,
      null::text as variant_explanation,
      1 as priority
    from public.japanese_grammar_guides g
    join me on me.user_id=g.user_id
    join query_key q on g.pattern_key=q.key
    where q.key<>''
  ),
  variant_matches as (
    select
      g.id as grammar_id,
      g.pattern as canonical,
      g.slug,
      'variant'::text as match_type,
      v.form as matched_form,
      v.variant_type,
      v.explanation as variant_explanation,
      2 as priority
    from public.japanese_grammar_variants v
    join public.japanese_grammar_guides g
      on g.id=v.grammar_id
     and g.user_id=v.user_id
    join me on me.user_id=v.user_id
    join query_key q
      on public.repository_grammar_key(v.form)=q.key
    where q.key<>''
  )
  select grammar_id,canonical,slug,match_type,matched_form,variant_type,variant_explanation
  from (
    select * from canonical_matches
    union all
    select * from variant_matches
  ) matches
  order by priority,canonical,matched_form;
$$;

revoke all on function public.resolve_canonical_grammar_label(text) from public, anon;
grant execute on function public.resolve_canonical_grammar_label(text) to authenticated;

comment on function public.resolve_canonical_grammar_label(text) is
  'Owner-scoped exact resolver for canonical grammar labels and saved variants. Returns zero, one, or multiple matches; never performs fuzzy inference.';

commit;
