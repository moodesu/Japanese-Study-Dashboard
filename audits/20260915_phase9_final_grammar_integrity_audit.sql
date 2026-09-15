-- Phase 9 — Final canonical grammar / repository integrity audit
-- Read-only. Expected result: final_issues = 0.

with owner as (
  select user_id from private.app_owner
),
summary as (
  select
    (select count(*) from public.japanese_grammar_guides g join owner o on o.user_id=g.user_id) as total_guides,
    (select count(*) from public.japanese_grammar_guides g join owner o on o.user_id=g.user_id
      where g.guide_status<>'complete' or g.is_placeholder) as pending_or_placeholder,
    (select count(*) from public.japanese_dictionary_entries d join owner o on o.user_id=d.user_id) as dojg_entries,
    (select count(*) from public.grammar_dictionary_references r join owner o on o.user_id=r.user_id) as dojg_reference_links,
    (select count(*) from public.grammar_supplementary_links s join owner o on o.user_id=s.user_id) as supplementary_links,
    (select count(*) from public.japanese_repository_grammar l join owner o on o.user_id=l.user_id) as sentence_grammar_links,
    (select count(*) from public.japanese_grammar_clarifications c join owner o on o.user_id=c.user_id) as clarifications
),
issues as (
  select 'duplicate_canonical_pattern'::text issue_type, g.pattern_key::text subject, count(*)::text detail
  from public.japanese_grammar_guides g join owner o on o.user_id=g.user_id
  group by g.pattern_key having count(*)>1

  union all
  select 'incomplete_guide', g.id::text, g.pattern
  from public.japanese_grammar_guides g join owner o on o.user_id=g.user_id
  where g.guide_status<>'complete' or g.is_placeholder

  union all
  select 'duplicate_sentence_annotation', l.repository_id::text,
         concat(l.grammar_id::text,' / ',coalesce(l.surface,''),' x',count(*))
  from public.japanese_repository_grammar l join owner o on o.user_id=l.user_id
  group by l.repository_id,l.grammar_id,l.surface having count(*)>1

  union all
  select 'orphan_sentence_grammar_link', l.id::text,
         coalesce(l.repository_id::text,'')||' / '||coalesce(l.grammar_id::text,'')
  from public.japanese_repository_grammar l
  join owner o on o.user_id=l.user_id
  left join public.japanese_repository r on r.id=l.repository_id and r.user_id=l.user_id
  left join public.japanese_grammar_guides g on g.id=l.grammar_id and g.user_id=l.user_id
  where r.id is null or g.id is null

  union all
  select 'sentence_link_to_incomplete_guide', l.id::text, g.pattern
  from public.japanese_repository_grammar l
  join owner o on o.user_id=l.user_id
  join public.japanese_grammar_guides g on g.id=l.grammar_id and g.user_id=l.user_id
  where g.guide_status<>'complete' or g.is_placeholder

  union all
  select 'unresolved_repository_grammar_point', r.id::text, p
  from public.japanese_repository r
  join owner o on o.user_id=r.user_id
  cross join lateral unnest(coalesce(r.grammar_points,'{}'::text[])) p
  left join public.japanese_grammar_guides g
    on g.user_id=r.user_id and g.pattern_key=public.repository_grammar_key(p)
  where g.id is null

  union all
  select 'clarification_missing_guide', c.id::text, c.title
  from public.japanese_grammar_clarifications c
  join owner o on o.user_id=c.user_id
  left join public.japanese_grammar_guides g on g.id=c.grammar_id and g.user_id=c.user_id
  where g.id is null

  union all
  select 'variant_missing_guide', v.id::text, v.form
  from public.japanese_grammar_variants v
  join owner o on o.user_id=v.user_id
  left join public.japanese_grammar_guides g on g.id=v.grammar_id and g.user_id=v.user_id
  where g.id is null

  union all
  select 'related_missing_guide', gr.grammar_id::text, gr.related_grammar_id::text
  from public.japanese_grammar_related gr
  join owner o on o.user_id=gr.user_id
  left join public.japanese_grammar_guides g1 on g1.id=gr.grammar_id and g1.user_id=gr.user_id
  left join public.japanese_grammar_guides g2 on g2.id=gr.related_grammar_id and g2.user_id=gr.user_id
  where g1.id is null or g2.id is null
)
select
  s.*,
  (select count(*) from issues) as final_issues
from summary s;

select * from issues order by issue_type,subject;
