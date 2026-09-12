-- Phase 4B — Batch 4 canonical guide enrichment
-- Source-grounded from the linked DOJG entries and supplementary mappings.
--
-- All ten guides already contain meaning, summary, formation, usage and nuance.
-- This migration fills only the missing reference_examples field.
--
-- Safety:
--   * Existing reference examples are preserved.
--   * Does not alter canonical identity, meaning, summary, formation, usage,
--     nuance, variants, clarifications, related grammar, personal examples,
--     DOJG links, supplementary links, slugs, register, or JLPT metadata.
--   * Rerunnable / idempotent.
--
-- Example sentences are newly authored Learning Hub examples and are not copied
-- from the private reference works.

begin;

update public.japanese_grammar_guides
set
  reference_examples = case
    when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
     and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))=0
    then '[{"japanese":"金曜日までに、このレポートを出してください。","japanese_furigana":"[金曜日|きんようび]までに、このレポートを[出|だ]してください。","english":"Please submit this report by Friday."},{"japanese":"九時までに駅に着きたいです。","japanese_furigana":"[九時|くじ]までに[駅|えき]に[着|つ]きたいです。","english":"I want to arrive at the station by nine o''clock."}]'::jsonb
    else reference_examples
  end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('〜までに');

update public.japanese_grammar_guides
set
  reference_examples = case
    when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
     and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))=0
    then '[{"japanese":"昨日は十時間も寝ました。","japanese_furigana":"[昨日|きのう]は[十時間|じゅうじかん]も[寝|ね]ました。","english":"I slept for as many as ten hours yesterday."},{"japanese":"一人も来ませんでした。","japanese_furigana":"[一人|ひとり]も[来|き]ませんでした。","english":"Not even one person came."}]'::jsonb
    else reference_examples
  end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('〜も（強調）');

update public.japanese_grammar_guides
set
  reference_examples = case
    when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
     and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))=0
    then '[{"japanese":"この本は読みやすいです。","japanese_furigana":"この[本|ほん]は[読|よ]みやすいです。","english":"This book is easy to read."},{"japanese":"このペンはとても書きやすいです。","japanese_furigana":"このペンはとても[書|か]きやすいです。","english":"This pen is very easy to write with."}]'::jsonb
    else reference_examples
  end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('〜やすい');

update public.japanese_grammar_guides
set
  reference_examples = case
    when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
     and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))=0
    then '[{"japanese":"この漢字の読み方を教えてください。","japanese_furigana":"この[漢字|かんじ]の[読|よ]み[方|かた]を[教|おし]えてください。","english":"Please tell me how to read this kanji."},{"japanese":"このアプリの使い方が分かりません。","japanese_furigana":"このアプリの[使|つか]い[方|かた]が[分|わ]かりません。","english":"I don''t know how to use this app."}]'::jsonb
    else reference_examples
  end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('〜方');

update public.japanese_grammar_guides
set
  reference_examples = case
    when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
     and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))=0
    then '[{"japanese":"朝ご飯を食べてから、仕事を始めます。","japanese_furigana":"[朝|あさ]ご[飯|はん]を[食|た]べてから、[仕事|しごと]を[始|はじ]めます。","english":"After eating breakfast, I start work."},{"japanese":"日本に来てから、毎日日本語を使っています。","japanese_furigana":"[日本|にほん]に[来|き]てから、[毎日|まいにち][日本語|にほんご]を[使|つか]っています。","english":"Since coming to Japan, I have used Japanese every day."}]'::jsonb
    else reference_examples
  end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('〜てから');

update public.japanese_grammar_guides
set
  reference_examples = case
    when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
     and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))=0
    then '[{"japanese":"外は寒いみたいです。","japanese_furigana":"[外|そと]は[寒|さむ]いみたいです。","english":"It seems to be cold outside."},{"japanese":"あの建物はホテルみたいです。","japanese_furigana":"あの[建物|たてもの]はホテルみたいです。","english":"That building looks like a hotel."}]'::jsonb
    else reference_examples
  end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('〜みたいだ');

update public.japanese_grammar_guides
set
  reference_examples = case
    when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
     and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))=0
    then '[{"japanese":"仕事の後で、買い物に行きます。","japanese_furigana":"[仕事|しごと]の[後|あと]で、[買|か]い[物|もの]に[行|い]きます。","english":"I will go shopping after work."},{"japanese":"映画を見た後で、晩ご飯を食べました。","japanese_furigana":"[映画|えいが]を[見|み]た[後|あと]で、[晩|ばん]ご[飯|はん]を[食|た]べました。","english":"After watching the film, I ate dinner."}]'::jsonb
    else reference_examples
  end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('〜後で');

update public.japanese_grammar_guides
set
  reference_examples = case
    when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
     and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))=0
    then '[{"japanese":"冷蔵庫には卵しかありません。","japanese_furigana":"[冷蔵庫|れいぞうこ]には[卵|たまご]しかありません。","english":"There are only eggs in the refrigerator."},{"japanese":"今日は千円しか持っていません。","japanese_furigana":"[今日|きょう]は[千円|せんえん]しか[持|も]っていません。","english":"I only have 1,000 yen today."}]'::jsonb
    else reference_examples
  end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('〜しか〜ない');

update public.japanese_grammar_guides
set
  reference_examples = case
    when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
     and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))=0
    then '[{"japanese":"ここで写真を撮ってはいけません。","japanese_furigana":"ここで[写真|しゃしん]を[撮|と]ってはいけません。","english":"You must not take photos here."},{"japanese":"この部屋に入ってはいけません。","japanese_furigana":"この[部屋|へや]に[入|はい]ってはいけません。","english":"You must not enter this room."}]'::jsonb
    else reference_examples
  end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('〜てはいけない');

update public.japanese_grammar_guides
set
  reference_examples = case
    when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
     and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))=0
    then '[{"japanese":"明日は早く起きなくてはいけません。","japanese_furigana":"[明日|あした]は[早|はや]く[起|お]きなくてはいけません。","english":"I have to get up early tomorrow."},{"japanese":"この薬は毎日飲まなくてはいけません。","japanese_furigana":"この[薬|くすり]は[毎日|まいにち][飲|の]まなくてはいけません。","english":"I have to take this medicine every day."}]'::jsonb
    else reference_examples
  end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('〜なくてはいけない');

commit;

-- Verification: every Batch 4 guide should have all six core content fields.
select
  pattern,
  case when coalesce(trim(meaning),'')<>'' and meaning<>'Guide pending' then 1 else 0 end as has_meaning,
  case when coalesce(trim(summary),'')<>'' and summary<>'Guide pending' then 1 else 0 end as has_summary,
  case when coalesce(array_length(formation,1),0)>0 then 1 else 0 end as has_formation,
  case when coalesce(array_length(usage,1),0)>0 then 1 else 0 end as has_usage,
  case when coalesce(array_length(nuance,1),0)>0 then 1 else 0 end as has_nuance,
  case
    when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
     and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))>0
    then 1 else 0
  end as has_reference_examples,
  jsonb_array_length(coalesce(reference_examples,'[]'::jsonb)) as reference_example_count
from public.japanese_grammar_guides
where user_id=(select user_id from private.app_owner)
  and pattern_key in (
    public.repository_grammar_key('〜までに'),
    public.repository_grammar_key('〜も（強調）'),
    public.repository_grammar_key('〜やすい'),
    public.repository_grammar_key('〜方'),
    public.repository_grammar_key('〜てから'),
    public.repository_grammar_key('〜みたいだ'),
    public.repository_grammar_key('〜後で'),
    public.repository_grammar_key('〜しか〜ない'),
    public.repository_grammar_key('〜てはいけない'),
    public.repository_grammar_key('〜なくてはいけない')
  )
order by pattern;
