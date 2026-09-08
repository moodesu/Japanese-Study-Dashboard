const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

const sql=read('migrations/20260908_supplementary_grammar_resources.sql');
const unitBlock=sql.slice(sql.indexOf('with unit('),sql.indexOf('insert into public.supplementary_units'));
const unitRows=[...unitBlock.matchAll(/^\s*\((\d+),'((?:[^']|'')*)',(\d+),(\d+),'(part-\d+)',(\d+),(\d+)\),?$/gm)].map(match=>({
  unit:Number(match[1]),heading:match[2],printed:Number(match[3]),source:Number(match[4]),part:match[5],local:Number(match[6]),sort:Number(match[7])
}));
assert.equal(unitRows.length,127,'All 127 workbook units are seeded');
assert.deepEqual(unitRows.map(row=>row.unit),Array.from({length:127},(_,index)=>index+1));
for(const row of unitRows){
  assert.equal(row.source,row.printed+18,`Unit ${row.unit} stores its explicit source page`);
  const expected=row.source<=85?['part-01',row.source]:row.source<=164?['part-02',row.source-85]:row.source<=245?['part-03',row.source-164]:['part-04',row.source-245];
  assert.deepEqual([row.part,row.local],expected,`Unit ${row.unit} has the correct split-PDF page`);
}
for(const [unit,part,local] of [[2,'part-01',24],[28,'part-02',1],[34,'part-02',16],[62,'part-03',1],[68,'part-03',14],[97,'part-04',1],[99,'part-04',7]]){
  const row=unitRows.find(item=>item.unit===unit);assert.deepEqual([row.part,row.local],[part,local]);
}

for(const file of ['part-01.pdf','part-02.pdf','part-03.pdf','part-04.pdf'])assert.ok(sql.includes(`supplementary/multimedia-basic-grammar/${file}`));
const mappingBlock=sql.slice(sql.indexOf('with mapping('),sql.indexOf('insert into public.grammar_supplementary_links'));
const mappingRows=[...mappingBlock.matchAll(/^\s*\('([^']+)','([^']+)',(\d+),'(exact|strong|related)','([^']*)'\),?$/gm)].map(match=>({slug:match[1],canonical:match[2],unit:Number(match[3]),relationship:match[4]}));
assert.equal(mappingRows.length,38);
assert.equal(mappingRows.filter(row=>row.relationship==='exact').length,35);
assert.equal(mappingRows.filter(row=>row.relationship==='strong').length,3);
assert.equal(mappingRows.filter(row=>row.relationship==='related').length,0,'Related candidates are deferred in phase 1');
assert.ok(!mappingRows.some(row=>row.canonical==='〜そうだ'),'The underspecified 〜そうだ guide is not linked');
assert.doesNotMatch(sql,/insert into public\.japanese_grammar_guides/i,'The migration never fabricates canonical guides');
assert.match(sql,/unique\(grammar_id,supplementary_unit_id\)/);
assert.match(sql,/private\.is_app_owner\(\)/);
assert.match(sql,/revoke all on public\.supplementary_resources[\s\S]*from anon,authenticated/);

const context={console};context.window=context;vm.createContext(context);
vm.runInContext(read('curriculum.js'),context);
vm.runInContext(read('book-maps.js'),context);
vm.runInContext(read('intermediate-curriculum.js'),context);
vm.runInContext(read('grammar-occurrences.js'),context);
const occurrences=context.JLHGrammarOccurrences;
assert.deepEqual(Array.from(occurrences.forOccurrence('tobira-beginning-ii-12w',20,2),row=>row.canonical),['〜ようになる']);
assert.deepEqual(Array.from(occurrences.forOccurrence('tobira-intermediate-future',2,16),row=>row.canonical),['〜ようになる']);
assert.deepEqual(Array.from(occurrences.forOccurrence('tobira-intermediate-future',3,9),row=>row.canonical),['〜ていく','〜てくる']);
assert.equal(occurrences.forOccurrence('tobira-intermediate-future',5,11).length,0,'Sense-sensitive typical 〜らしい is not guessed');
const repositorySource=read('repository.js'),catalogueStart=repositorySource.indexOf('function repositoryGrammarCatalogue('),catalogueEnd=repositorySource.indexOf('\nfunction ',catalogueStart+1);
vm.runInContext(repositorySource.slice(catalogueStart,catalogueEnd),context);
const youNiNaru=Array.from(context.repositoryGrammarCatalogue()).filter(row=>row.canonical==='〜ようになる');
assert.deepEqual(youNiNaru.map(row=>[row.programmeId,row.lesson,row.index]),[['tobira-beginning-ii-12w',20,2],['tobira-intermediate-future',2,16]],'Both textbooks reuse one canonical grammar identity');

const opened=[];
const supplementaryContext={console,Map,setTimeout,window:null};
supplementaryContext.window=supplementaryContext;
supplementaryContext.window.open=()=>({closed:false,document:{body:{}},location:{replace:url=>opened.push(url)}});
const signedPaths=[];
supplementaryContext.window.signedTextbookPdfUrl=async config=>{signedPaths.push(config.path);return 'https://private.test/file';};
vm.createContext(supplementaryContext);vm.runInContext(read('supplementary.js'),supplementaryContext);
const supplementary=supplementaryContext.JLHSupplementary;
supplementary.data.resources=[{id:'resource',slug:'multimedia-basic-grammar',english_title:'Multimedia Exercises for Basic Japanese Grammar'}];
supplementary.data.parts=[{id:'part-4',resource_id:'resource',storage_path:'supplementary/multimedia-basic-grammar/part-04.pdf'}];
supplementary.data.units=[{id:'unit-124',resource_id:'resource',resource_part_id:'part-4',unit_number:124,source_heading:'ようになる',printed_page:290,local_pdf_page:63}];
supplementary.data.links=[{grammar_id:'guide',supplementary_unit_id:'unit-124',relationship:'exact',note:'Direct practice match.'}];
assert.match(supplementary.grammarMarkup('guide'),/Unit 124/);
assert.match(supplementary.lessonMarkup('〜ようになる',[{id:'guide',pattern:'〜ようになる'}]),/Practice · Unit 124/);
assert.equal((supplementary.lessonMarkup(['〜ようになる','〜ようになる'],[{id:'guide',pattern:'〜ようになる'}]).match(/Practice · Unit 124/g)||[]).length,1,'One lesson occurrence does not duplicate the same practice unit');
assert.match(supplementary.browserMarkup(),/independent of programme progress/);
const db={};

(async()=>{
  await supplementary.openPractice('unit-124',db,{id:'owner'},message=>{throw new Error(message);});
  assert.deepEqual(signedPaths,['supplementary/multimedia-basic-grammar/part-04.pdf']);
  assert.equal(opened[0],'https://private.test/file#page=63&zoom=page-width');
  const app=read('app.js'),repository=read('repository.js'),router=read('router.js'),html=read('index.html'),styles=read('styles.css');
  assert.match(app,/JLHSupplementary\?\.hubCardMarkup/);
  assert.match(app,/JLHSupplementary\?\.lessonMarkup/);
  assert.match(app,/supplementary\.load\(db,state\.user\)\.then\(\(\)=>\{/,'The Hub starts or joins supplementary loading');
  assert.match(app,/if\(state\.view==='library'&&!state\.libraryItem\)renderLibrary\(\)/,'A completed load rerenders only the visible Hub');
  assert.match(app,/if\(state\.view==='library'\)state\.libraryItem=null/,'Hub navigation returns to the root library where supplementary resources are rendered');
  assert.match(app,/db\.storage\.from\(bucket\)\.createSignedUrl\(config\.path,3600\)/,'Supplementary PDFs reuse the existing private signer');
  assert.match(repository,/JLHSupplementary\?\.grammarMarkup/);
  assert.match(router,/parts\[0\]==='resources'/);
  assert.ok(html.indexOf('grammar-occurrences.js')<html.indexOf('repository.js'));
  assert.ok(html.indexOf('supplementary.js')<html.indexOf('app.js'),'The supplementary module loads before the Hub renderer');
  assert.match(styles,/\.supplementary-controls input \{ font-size:16px; \}/);

  // Hub async lifecycle: the first data-backed render has no card, callers
  // share one in-flight request, and completion causes the existing card to
  // appear without a page reload.
  const asyncContext={console,Map,setTimeout,window:null};asyncContext.window=asyncContext;
  vm.createContext(asyncContext);vm.runInContext(read('supplementary.js'),asyncContext);
  const asyncSupplementary=asyncContext.JLHSupplementary;
  assert.equal(asyncSupplementary.hubCardMarkup(),'');
  let releaseResources;
  const resourcesPromise=new Promise(resolve=>{releaseResources=resolve;});
  const results={
    supplementary_resources:resourcesPromise,
    supplementary_resource_parts:Promise.resolve({data:[{id:'part'}],error:null}),
    supplementary_units:Promise.resolve({data:Array.from({length:127},(_,index)=>({id:`u${index+1}`,resource_id:'resource',unit_number:index+1})),error:null}),
    grammar_supplementary_links:Promise.resolve({data:[],error:null})
  };
  const asyncDb={from(table){const query={select(){return query;},eq(){return query;},order(){return query;},then(resolve,reject){return results[table].then(resolve,reject);}};return query;}};
  const firstLoad=asyncSupplementary.load(asyncDb,{id:'owner'}),secondLoad=asyncSupplementary.load(asyncDb,{id:'owner'});
  assert.equal(firstLoad,secondLoad,'Hub and Repository join the same in-flight supplementary request');
  let rerenders=0,rendered='';
  firstLoad.then(()=>{rerenders++;rendered=asyncSupplementary.hubCardMarkup();});
  releaseResources({data:[{id:'resource',user_id:'owner',slug:'multimedia-basic-grammar',title:'マルチメディア日本語基本文法ワークブック',english_title:'Multimedia Exercises for Basic Japanese Grammar'}],error:null});
  await firstLoad;await Promise.resolve();
  assert.equal(rerenders,1);
  assert.match(rendered,/マルチメディア日本語基本文法ワークブック/);
  assert.match(rendered,/Multimedia Exercises for Basic Japanese Grammar/);
  assert.match(rendered,/127 standalone grammar practice units/);
  assert.match(rendered,/Browse exercises/);
  const programmeIndependent=rendered;
  for(const activeProgramme of ['tobira-beginning-ii-12w','tobira-intermediate-future',null]){
    asyncContext.activeProgramme=activeProgramme;
    assert.equal(asyncSupplementary.hubCardMarkup(),programmeIndependent,`Card is independent of programme state: ${activeProgramme}`);
  }
  console.log('PASS: 127 supplementary units, canonical reuse, private split-PDF pages, RLS declarations and independent UI routes.');
})().catch(error=>{console.error(error);process.exitCode=1;});
