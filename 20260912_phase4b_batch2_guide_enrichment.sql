-- Phase 4B — Batch 2 canonical guide enrichment
-- Source-grounded from the linked DOJG entries and supplementary mappings.
--
-- All ten guides already contained meaning, summary, formation, usage and nuance.
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
    then '[{"japanese":"留守の間に、荷物が届きました。","japanese_furigana":"[留守|るす]の[間|あいだ]に、[荷物|にもつ]が[届|とど]きました。","english":"A package arrived while I was away."},{"japanese":"子どもが寝ている間に、夕飯を作りました。","japanese_furigana":"[子|こ]どもが[寝|ね]ている[間|あいだ]に、[夕飯|ゆうはん]を[作|つく]りました。","english":"I made dinner while the child was sleeping."}]'::jsonb
    else reference_examples
  end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('〜間に');

update public.japanese_grammar_guides
set
  reference_examples = case
    when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
     and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))=0
    then '[{"japanese":"毎日日本語を勉強することは大切です。","japanese_furigana":"[毎日|まいにち][日本語|にほんご]を[勉強|べんきょう]することは[大切|たいせつ]です。","english":"Studying Japanese every day is important."},{"japanese":"一人で旅行することが好きです。","japanese_furigana":"[一人|ひとり]で[旅行|りょこう]することが[好|す]きです。","english":"I like travelling alone."}]'::jsonb
    else reference_examples
  end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('〜こと（名詞化）');

update public.japanese_grammar_guides
set
  reference_examples = case
    when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
     and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))=0
    then '[{"japanese":"この店は安いし、おいしいです。","japanese_furigana":"この[店|みせ]は[安|やす]いし、おいしいです。","english":"This restaurant is cheap, and the food is good too."},{"japanese":"今日は雨だし、家にいよう。","japanese_furigana":"[今日|きょう]は[雨|あめ]だし、[家|いえ]にいよう。","english":"It is raining today, so I think I will stay home."}]'::jsonb
    else reference_examples
  end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('〜し');

update public.japanese_grammar_guides
set
  reference_examples = case
    when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
     and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))=0
    then '[{"japanese":"日本で働くために、日本語を勉強しています。","japanese_furigana":"[日本|にほん]で[働|はたら]くために、[日本語|にほんご]を[勉強|べんきょう]しています。","english":"I am studying Japanese in order to work in Japan."},{"japanese":"健康のために、毎朝歩いています。","japanese_furigana":"[健康|けんこう]のために、[毎朝|まいあさ][歩|ある]いています。","english":"I walk every morning for my health."}]'::jsonb
    else reference_examples
  end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('〜ために');

update public.japanese_grammar_guides
set
  reference_examples = case
    when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
     and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))=0
    then '[{"japanese":"疲れているなら、少し休んだらどうですか。","japanese_furigana":"[疲|つか]れているなら、[少|すこ]し[休|やす]んだらどうですか。","english":"If you are tired, why don''t you rest for a while?"},{"japanese":"分からない時は、先生に聞いたらどうですか。","japanese_furigana":"[分|わ]からない[時|とき]は、[先生|せんせい]に[聞|き]いたらどうですか。","english":"If you don''t understand, how about asking the teacher?"}]'::jsonb
    else reference_examples
  end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('〜たらどうですか');

update public.japanese_grammar_guides
set
  reference_examples = case
    when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
     and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))=0
    then '[{"japanese":"友達に日本語を教えてあげました。","japanese_furigana":"[友達|ともだち]に[日本語|にほんご]を[教|おし]えてあげました。","english":"I helped my friend by teaching them Japanese."},{"japanese":"妹の荷物を持ってあげた。","japanese_furigana":"[妹|いもうと]の[荷物|にもつ]を[持|も]ってあげた。","english":"I carried my younger sister''s luggage for her."}]'::jsonb
    else reference_examples
  end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('〜てあげる');

update public.japanese_grammar_guides
set
  reference_examples = case
    when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
     and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))=0
    then '[{"japanese":"雨が降っても、試合はあります。","japanese_furigana":"[雨|あめ]が[降|ふ]っても、[試合|しあい]はあります。","english":"Even if it rains, the match will go ahead."},{"japanese":"高くても、この靴を買いたいです。","japanese_furigana":"[高|たか]くても、この[靴|くつ]を[買|か]いたいです。","english":"Even if they are expensive, I want to buy these shoes."}]'::jsonb
    else reference_examples
  end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('〜ても');

update public.japanese_grammar_guides
set
  reference_examples = case
    when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
     and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))=0
    then '[{"japanese":"春になると、桜が咲きます。","japanese_furigana":"[春|はる]になると、[桜|さくら]が[咲|さ]きます。","english":"When spring comes, the cherry blossoms bloom."},{"japanese":"このボタンを押すと、ドアが開きます。","japanese_furigana":"このボタンを[押|お]すと、ドアが[開|あ]きます。","english":"When you press this button, the door opens."}]'::jsonb
    else reference_examples
  end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('〜と（条件）');

update public.japanese_grammar_guides
set
  reference_examples = case
    when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
     and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))=0
    then '[{"japanese":"朝ご飯を食べないで、学校に行きました。","japanese_furigana":"[朝|あさ]ご[飯|はん]を[食|た]べないで、[学校|がっこう]に[行|い]きました。","english":"I went to school without eating breakfast."},{"japanese":"心配しないでください。","japanese_furigana":"[心配|しんぱい]しないでください。","english":"Please don''t worry."}]'::jsonb
    else reference_examples
  end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('〜ないで');

update public.japanese_grammar_guides
set
  reference_examples = case
    when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
     and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))=0
    then '[{"japanese":"音楽を聞きながら、勉強しています。","japanese_furigana":"[音楽|おんがく]を[聞|き]きながら、[勉強|べんきょう]しています。","english":"I study while listening to music."},{"japanese":"歩きながら、友達と話しました。","japanese_furigana":"[歩|ある]きながら、[友達|ともだち]と[話|はな]しました。","english":"I talked with my friend while walking."}]'::jsonb
    else reference_examples
  end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('〜ながら');

commit;

-- Verification: every Batch 2 guide should have all six core content fields.
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
    public.repository_grammar_key('〜間に'),
    public.repository_grammar_key('〜こと（名詞化）'),
    public.repository_grammar_key('〜し'),
    public.repository_grammar_key('〜ために'),
    public.repository_grammar_key('〜たらどうですか'),
    public.repository_grammar_key('〜てあげる'),
    public.repository_grammar_key('〜ても'),
    public.repository_grammar_key('〜と（条件）'),
    public.repository_grammar_key('〜ないで'),
    public.repository_grammar_key('〜ながら')
  )
order by pattern;
