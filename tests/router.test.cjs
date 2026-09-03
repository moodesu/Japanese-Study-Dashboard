// Test-only DOM: npm install --prefix /tmp/jlh-dictionary-furigana --no-save linkedom@0.18.12
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {parseHTML}=require(process.env.LINKEDOM_MODULE||'/tmp/jlh-dictionary-furigana/node_modules/linkedom');
const root=path.resolve(__dirname,'..');
const dictionaryId='a'.repeat(64),sentenceId='00000000-0000-4000-8000-000000000001',guideId='00000000-0000-4000-8000-000000000002';
const sentence={id:sentenceId,japanese:'寒くなってきた。',english:'It is getting colder.',entry_type:'sentence',grammar_points:['〜てくる'],tags:[],status:'learning'};
const guide={id:guideId,label:'〜てくる',grammar_key:'てくる',sense:'change',content:{meaning:'A developing change',formation:['て + くる'],explanation:'Change over time.',examples:[]}};
function boot(initial='/'){
  const {document,window:dom}=parseHTML(fs.readFileSync(path.join(root,'index.html'),'utf8'));
  for(const select of document.querySelectorAll('select'))Object.defineProperty(select,'value',{get(){return this._value||'';},set(v){this._value=v;},configurable:true});
  Object.defineProperty(dom.HTMLSelectElement.prototype,'value',{get(){return this._value||'';},set(v){this._value=v;},configurable:true});
  dom.HTMLElement.prototype.scrollIntoView=function(){this._testScrolled=true;};
  dom.HTMLElement.prototype.focus=function(){};
  Object.defineProperty(dom.HTMLElement.prototype,'elements',{get(){return Object.fromEntries(Array.from(this.querySelectorAll('input,select,textarea')).map(x=>[x.name,x]));},configurable:true});
  for(const dialog of document.querySelectorAll('dialog')){
    dialog.showModal=function(){this.open=true;};dialog.close=function(){const wasOpen=this.open;this.open=false;if(wasOpen)this.dispatchEvent(new dom.Event('close'));};
  }
  const listeners=new Map(),values=new Map(),requests=[];
  let url=new URL(initial,'https://hub.test'),cursor=0,confirmValue=true;
  const stack=[{url:url.href,state:null}];
  const location={get origin(){return url.origin;},get pathname(){return url.pathname;},get search(){return url.search;},get hash(){return url.hash;},get href(){return url.href;}};
  const emit=(name,event={})=>{for(const cb of listeners.get(name)||[])cb(event);};
  const history={get state(){return stack[cursor].state;},get length(){return stack.length;},
    replaceState(state,unused,href){url=new URL(href,url);stack[cursor]={url:url.href,state:structuredClone(state)};},
    pushState(state,unused,href){url=new URL(href,url);stack.splice(cursor+1);stack.push({url:url.href,state:structuredClone(state)});cursor++;},
    go(delta){const next=cursor+delta;if(next<0||next>=stack.length)return;cursor=next;url=new URL(stack[cursor].url);emit('popstate',{state:stack[cursor].state});},back(){this.go(-1);},forward(){this.go(1);}};
  const records={japanese_repository:[sentence],japanese_repository_revisions:[],japanese_grammar_guides:[guide],japanese_repository_grammar:[{repository_id:sentenceId,label:'〜てくる',grammar_id:guideId}],japanese_dictionary_entries:[{id:dictionaryId,headword:'来る (2)',volume:'Basic',summary:'Change',body_html:'<p>変化</p>',image_files:[]}],japanese_dictionary_links:[{entry_id:dictionaryId}],japanese_dictionary_readings:[]};
  const db={auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>{},signOut:async()=>{}},rpc:async()=>({data:records.japanese_dictionary_entries}),storage:{from:()=>({createSignedUrls:async()=>({data:[]})})},from:table=>{
    let count=false;const filters=[];const q={select(fields,options){count=options?.head;return q;},eq(k,v){filters.push([k,v]);return q;},order(){return q;},
      maybeSingle:async()=>({data:(records[table]||[])[0]||null}),single:async()=>{const rows=records[table]||[];const id=filters.find(x=>x[0]==='id')?.[1];return {data:rows.find(x=>!id||x.id===id)||null,error:rows.some(x=>!id||x.id===id)?null:{message:'Entry unavailable'}};},
      then(resolve){requests.push(table);return Promise.resolve(resolve(count?{count:(records[table]||[]).length}:{data:records[table]||[]}));}};return q;
  }};
  const context={console,document,URL,URLSearchParams,TextEncoder,FormData,location,history,crypto:require('node:crypto').webcrypto,
    SUPABASE_CONFIG:{url:'https://test.supabase.co',anonKey:'test'},supabase:{createClient:()=>db},
    localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)},
    addEventListener:(name,cb)=>listeners.set(name,[...(listeners.get(name)||[]),cb]),
    setTimeout:(cb,ms)=>{const t=setTimeout(cb,ms);t.unref();return t;},clearTimeout,
    setInterval:(cb,ms)=>{const t=setInterval(cb,ms);t.unref();return t;},clearInterval,
    requestAnimationFrame:cb=>setImmediate(cb),scrollY:0,scrollX:0,scrollTo:({top=0,left=0})=>{context.scrollY=top;context.scrollX=left;},
    confirm:()=>confirmValue,navigator:{},matchMedia:()=>({matches:false,addEventListener:()=>{}})};
  context.window=context;vm.createContext(context);
  for(const file of ['curriculum.js','book-maps.js','grammar-guides.js','repository.js','dictionary.js','router.js','app.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context,{filename:file});
  const state=vm.runInContext('state',context),repository=vm.runInContext('repositoryState',context);
  return {context,document,dom,state,repository,history,stack,requests,records,emit,router:context.JLHRouter,location,setConfirm:v=>{confirmValue=v;},login:async()=>{await tick();state.user={id:'owner'};state.ready=true;context.render();while(context.JLHRouter.isNavigating())await tick();await tick();}};
}
async function tick(){for(let i=0;i<12;i++)await new Promise(resolve=>setImmediate(resolve));}
const watchdog=setTimeout(()=>{console.error('Routing test timed out');process.exit(1);},20000);
(async()=>{
  const app=boot('/plan/week/3');await app.login();
  assert.equal(app.state.week,2);assert.equal(app.location.pathname,'/plan/week/3');assert.match(app.document.title,/Week 3/);
  assert.ok(app.document.querySelector('a[data-view="repository"]'));
  await app.router.navigate('/repository?q=cold&status=learning');assert.equal(app.repository.query,'cold');
  const listLength=app.history.length;app.repository.query='colder';app.context.renderRepository();assert.equal(app.history.length,listLength,'Filters replace, not push');
  await tick();app.context.scrollY=540;app.emit('scroll');await new Promise(resolve=>setTimeout(resolve,120));
  await app.router.navigate('/repository/entries/'+sentenceId);
  await app.router.navigate('/grammar/'+guideId+'?entry='+sentenceId);
  assert.match(app.document.querySelector('#mainContent').textContent,/A developing change/);
  const dictionaryLink=app.document.querySelector('#repoDictionaryOpen');assert.equal(dictionaryLink.localName,'a');
  await app.router.navigate(dictionaryLink.getAttribute('href'));
  assert.equal(app.location.pathname,'/dictionary/'+dictionaryId);assert.match(app.document.title,/来る/);
  app.history.back();await tick();assert.equal(app.location.pathname,'/grammar/'+guideId);
  app.history.back();await tick();assert.equal(app.location.pathname,'/repository/entries/'+sentenceId);
  app.history.back();await tick();assert.equal(app.repository.query,'colder');assert.equal(app.context.scrollY,540);
  app.history.forward();await tick();assert.equal(app.repository.selectedId,sentenceId);
  const direct=boot('/dictionary/'+dictionaryId);await tick();assert.equal(direct.requests.length,0,'No private fetch before login');await direct.login();
  assert.match(direct.document.querySelector('#dictionaryTitle').textContent,/来る/);assert.equal(direct.document.querySelector('#dictionaryLink'),null,'Standalone dictionary cannot save a context-free reference');
  const grammar=boot('/grammar/'+guideId);await grammar.login();assert.match(grammar.document.querySelector('#mainContent').textContent,/A developing change/);assert.doesNotMatch(grammar.document.querySelector('#mainContent').textContent,/Your saved sentence/);
  await app.router.navigate('/repository/entries/'+sentenceId+'/edit');const field=app.document.querySelector('[name="japanese"]');assert.ok(field,app.document.querySelector('#mainContent').textContent);field.value='unsaved text';app.setConfirm(false);
  const editURL=app.location.href;await app.router.navigate('/books');assert.equal(app.location.href,editURL);
  app.history.back();await tick();assert.equal(app.location.href,editURL);assert.equal(app.document.querySelector('[name="japanese"]').value,'unsaved text');
  const unload={preventDefault(){this.prevented=true;}};app.emit('beforeunload',unload);assert.ok(unload.prevented);
  app.setConfirm(true);await app.router.navigate('/books');assert.equal(app.location.pathname,'/books');
  await app.router.navigate('/books/tobira-beginning-ii');assert.match(app.document.querySelector('#mainContent h1').textContent,/Beginning/,app.document.querySelector('#mainContent').textContent);assert.ok(app.document.querySelector('a[data-lesson="11"]'));
  await app.router.navigate(app.router.lessonURL(11,'b2-l11-textbook_conversation'));await tick();assert.equal(app.state.lesson,11);assert.ok(app.document.getElementById('guide-b2-l11-textbook_conversation')._testScrolled);
  const lessonLength=app.history.length;app.context.render();assert.equal(app.history.length,lessonLength,'Repaint creates no duplicate history');
  await app.router.navigate('/plan/week/1?task=b2-l11-textbook_conversation');assert.ok(app.document.querySelector('#modal').open);app.document.querySelector('#modal').close();await tick();assert.equal(app.document.querySelector('#modal').open,false);
  const built=app.context.REPOSITORY_GRAMMAR_GUIDES[0];await app.router.navigate('/grammar/'+built.id);assert.match(app.document.querySelector('#mainContent').textContent,/Meaning/);
  await app.router.navigate('/plan/week/99');assert.match(app.document.querySelector('#mainContent').textContent,/Page unavailable/);
  await app.router.navigate('/repository/entries/missing');assert.match(app.document.querySelector('#mainContent').textContent,/Page unavailable/);
  await app.router.navigate('/repository/import');app.document.querySelector('#repoImportJson').value='private unsaved draft';assert.doesNotMatch(JSON.stringify(app.stack),/private unsaved draft|寒く|signedUrl|access_token/);
  app.setConfirm(true);await app.router.navigate('/');
  const nav=app.document.querySelector('a[data-view="plan"]');const event=new app.dom.Event('click',{bubbles:true,cancelable:true});Object.defineProperties(event,{button:{value:0},ctrlKey:{value:true}});nav.dispatchEvent(event);assert.equal(event.defaultPrevented,false);assert.equal(app.location.pathname,'/');
  const click=new app.dom.Event('click',{bubbles:true,cancelable:true});Object.defineProperty(click,'button',{value:0});nav.dispatchEvent(click);while(app.router.isNavigating())await tick();assert.ok(click.defaultPrevented);assert.equal(app.state.view,'plan');
  app.context.JLHRepositorySaving=true;const previous=app.location.href;await app.router.navigate('/repository');assert.equal(app.location.href,previous);app.context.JLHRepositorySaving=false;
  await app.router.navigate('/grammar/'+guideId+'?entry='+sentenceId);
  app.state.user=null;app.context.render();assert.equal(app.repository.entries.length,0);assert.equal(app.document.querySelector('#mainContent').textContent,'');assert.equal(app.document.querySelector('#loginGate').hidden,false);
  const beforeLogin=app.requests.length;await app.login();assert.ok(app.requests.length>beforeLogin);assert.match(app.document.querySelector('#mainContent').textContent,/A developing change/,'Login returns to the requested route');
  app.records.japanese_repository=[];app.records.japanese_grammar_guides=[];app.records.japanese_repository_grammar=[];app.state.user={id:'other'};app.context.render();while(app.router.isNavigating())await tick();assert.match(app.document.querySelector('#mainContent').textContent,/Page unavailable/);assert.doesNotMatch(app.document.querySelector('#mainContent').textContent,/A developing change/);
  console.log('PASS: real app routing, direct login links, history/filters/scroll, standalone grammar/dictionary, context links, edit guards, book/lesson/task URLs, invalid routes, modifier links, title and history privacy.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>clearTimeout(watchdog));
