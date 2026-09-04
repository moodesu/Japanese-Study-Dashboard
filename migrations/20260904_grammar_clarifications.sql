-- Apply separately in Supabase SQL Editor AFTER 20260903_repository_grammar_library.sql.
-- Additive: existing guides and sentence entries are preserved unchanged.
begin;

create or replace function public.repository_grammar_content_valid(content jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare example jsonb; item jsonb; clarification jsonb; contrast jsonb;
begin
  if jsonb_typeof(content) is distinct from 'object' then return false; end if;
  if not (content ?& array['meaning','formation','explanation','examples'])
    or content - array['meaning','formation','explanation','examples','clarifications'] <> '{}'::jsonb then return false; end if;
  if jsonb_typeof(content->'meaning') is distinct from 'string' or length(trim(content->>'meaning'))=0
    or jsonb_typeof(content->'explanation') is distinct from 'string' or length(trim(content->>'explanation'))=0
    or jsonb_typeof(content->'formation') is distinct from 'array'
    or jsonb_typeof(content->'examples') is distinct from 'array' then return false; end if;
  if jsonb_array_length(content->'formation')=0 or jsonb_array_length(content->'examples')=0 then return false; end if;
  for item in select value from jsonb_array_elements(content->'formation') loop
    if jsonb_typeof(item)<>'string' or length(trim(item#>>'{}'))=0 then return false; end if;
  end loop;
  for example in select value from jsonb_array_elements(content->'examples') loop
    if jsonb_typeof(example) is distinct from 'object' then return false; end if;
    if not (example ?& array['japanese','japanese_furigana','english'])
      or example - array['japanese','japanese_furigana','english'] <> '{}'::jsonb then return false; end if;
    if jsonb_typeof(example->'japanese') is distinct from 'string' or length(trim(example->>'japanese'))=0
      or jsonb_typeof(example->'english') is distinct from 'string' or length(trim(example->>'english'))=0
      or jsonb_typeof(example->'japanese_furigana') is distinct from 'string' then return false; end if;
    if example->>'japanese_furigana'<>'' and regexp_replace(example->>'japanese_furigana', '\[([^\]|]+)\|([^\]]+)\]', '\1', 'g')<>example->>'japanese' then return false; end if;
  end loop;
  if content ? 'clarifications' then
    if jsonb_typeof(content->'clarifications') is distinct from 'array'
      or jsonb_array_length(content->'clarifications')>100 then return false; end if;
    for clarification in select value from jsonb_array_elements(content->'clarifications') loop
      if jsonb_typeof(clarification) is distinct from 'object'
        or not (clarification ?& array['title','explanation','contrasts'])
        or clarification - array['title','explanation','contrasts'] <> '{}'::jsonb then return false; end if;
      if jsonb_typeof(clarification->'title') is distinct from 'string' or length(trim(clarification->>'title'))=0 or length(clarification->>'title')>200
        or jsonb_typeof(clarification->'explanation') is distinct from 'string' or length(trim(clarification->>'explanation'))=0 or length(clarification->>'explanation')>10000
        or jsonb_typeof(clarification->'contrasts') is distinct from 'array' then return false; end if;
      if jsonb_array_length(clarification->'contrasts') not between 2 and 12 then return false; end if;
      for contrast in select value from jsonb_array_elements(clarification->'contrasts') loop
        if jsonb_typeof(contrast) is distinct from 'object'
          or not (contrast ?& array['japanese','japanese_furigana','english','note'])
          or contrast - array['japanese','japanese_furigana','english','note'] <> '{}'::jsonb then return false; end if;
        if jsonb_typeof(contrast->'japanese') is distinct from 'string' or length(trim(contrast->>'japanese'))=0
          or jsonb_typeof(contrast->'japanese_furigana') is distinct from 'string' or length(trim(contrast->>'japanese_furigana'))=0
          or jsonb_typeof(contrast->'english') is distinct from 'string' or length(trim(contrast->>'english'))=0
          or jsonb_typeof(contrast->'note') is distinct from 'string' or length(trim(contrast->>'note'))=0 then return false; end if;
        if regexp_replace(contrast->>'japanese_furigana', '\[([^\]|]+)\|([^\]]+)\]', '\1', 'g')<>contrast->>'japanese' then return false; end if;
      end loop;
    end loop;
  end if;
  return true;
end;
$$;

-- The guide core remains immutable. This is the only app path that updates a
-- saved guide, and it can append validated clarifications only.
create or replace function public.append_repository_grammar_clarifications(p_updates jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid(); incoming jsonb; clarification jsonb; duplicate jsonb;
  guide public.japanese_grammar_guides%rowtype; next_content jsonb; title_key text;
  result_guides jsonb := '[]'::jsonb;
begin
  if caller is null then raise exception 'Sign in before importing.'; end if;
  if jsonb_typeof(p_updates) is distinct from 'array' then raise exception 'Expected an array of grammar updates.'; end if;
  if jsonb_array_length(p_updates) not between 1 and 20 or octet_length(p_updates::text)>2097152 then
    raise exception 'Import at most 20 grammar updates and 2 MB at a time.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(caller::text,1));
  for incoming in select value from jsonb_array_elements(p_updates) loop
    if jsonb_typeof(incoming) is distinct from 'object'
      or not (incoming ?& array['label','sense','expected_content','clarifications'])
      or incoming - array['label','sense','expected_content','clarifications'] <> '{}'::jsonb
      or jsonb_typeof(incoming->'label') is distinct from 'string'
      or jsonb_typeof(incoming->'sense') is distinct from 'string'
      or jsonb_typeof(incoming->'expected_content') is distinct from 'object'
      or jsonb_typeof(incoming->'clarifications') is distinct from 'array'
      or jsonb_array_length(incoming->'clarifications')=0 then raise exception 'Invalid grammar clarification update.'; end if;
    select * into guide from public.japanese_grammar_guides
      where user_id=caller and grammar_key=public.repository_grammar_key(incoming->>'label') and sense=incoming->>'sense'
      for update;
    if not found then raise exception 'Saved grammar guide not found for % (%).',incoming->>'label',incoming->>'sense'; end if;
    if guide.content is distinct from incoming->'expected_content' then
      raise exception 'Grammar guide changed after preview for % (%). Reload and preview again.',guide.label,guide.sense;
    end if;
    next_content=guide.content;
    for clarification in select value from jsonb_array_elements(incoming->'clarifications') loop
      title_key=lower(regexp_replace(normalize(clarification->>'title',NFKC),'[[:space:]]+','','g'));
      duplicate=null;
      select value into duplicate from jsonb_array_elements(coalesce(next_content->'clarifications','[]'::jsonb))
        where lower(regexp_replace(normalize(value->>'title',NFKC),'[[:space:]]+','','g'))=title_key limit 1;
      if duplicate is not null then
        if duplicate is distinct from clarification then raise exception 'Clarification title already exists with different content: %',clarification->>'title'; end if;
      else
        next_content=jsonb_set(next_content,'{clarifications}',coalesce(next_content->'clarifications','[]'::jsonb)||jsonb_build_array(clarification),true);
      end if;
    end loop;
    if not public.repository_grammar_content_valid(next_content) then raise exception 'Invalid grammar clarification content.'; end if;
    update public.japanese_grammar_guides set content=next_content where id=guide.id and user_id=caller returning * into guide;
    result_guides=result_guides||jsonb_build_array(to_jsonb(guide));
  end loop;
  return jsonb_build_object('guides',result_guides);
end;
$$;

revoke all on function public.append_repository_grammar_clarifications(jsonb) from public,anon;
grant execute on function public.append_repository_grammar_clarifications(jsonb) to authenticated;
notify pgrst,'reload schema';
commit;
