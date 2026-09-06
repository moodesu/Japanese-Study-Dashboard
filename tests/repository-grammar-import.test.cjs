const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const nodes=new Map();
function node(){return {value:'',innerHTML:'',textContent:'',disabled:false,isConnected:true,handlers:{},addEventListener(k,fn){this.handlers[k]=fn;}};}
for(const id of ['#repoImportJson','#repoImportPreview','#repoRunImport'])nodes.set(id,node());
const messages=[];
const context={console,URL,TextEncoder,localStorage:{getItem:()=>null},state:{user:{id:'user'},view:'repository'},
  $:s=>nodes.get(s)||null,document:{querySelectorAll:()=>[]},toast:x=>messages.push(x),
  esc:x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))};
context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(root,'repository.js'),'utf8'),context);
const state=vm.runInContext('repositoryState',context);state.grammarLibraryReady=true;
const sentence=JSON.parse(fs.readFileSync(path.join(root,'examples/repository-grammar-import.json'),'utf8'));
const plan=context.repositoryPlanImport(sentence);
assert.deepEqual(Array.from(plan.items[0].entry.grammar_points),['〜たら','〜ている','〜てくる']);
assert.equal(plan.items[0].grammar_points[0].surface,'見てたら');
assert.ok(plan.items[0].import_fields.includes('english'));assert.ok(!plan.items[0].import_fields.includes('status'));
assert.ok(!JSON.stringify(plan).includes('〜てたら"'), 'surface form is not promoted to a canonical label');
assert.throws(()=>context.repositoryPlanImport({...sentence,grammar_points:['〜てたら']}),/canonical, surface and note/);
assert.throws(()=>context.repositoryPlanImport({...sentence,grammar_points:[{canonical:'〜たら',surface:'食べたら',note:''}]}),/not present/);
const contraction={...sentence,japanese:'ケーキを食べちゃった。',japanese_furigana:'ケーキを[食|た]べちゃった。',grammar_points:[{canonical:'〜てしまう',surface:'食べちゃった',note:'Casual contraction.'}]};
assert.equal(context.repositoryPlanImport(contraction).items[0].entry.grammar_points[0],'〜てしまう');
const spoken={...sentence,japanese:'何してる？',japanese_furigana:'[何|なに]してる？',grammar_points:[{canonical:'〜ている',surface:'してる',note:'Spoken contraction.'}]};
assert.equal(context.repositoryPlanImport(spoken).items[0].entry.grammar_points[0],'〜ている');

const guideRaw=JSON.parse(fs.readFileSync(path.join(root,'examples/canonical-grammar-guide-import.json'),'utf8'));
const guide=context.repositoryValidateGrammarGuide(guideRaw);
assert.equal(guide.canonical,'〜たら');assert.equal(guide.variants.length,2);assert.equal(guide.variants[1].variant_type,'combined_form');
const clarificationRaw=JSON.parse(fs.readFileSync(path.join(root,'examples/grammar-clarification-import.json'),'utf8'));
const clarification=context.repositoryValidateClarification(clarificationRaw);
assert.equal(clarification.canonical,'〜たら');assert.equal(clarification.contrasts.length,3);
assert.throws(()=>context.repositoryValidateClarification({...clarificationRaw,contrasts:[{...clarificationRaw.contrasts[0],japanese_furigana:'違う'},clarificationRaw.contrasts[1]]}),/furigana/);

(async()=>{
  let calls=[];context.renderRepository=()=>{};context.loadRepositoryData=async()=>{};
  context.db={rpc:async(name,args)=>{calls.push([name,args]);if(name==='import_repository_with_canonical_grammar')return {data:{entries:[{id:'sentence'}],created_count:0,updated_count:1}};if(name==='upsert_canonical_grammar_guide')return {data:{guide:{pattern:'〜たら'}}};return {data:{guide:{pattern:'〜たら'}}};}};
  state.entries=[{id:'existing',entry_type:'sentence',japanese:sentence.japanese}];
  nodes.get('#repoImportJson').value=JSON.stringify(sentence);context.previewRepositoryImport();assert.match(nodes.get('#repoImportPreview').innerHTML,/1 existing sentence will be updated · 3 canonical grammar links/);await context.runRepositoryImport();assert.equal(calls[0][0],'import_repository_with_canonical_grammar');assert.equal(calls[0][1].p_entries[0].grammar_points[0].canonical,'〜たら');assert.equal(calls[0][1].p_entries[0].existing_id,undefined);assert.ok(calls[0][1].p_entries[0].import_fields.includes('english'));
  nodes.get('#repoImportJson').value=JSON.stringify(guideRaw);context.previewRepositoryImport();await context.runRepositoryImport();assert.equal(calls[1][0],'upsert_canonical_grammar_guide');
  nodes.get('#repoImportJson').value=JSON.stringify(clarificationRaw);context.previewRepositoryImport();await context.runRepositoryImport();assert.equal(calls[2][0],'append_canonical_grammar_clarification');
  nodes.get('#repoImportJson').value=JSON.stringify(sentence);context.previewRepositoryImport();nodes.get('#repoImportJson').value+=' ';await context.runRepositoryImport();assert.equal(calls.length,3,'stale preview cannot import');
  console.log('PASS: canonical sentence annotations, contractions, guide/clarification validation, furigana and isolated import RPCs.');
})().catch(error=>{console.error(error);process.exitCode=1;});
