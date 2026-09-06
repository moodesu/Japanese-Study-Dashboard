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
assert.ok(html.includes('見てたら'));assert.ok(html.includes('data-repo-entry="sentence"'));assert.ok(!html.includes('〜てたら</h1>'));
assert.match(context.repositoryGrammarLinks(entry),/〜たら/);assert.match(context.repositoryGrammarLinks(entry),/〜ている/);
state.grammarQuery='てたら';html=context.repositoryGrammarLibraryMarkup();assert.ok(html.includes('〜たら'));assert.ok(html.includes('Matched: 〜てたら'));assert.ok(html.includes('Related match via 〜たら: 〜てたら'));assert.equal((html.match(/class="repo-grammar-card"/g)||[]).length,2,'combined-form search also discovers its related canonical guide');assert.ok(!html.includes('data-repo-guide="v2"'),'variants are not cards');
state.grammarQuery='';html=context.repositoryGrammarLibraryMarkup();assert.equal((html.match(/class="repo-grammar-card"/g)||[]).length,2,'only canonical guides become cards');
assert.equal(context.repositorySavedGuide(tara).myExamples.length,1);
console.log('PASS: canonical-only library, variant search, guide sections, related grammar and linked personal examples.');
