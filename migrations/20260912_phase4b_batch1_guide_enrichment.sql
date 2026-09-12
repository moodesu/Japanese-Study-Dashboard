-- Phase 4B — Batch 1 canonical guide enrichment
-- Source-grounded from the user's linked DOJG entries and supplementary mappings.
--
-- Safety:
--   * Updates only the 10 reviewed Batch 1 canonical identities.
--   * Existing non-empty formation / usage / nuance are preserved.
--   * Existing reference examples are preserved.
--   * Does not touch variants, clarifications, related grammar, personal examples,
--     DOJG references, supplementary links, slugs, canonical identities, or JLPT.
--   * Rerunnable / idempotent.
--
-- The example sentences below are newly authored Learning Hub examples; they are
-- not copied from the private reference works.

begin;

update public.japanese_grammar_guides
set
  formation = case when coalesce(array_length(formation,1),0)=0 then ARRAY['まだ + affirmative predicate','まだ + negative predicate']::text[] else formation end,
  usage = case when coalesce(array_length(usage,1),0)=0 then ARRAY['Use まだ with an affirmative predicate when a state or action is continuing: “still”.','Use まだ with a negative predicate when an expected action or change has not happened: “not yet”.']::text[] else usage end,
  nuance = case when coalesce(array_length(nuance,1),0)=0 then ARRAY['まだ presents the current situation as continuing from an earlier state or as not yet having reached an expected change.','It contrasts naturally with もう, which presents a change as already completed or a previous state as no longer continuing.']::text[] else nuance end,
  reference_examples = case
      when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
       and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))=0
      then '[{"japanese":"日本語の宿題はまだ終わっていません。","japanese_furigana":"[日本語|にほんご]の[宿題|しゅくだい]はまだ[終|お]わっていません。","english":"The Japanese homework is not finished yet."},{"japanese":"まだ雨が降っています。","japanese_furigana":"まだ[雨|あめ]が[降|ふ]っています。","english":"It is still raining."}]'::jsonb
      else reference_examples
    end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('まだ');

update public.japanese_grammar_guides
set
  formation = case when coalesce(array_length(formation,1),0)=0 then ARRAY['もう + affirmative predicate','もう + negative predicate']::text[] else formation end,
  usage = case when coalesce(array_length(usage,1),0)=0 then ARRAY['Use もう with an affirmative predicate when an action or change has already happened.','Use もう with a negative predicate when a previous action or state no longer continues.']::text[] else usage end,
  nuance = case when coalesce(array_length(nuance,1),0)=0 then ARRAY['もう presents the situation as having crossed an expected point of change: “already”, “now”, or with negation “no longer”.','In questions, もう can ask whether an expected event has happened yet; it contrasts with まだ.']::text[] else nuance end,
  reference_examples = case
      when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
       and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))=0
      then '[{"japanese":"もう昼ご飯を食べました。","japanese_furigana":"もう[昼|ひる]ご[飯|はん]を[食|た]べました。","english":"I have already eaten lunch."},{"japanese":"この店はもう閉まっています。","japanese_furigana":"この[店|みせ]はもう[閉|し]まっています。","english":"This shop is already closed."}]'::jsonb
      else reference_examples
    end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('もう');

update public.japanese_grammar_guides
set
  reference_examples = case
      when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
       and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))=0
      then '[{"japanese":"昨日買った本は面白いです。","japanese_furigana":"[昨日|きのう][買|か]った[本|ほん]は[面白|おもしろ]いです。","english":"The book I bought yesterday is interesting."},{"japanese":"田中さんが作った料理を食べました。","japanese_furigana":"[田中|たなか]さんが[作|つく]った[料理|りょうり]を[食|た]べました。","english":"I ate the food that Mr. Tanaka made."}]'::jsonb
      else reference_examples
    end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('名詞修飾節');

update public.japanese_grammar_guides
set
  reference_examples = case
      when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
       and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))=0
      then '[{"japanese":"早く寝たのに、まだ眠いです。","japanese_furigana":"[早|はや]く[寝|ね]たのに、まだ[眠|ねむ]いです。","english":"Even though I went to bed early, I am still sleepy."},{"japanese":"日曜日なのに、会社に行かなければなりません。","japanese_furigana":"[日曜日|にちようび]なのに、[会社|かいしゃ]に[行|い]かなければなりません。","english":"Even though it is Sunday, I have to go to work."}]'::jsonb
      else reference_examples
    end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('〜のに');

update public.japanese_grammar_guides
set
  reference_examples = case
      when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
       and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))=0
      then '[{"japanese":"外は雨が降っているようです。","japanese_furigana":"[外|そと]は[雨|あめ]が[降|ふ]っているようです。","english":"It seems to be raining outside."},{"japanese":"あの人は先生のようです。","japanese_furigana":"あの[人|ひと]は[先生|せんせい]のようです。","english":"That person appears to be a teacher."}]'::jsonb
      else reference_examples
    end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('〜ようだ');

update public.japanese_grammar_guides
set
  reference_examples = case
      when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
       and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))=0
      then '[{"japanese":"日本へ行った時、京都にも行きました。","japanese_furigana":"[日本|にほん]へ[行|い]った[時|とき]、[京都|きょうと]にも[行|い]きました。","english":"When I went to Japan, I also went to Kyoto."},{"japanese":"暇な時、本を読みます。","japanese_furigana":"[暇|ひま]な[時|とき]、[本|ほん]を[読|よ]みます。","english":"When I have free time, I read books."}]'::jsonb
      else reference_examples
    end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('〜時');

update public.japanese_grammar_guides
set
  reference_examples = case
      when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
       and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))=0
      then '[{"japanese":"明日は雪が降るかもしれません。","japanese_furigana":"[明日|あした]は[雪|ゆき]が[降|ふ]るかもしれません。","english":"It might snow tomorrow."},{"japanese":"彼はもう帰ったかもしれない。","japanese_furigana":"[彼|かれ]はもう[帰|かえ]ったかもしれない。","english":"He may have already gone home."}]'::jsonb
      else reference_examples
    end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('〜かもしれない');

update public.japanese_grammar_guides
set
  reference_examples = case
      when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
       and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))=0
      then '[{"japanese":"友達が駅まで送ってくれました。","japanese_furigana":"[友達|ともだち]が[駅|えき]まで[送|おく]ってくれました。","english":"My friend kindly took me to the station."},{"japanese":"姉が宿題を手伝ってくれた。","japanese_furigana":"[姉|あね]が[宿題|しゅくだい]を[手伝|てつだ]ってくれた。","english":"My older sister helped me with my homework."}]'::jsonb
      else reference_examples
    end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('〜てくれる');

update public.japanese_grammar_guides
set
  reference_examples = case
      when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
       and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))=0
      then '[{"japanese":"雨が降っているので、家にいます。","japanese_furigana":"[雨|あめ]が[降|ふ]っているので、[家|いえ]にいます。","english":"Because it is raining, I am staying home."},{"japanese":"明日は早いので、もう寝ます。","japanese_furigana":"[明日|あした]は[早|はや]いので、もう[寝|ね]ます。","english":"Since I have an early start tomorrow, I am going to bed now."}]'::jsonb
      else reference_examples
    end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('〜ので');

update public.japanese_grammar_guides
set
  reference_examples = case
      when jsonb_typeof(coalesce(reference_examples,'[]'::jsonb))='array'
       and jsonb_array_length(coalesce(reference_examples,'[]'::jsonb))=0
      then '[{"japanese":"日本にいる間、日本語をたくさん話したいです。","japanese_furigana":"[日本|にほん]にいる[間|あいだ]、[日本語|にほんご]をたくさん[話|はな]したいです。","english":"While I am in Japan, I want to speak a lot of Japanese."},{"japanese":"子どもが寝ている間、本を読みました。","japanese_furigana":"[子|こ]どもが[寝|ね]ている[間|あいだ]、[本|ほん]を[読|よ]みました。","english":"I read a book while the child was sleeping."}]'::jsonb
      else reference_examples
    end,
  updated_at = now()
where user_id=(select user_id from private.app_owner)
  and pattern_key=public.repository_grammar_key('〜間');

commit;

-- Verification: every Batch 1 guide should now have all six core content fields.
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
    public.repository_grammar_key('まだ'),
    public.repository_grammar_key('もう'),
    public.repository_grammar_key('名詞修飾節'),
    public.repository_grammar_key('〜のに'),
    public.repository_grammar_key('〜ようだ'),
    public.repository_grammar_key('〜時'),
    public.repository_grammar_key('〜かもしれない'),
    public.repository_grammar_key('〜てくれる'),
    public.repository_grammar_key('〜ので'),
    public.repository_grammar_key('〜間')
  )
order by pattern;
