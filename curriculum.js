window.CURRICULUM = {
  book: "TOBIRA Beginning Japanese II",
  lessons: [
    {n:11,title:"私に漢字の覚え方を教えてくれない？",english:"Can you teach me how to memorize kanji?", workbook2:{vocab:7,particle:8,grammar1:9,comp1:14,grammar2:15,comp2:19,listening:20}, workbook1:{kanji:7,reading:13,writing:14,review:15}},
    {n:12,title:"今度日本に来たら、何がしたい？",english:"When you come to Japan next time, what do you want to do?", workbook2:{vocab:21,particle:22,grammar1:23,comp1:32,grammar2:null,comp2:null,listening:33}, workbook1:{kanji:17,reading:23,writing:24,review:null}},
    {n:13,title:"明日行ってみようと思います。",english:"I think I'll go tomorrow.", workbook2:{vocab:34,particle:35,grammar1:36,comp1:39,grammar2:40,comp2:44,listening:45}, workbook1:{kanji:27,reading:33,writing:34,review:35}},
    {n:14,title:"大阪を案内してほしいんですけど…",english:"I'd like you to show me around Osaka…", workbook2:{vocab:46,particle:47,grammar1:48,comp1:55,grammar2:56,comp2:58,listening:59}, workbook1:{kanji:37,reading:43,writing:44,review:null}},
    {n:15,title:"ちょっと分かりにくいと思うんですけど…",english:"I think it might be a little difficult to understand…", workbook2:{vocab:60,particle:61,grammar1:62,comp1:71,grammar2:null,comp2:null,listening:72}, workbook1:{kanji:47,reading:53,writing:55,review:null}},
    {n:16,title:"一日しか会えなくて残念です…",english:"It's too bad we can only meet up for one day…", workbook2:{vocab:73,particle:74,grammar1:75,comp1:82,grammar2:83,comp2:85,listening:86}, workbook1:{kanji:57,reading:63,writing:64,review:65}},
    {n:17,title:"お店を手伝わせていただけませんか。",english:"Won't you let me help out around the shop?", workbook2:{vocab:87,particle:88,grammar1:89,comp1:93,grammar2:94,comp2:97,listening:98}, workbook1:{kanji:67,reading:73,writing:74,review:null}},
    {n:18,title:"好きなことをしなさい。",english:"Do what you like.", workbook2:{vocab:99,particle:100,grammar1:101,comp1:105,grammar2:105,comp2:109,listening:110}, workbook1:{kanji:77,reading:84,writing:86,review:null}},
    {n:19,title:"明日はどんな話をなさいますか。",english:"What story will you be telling tomorrow?", workbook2:{vocab:111,particle:112,grammar1:113,comp1:119,grammar2:119,comp2:121,listening:122}, workbook1:{kanji:89,reading:96,writing:98,review:99}},
    {n:20,title:"みんな、これからどうするの？",english:"What's everyone doing next?", workbook2:{vocab:123,particle:124,grammar1:125,comp1:133,grammar2:null,comp2:null,listening:134}, workbook1:{kanji:101,reading:107,writing:109,review:null}}
  ]
};

window.TASK_TYPES = [
  {key:"vocab", label:"Vocabulary", book:"Workbook 2", field:"vocab", duration:"25–35 min", desc:"Study the lesson vocabulary. Read the examples aloud, check meanings in context, then test yourself without looking."},
  {key:"particle", label:"Particle practice", book:"Workbook 2", field:"particle", duration:"20–30 min", desc:"Complete the particle practice. Do not just check answers: explain why each particle works and note recurring errors."},
  {key:"grammar1", label:"Grammar practice 1", book:"Workbook 2", field:"grammar1", duration:"25–35 min", desc:"Study the first grammar section, then complete the assigned practice. Produce 2–3 original sentences before moving on."},
  {key:"comp1", label:"Comprehensive practice 1", book:"Workbook 2", field:"comp1", duration:"25–35 min", desc:"Use this as a retrieval test. Try it without notes first, then investigate every error."},
  {key:"grammar2", label:"Grammar practice 2", book:"Workbook 2", field:"grammar2", duration:"25–35 min", desc:"Study the second grammar section when present. Focus on form, nuance and producing your own examples."},
  {key:"comp2", label:"Comprehensive practice 2", book:"Workbook 2", field:"comp2", duration:"25–35 min", desc:"Second application check. Treat mistakes as diagnostic information and record anything that remains shaky."},
  {key:"listening", label:"Listening practice", book:"Workbook 2", field:"listening", duration:"20–30 min", desc:"Listen once without the script, listen again with it, then repeat/shadow selected sentences. Note words or grammar you could not hear."},
  {key:"kanji", label:"Kanji practice", book:"Workbook 1", field:"kanji", duration:"20–30 min", desc:"Complete the kanji practice. Prioritise recognition, readings and writing from memory; use WaniKani to reinforce rather than replace this work."},
  {key:"reading", label:"Reading practice", book:"Workbook 1", field:"reading", duration:"30–40 min", desc:"Read once for overall meaning, then again for detail. Mark unknown vocabulary and grammar, then give yourself a short Japanese or English summary."},
  {key:"writing", label:"Writing practice", book:"Workbook 1", field:"writing", duration:"25–40 min", desc:"Complete the writing practice. Aim for accurate, natural sentences and compare carefully with the model."},
  {key:"review", label:"Kanji review / consolidation", book:"Workbook 1", field:"review", duration:"15–25 min", desc:"Use the review section as a retrieval check. Only skip it if the underlying kanji are genuinely automatic."}
];

window.OPTIONAL_TASKS = [
  {key:"wanikani",label:"WaniKani",duration:"15–25 min",desc:"Clear a manageable portion of your reviews. Stop before this becomes the main study block; TOBIRA remains the priority."},
  {key:"migaku",label:"Migaku input",duration:"20–30 min",desc:"Watch/listen to Japanese you can mostly follow. Save only a small number of genuinely useful items."},
  {key:"shadowing",label:"Shadowing",duration:"15–20 min",desc:"Use TOBIRA audio or another comprehensible source. Listen once, then shadow short chunks for rhythm, pronunciation and automaticity."},
  {key:"yotsuba",label:"Yotsuba / easy reading",duration:"20–30 min",desc:"Read for enjoyment and volume. Avoid turning every unknown word into a vocabulary research project."}
];