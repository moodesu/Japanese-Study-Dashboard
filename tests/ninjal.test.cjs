const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'ninjal.js'),'utf8');

const entries=Array.from({length:800},(_,index)=>({
  id:index===0?'〜たら':`fixture-${index}`,
  pattern:index===0?'〜たら':`fixture-${index}`,
  reading:'',
  explanation:index===0?'条件を表す。':'',
  senses:index===0?[{
    id:'1',
    category:'条件',
    usage:'条件を表す。',
    notes:[],
    connections:[{form:'V-たら',examples:[{text:'雨が降ったら、行きません。',scene:'',note:''}]}]
  }]:[]
}));
const dataset={version:'2026.01',entries};

const listeners={};
const document={
  baseURI:'https://hub.test/',
  addEventListener(name,handler){listeners[name]=handler;}
};
let fetchCount=0;
const context={
  console,
  document,
  URL,
  fetch:async()=>{fetchCount++;return {ok:true,json:async()=>dataset};}
};
context.window=context;
vm.createContext(context);
vm.runInContext(source,context,{filename:'ninjal.js'});

const api=context.JLHNinjal;
assert.ok(api,'NINJAL API exported');
assert.deepEqual(Array.from(api.matchEntries(dataset,'〜たら').entries,e=>e.id),['〜たら']);
assert.deepEqual(Array.from(api.matchEntries(dataset,'～たら [if/when]').entries,e=>e.id),['〜たら']);
assert.match(api.rich('〓先生〔せんせい〕'),/<ruby>先生<rt>せんせい<\/rt><\/ruby>/);
assert.equal(api.plain('〓先生〔せんせい〕'),'先生');

(async()=>{
  const loaded=await api.load();
  assert.equal(loaded.entries.length,800);
  assert.equal(fetchCount,1);
  await api.load();
  assert.equal(fetchCount,1,'NINJAL dataset loader caches the successful snapshot');
  console.log('PASS: NINJAL mapping, safe source ruby, exact matching and cached dataset loading using an inline fixture.');
})().catch(error=>{console.error(error);process.exitCode=1;});
