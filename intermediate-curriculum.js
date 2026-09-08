/* TOBIRA Intermediate Japanese I — authoritative mapped programme data.
 * Printed textbook pages remain the UI source of truth. Official publisher
 * resources stay external; the private textbook uses signed Storage access. */
(function(){
  const grammar = {
    1:[
      ['Nから｛できる/できている｝ / Nで｛できる/できている｝','be made from/out of N; be made of/consist of N'],['Adj+さ','degree of adjective; -ness/-ty'],['～ように','like; as if; as'],['～は～で｛有名だ/知られている｝','be famous/known for/because'],['Adj(i)-stem+く / V-masu','and'],['～ことがある','there are times when; sometimes'],['～｛は/か（どうか）は｝～に｛よって違う/よる｝','differ depending on; depend on'],['～始める','begin to V / begin V-ing'],['N1+Prt+の+N2','noun phrase linkage with の'],['～は～と言われている','is said to be; it is said that'],['～とか～（とか）','and/or; things like'],['～というのは…だ','means; what X means is…'],['～だけ｛でなく/じゃなく｝（て）、～も','not only…but also'],['～って','speaking of; as for'],['～って｛言う/聞く/書く/etc.｝','say/hear/write/etc. that']
    ],
    2:[
      ['〜必要がある / 〜必要はない','necessary / not necessary; have to / do not have to'],['〜は〜の一つだ','is one of'],['〜にとって','for; to'],['また、〜','additionally; also'],['〜の代わりに','instead of; in place of'],['〜ため（に）【purpose】','in order to; for the purpose of'],['AかBか','whether A or B; either A or B'],['〜が見られる','can be observed/seen'],['〜場合（は/には）','if; when; in case'],['〜なくては／〜なければ｛いけない/ならない｝','have to; must; should'],['A｛では/じゃ｝なく（て）B','not A, but B'],['｛何/いく｝+Counter+か','some'],['｛でしょう/だろう｝','tag question'],['AやBなど','A, B, etc.'],['〜ため（に）【reason/cause】','because; due to'],['〜ようになる / 〜ないようになる','come/begin to V; stop V-ing']
    ],
    3:[
      ['Xと同じぐらい～','about as…as X'],['N+型','N-shaped/type/make/style/model'],['それに','in addition; moreover'],['～（の）なら','if it is the case that; would/could'],['～として','as; in the capacity of'],['～他（に）は（～ない） / ～他に（も）','other than/except for; besides'],['～ことになっている','it has been decided; rule; supposed to V'],['～をしたN / ～をしている','N that has; have'],['～ていく / ～てくる','continue/become/grow; have begun/become'],['～ことになった','it was/has been decided; turns out'],['～ように｛頼む/言う｝','ask/tell someone to V'],['～て｛くれる/くれない/もらえる/もらえない｝？','will/can/could you'],['～ようにする','make an effort to; try to'],['～かな（あ）','I wonder'],['なるべく','as much/often as possible'],['～ようとする','try to V; be about to V']
    ],
    4:[
      ['毎～のように','almost every'],['～｛など（は）/なんて｝','things/people like'],['～と｛考えられている/思われている｝','it is considered/believed'],['～ように','so that; in such a way that'],['まず','first; first of all'],['～合う','V each other; V with'],['XはYこと｛だ/なのだ｝','X is Y'],['～のではない｛だろうか/でしょうか｝ / ～んじゃない｛でしょうか/かな｝','I think that; isn’t it that'],['～と言える｛だろう/でしょう｝','it can probably be said'],['～ず（に）','without V-ing; instead of V-ing'],['～ん｛だけど/ですが｝','lead-in / softening form'],['それで','because of that; so'],['Question word ～ても','no matter what/who/when/where/how'],['～うちに / ～ないうちに','while still; before'],['できれば/できたら','if possible; if you don’t mind'],['～たばかり','have just V-ed']
    ],
    5:[
      ['Quantifier（ぐらい/くらい）は / N｛だけ/ぐらい/くらい｝は','at least'],['〜のはXの方だ','it is X that'],['〜以下 / 〜以上','or less / or more'],['〜さえ〜ば','if only; as long as'],['ついに','at last; finally'],['〜化 / 〜化する','-ization; -ize/become'],['ところが','however; but'],['〜に違いない','must; certainly'],['〜をもとに（して）','based on'],['〜と同じで / 〜と違って','just like / unlike'],['〜らしい','typical of; -like'],['〜的','-ic/-ive/-al/-like'],['Sたらいいのになあ','I wish; if only'],['ほとんど / ほとんど〜ない / ほとんどの〜','almost all; hardly; most'],['〜（ような）気がする','feel/have the impression that'],['V-teいるところ / V-non-pastところ / V-pastところ','in the midst of / about to / just did']
    ],
    6:[
      ['～に気がつく','notice; realize'],['～ように（と）｛願う/祈る｝','hope/pray that'],['～も～ば、～も～','some…and others…; both'],['～のだろうか','I wonder'],['｛そんな/こんな/あんな｝～','that/this kind of'],['それぞれ','each'],['～らしい','seems; apparently; I heard'],['～続ける','continue/keep V-ing'],['～ばかり','nothing but; spend all one’s time'],['～わけだ','that means; no wonder'],['～でよければ','if that works/is acceptable'],['結構～','fairly; quite; a fair amount'],['なかなか～','quite; fairly; considerably'],['そう言えば','now that you mention it'],['～ということ','that; V-ing']
    ],
    7:[
      ['〜出す','begin/start V-ing'],['（〜が/は）〜する','onomatopoeia + する / event description'],['XはYに当たる / Yに当たるZはXだ','correspond/equivalent to'],['〜（という）ことになる','end up; mean that; cause'],['｛では/それでは/それじゃ/じゃ｝、〜','if so; in that case'],['〜（という）傾向がある','tend to; tendency'],['（もし）〜としたら','suppose; if'],['〜さえ','even'],['その上','in addition; moreover'],['〜向け','for; made for; directed toward'],['〜ない〜は｛ない/いない｝','there is no…that/who does not'],['〜くせに','although; in spite of'],['話し言葉の縮約形','contracted spoken forms'],['〜（という）わけではない','it’s not that; I don’t mean that']
    ],
    8:[
      ['XはY｛と/に｝関係がある','X is related to Y'],['〜（こと）によって','because of; by means of; by V-ing'],['すると','then'],['〜通り（に）','the way/as/according to'],['〜ば〜ほど','the more…the more'],['〜を中心｛と/に｝する','centering/focusing on'],['逆だ / 逆に / 逆の','opposite; conversely'],['〜はず','should; expect/believe; supposed to'],['〜点 / S（という）点が / S（という）点で（は）','point/aspect; the fact that; in that respect'],['ますます','more and more; increasingly'],['さて','well; now'],['V-masu直す','do again; re-V'],['〜ことは〜（が/けれど）','it is true that…but'],['｛おかげ/せい｝で','because; due to'],['〜たびに','every time; whenever'],['とうとう','finally; eventually']
    ]
  };

  const lessonRows=[
    {n:1,title:'日本の名所や名物をもっと知ろう',pages:[23,44],before:'24–25',reading:'26–29',dialogue:'30–36',grammar:'37–41',kanji:'42',notes:'43–44'},
    {n:2,title:'私の日本語は大丈夫？',pages:[45,66],before:'46–47',reading:'48–52',dialogue:'53–58',grammar:'59–63',kanji:'64',notes:'65–66'},
    {n:3,title:'日本のかわいいAIロボット',pages:[67,86],before:'68',reading:'69–73',dialogue:'74–78',grammar:'79–84',kanji:'85',notes:'86'},
    {n:4,title:'武道の心とスポーツ',pages:[89,108],before:'90–91',reading:'92–95',dialogue:'96–101',grammar:'102–106',kanji:'107',notes:'108'},
    {n:5,title:'世界に広がる日本の味',pages:[109,132],before:'110–111',reading:'112–118',dialogue:'119–122',grammar:'123–128',kanji:'129',notes:'130–132'},
    {n:6,title:'年中行事や習慣から日本を考えよう',pages:[133,154],before:'134–135',reading:'136–141',dialogue:'142–146',grammar:'147–151',kanji:'152',notes:'153–154'},
    {n:7,title:'日本のポップカルチャーのルーツは？',pages:[157,180],before:'158–159',reading:'160–166',dialogue:'167–172',grammar:'173–178',kanji:'179',notes:'180'},
    {n:8,title:'伝統芸能からの贈り物',pages:[181,206],before:'182–183',reading:'184–189',dialogue:'190–196',grammar:'197–202',kanji:'203',notes:'204–206'}
  ];
  const map=window.BOOK_MAPS?.['tobira-intermediate-i'];
  const resources={
    1:{video:'einlt8I6rx8',protected:'https://tobiraweb.9640.jp/video/第1課/',videoWorksheet:'https://tobiraweb.9640.jp/wp-content/uploads/L01_video_question.pdf',videoWorksheetDoc:'https://tobiraweb.9640.jp/wp-content/uploads/L01_video_question.doc',worksheet:'https://tobiraweb.9640.jp/wp-content/uploads/L1_worksheet.pdf',plus:'https://tobiraweb.9640.jp/wp-content/uploads/L1_plus-activity.pdf'},
    2:{video:'TUbY4yJDJhg',protected:'https://tobiraweb.9640.jp/video/第2課/',videoWorksheet:'https://tobiraweb.9640.jp/wp-content/uploads/L02_video_question.pdf',videoWorksheetDoc:'https://tobiraweb.9640.jp/wp-content/uploads/L02_video_question.doc',worksheet:'https://tobiraweb.9640.jp/wp-content/uploads/L2_worksheet.pdf',plus:'https://tobiraweb.9640.jp/wp-content/uploads/L2_plus-activity.pdf'},
    3:{video:'M3f58FLtv2U',protected:'https://tobiraweb.9640.jp/video/第3課/',videoWorksheet:'https://tobiraweb.9640.jp/wp-content/uploads/L03_video_question.pdf',videoWorksheetDoc:'https://tobiraweb.9640.jp/wp-content/uploads/L03_video_question.doc'},
    4:{video:'ij-kbSPn2wI',protected:'https://tobiraweb.9640.jp/video/第4課/',videoWorksheet:'https://tobiraweb.9640.jp/wp-content/uploads/L04_video_question.pdf',videoWorksheetDoc:'https://tobiraweb.9640.jp/wp-content/uploads/L04_video_question.doc'},
    5:{video:'Oo17iH1bdZU',protected:'https://tobiraweb.9640.jp/video/第5課/',videoWorksheet:'https://tobiraweb.9640.jp/wp-content/uploads/L05_video_question.pdf',videoWorksheetDoc:'https://tobiraweb.9640.jp/wp-content/uploads/L05_video_question.doc'},
    6:{video:'zc_fUOKwfzM',protected:'https://tobiraweb.9640.jp/video/第6課/',videoWorksheet:'https://tobiraweb.9640.jp/wp-content/uploads/L06_video_question.pdf',videoWorksheetDoc:'https://tobiraweb.9640.jp/wp-content/uploads/L06_video_question.doc',worksheet:'https://tobiraweb.9640.jp/wp-content/uploads/L6_worksheet.pdf',plus:'https://tobiraweb.9640.jp/wp-content/uploads/L6_plus-activity.pdf'},
    7:{video:'sXtI4NzcYPs',protected:'https://tobiraweb.9640.jp/video/第7課/',videoWorksheet:'https://tobiraweb.9640.jp/wp-content/uploads/L07_video_question.pdf',videoWorksheetDoc:'https://tobiraweb.9640.jp/wp-content/uploads/L07_video_question.doc',worksheet:'https://tobiraweb.9640.jp/wp-content/uploads/L7_worksheet.pdf'},
    8:{video:'fyXevi3SWPE',protected:'https://tobiraweb.9640.jp/video/第8課/',videoWorksheet:'https://tobiraweb.9640.jp/wp-content/uploads/L08_video_question.pdf',videoWorksheetDoc:'https://tobiraweb.9640.jp/wp-content/uploads/L08_video_question.doc',worksheet:'https://tobiraweb.9640.jp/wp-content/uploads/L8_worksheet.pdf',plus:'https://tobiraweb.9640.jp/wp-content/uploads/L8_plus-activity.pdf'}
  };
  const links={
    1:[['東北三大祭り','Dialogue 2 after-dialogue · p.33','https://www.youtube.com/watch?v=d4JiMucOKk4'],['東北三大祭りを3日間で巡るモデルコース','Dialogue 2 after-dialogue · p.33','https://www.youtube.com/watch?v=Ut6HhdeaH2Y'],['「東北三大祭り」とは?','Dialogue 2 after-dialogue · p.33','https://www.youtube.com/watch?v=hCfNh2GmQas'],['日本昔話 動画集','PLUS Activity · p.35','https://www.yumearu-ehon.com/stories/story/japan/page/2/'],['日本昔話 読み聞かせセット集','PLUS Activity · p.35','https://www.youtube.com/watch?v=cDZqV3CPRds'],['まんが日本昔話 お話しデータベース','PLUS Activity · p.35','http://nihon.syoukoukai.com/modules/stories/index.php'],['民話の部屋ーとんとむかしあったとさ','PLUS Activity · p.35','https://minwanoheya.jp/']],
    4:[['日本相撲協会','Reading 1 Activity 1 · p.93','https://www.sumo.or.jp/'],['International Sumo Federation','Reading 1 Activity 1 · p.93','http://www.ifs-sumo.org/'],['全日本柔道連盟','Reading 1 Activity 1 · p.93','https://www.judo.or.jp/what-is-judo/'],['International Judo Federation','Reading 1 Activity 1 · p.93','https://www.ijf.org/'],['全日本空手道連盟','Reading 1 Activity 1 · p.93','https://www.jkf.ne.jp/'],['World Karate Federation','Reading 1 Activity 1 · p.93','https://www.wkf.net/'],['全日本剣道連盟','Reading 1 Activity 1 · p.93','https://www.kendo.or.jp/'],['All Japan Kendo Federation','Reading 1 Activity 1 · p.93','https://www.kendo.or.jp/en']],
    7:[['手塚治虫物語 01','Before Starting 3 · p.159','https://youtu.be/PKJQZJK_wVA'],['手塚治虫物語 02','Before Starting 3 · p.159','https://youtu.be/RLd1D4_4JT0'],['手塚治虫物語 03','Before Starting 3 · p.159','https://youtu.be/BcNH64YQfYs']],
    8:[['歌舞伎・文楽・能楽・雅楽・組踊の世界','Before Starting 2 Step 3 · p.183','https://www.youtube.com/watch?v=Lw-PRHjjzpQ'],['ドキッとする風刺画14枚','Reading 2 Activity 2 · p.189','https://tabi-labo.com/275793/pawelkuczynski-caricature-art-sns']]
  };
  const publisherNotes={
    1:[{section:'reading1_activity',text:'Language Note: Noun modification structures · Reading 1 after-reading · p.27'}],
    3:[{section:'reading2_activity',text:'Full writing example for 考えてみよう3 · p.73'}],
    4:[{section:'reading1_activity',text:'Full writing example · Reading 1 Activity 2 · p.93'}],
    7:[{section:'dialogue_listen',text:'Personality-expression list before Dialogue 2 · p.169'}],
    8:[{section:'conversation',text:'Full writing example · p.196'}]
  };
  const sectionBlueprint=[
    ['orientation','Can-do goals / lesson orientation','start','Read the outcomes and preview the lesson’s central topic.'],
    ['before','Before Starting the Lesson','before','Activate background knowledge and complete the opening prompts.'],
    ['reading1','Reading 1 — first pass','reading','Read for structure and overall meaning before investigating details.','reading1'],
    ['reading1_activity','Reading 1 — comprehension / activity','reading','Answer the after-reading questions and explain the main point.'],
    ['reading2','Reading 2 — first pass','reading','Read the second text for its main argument, story or comparison.','reading2'],
    ['reading2_activity','Reading 2 — comprehension / activity','reading','Complete the associated comprehension or production activity.'],
    ['dialogue_listen','Dialogue — listen first','dialogue','Listen without the script and identify the situation and intent.','dialogue'],
    ['dialogue_read','Dialogue — read + listen','dialogue','Read with the recording and resolve the language that blocked comprehension.','dialogue'],
    ['dialogue_shadow','Dialogue shadowing','dialogue','Shadow a short understood section, matching rhythm and intonation.','dialogue'],
    ['conversation','Conversation Practice / model conversation','dialogue','Use the model to produce your own spoken exchange.','conversation'],
    ['grammar','Grammar / Expression Notes','grammar','Study each numbered expression, its restrictions and examples.'],
    ['kanji','Kanji List — contextual reinforcement','kanji','Reinforce recognition, readings and compounds in lesson context; WaniKani remains the SRS.'],
    ['culture','Language / Culture Note','notes','Read the note and connect it to the lesson’s language or topic.','culture'],
    ['consolidation','Lesson consolidation / production','end','Summarise, speak or write using the lesson language, then revisit the Can-do goals.']
  ];
  const lessons=lessonRows.map(row=>{
    const source=map?.lessons?.find(item=>item.n===row.n)||{};
    const pageMap={start:row.pages[0],end:row.pages[1],before:row.before,reading:row.reading,dialogue:row.dialogue,grammar:row.grammar,kanji:row.kanji,notes:row.notes};
    const sections=sectionBlueprint.map(([key,label,field,desc,audio])=>({id:`ti-l${row.n}-${key}`,key,label,taskKey:key,resource:'Textbook',pages:pageMap[field]||`${row.pages[0]}–${row.pages[1]}`,desc,audio,items:key==='reading1'?(source.readings||[]).slice(0,1).map(label=>({label})):key==='reading2'?(source.readings||[]).slice(1).map(label=>({label})):[]}));
    if([3,6,8].includes(row.n))sections.push({id:`ti-project-${row.n===3?1:row.n===6?2:3}`,key:'unit_project',label:`Unit ${row.n===3?1:row.n===6?2:3} Project`,taskKey:'unit_project',resource:'Textbook',pages:row.n===3?'87–88':row.n===6?'155–156':'207–208',desc:'Complete the required unit project as integrated research, production and presentation work.'});
    return {programmeId:'tobira-intermediate-future',bookId:'tobira-intermediate-i',n:row.n,title:row.title,english:source.topic||source.conversation||'Intermediate Japanese lesson',unit:source.unit||`Unit ${row.n<=3?1:row.n<=6?2:3}`,textbook:{start:row.pages[0],end:row.pages[1],pages:pageMap,cando:source.canDo||[],grammar:(grammar[row.n]||[]).map(([heading,gloss],index)=>({number:index+1,heading,gloss})),note:`Language / Culture Note · pp.${row.notes}`},sections,workbookMap:{workbook1:[],workbook2:[]},resources:{...resources[row.n],links:(links[row.n]||[]).map(([title,context,url])=>({title,context,url})),notes:publisherNotes[row.n]||[]}};
  });

  if(map){
    map.sourceNote='Authoritative programme map for printed pp.23–208, including all eight lessons, three required unit projects, companion vocabulary/dialogue material and official publisher resources.';
    map.structure.lessonPages='23–208';
    map.lessons=(map.lessons||[]).map(existing=>{const row=lessonRows.find(item=>item.n===existing.n);return row?{...existing,title:row.title,pages:`${row.pages[0]}–${row.pages[1]}`} : existing;});
    map.projects=[
      {unit:'Unit 1',lessons:'1–3',title:'Unit 1 Project',pages:'87–88',note:'Required integration project after Lesson 3.'},
      {unit:'Unit 2',lessons:'4–6',title:'Unit 2 Project',pages:'155–156',note:'Required integration project after Lesson 6.'},
      {unit:'Unit 3',lessons:'7–8',title:'Unit 3 Project',pages:'207–208',note:'Required integration project after Lesson 8.'}
    ];
    map.programmeNote='Fully mapped as a planned 12-week reading-led programme. Activation remains an explicit Hub action.';
  }

  const lessonWeek={1:0,2:1,3:2,4:4,5:5,6:6,7:8,8:9};
  const projects=[
    {id:'ti-project-1',unit:1,title:'Unit 1 Project',page:'87–88',week:3,worksheet:'https://tobiraweb.9640.jp/wp-content/uploads/U1-Project_worksheet.pdf'},
    {id:'ti-project-2',unit:2,title:'Unit 2 Project',page:'155–156',week:7,worksheet:null},
    {id:'ti-project-3',unit:3,title:'Unit 3 Project',page:'207–208',week:10,worksheet:'https://tobiraweb.9640.jp/wp-content/uploads/U3-Project_worksheet.pdf'}
  ];
  window.INTERMEDIATE_CURRICULUM={book:'TOBIRA Intermediate Japanese I',bookId:'tobira-intermediate-i',programmeId:'tobira-intermediate-future',lessons,projects,lessonWeek,weeks:12};

  window.INTERMEDIATE_TASK_TYPES=sectionBlueprint.map(([key,label,field,desc,audio])=>({key,label:`Textbook · ${label}`,book:'Textbook',field,duration:key.includes('reading')?'30–45 min':key.includes('dialogue')||key==='conversation'?'20–30 min':key==='grammar'?'45–60 min':'15–30 min',desc,audio})).concat([{key:'unit_project',label:'Unit Project',book:'Textbook',field:'project',duration:'60–120 min',desc:'Complete the mapped unit project and its official worksheet where supplied.'}]);

  const weekFocus=['Lesson 1','Lesson 2','Lesson 3','Unit 1 Project + consolidation','Lesson 4','Lesson 5','Lesson 6','Unit 2 Project + consolidation','Lesson 7','Lesson 8','Unit 3 Project + consolidation','Full-course consolidation and final production'];
  const lessonDayFocus=['Orientation + Before Starting','Reading 1','Reading 2','Dialogue: listen + close study','Shadowing + Conversation Practice','Grammar + contextual kanji','Culture note + lesson production'];
  const projectDayFocus=['Complete the mapped unit project','Review project language and sources','Catch up unfinished reading','Catch up dialogue and conversation','Consolidate grammar and expressions','Reinforce lesson kanji in context','Finish unit production and notes'];
  const finalDayFocus=['Audit unfinished programme work','Consolidate Reading 1 texts','Consolidate Reading 2 texts','Dialogue listening and shadowing','Grammar and expression repair','Final speaking or writing production','Course reflection and completion check'];
  window.INTERMEDIATE_WEEK_PLANS=weekFocus.map((focus,index)=>{const labels=[3,7,10].includes(index)?projectDayFocus:index===11?finalDayFocus:lessonDayFocus;return {week:index+1,focus,target:index===11?420:600,days:labels.map(dayFocus=>({focus:dayFocus,target:index===11?60:90,extra:'Optional Japanese input'}))};});
  window.INTERMEDIATE_SCHEDULE={lessonWeek,projects,lessonDays:[['orientation','before'],['reading1','reading1_activity'],['reading2','reading2_activity'],['dialogue_listen','dialogue_read'],['dialogue_shadow','conversation'],['grammar','kanji'],['culture','consolidation']]};

  const audioRows={
    1:[['reading1',26,'Reading 1 — 日本の地理と気候'],['reading2',28,'Reading 2 — 日本の色々な名所'],['dialogue',30,'Dialogue 1-1'],['dialogue',30,'Dialogue 1-2'],['conversation',32,'Conversation Practice 1'],['dialogue',33,'Dialogue 2'],['conversation',34,'Conversation Practice 2'],['vocabulary',null,'Vocabulary — Before Starting'],['vocabulary',null,'Vocabulary — Reading 1'],['vocabulary',null,'Vocabulary — Reading 2'],['vocabulary',null,'Vocabulary — Dialogue 1-1'],['vocabulary',null,'Vocabulary — Dialogue 1-2'],['vocabulary',null,'Vocabulary — Dialogue 2']],
    2:[['reading1',48,'Reading 1 — スピーチレベル'],['reading1',48,'Reading 1 — 話し方から分かる日本語的特徴'],['reading2',50,'Reading 2 — 「話す・書く」のポイント, section 1'],['reading2',51,'Reading 2 — section 2'],['dialogue',53,'Dialogue 1'],['conversation',54,'Conversation Practice 1'],['dialogue',55,'Dialogue 2'],['conversation',56,'Conversation Practice 2'],['vocabulary',null,'Vocabulary — Before Starting'],['vocabulary',null,'Vocabulary — Reading 1'],['vocabulary',null,'Vocabulary — Reading 2'],['vocabulary',null,'Vocabulary — Dialogue 1'],['vocabulary',null,'Vocabulary — Dialogue 2']],
    3:[['reading1',69,'Reading 1 — 日本ロボット界のレジェンド達'],['reading2',71,'Reading 2 — ペットロボット：AIBOからaiboへ'],['dialogue',74,'Dialogue 1'],['dialogue',75,'Dialogue 2'],['conversation',77,'Conversation Practice 1'],['dialogue',78,'Dialogue 3'],['conversation',78,'Conversation Practice 2'],['vocabulary',null,'Vocabulary — Before Starting'],['vocabulary',null,'Vocabulary — Reading 1'],['vocabulary',null,'Vocabulary — Reading 2'],['vocabulary',null,'Vocabulary — 考えてみよう'],['vocabulary',null,'Vocabulary — Dialogue 1'],['vocabulary',null,'Vocabulary — Dialogue 2'],['vocabulary',null,'Vocabulary — Dialogue 3']],
    4:[['reading1',92,'Reading 1 — 武道を通して学ぶ'],['reading2',94,'Reading 2 — 武道の心'],['dialogue',96,'Dialogue 1'],['conversation',97,'Conversation Practice 1'],['dialogue',98,'Dialogue 2'],['conversation',98,'Conversation Practice 2'],['dialogue',99,'Dialogue 3-1'],['dialogue',99,'Dialogue 3-2'],['vocabulary',null,'Vocabulary — Before Starting'],['vocabulary',null,'Vocabulary — Reading 1'],['vocabulary',null,'Vocabulary — Reading 2'],['vocabulary',null,'Vocabulary — Dialogue 1'],['vocabulary',null,'Vocabulary — Dialogue 2'],['vocabulary',null,'Vocabulary — Dialogue 3-1'],['vocabulary',null,'Vocabulary — Dialogue 3-2']],
    5:[['reading1',112,'Reading 1 — 世界中で愛されるインスタントラーメン'],['reading2',114,'Reading 2 — 安藤百福の物語'],['dialogue',119,'Dialogue 1-1'],['dialogue',119,'Dialogue 1-2'],['conversation',120,'Conversation Practice 1'],['dialogue',121,'Dialogue 2'],['conversation',122,'Conversation Practice 2'],['culture',130,'Culture Note 1 — お米の話'],['vocabulary',null,'Vocabulary — Before Starting'],['vocabulary',null,'Vocabulary — Reading 1'],['vocabulary',null,'Vocabulary — Reading 2'],['vocabulary',null,'Vocabulary — Dialogue 1-1'],['vocabulary',null,'Vocabulary — Dialogue 1-2'],['vocabulary',null,'Vocabulary — Dialogue 2']],
    6:[['reading1',136,'Reading 1-1 — 日本には神様がいっぱい'],['reading1',138,'Reading 1-2 — 神道の考え方と日本人'],['reading2',141,'Reading 2 — 日本の昔話「天の岩戸」'],['dialogue',142,'Dialogue 1'],['dialogue',143,'Dialogue 2'],['culture',153,'Culture Note 2 — 日本の色々な迷信'],['vocabulary',null,'Vocabulary — Before Starting'],['vocabulary',null,'Vocabulary — Reading 1-1'],['vocabulary',null,'Vocabulary — Reading 1-2'],['vocabulary',null,'Vocabulary — Reading 2'],['vocabulary',null,'Vocabulary — Dialogue 1'],['vocabulary',null,'Vocabulary — Dialogue 2'],['presentation',null,'Vocabulary — Presentation']],
    7:[['reading1',160,'Reading 1 — 「ドキドキする」ってどんな気持ち？'],['reading2',163,'Reading 2-1 — 日本のストーリーマンガが世界に与えた影響'],['reading2',164,'Reading 2-2 — マンガの神様'],['dialogue',167,'Dialogue 1-1'],['dialogue',167,'Dialogue 1-2'],['conversation',168,'Conversation Practice 1'],['dialogue',169,'Dialogue 2 — 血液型占い'],['conversation',171,'Conversation Practice 2'],['culture',180,'Culture Note 3 — 日本はキャラクター天国'],['vocabulary',null,'Vocabulary — Before Starting'],['vocabulary',null,'Vocabulary — Reading 1'],['vocabulary',null,'Vocabulary — Reading 2-1'],['vocabulary',null,'Vocabulary — Reading 2-2'],['vocabulary',null,'Vocabulary — Dialogue 1-1'],['vocabulary',null,'Vocabulary — Dialogue 1-2'],['vocabulary',null,'Vocabulary — Dialogue 2']],
    8:[['reading1',184,'Reading 1 — 笑いの効果'],['reading2',186,'Reading 2 — 狂言と笑い'],['reading2',187,'Reading 2 — 狂言「ぶす」'],['dialogue',190,'Dialogue 1'],['dialogue',190,'Dialogue 2 — 『くさびら』について話す'],['conversation',193,'『くさびら』紹介文とストーリー'],['culture',204,'Culture Note 4 — 日本の歌'],['vocabulary',null,'Vocabulary — Before Starting'],['vocabulary',null,'Vocabulary — Reading 1'],['vocabulary',null,'Vocabulary — Reading 2'],['vocabulary',null,'Vocabulary — Dialogue 1'],['vocabulary',null,'Vocabulary — Dialogue 2'],['vocabulary',null,'Vocabulary — 『くさびら』紹介文とストーリー']]
  };
  const categories=[
    {key:'reading1',label:'読み物 1',english:'Reading 1',guide:'Read for gist first, then replay and shadow selected sentences.'},{key:'reading2',label:'読み物 2',english:'Reading 2',guide:'Read for structure and meaning before close listening.'},{key:'dialogue',label:'会話',english:'Dialogue',guide:'Listen without the script first, then read, replay and shadow.'},{key:'conversation',label:'会話練習',english:'Conversation Practice',guide:'Pause and produce your own response before replaying the model.'},{key:'culture',label:'文化ノート',english:'Culture Note',guide:'Listen while following the note, then summarise its point.'},{key:'presentation',label:'発表',english:'Presentation',guide:'Use the model language to prepare your own presentation.'},
    {key:'vocabulary_before',label:'単語',english:'Before Starting vocabulary',guide:'Use this compact group while preparing the lesson topic.'},{key:'vocabulary_reading1',label:'単語',english:'Reading 1 vocabulary',guide:'Use this group beside Reading 1.'},{key:'vocabulary_reading2',label:'単語',english:'Reading 2 vocabulary',guide:'Use this group beside Reading 2.'},{key:'vocabulary_dialogue',label:'単語',english:'Dialogue vocabulary',guide:'Use this group beside the dialogue and conversation work.'},{key:'vocabulary_other',label:'単語',english:'Presentation / other vocabulary',guide:'Use this group beside its mapped production activity.'}
  ];
  const audioLessons={};
  Object.entries(audioRows).forEach(([lesson,rows])=>{
    const groups=Object.fromEntries(categories.map(category=>[category.key,[]]));
    rows.forEach(([rawCategory,page,title],index)=>{let category=rawCategory;if(rawCategory==='vocabulary')category=/Before Starting/i.test(title)?'vocabulary_before':/Reading 1/i.test(title)?'vocabulary_reading1':/Reading 2/i.test(title)?'vocabulary_reading2':/Dialogue/i.test(title)?'vocabulary_dialogue':'vocabulary_other';const number=index+1,nn=String(lesson).padStart(2,'0'),tt=String(number).padStart(2,'0');groups[category].push({lesson:Number(lesson),number,category,page,title,filename:`${nn}-${tt}.mp3`,path:`https://tobiraweb.9640.jp/files/material/1018_onsei/${nn}-${tt}.mp3`,url:`https://tobiraweb.9640.jp/files/material/1018_onsei/${nn}-${tt}.mp3`});});
    audioLessons[lesson]={groups,tracks:categories.flatMap(category=>groups[category.key])};
  });
  window.INTERMEDIATE_AUDIO={bucket:null,categories,lessons:audioLessons};
})();
