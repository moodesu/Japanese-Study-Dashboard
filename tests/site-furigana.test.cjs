const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {parseHTML}=require(process.env.LINKEDOM_MODULE||'/tmp/jlh-dictionary-furigana/node_modules/linkedom');
const root=path.resolve(__dirname,'..');
const {document,window:dom}=parseHTML('<html><head><base href="https://hub.test/"></head><body><button id="siteFuriganaToggle"></button><p id="mixed">Looking at 見てたら、お腹すいた。</p><p id="supplied"><ruby>弁当箱<rt>べんとうばこ</rt></ruby></p><textarea id="editor">漢字</textarea><code id="code">日本</code></body></html>');
const storage=new Map();let builds=0;
const fakeTokenizer={tokenize(value){
  const tokens=[];let cursor=0;
  for(const [surface,reading] of [['見','ミ'],['てたら','テタラ'],['、','、'],['お腹','オナカ'],['すいた','スイタ'],['。','。'],['追加','ツイカ'],['文章','ブンショウ']]){
    const at=value.indexOf(surface,cursor);if(at<0)continue;
    if(at>cursor)tokens.push({surface_form:value.slice(cursor,at),reading:'*'});
    tokens.push({surface_form:surface,reading});cursor=at+surface.length;
  }
  if(cursor<value.length)tokens.push({surface_form:value.slice(cursor),reading:'*'});
  return tokens;
}};
const context={document,URL,NodeFilter:{SHOW_TEXT:4},MutationObserver:dom.MutationObserver,
  requestAnimationFrame:callback=>setImmediate(callback),setTimeout,clearTimeout,localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value))},
  kuromoji:{builder:options=>{assert.equal(options.dicPath,'/vendor/kuromoji-dict/');return {build(callback){builds++;setImmediate(()=>callback(null,fakeTokenizer));}};}}};
context.window=context;vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(root,'site-furigana.js'),'utf8'),context);
const tick=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
  await tick();await tick();await tick();
  const api=context.JLHFurigana;
  assert.equal(builds,1);assert.equal(document.documentElement.dataset.furigana,'on');
  assert.equal(JSON.stringify(api.spansForText('見てたら、お腹すいた。',fakeTokenizer)),JSON.stringify([[0,1,'み'],[6,7,'なか']]));
  assert.equal(document.querySelector('#mixed').textContent,'Looking at 見みてたら、お腹なかすいた。','Ruby readings remain separate DOM text');
  assert.equal(document.querySelectorAll('#mixed ruby[data-auto-furigana]').length,2);
  assert.equal(document.querySelectorAll('#supplied ruby').length,1,'Supplied ruby remains authoritative and is not nested');
  assert.equal(document.querySelectorAll('#editor ruby,#code ruby').length,0,'Editable and code content are excluded');
  const button=document.querySelector('#siteFuriganaToggle');button.click();
  assert.equal(document.documentElement.dataset.furigana,'off');assert.equal(storage.get('siteShowFurigana'),'false');assert.equal(button.getAttribute('aria-pressed'),'false');
  const added=document.createElement('p');added.textContent='追加文章';document.body.append(added);await tick();await tick();assert.equal(added.querySelector('ruby'),null,'New text is not analysed while disabled');
  button.click();await tick();await tick();await tick();
  assert.equal(document.documentElement.dataset.furigana,'on');assert.equal(added.querySelectorAll('ruby').length,2);assert.equal(builds,1,'Tokenizer is cached across switches');
  assert.equal(document.querySelectorAll('#mixed ruby ruby').length,0);
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.ok(html.indexOf('src="vendor/kuromoji.js"')<html.indexOf('src="site-furigana.js"'));
  assert.ok(html.indexOf('src="site-furigana.js"')<html.indexOf('src="app.js"'));
  for(const file of ['vendor/kuromoji.js','vendor/kuromoji-licenses/LICENSE-2.0.txt','vendor/kuromoji-licenses/NOTICE.md'])assert.ok(fs.statSync(path.join(root,file)).size>0,file);
  const dictionaries=fs.readdirSync(path.join(root,'vendor/kuromoji-dict')).filter(name=>name.endsWith('.gz'));assert.equal(dictionaries.length,12);
  console.log('PASS: one persistent global toggle, mixed-language readings, supplied-ruby precedence, safe exclusions, dynamic content and cached local tokenizer.');
  process.exit(0);
})().catch(error=>{console.error(error);process.exitCode=1;});
