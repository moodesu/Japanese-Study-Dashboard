// Test-only dependency: npm install --prefix /tmp/jlh-dictionary-test --no-save linkedom @electric-sql/pglite
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const {parseHTML}=require(process.env.LINKEDOM_MODULE||'/tmp/jlh-dictionary-test/node_modules/linkedom');
const root=path.resolve(__dirname,'..');
function boot(db){
  const {document}=parseHTML('<html><body><main id="mainContent"></main></body></html>');
  const preferences=new Map();
  const context={console,document,db,crypto:webcrypto,URL,TextEncoder,localStorage:{getItem:key=>preferences.get(key)||null,setItem:(key,value)=>preferences.set(key,value)},
    state:{user:{id:'test-user'},view:'repository'},scrollY:24,scrollTo:()=>{},addEventListener:()=>{},
    $:s=>document.querySelector(s),toast:()=>{},esc:v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))};
  context.window=context;vm.createContext(context);
  for(const file of ['repository.js','dictionary.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
  const repository=vm.runInContext('repositoryState',context);
  repository.selectedId='sentence1';repository.grammarLabel='〜てくる';repository.entries=[{id:'sentence1',grammar_points:['〜てくる']}];
  repository.grammarGuides=[{id:'guide',grammar_key:'てくる',label:'〜てくる',sense:'developing-change',content:{meaning:'Change',formation:['て + くる'],explanation:'Change',examples:[]}}];
  repository.grammarLinks=[{repository_id:'sentence1',label:'〜てくる',grammar_id:'guide'}];
  context.renderRepository=()=>{document.querySelector('#mainContent').innerHTML=context.JLHDictionary.markup();context.bindRepositoryEvents(repository.entries[0]);};
  return {context,repository,document,dictionary:context.JLHDictionary};
}
const id='a'.repeat(64),filename='b'.repeat(64)+'.png';
const row={id,headword:'来る・くる (2)',volume:'Basic',aliases:['くる'],summary:'A developing change',body_html:'<span class="sub-header">Formation</span><table><tr><td>て + くる</td></tr></table>',image_files:[filename]};
const calls=[];let savedId=null;
function chain(table){
  let operation='select',payload,filters=[];
  const q={select(){return q;},eq(k,v){filters.push([k,v]);return q;},maybeSingle:async()=>({data:savedId?{entry_id:savedId}:null}),single:async()=>({data:row}),
    upsert(value){operation='upsert';payload=value;return q;},delete(){operation='delete';return q;},then(resolve){
      calls.push({table,operation,payload,filters});
      if(table==='japanese_dictionary_links'){savedId=operation==='delete'?null:payload.entry_id;return Promise.resolve(resolve({}));}
      return Promise.resolve(resolve({data:null,count:629}));
    }};return q;
}
const db={from:chain,rpc:async(name,args)=>{calls.push({name,args});return {data:[row]};},storage:{from:bucket=>({createSignedUrls:async(paths,ttl)=>{calls.push({bucket,paths,ttl});return {data:paths.map(p=>({path:p,signedUrl:'https://example.supabase.co/storage/v1/object/sign/'+p+'?token=test'}))};}})}};
const readingFixture={version:1,generator:'test automatic readings',headword:{text:row.headword,spans:[[0,1,'く']]},body:[{index:0,text:'先生に聞いたら分かった。',spans:[[0,2,'せんせい'],[3,4,'き'],[7,8,'わ']]}]};
async function readingTests(){
  const {dictionary,document}=boot(db);
  dictionary.validateReadings(readingFixture);
  const source='<p>先生に聞いたら分かった。</p>';
  const output=dictionary.readingMarkup(source,readingFixture,false,true);
  assert.match(output,/<ruby>先生<rt>せんせい<\/rt><\/ruby>/);
  assert.equal(dictionary.readingMarkup(source,readingFixture,false,false),source);
  const parsed=document.createElement('div');parsed.innerHTML=output;parsed.querySelectorAll('rt').forEach(node=>node.remove());assert.equal(parsed.textContent,'先生に聞いたら分かった。');
  assert.equal(dictionary.readingMarkup('<p>違う文章。</p>',readingFixture,false,true),'<p>違う文章。</p>','Mismatched source remains unchanged');
  assert.equal(dictionary.readingMarkup('<p><ruby>先生<rt>せんせい</rt></ruby></p>',readingFixture,false,true),'<p><ruby>先生<rt>せんせい</rt></ruby></p>','Existing ruby is not nested');
  const malicious=structuredClone(readingFixture);malicious.body[0].spans[0][2]='<img src=x onerror=alert(1)>';
  assert.throws(()=>dictionary.validateReadings(malicious),/Invalid/);
  assert.equal(dictionary.readingMarkup(source,malicious,false,true),source);
  const overlap=structuredClone(readingFixture);overlap.body[0].spans[1][0]=1;assert.throws(()=>dictionary.validateReadings(overlap),/Invalid/);
  assert.throws(()=>dictionary.validateReadingsFile({format:'jlh-dictionary-readings-v1',entries:[{entry_id:id,readings:readingFixture},{entry_id:id,readings:readingFixture}]}),/duplicate/);
  let overlay=null,failWrite=true,available=true,loadError=false,uploadCount=0;
  const writes=[];
  const readingDb={...db,from:table=>{
    if(table==='japanese_dictionary_readings')return {select(){return this;},eq(){return this;},maybeSingle:async()=>loadError?{error:{message:'Missing table'}}:{data:overlay?{readings:overlay}:null},
      upsert:async(payload,options)=>{writes.push({payload,options});uploadCount++;if(failWrite)return {error:{message:'Simulated interrupted upload'}};overlay=payload[0].readings;return {};}};
    const q=chain(table);q.in=async()=>({data:available?[{id}]:[]});return q;
  }};
  const app=boot(readingDb);await app.dictionary.open(app.repository.entries[0]);
  const choose=async()=>{
    app.document.querySelector('#dictionarySetup').click();
    const input=app.document.querySelector('#dictionaryReadingsFile');
    Object.defineProperty(input,'files',{value:[{size:1000,text:async()=>JSON.stringify({format:'jlh-dictionary-readings-v1',entries:[{entry_id:id,readings:readingFixture}]})}]});
    input.dispatchEvent(new app.context.document.defaultView.Event('change'));
    await until(()=>!app.document.querySelector('#dictionaryReadingsInstall').disabled);
  };
  await choose();assert.equal(uploadCount,0,'Choosing readings does not upload');
  app.document.querySelector('#dictionaryReadingsInstall').click();await until(()=>app.document.body.innerHTML.includes('Simulated interrupted upload'));
  failWrite=false;await choose();app.document.querySelector('#dictionaryReadingsInstall').click();await until(()=>app.document.body.innerHTML.includes('Suggestions are not automatic links'));
  assert.equal(uploadCount,2);assert.equal(writes[0].options.onConflict,'user_id,entry_id');assert.equal(writes[0].payload[0].user_id,'test-user');
  app.document.querySelector('[data-dictionary-entry]').click();await until(()=>!!app.document.querySelector('#dictionaryTitle'));
  assert.match(app.document.querySelector('#dictionaryTitle').innerHTML,/<rt>く<\/rt>/);
  const countBefore=calls.length;
  app.document.querySelector('#repoFuriganaToggle').click();assert.equal(app.repository.showFurigana,false);assert.equal(app.document.querySelector('#dictionaryTitle').textContent,row.headword);
  assert.equal(app.context.localStorage.getItem('repositoryShowFurigana'),'false');
  app.document.querySelector('#repoFuriganaToggle').click();assert.match(app.document.querySelector('#dictionaryTitle').innerHTML,/<rt>/);assert.equal(calls.length,countBefore,'Toggle does not fetch or upload');
  assert.match(app.document.body.innerHTML,/automatically generated and unverified/);
  loadError=true;app.dictionary.reset();await app.dictionary.open(app.repository.entries[0]);app.document.querySelector('[data-dictionary-entry]').click();await until(()=>!!app.document.querySelector('#dictionaryTitle'));
  assert.match(app.document.body.innerHTML,/Furigana could not be loaded/);assert.match(app.document.body.innerHTML,/Formation/,'Readings failure preserves original reader');
  available=false;await choose();const before=uploadCount;app.document.querySelector('#dictionaryReadingsInstall').click();await until(()=>app.document.body.innerHTML.includes('Install the matching dictionary data first'));assert.equal(uploadCount,before);
  if(process.env.DICTIONARY_READINGS_FILE&&process.env.DICTIONARY_DATA_DIR){
    const originals=JSON.parse(fs.readFileSync(path.join(process.env.DICTIONARY_DATA_DIR,'dictionary-data.json'),'utf8')).entries;
    const supplied=dictionary.validateReadingsFile(JSON.parse(fs.readFileSync(process.env.DICTIONARY_READINGS_FILE,'utf8')));
    assert.equal(supplied.length,originals.length);
    for(const entry of supplied){
      const original=originals.find(x=>x.id===entry.entry_id);assert.ok(original);
      const originalDOM=document.createElement('div');originalDOM.innerHTML=dictionary.safeHtml(original.body_html);
      const annotated=document.createElement('div');annotated.innerHTML=dictionary.readingMarkup(original.body_html,entry.readings,false,true);
      const expected=entry.readings.body.reduce((sum,node)=>sum+node.spans.length,0);
      assert.equal(annotated.querySelectorAll('ruby').length,expected,'All supplied annotations are applied');
      annotated.querySelectorAll('rt,rp').forEach(node=>node.remove());assert.equal(annotated.textContent,originalDOM.textContent);
      assert.equal(dictionary.readingMarkup(original.body_html,entry.readings,false,false),dictionary.safeHtml(original.body_html));
    }
    console.log(`PASS: all ${supplied.length} reading overlays preserve source text and toggle off exactly.`);
  }
  console.log('PASS: furigana overlay validation/escaping, existing ruby, source mismatch, shared persisted toggle, missing-table fallback, upload/retry and unmatched-dictionary preflight.');
}
async function until(predicate){
  const deadline=Date.now()+5000;
  while(!predicate()){if(Date.now()>deadline)throw new Error('Timed out waiting for setup');await new Promise(resolve=>setImmediate(resolve));}
}
async function setupTests(){
  const bytes=Uint8Array.from([137,80,78,71,13,10,26,10,1,2,3]);
  const hash=Buffer.from(await webcrypto.subtle.digest('SHA-256',bytes)).toString('hex');
  const fixture={...row,image_files:[hash+'.png']};
  const writes=[],stored=new Set();let failEntries=true;
  const setupDb={rpc:async()=>({data:[]}),from:table=>({
    select(){return this;},eq(){return this;},maybeSingle:async()=>({data:null}),then:resolve=>resolve({count:0}),
    upsert:async(payload,options)=>{writes.push({table,payload,options});return failEntries?{error:{message:'Simulated connection loss'}}:{};}
  }),storage:{from:()=>({list:async()=>({data:Array.from(stored,name=>({id:'stored',name}))}),
    upload:async(target,file,options)=>{writes.push({target,options});stored.add(file.name);return {};}
  })}};
  const app=boot(setupDb);
  await app.dictionary.open(app.repository.entries[0]);
  const choose=async(content=bytes)=>{
    const files=[{name:'dictionary-data.json',size:500,text:async()=>JSON.stringify({format:'jlh-private-dictionary-v1',entries:[fixture]})},
      {name:hash+'.png',size:content.length,arrayBuffer:async()=>content.buffer}];
    Object.defineProperty(app.document.querySelector('#dictionaryFolder'),'files',{value:files,configurable:true});
    app.document.querySelector('#dictionaryFolder').dispatchEvent(new app.context.document.defaultView.Event('change'));
    await until(()=>!app.document.querySelector('#dictionaryInstall').disabled);
  };
  await choose();assert.equal(writes.length,0,'Choosing a folder does not upload');
  app.document.querySelector('#dictionaryInstall').click();
  await until(()=>app.document.body.innerHTML.includes('Simulated connection loss'));
  assert.equal(writes.filter(x=>x.target).length,1);
  assert.equal(writes.find(x=>x.target).target,'test-user/'+hash+'.png');
  assert.equal(writes.find(x=>x.target).options.upsert,false);
  failEntries=false;await choose();app.document.querySelector('#dictionaryInstall').click();
  await until(()=>app.document.body.innerHTML.includes('Suggestions are not automatic links'));
  assert.equal(writes.filter(x=>x.target).length,1,'Resume skips previously uploaded image');
  assert.equal(writes.filter(x=>x.table).length,2);
  assert.equal(writes.find(x=>x.table).options.ignoreDuplicates,true);
  assert.equal(writes.find(x=>x.table).payload[0].user_id,'test-user');
  app.document.querySelector('#dictionarySetup').click();
  await choose(Uint8Array.from([1,2,3]));const before=writes.length;
  app.document.querySelector('#dictionaryInstall').click();
  await until(()=>app.document.body.innerHTML.includes('corrupt'));
  assert.equal(writes.length,before,'Corrupt images rejected before any external write');
}
(async()=>{
  const {dictionary,context,repository,document}=boot(db);
  const dirty='<script>alert(1)</script><style>body{display:none}</style><img src="https://bad.test/track"><a href="javascript:alert(1)">text</a><svg onload="alert(1)"></svg><table><tr><td colspan="2" onclick="alert(1)"><span class="concept evil" style="color:red">安全</span></td></tr></table>';
  const safe=dictionary.safeHtml(dirty);
  assert.ok(!/script|style|img|href|svg|onclick|evil|bad\.test/.test(safe));assert.match(safe,/colspan="2"/);assert.match(safe,/class="concept"/);assert.match(safe,/安全/);
  assert.equal(dictionary.validateManifest({format:'jlh-private-dictionary-v1',entries:[row]}).length,1);
  assert.throws(()=>dictionary.validateManifest({format:'jlh-private-dictionary-v1',entries:[{...row,image_files:['../secret']}]}),/Invalid/);
  assert.throws(()=>dictionary.validateManifest({format:'jlh-private-dictionary-v1',entries:[row,row]}),/duplicate/);
  assert.deepEqual(Array.from(dictionary.terms('〜てたら')),['てたら','たら']);
  assert.equal(dictionary.identity(repository.entries[0]).sense,'developing-change');
  await dictionary.open(repository.entries[0]);
  assert.equal(repository.mode,'dictionary');assert.match(document.body.innerHTML,/Suggestions are not automatic links/);
  assert.equal(calls.filter(x=>x.operation==='upsert').length,0,'Opening suggestions cannot save references');
  document.querySelector('[data-dictionary-entry]').click();await new Promise(resolve=>setImmediate(resolve));
  assert.match(document.body.innerHTML,/Notes and reference images/);assert.match(document.body.innerHTML,/Formation/);
  const signing=calls.find(x=>x.ttl);assert.equal(signing.ttl,300);assert.equal(signing.paths[0],'test-user/'+filename);
  document.querySelector('#dictionaryLink').click();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(savedId,id);assert.match(document.body.innerHTML,/Saved reference/);
  assert.equal(calls.find(x=>x.operation==='upsert').payload.sense,'developing-change');
  document.querySelector('#dictionaryBack').click();assert.equal(repository.mode,'grammar');
  await dictionary.open(repository.entries[0]);assert.match(document.body.innerHTML,/Saved reference/,'Saved dictionary entry opens directly');
  document.querySelector('#dictionaryUnlink').click();await new Promise(resolve=>setImmediate(resolve));assert.equal(savedId,null);
  const stale=boot({...db,rpc:()=>new Promise(resolve=>{stale.resolve=resolve;})});
  const opening=stale.dictionary.open(stale.repository.entries[0]);await new Promise(resolve=>setImmediate(resolve));
  stale.dictionary.reset();stale.context.state.user=null;stale.document.body.innerHTML='signed out';
  stale.resolve({data:[row]});await opening;assert.equal(stale.document.body.innerHTML,'signed out');
  const missing=boot({...db,from:()=>({select(){return this;},eq(){return this;},maybeSingle:async()=>({error:{message:'Missing schema'}}),then:resolve=>resolve({error:{message:'Missing schema'}})})});
  await missing.dictionary.open(missing.repository.entries[0]);assert.match(missing.document.body.innerHTML,/20260903_private_dictionary.sql/);
  await setupTests();
  await readingTests();
  if(process.env.DICTIONARY_DATA_DIR){
    const folder=process.env.DICTIONARY_DATA_DIR;
    const entries=dictionary.validateManifest(JSON.parse(fs.readFileSync(path.join(folder,'dictionary-data.json'),'utf8')));
    const images=new Set();
    for(const entry of entries){
      const safe=dictionary.safeHtml(entry.body_html);
      assert.equal(dictionary.safeHtml(safe),safe,'Sanitization is stable');
      for(const file of entry.image_files)images.add(file);
    }
    for(const name of images){
      const bytes=fs.readFileSync(path.join(folder,'images',name));
      assert.deepEqual(Array.from(bytes.subarray(0,8)),[137,80,78,71,13,10,26,10]);
      assert.equal(Buffer.from(await webcrypto.subtle.digest('SHA-256',bytes)).toString('hex')+'.png',name);
    }
    console.log(`PASS: supplied dictionary validates: ${entries.length} entries, ${images.size} hash-verified PNG images.`);
  }
  console.log('PASS: dictionary sanitization, manifest validation, aliases, search/read/save/remove, signed images, persisted references, session isolation, missing-schema guidance, upload/resume and corrupt-image rejection.');
})().catch(error=>{console.error(error);process.exitCode=1;});
