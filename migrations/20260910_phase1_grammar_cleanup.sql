-- Phase 1 grammar cleanup:
-- remove the obsolete generic 〜そうだ placeholder only when it has no
-- repository sentence links. The two sense-specific guides remain:
-- 〜そうだ（伝聞） and 〜そうだ（様態）.
begin;

do $$
declare
  target uuid;
begin
  select guide.id into target
  from public.japanese_grammar_guides guide
  join private.app_owner owner on owner.user_id=guide.user_id
  where guide.pattern_key=public.repository_grammar_key('〜そうだ')
    and (guide.is_placeholder=true or guide.guide_status='pending')
  limit 1;

  if target is null then
    return;
  end if;

  if exists (
    select 1
    from public.japanese_repository_grammar link
    where link.grammar_id=target
  ) then
    raise notice 'Generic 〜そうだ placeholder retained because repository sentences are linked to it.';
    return;
  end if;

  delete from public.grammar_supplementary_links where grammar_id=target;
  delete from public.japanese_grammar_related where grammar_id=target or related_grammar_id=target;
  delete from public.japanese_grammar_variants where grammar_id=target or related_grammar_id=target;
  delete from public.japanese_grammar_clarifications where grammar_id=target;
  delete from public.japanese_grammar_guides where id=target;
end $$;

commit;
