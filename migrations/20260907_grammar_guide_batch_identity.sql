-- Make canonical grammar identity authoritative and add an atomic batch import.
-- Apply after 20260906_pending_grammar_guides.sql.
begin;

create or replace function public.upsert_canonical_grammar_guide(p_guide jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  caller uuid:=auth.uid();
  guide public.japanese_grammar_guides;
  related public.japanese_grammar_guides;
  item jsonb;
  clarification jsonb;
  chosen_slug text;
  canonical_key text;
begin
  if caller is null then raise exception 'Sign in before importing.'; end if;
  if jsonb_typeof(p_guide) is distinct from 'object' or not(p_guide ?& array['canonical','meaning','summary','formation','usage','nuance','register','jlpt_level','variants','clarifications','related_grammar','reference_examples','references']) then raise exception 'Invalid grammar guide.'; end if;
  if not public.repository_reference_examples_valid(p_guide->'reference_examples') then raise exception 'Invalid grammar reference examples or furigana.'; end if;

  canonical_key=public.repository_grammar_key(p_guide->>'canonical');
  if coalesce(canonical_key,'')='' then raise exception 'Canonical grammar is required.'; end if;
  chosen_slug=coalesce(nullif(p_guide->>'slug',''),'grammar-'||substr(md5(canonical_key),1,20));
  if chosen_slug!~'^[a-z0-9]+(-[a-z0-9]+)*$' then raise exception 'Invalid grammar slug.'; end if;

  -- A guide's canonical pattern is its identity. Never select an update target by
  -- an incoming slug, because generated/stale slugs can belong to another guide.
  perform pg_advisory_xact_lock(hashtextextended(caller::text,0));
  select * into guide
    from public.japanese_grammar_guides
    where user_id=caller and pattern_key=canonical_key
    for update;

  if exists(
    select 1 from public.japanese_grammar_guides candidate
    where candidate.user_id=caller and candidate.slug=chosen_slug
      and (guide.id is null or candidate.id<>guide.id)
  ) then
    raise exception 'Grammar slug % belongs to a different canonical guide.',chosen_slug;
  end if;

  if guide.id is null then
    insert into public.japanese_grammar_guides(user_id,slug,pattern,meaning,summary,formation,usage,nuance,register,jlpt_level,reference_examples,reference_links,is_placeholder)
      values(caller,chosen_slug,p_guide->>'canonical',p_guide->>'meaning',p_guide->>'summary',array(select jsonb_array_elements_text(p_guide->'formation')),array(select jsonb_array_elements_text(p_guide->'usage')),array(select jsonb_array_elements_text(p_guide->'nuance')),p_guide->>'register',p_guide->>'jlpt_level',p_guide->'reference_examples',p_guide->'references',false)
      returning * into guide;
  else
    update public.japanese_grammar_guides set
      slug=chosen_slug,pattern=p_guide->>'canonical',meaning=p_guide->>'meaning',summary=p_guide->>'summary',
      formation=array(select jsonb_array_elements_text(p_guide->'formation')),
      usage=array(select jsonb_array_elements_text(p_guide->'usage')),
      nuance=array(select jsonb_array_elements_text(p_guide->'nuance')),
      register=p_guide->>'register',jlpt_level=p_guide->>'jlpt_level',reference_examples=p_guide->'reference_examples',
      reference_links=p_guide->'references',is_placeholder=false,updated_at=now()
      where id=guide.id returning * into guide;
  end if;

  if guide.pattern_key<>canonical_key then
    raise exception 'Grammar guide import mismatch: expected %, database updated %.',p_guide->>'canonical',guide.pattern;
  end if;

  delete from public.japanese_grammar_variants where grammar_id=guide.id;
  delete from public.japanese_grammar_related where grammar_id=guide.id;
  for item in select value from jsonb_array_elements(p_guide->'variants') loop
    related=null;
    if coalesce(item->>'related_canonical','')<>'' then related=public.ensure_canonical_grammar(caller,item->>'related_canonical',''); end if;
    insert into public.japanese_grammar_variants(user_id,grammar_id,form,variant_type,explanation,related_grammar_id)
      values(caller,guide.id,item->>'form',item->>'variant_type',item->>'explanation',related.id);
  end loop;
  for clarification in select value from jsonb_array_elements(p_guide->'clarifications') loop
    if not public.repository_contrasts_valid(clarification->'contrasts') then raise exception 'Invalid grammar clarification contrasts or furigana.'; end if;
    insert into public.japanese_grammar_clarifications(user_id,grammar_id,title,question,explanation,contrasts,sort_order)
      values(caller,guide.id,clarification->>'title',clarification->>'question',clarification->>'explanation',clarification->'contrasts',coalesce((clarification->>'sort_order')::integer,0))
      on conflict(grammar_id,title_key) do update set title=excluded.title,question=excluded.question,explanation=excluded.explanation,contrasts=excluded.contrasts,sort_order=excluded.sort_order,updated_at=now();
  end loop;
  for item in select value from jsonb_array_elements(p_guide->'related_grammar') loop
    related=public.ensure_canonical_grammar(caller,item#>>'{}','');
    if related.id<>guide.id then
      insert into public.japanese_grammar_related(user_id,grammar_id,related_grammar_id)
        values(caller,guide.id,related.id) on conflict do nothing;
    end if;
  end loop;

  return jsonb_build_object(
    'incoming_canonical',p_guide->>'canonical',
    'incoming_slug',coalesce(p_guide->>'slug',''),
    'guide',to_jsonb(guide)
  );
end;
$$;

create or replace function public.upsert_canonical_grammar_guides(p_guides jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  caller uuid:=auth.uid();
  item jsonb;
  saved jsonb;
  guide jsonb;
  diagnostics jsonb:='[]'::jsonb;
  guides jsonb:='[]'::jsonb;
begin
  if caller is null then raise exception 'Sign in before importing.'; end if;
  if jsonb_typeof(p_guides) is distinct from 'array' or jsonb_array_length(p_guides) not between 1 and 10 then
    raise exception 'Import between 1 and 10 grammar guides.';
  end if;
  if exists(
    select 1 from jsonb_array_elements(p_guides) value
    group by public.repository_grammar_key(value->>'canonical') having count(*)>1
  ) then raise exception 'A batch cannot contain duplicate canonical grammar guides.'; end if;

  -- One RPC call is one transaction. Any validation or identity failure rolls
  -- back every guide in the batch.
  perform pg_advisory_xact_lock(hashtextextended(caller::text,0));
  for item in select value from jsonb_array_elements(p_guides) loop
    saved=public.upsert_canonical_grammar_guide(item);
    guide=saved->'guide';
    if public.repository_grammar_key(guide->>'pattern')<>public.repository_grammar_key(item->>'canonical') then
      raise exception 'Grammar guide import mismatch: expected %, database updated %.',item->>'canonical',guide->>'pattern';
    end if;
    guides=guides||jsonb_build_array(guide);
    diagnostics=diagnostics||jsonb_build_array(jsonb_build_object(
      'incoming_canonical',item->>'canonical',
      'incoming_slug',coalesce(item->>'slug',''),
      'guide_id',guide->>'id',
      'returned_pattern',guide->>'pattern',
      'guide_status',guide->>'guide_status',
      'is_placeholder',coalesce((guide->>'is_placeholder')::boolean,true)
    ));
  end loop;
  return jsonb_build_object('guides',guides,'items',diagnostics);
end;
$$;

revoke all on function public.upsert_canonical_grammar_guides(jsonb) from public,anon;
grant execute on function public.upsert_canonical_grammar_guides(jsonb) to authenticated;

commit;
