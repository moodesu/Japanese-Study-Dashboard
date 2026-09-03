const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const nodes=new Map();
function element(){return {innerHTML:'',hidden:false,handlers:{},addEventListener(type,fn){this.handlers[type]=fn;},focus(){this.focused=true;}};}
for(const id of ['#hero','#bottomArea','#weekView','#mainContent','#repoGrammarBack','#repoGrammarTitle']) nodes.set(id,element());
const chips=[];
const textbookButtons=[];
const scrolls=[];
let lessonTarget;
const context={
  console,
  localStorage:{getItem:()=>null,setItem:()=>{}},
  state:{user:{id:'test-user'},view:'repository'},
  $:selector=>nodes.get(selector)||null,
  document:{querySelectorAll:selector=>selector==='[data-repo-grammar]'?chips:selector==='[data-repo-grammar-lesson]'?textbookButtons:[]},
  scrollTo:options=>scrolls.push(options),scrollY:325,
  openGuidedLesson:(lesson,id)=>{lessonTarget={lesson,id};},
  esc:value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
  db:new Proxy({}, {get(){throw new Error('Grammar navigation must not access the database');}})
};
context.window=context;
vm.createContext(context);
for(const file of ['curriculum.js','grammar-guides.js','repository.js']) vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
const state=vm.runInContext('repositoryState',context);
const entry={id:'price-example',entry_type:'sentence',status:'learning',japanese:'4000円くらいなら妥当だと思う。',japanese_furigana:'4000[円|えん]くらいなら[妥当|だとう]だと[思|おも]う。',english:'If it is around 4,000 yen, I think that is reasonable.',explanation:'Price comment.',grammar_points:['〜くらいなら','〜だと思う'],tags:[]};
state.entries=[entry];state.selectedId=entry.id;state.loaded=true;state.mode='detail';
const before=JSON.stringify(entry);
for(const label of entry.grammar_points) chips.push({...element(),dataset:{repoGrammar:label}});
context.renderRepository();
for(const chip of chips){
  chip.onclick();
  assert.equal(state.mode,'grammar');
  assert.equal(state.selectedId,entry.id);
  assert.ok(nodes.get('#mainContent').innerHTML.includes('<h2>Formation</h2>'));
  assert.ok(nodes.get('#mainContent').innerHTML.includes('<h2>Examples</h2>'));
  assert.ok(nodes.get('#mainContent').innerHTML.includes('Your saved sentence'));
  assert.ok(nodes.get('#mainContent').innerHTML.includes('<ruby>'));
  assert.ok(nodes.get('#repoGrammarTitle').focused);
  assert.ok(!nodes.get('#mainContent').innerHTML.includes('id="repoFuriganaToggle"'),'Page-level toggle was replaced by the global control');
  nodes.get('#repoGrammarBack').handlers.click();
  assert.equal(state.mode,'detail');
  assert.ok(chip.focused);
  assert.equal(scrolls.at(-1).top,325);
}
assert.equal(JSON.stringify(entry),before,'No entry changes during navigation');
assert.equal(context.repositoryGrammarGuide('～だと思う').id,'to-omou');
assert.equal(context.repositoryGrammarGuide(' ~ だと思います ').id,'to-omou');
assert.equal(context.repositoryGrammarGuide('〜ぐらいなら').id,'kurai-nara');
assert.equal(context.repositoryGrammarGuide('〜ようと思う'),undefined,'Do not confuse intent with generic opinion through substring matching');
const keys=new Set();
for(const guide of context.REPOSITORY_GRAMMAR_GUIDES){
  for(const alias of guide.aliases){const key=context.repositoryGrammarKey(alias);assert.ok(!keys.has(key));keys.add(key);}
  for(const example of guide.examples){
    const plain=context.repositoryPlainFromFurigana(example.japanese);
    assert.ok(context.repositoryFuriganaMatches(plain,example.japanese));
    assert.ok(!/[\[\]|]/.test(plain),'Example notation is complete');
  }
  for(const source of guide.sources) assert.equal(new URL(source.url).protocol,'https:');
}
const hostile='unknown"><img src=x onerror=alert(1)>';
state.grammarLabel=hostile;
let html=context.repositoryGrammarMarkup({...entry,japanese:'<script>alert(1)</script>',japanese_furigana:'',explanation:'<img src=x>'});
assert.ok(html.includes('Explanation not yet in the guide library'));
assert.ok(!html.includes('<script>'));
assert.ok(!html.includes('<img'));
assert.ok(html.includes(encodeURIComponent(hostile+' Japanese grammar explanation')));
assert.ok(!context.repositoryGrammarLinks({grammar_points:[hostile]}).includes('<img'));
const grammar=context.repositoryGrammarCatalogue().find(row=>row.lesson===11);
assert.equal(grammar.index,1);
state.grammarLabel=grammar.label;
html=context.repositoryGrammarMarkup(entry);
assert.ok(html.includes('data-repo-grammar-lesson="11"'));
assert.ok(html.includes('data-repo-grammar-index="1"'));
textbookButtons.push({dataset:{repoGrammarLesson:'11',repoGrammarIndex:'1'}});
context.bindRepositoryEvents(entry);
textbookButtons[0].onclick();
assert.deepEqual(lessonTarget,{lesson:11,id:'b2-l11-guide-grammar-1'});
context.openRepositoryGrammar('not attached to this entry');
assert.equal(state.mode,'detail','Ignore stale or unattached grammar labels');
context.resetRepositorySession();
assert.equal(state.grammarLabel,'');
assert.equal(state.entries.length,0);
const htmlSource=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.ok(htmlSource.indexOf('src="grammar-guides.js"')<htmlSource.indexOf('src="repository.js"'));
console.log('PASS: grammar chip navigation, both imported labels, aliases, furigana, return focus/scroll, unknown-label fallback, escaping, textbook target, no database writes.');
