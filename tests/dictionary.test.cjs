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
  const context={console,document,db,crypto:webcrypto,URL,TextEncoder,localStorage:{getItem:()=>null},
    state:{user:{id:'test-user'},view:'repository'},scrollY:24,scrollTo:()=>{},addEventListener:()=>{},
    $:s=>document.querySelector(s),toast:()=>{},esc:v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))};
  context.window=context;vm.createContext(context);
  for(const file of ['repository.js','dictionary.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
  const repository=vm.runInContext('repositoryState',context);
  repository.selectedId='sentence1';repository.grammarLabel='〜てくる';repository.entries=[{id:'sentence1',grammar_points:['〜てくる']}];
  repository.grammarGuides=[{id:'guide',grammar_key:'てくる',label:'〜てくる',sense:'developing-change',content:{meaning:'Change',formation:['て + くる'],explanation:'Change',examples:[]}}];
  repository.grammarLinks=[{repository_id:'sentence1',label:'〜てくる',grammar_id:'guide'}];
  context.renderRepository=()=>{document.querySelector('#mainContent').innerHTML=context.JLHDictionary.markup();context.JLHDictionary.bind();};
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
