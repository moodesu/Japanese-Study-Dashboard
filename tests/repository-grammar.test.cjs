const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..'),nodes=new Map();
function element(){return {innerHTML:'',hidden:false,handlers:{},addEventListener(type,fn){this.handlers[type]=fn;},focus(){this.focused=true;}};}
for(const id of ['#hero','#bottomArea','#weekView','#mainContent','#repoGrammarBack','#repoGrammarTitle'])nodes.set(id,element());
const context={console,URL,TextEncoder,localStorage:{getItem:()=>null},state:{user:{id:'user'},view:'repository'},$:s=>nodes.get(s)||null,
  document:{querySelectorAll:()=>[]},scrollTo:()=>{},scrollY:0,esc:value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))};
context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(root,'repository.js'),'utf8'),context);
const state=vm.runInContext('repositoryState',context);
const entry={id:'sentence',japanese:'お弁当箱を見てたら、お腹すいてきた。',japanese_furigana:'お[弁当箱|べんとうばこ]を[見|み]てたら、お[腹|なか]すいてきた。',english:'Looking at lunchboxes made me hungry.',grammar_points:['〜たら','〜ている','〜てくる'],tags:[]};
const tara={id:'tara-id',slug:'tara',pattern:'〜たら',meaning:'if; when; after',summary:'Conditional and temporal.',formation:['動詞た形 + ら'],usage:['Introduces a condition.'],nuance:['Context determines the translation.'],register:'neutral',jlpt_level:'N4',reference_examples:[],references:[],is_placeholder:false};
const teiru={...tara,id:'teiru-id',slug:'teiru',pattern:'〜ている',meaning:'ongoing action'};
state.entries=[entry];state.grammarGuides=[tara,teiru];state.grammarVariants=[
  {id:'v1',grammar_id:tara.id,form:'〜ていたら',variant_type:'combined_form',explanation:'Combined with 〜ている.',related_grammar_id:teiru.id},
  {id:'v2',grammar_id:tara.id,form:'〜てたら',variant_type:'combined_form',explanation:'Casual contraction.',related_grammar_id:teiru.id}
];
state.grammarLinks=[{id:'l1',repository_id:entry.id,grammar_id:tara.id,surface:'見てたら',note:'Contracted ongoing form.'},{id:'l2',repository_id:entry.id,grammar_id:teiru.id,surface:'見てたら',note:'Ongoing aspect.'}];
state.grammarClarifications=[{id:'c1',grammar_id:tara.id,title:'見たら vs 見ていたら / 見てたら',question:'How do they differ?',explanation:'They differ in aspect.',contrasts:[]}];state.grammarRelated=[{grammar_id:tara.id,related_grammar_id:teiru.id}];
state.selectedId=entry.id;state.grammarGuideId=tara.id;state.grammarLabel='〜たら';state.mode='grammar';
let html=context.repositoryGrammarMarkup(entry);
for(const heading of ['Overview','Formation','Usage and nuance','Combined forms','Clarifications','My examples','Reference examples','Related grammar'])assert.ok(html.includes(`<h2>${heading}</h2>`),heading);
assert.ok(html.includes('<h2>In this sentence</h2>'));assert.ok(!html.includes('Your saved sentence'));
assert.ok(html.includes('<nav class="repo-grammar-nav-list" aria-label="Related grammar">'));assert.ok(html.includes('class="repo-grammar-nav" data-repo-guide="teiru-id"'));assert.ok(!html.match(/<h2>Related grammar<\/h2><button[^>]+class="repo-link"/));
assert.ok(html.includes('<div class="repo-variant-related"><button type="button" class="repo-grammar-nav" data-repo-guide="teiru-id"><span>Related</span><strong lang="ja">〜ている</strong>'));
assert.ok(html.includes('<mark class="repo-grammar-surface">見</mark><rt>み</rt>'));assert.ok(html.includes('<mark class="repo-grammar-surface">てたら</mark>'));assert.equal((html.match(/<rt>み<\/rt>/g)||[]).length,2,'the context and My example each render one reading without duplication');
assert.ok(html.includes('<span lang="ja">見てたら</span><span aria-hidden="true">→</span><strong lang="ja">〜たら</strong>'));assert.ok(html.includes('Contracted ongoing form.'));assert.ok(!html.includes('Ongoing aspect.'),'sentence context shows only the current guide link note');
assert.ok(html.includes('data-repo-entry="sentence"'));assert.ok(!html.includes('〜てたら</h1>'));
assert.match(context.repositoryGrammarLinks(entry),/〜たら/);assert.match(context.repositoryGrammarLinks(entry),/〜ている/);
state.grammarGuideId=teiru.id;state.grammarLabel='〜ている';html=context.repositoryGrammarMarkup(entry);assert.ok(html.includes('<span lang="ja">見てたら</span><span aria-hidden="true">→</span><strong lang="ja">〜ている</strong>'));assert.ok(html.includes('Ongoing aspect.'));assert.ok(!html.includes('Contracted ongoing form.'),'the same surface resolves to the current canonical guide only');
const iku={japanese:'今日レクサスのディーラーに行ってきた。',japanese_furigana:'[今日|きょう]レクサスのディーラーに[行|い]ってきた。'};const ikuHtml=context.repositoryJapaneseWithSurfaces(iku,['行ってきた']);assert.ok(ikuHtml.includes('<ruby><mark class="repo-grammar-surface">行</mark><rt>い</rt></ruby><mark class="repo-grammar-surface">ってきた</mark>'));assert.equal((ikuHtml.match(/<rt>い<\/rt>/g)||[]).length,1);
const kanjiNav=context.repositoryGrammarNavLink({id:'kuru-id',pattern:'[来|く]る'});assert.ok(kanjiNav.includes('<strong lang="ja"><ruby>来<rt>く</rt></ruby>る</strong>'));assert.ok(!kanjiNav.includes('<br'));
const standalone={routeStandalone:true};html=context.repositoryGrammarMarkup(standalone);assert.ok(!html.includes('<h2>In this sentence</h2>'));assert.ok(html.includes('<h2>My examples</h2>'));assert.ok(html.includes('<mark class="repo-grammar-surface">てたら</mark>'));
state.grammarQuery='てたら';html=context.repositoryGrammarLibraryMarkup();assert.ok(html.includes('〜たら'));assert.ok(html.includes('Matched: 〜てたら'));assert.ok(html.includes('Related match via 〜たら: 〜てたら'));assert.equal((html.match(/class="repo-grammar-card"/g)||[]).length,2,'combined-form search also discovers its related canonical guide');assert.ok(!html.includes('data-repo-guide="v2"'),'variants are not cards');
state.grammarQuery='';html=context.repositoryGrammarLibraryMarkup();assert.equal((html.match(/class="repo-grammar-card"/g)||[]).length,2,'only canonical guides become cards');
teiru.is_placeholder=true;teiru.guide_status='pending';teiru.discovered_from_sentence=true;teiru.first_encountered_at='2026-09-01T00:00:00Z';teiru.last_encountered_at='2026-09-06T00:00:00Z';state.grammarFilter='pending';state.pendingGuideIds=new Set([teiru.id]);html=context.repositoryGrammarLibraryMarkup();assert.ok(html.includes('Pending Guides'));assert.ok(html.includes('1 linked sentence'));assert.ok(html.includes('encountered directly'));assert.ok(html.includes('data-pending-guide="teiru-id" checked'));assert.ok(html.includes('Copy guide-generation prompt'));assert.equal((html.match(/class="repo-grammar-card"/g)||[]).length,1);
const prompt=context.repositoryPendingGuidePrompt([teiru]);assert.match(prompt,/Create complete Learning Hub `grammar_guide` JSON/);assert.match(prompt,/- 〜ている/);assert.match(prompt,/one valid JSON array for batch import/);assert.doesNotMatch(prompt,/見てたら/);
assert.equal(context.repositorySavedGuide(tara).myExamples.length,1);
const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');assert.match(css,/\.repo-grammar-nav\{[^}]*display:inline-flex/);assert.match(css,/\.repo-grammar-nav\{[^}]*white-space:nowrap/);assert.match(css,/\.repo-grammar-nav\{[^}]*word-break:keep-all/);assert.match(css,/\.repo-import textarea\{[^}]*max-width:100%[^}]*overflow-x:auto/);assert.match(css,/\.repo-grammar-card>span[^}]*overflow-wrap:anywhere/);assert.match(css,/\.repo-grammar-card>strong\{[^}]*writing-mode:horizontal-tb/);
console.log('PASS: canonical-only library, variant search, guide sections, related grammar and linked personal examples.');
