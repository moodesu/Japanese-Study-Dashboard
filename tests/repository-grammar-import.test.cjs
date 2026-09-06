const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const nodes=new Map();
function node(){return {value:'',innerHTML:'',textContent:'',disabled:false,isConnected:true,handlers:{},addEventListener(k,fn){this.handlers[k]=fn;},focus(){}};}
for(const id of ['#repoImportJson','#repoImportPreview','#repoRunImport','#repoClearImport'])nodes.set(id,node());
const messages=[];
const sessionValues=new Map();
const context={console,URL,TextEncoder,localStorage:{getItem:()=>null},state:{user:{id:'user'},view:'repository'},
  sessionStorage:{getItem:key=>sessionValues.get(key)||null,setItem:(key,value)=>sessionValues.set(key,value),removeItem:key=>sessionValues.delete(key)},
  $:s=>nodes.get(s)||null,document:{querySelectorAll:()=>[]},toast:x=>messages.push(x),
  esc:x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))};
context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(root,'repository.js'),'utf8'),context);
const state=vm.runInContext('repositoryState',context);state.grammarLibraryReady=true;
context.repositorySaveImportDraft('{"draft":true}');assert.match(context.repositoryImportMarkup(),/\{&quot;draft&quot;:true\}/);assert.match(context.repositoryImportMarkup(),/Draft restored/);assert.equal(sessionValues.get('learningHub.repositoryImportDraft'),'{"draft":true}');context.bindRepositoryEvents(null);nodes.get('#repoImportJson').value='edited draft';nodes.get('#repoImportJson').handlers.input();assert.equal(sessionValues.get('learningHub.repositoryImportDraft'),'edited draft','input changes persist without waiting for blur');nodes.get('#repoClearImport').handlers.click();assert.equal(sessionValues.has('learningHub.repositoryImportDraft'),false,'Clear explicitly discards the draft');
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
  let calls=[],lastBatch=null,batchMode='success';context.renderRepository=()=>{};
  context.loadRepositoryData=async()=>{if(lastBatch)state.grammarGuides=lastBatch.map((guide,index)=>({id:`guide-${index}`,pattern:guide.canonical,is_placeholder:batchMode==='incomplete'&&index===1,guide_status:batchMode==='incomplete'&&index===1?'pending':'complete'}));};
  context.db={rpc:async(name,args)=>{calls.push([name,args]);if(name==='import_repository_with_canonical_grammar')return {data:{entries:[{id:'sentence'}],created_count:0,updated_count:1}};if(name==='upsert_canonical_grammar_guide')return {data:{guide:{pattern:args.p_guide.canonical}}};if(name==='upsert_canonical_grammar_guides'){lastBatch=args.p_guides;return {data:{guides:args.p_guides.map((guide,index)=>({id:`guide-${index}`,pattern:guide.canonical,guide_status:'complete',is_placeholder:false})),items:args.p_guides.map((guide,index)=>({incoming_canonical:guide.canonical,incoming_slug:guide.slug,guide_id:`guide-${index}`,returned_pattern:batchMode==='mismatch'&&index===1?'〜たら':guide.canonical,guide_status:'complete',is_placeholder:false}))}};}return {data:{guide:{pattern:'〜たら'}}};}};
  state.entries=[{id:'existing',entry_type:'sentence',japanese:sentence.japanese}];
  nodes.get('#repoImportJson').value=JSON.stringify(sentence);context.repositorySaveImportDraft(nodes.get('#repoImportJson').value);context.previewRepositoryImport();assert.match(nodes.get('#repoImportPreview').innerHTML,/1 existing sentence will be updated · 3 canonical grammar links/);await context.runRepositoryImport();assert.equal(calls[0][0],'import_repository_with_canonical_grammar');assert.equal(calls[0][1].p_entries[0].grammar_points[0].canonical,'〜たら');assert.equal(calls[0][1].p_entries[0].existing_id,undefined);assert.ok(calls[0][1].p_entries[0].import_fields.includes('english'));assert.equal(sessionValues.has('learningHub.repositoryImportDraft'),false,'successful import clears the draft');
  nodes.get('#repoImportJson').value=JSON.stringify(guideRaw);context.previewRepositoryImport();await context.runRepositoryImport();assert.equal(calls[1][0],'upsert_canonical_grammar_guide');
  const guideBatch=[guideRaw,{...guideRaw,slug:'teiru',canonical:'〜ている'}];state.grammarGuides=[{id:'pending',pattern:'〜たら',is_placeholder:true,guide_status:'pending'}];nodes.get('#repoImportJson').value=JSON.stringify(guideBatch);context.previewRepositoryImport();assert.match(nodes.get('#repoImportPreview').innerHTML,/2 grammar guides/);assert.match(nodes.get('#repoImportPreview').innerHTML,/1 pending guides will be completed · 1 new guides/);await context.runRepositoryImport();assert.equal(calls[2][0],'upsert_canonical_grammar_guides');assert.equal(calls[2][1].p_guides[1].canonical,'〜ている');assert.match(messages.at(-1),/2 canonical grammar guides saved/);
  nodes.get('#repoImportJson').value=JSON.stringify(clarificationRaw);context.previewRepositoryImport();await context.runRepositoryImport();assert.equal(calls[3][0],'append_canonical_grammar_clarification');
  batchMode='mismatch';nodes.get('#repoImportJson').value=JSON.stringify(guideBatch);context.repositorySaveImportDraft(nodes.get('#repoImportJson').value);context.previewRepositoryImport();await context.runRepositoryImport();assert.match(messages.at(-1),/Grammar guide import mismatch: expected 〜ている, database updated 〜たら/);assert.ok(sessionValues.has('learningHub.repositoryImportDraft'),'identity mismatch keeps the draft');
  batchMode='incomplete';nodes.get('#repoImportJson').value=JSON.stringify(guideBatch);context.repositorySaveImportDraft(nodes.get('#repoImportJson').value);context.previewRepositoryImport();await context.runRepositoryImport();assert.match(messages.at(-1),/Batch import incomplete: 1 of 2 guides completed\. Still pending: 〜ている/);assert.ok(sessionValues.has('learningHub.repositoryImportDraft'),'post-load incomplete batch keeps the draft');
  context.repositorySaveImportDraft('{invalid');nodes.get('#repoImportJson').value='{invalid';context.previewRepositoryImport();assert.equal(sessionValues.get('learningHub.repositoryImportDraft'),'{invalid','failed preview keeps the draft');
  nodes.get('#repoImportJson').value=JSON.stringify(sentence);context.repositorySaveImportDraft(nodes.get('#repoImportJson').value);context.previewRepositoryImport();nodes.get('#repoImportJson').value+=' ';await context.runRepositoryImport();assert.equal(calls.length,6,'stale preview cannot import');assert.ok(sessionValues.has('learningHub.repositoryImportDraft'),'stale or failed import keeps the draft');
  console.log('PASS: canonical sentence annotations, atomic guide batches, return/post-load verification, furigana and isolated import RPCs.');
})().catch(error=>{console.error(error);process.exitCode=1;});
