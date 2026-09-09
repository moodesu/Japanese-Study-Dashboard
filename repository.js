const repositoryState = {
  entries: [],
  revisions: [],
  grammarGuides: [],
  grammarVariants: [],
  grammarClarifications: [],
  grammarRelated: [],
  grammarLinks: [],
  grammarLibraryReady: false,
  grammarLibraryError: '',
  grammarGuideId: null,
  grammarQuery: '',
  grammarFilter: 'all',
  pendingGuideIds: new Set(),
  loaded: false,
  loading: false,
  error: '',
  selectedId: null,
  grammarLabel: '',
  grammarReturnScroll: 0,
  mode: 'browse',
  query: '',
  status: 'all',
  kind: 'all',
  register: 'all',
  migaku: 'all',
  showFurigana: true
};

const REPOSITORY_STATUSES = ['reference','learning','review','known'];
const REPOSITORY_REGISTERS = ['neutral','casual','polite','formal','written'];
const REPOSITORY_IMPORT_UPDATE_FIELDS = [
  'status','intent_english','original_japanese','original_japanese_furigana',
  'japanese_furigana','english','explanation','tags','lesson_number','book_id',
  'register','source_type','source_detail','error_types','notes'
];
const REPOSITORY_ERROR_TYPES = [
  'Particles','Verb form','Word choice','Word order','Register','Omission',
  'Grammar pattern','Naturalness','Kanji / spelling','Other'
];
const REPOSITORY_IMPORT_DRAFT_KEY = 'learningHub.repositoryImportDraft';

function repositoryImportDraft(){
  try{return window.sessionStorage?.getItem(REPOSITORY_IMPORT_DRAFT_KEY)||'';}catch{return '';}
}

function repositorySaveImportDraft(value){
  try{window.sessionStorage?.setItem(REPOSITORY_IMPORT_DRAFT_KEY,String(value||''));}catch{}
}

function repositoryClearImportDraft(){
  try{window.sessionStorage?.removeItem(REPOSITORY_IMPORT_DRAFT_KEY);}catch{}
}

function repositoryArray(value){
  if(Array.isArray(value)) return value.filter(Boolean).map(String);
  if(typeof value!=='string') return [];
  return value.split(',').map(x=>x.trim()).filter(Boolean);
}

function repositoryGrammarCatalogue(){
  const rows=[];
  const curricula=[window.CURRICULUM,window.INTERMEDIATE_CURRICULUM].filter(Boolean);
  for(const curriculum of curricula)for(const lesson of (curriculum.lessons||[])){
    for(const [index,grammar] of (lesson.textbook?.grammar||[]).entries()){
      const label=grammar?.heading||grammar;
      const programmeId=curriculum.programmeId||'tobira-beginning-ii-12w';
      const number=grammar?.number||index+1;
      const occurrences=window.JLHGrammarOccurrences?.forOccurrence(programmeId,lesson.n,number)||[];
      const canonicals=occurrences.length?occurrences.map(row=>row.canonical):[label];
      for(const canonical of canonicals){
        if(!rows.some(row=>row.canonical===canonical&&row.lesson===lesson.n&&row.index===number&&row.programmeId===programmeId)){
          rows.push({label,canonical,lesson:lesson.n,index:number,programmeId});
        }
      }
    }
  }
  return rows;
}

function repositoryEntrySearchText(entry){
  const linkedGrammar=repositoryState.grammarLinks.filter(link=>link.repository_id===entry.id).flatMap(link=>{
    const guide=repositoryState.grammarGuides.find(row=>row.id===link.grammar_id);
    return [guide?.pattern,link.surface,link.note];
  });
  return [entry.japanese,entry.japanese_furigana,entry.english,entry.intent_english,entry.original_japanese,entry.original_japanese_furigana,
    entry.explanation,entry.source_detail,entry.notes,...(entry.grammar_points||[]),...linkedGrammar,
    ...(entry.tags||[]),...(entry.error_types||[])].filter(Boolean).join(' ').toLowerCase();
}

function renderRepositoryFurigana(notation,plain=''){
  if(!notation) return esc(plain||notation||'');
  const source=String(notation), pattern=/\[([^\]|]+)\|([^\]]+)\]/g;
  let html='',last=0,match;
  while((match=pattern.exec(source))){
    html+=esc(source.slice(last,match.index));
    html+=`<ruby>${esc(match[1])}<rt>${esc(match[2])}</rt></ruby>`;
    last=pattern.lastIndex;
  }
  return html+esc(source.slice(last));
}

function repositoryPlainFromFurigana(notation){
  return String(notation||'').replace(/\[([^\]|]+)\|([^\]]+)\]/g,'$1');
}

function repositoryFuriganaMatches(plain,notation){
  return !notation||repositoryPlainFromFurigana(notation)===String(plain||'');
}

function repositoryJapanese(entry,original=false){
  const plain=original?entry.original_japanese:entry.japanese;
  const notation=original?entry.original_japanese_furigana:entry.japanese_furigana;
  return renderRepositoryFurigana(notation,plain);
}

function repositorySurfaceRanges(plain,surfaces){
  const ranges=[];
  for(const surface of [...new Set((surfaces||[]).filter(Boolean))]){
    const start=String(plain||'').indexOf(surface);
    if(start>=0) ranges.push([start,start+surface.length]);
  }
  ranges.sort((a,b)=>a[0]-b[0]);
  return ranges.reduce((merged,range)=>{
    const previous=merged.at(-1);
    if(previous&&range[0]<=previous[1]) previous[1]=Math.max(previous[1],range[1]);
    else merged.push([...range]);
    return merged;
  },[]);
}

function repositoryMarkedSegment(value,offset,ranges){
  let html='',cursor=0;
  for(const [start,end] of ranges){
    const from=Math.max(0,start-offset),to=Math.min(value.length,end-offset);
    if(from>=to) continue;
    html+=esc(value.slice(cursor,from));
    html+=`<mark class="repo-grammar-surface">${esc(value.slice(from,to))}</mark>`;
    cursor=to;
  }
  return html+esc(value.slice(cursor));
}

function repositoryJapaneseWithSurfaces(entry,surfaces){
  const plain=String(entry.japanese||''),notation=String(entry.japanese_furigana||''),ranges=repositorySurfaceRanges(plain,surfaces);
  if(!ranges.length) return repositoryJapanese(entry);
  if(!notation||repositoryPlainFromFurigana(notation)!==plain) return repositoryMarkedSegment(plain,0,ranges);
  const pattern=/\[([^\]|]+)\|([^\]]+)\]/g;
  let html='',notationCursor=0,plainCursor=0,match;
  while((match=pattern.exec(notation))){
    const before=notation.slice(notationCursor,match.index);
    html+=repositoryMarkedSegment(before,plainCursor,ranges);plainCursor+=before.length;
    html+=`<ruby>${repositoryMarkedSegment(match[1],plainCursor,ranges)}<rt>${esc(match[2])}</rt></ruby>`;
    plainCursor+=match[1].length;notationCursor=pattern.lastIndex;
  }
  html+=repositoryMarkedSegment(notation.slice(notationCursor),plainCursor,ranges);
  return html;
}

function filteredRepositoryEntries(){
  const q=repositoryState.query.trim().toLowerCase();
  return repositoryState.entries.filter(entry=>{
    if(repositoryState.status!=='all' && entry.status!==repositoryState.status) return false;
    if(repositoryState.kind!=='all' && entry.entry_type!==repositoryState.kind) return false;
    if(repositoryState.register!=='all' && entry.register!==repositoryState.register) return false;
    if(repositoryState.migaku==='pending' && entry.migaku_exported_at) return false;
    if(repositoryState.migaku==='exported' && !entry.migaku_exported_at) return false;
    return !q || repositoryEntrySearchText(entry).includes(q);
  });
}

function repositoryDate(value){
  const d=new Date(value);
  return Number.isNaN(d.getTime())?'':d.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
}

function repositoryStatusLabel(status){
  return ({reference:'Reference',learning:'Learning',review:'Review',known:'Known'})[status]||status;
}

async function loadRepositoryData(force=false){
  if(!db||!state.user||repositoryState.loading) return;
  if(repositoryState.loaded&&!force) return;
  repositoryState.loading=true; repositoryState.error='';
  const userId=state.user.id;
  try{
    const [{data:entries,error},{data:revisions,error:revisionError},guides,variants,clarifications,related,links]=await Promise.all([
      db.from('japanese_repository').select('*').eq('user_id',state.user.id).order('updated_at',{ascending:false}),
      db.from('japanese_repository_revisions').select('*').eq('user_id',userId).order('created_at',{ascending:false}),
      db.from('japanese_grammar_guides').select('*').eq('user_id',userId),
      db.from('japanese_grammar_variants').select('*').eq('user_id',userId),
      db.from('japanese_grammar_clarifications').select('*').eq('user_id',userId).order('sort_order',{ascending:true}),
      db.from('japanese_grammar_related').select('*').eq('user_id',userId),
      db.from('japanese_repository_grammar').select('*').eq('user_id',userId)
    ]);
    if(state.user?.id!==userId) return;
    if(error) throw error;
    if(revisionError) throw revisionError;
    repositoryState.entries=entries||[];
    repositoryState.revisions=revisions||[];
    repositoryState.grammarLibraryReady=!guides.error&&!variants.error&&!clarifications.error&&!related.error&&!links.error;
    repositoryState.grammarLibraryError=guides.error?.message||variants.error?.message||clarifications.error?.message||related.error?.message||links.error?.message||'';
    repositoryState.grammarGuides=guides.data||[];
    repositoryState.grammarVariants=variants.data||[];
    repositoryState.grammarClarifications=clarifications.data||[];
    repositoryState.grammarRelated=related.data||[];
    repositoryState.grammarLinks=links.data||[];
    await window.JLHSupplementary?.load(db,state.user,force);
    repositoryState.loaded=true;
  }catch(error){
    if(state.user?.id!==userId) return;
    repositoryState.error=error?.message||'The Japanese Repository could not be loaded.';
  }finally{
    if(state.user?.id===userId){
      repositoryState.loading=false;
      if(state.view==='repository') renderRepository();
    }
  }
}

function resetRepositorySession(){
  window.JLHDictionary?.reset();
  repositoryState.routeEntry=null;
  repositoryState.entries=[]; repositoryState.revisions=[]; repositoryState.loaded=false;
  repositoryState.loading=false; repositoryState.error=''; repositoryState.selectedId=null;
  repositoryState.mode='browse';
  repositoryState.grammarLabel=''; repositoryState.grammarReturnScroll=0;
  repositoryState.grammarGuides=[]; repositoryState.grammarVariants=[]; repositoryState.grammarClarifications=[];
  repositoryState.grammarRelated=[]; repositoryState.grammarLinks=[];
  window.JLHSupplementary?.reset();
  repositoryState.grammarLibraryReady=false; repositoryState.grammarLibraryError='';
  repositoryState.grammarGuideId=null; repositoryState.grammarQuery=''; repositoryState.grammarFilter='all'; repositoryState.pendingGuideIds=new Set(); pendingRepositoryImport=null; repositoryImportSnapshot='';
}

function openRepositoryEntry(id){
  if(window.JLHRouter){window.JLHRouter.navigate(window.JLHRouter.entryURL(id));return;}
  repositoryState.selectedId=id;
  repositoryState.mode='detail';
  state.view='repository';
  render();
  scrollTo({top:0,behavior:'smooth'});
}

function repositoryLessonButton(entry){
  if(!entry.lesson_number) return '';
  const lesson=(typeof currentCurriculum==='function'?currentCurriculum():window.CURRICULUM)?.lessons?.find(x=>Number(x.n)===Number(entry.lesson_number));
  return `<button type="button" class="repo-link" data-repo-lesson="${entry.lesson_number}"><span>Lesson ${entry.lesson_number}</span><strong>${esc(lesson?.title||'Open lesson')}</strong></button>`;
}

function repositoryGrammarLinks(entry){
  return repositoryState.grammarLinks.filter(link=>link.repository_id===entry.id).map(link=>{
    const guide=repositoryState.grammarGuides.find(row=>row.id===link.grammar_id);
    if(!guide) return '';
    const detail=[link.surface,link.note].filter(Boolean).join(' · ');
    return `<button type="button" class="repo-chip grammar" data-repo-guide="${esc(guide.id)}" aria-label="Open grammar: ${esc(guide.pattern)}"${detail?` title="${esc(detail)}"`:''}>${esc(guide.pattern)} →</button>`;
  }).join('');
}

function repositoryGrammarKey(label){
  return String(label||'').normalize('NFKC').trim().replace(/^[~〜～]+/u,'').replace(/\s+/gu,'').toLowerCase();
}

function repositoryGrammarGuide(label,entry){
  if(repositoryState.grammarGuideId){
    const saved=repositoryState.grammarGuides.find(x=>x.id===repositoryState.grammarGuideId);
    if(saved&&(!entry?.id||entry.routeStandalone||repositoryState.grammarLinks.some(link=>link.repository_id===entry.id&&link.grammar_id===saved.id))) return repositorySavedGuide(saved);
  }
  const key=repositoryGrammarKey(label);
  const saved=repositoryState.grammarGuides.find(x=>repositoryGrammarKey(x.pattern)===key);
  if(saved&&(!entry?.id||entry.routeStandalone||repositoryState.grammarLinks.some(link=>link.repository_id===entry.id&&link.grammar_id===saved.id))) return repositorySavedGuide(saved);
  return undefined;
}

function repositorySavedGuide(guide){
  return {...guide,title:guide.pattern,references:guide.reference_links||[],
    variants:repositoryState.grammarVariants.filter(row=>row.grammar_id===guide.id),
    clarifications:repositoryState.grammarClarifications.filter(row=>row.grammar_id===guide.id),
    related:repositoryState.grammarRelated.filter(row=>row.grammar_id===guide.id).map(row=>repositoryState.grammarGuides.find(x=>x.id===row.related_grammar_id)).filter(Boolean),
    myExamples:repositoryState.grammarLinks.filter(row=>row.grammar_id===guide.id).map(link=>({link,entry:repositoryState.entries.find(x=>x.id===link.repository_id)})).filter(row=>row.entry)};
}

function openRepositoryGrammar(label){
  const entry=repositoryState.entries.find(row=>row.id===repositoryState.selectedId);
  const guide=repositoryState.grammarGuides.find(row=>row.id===label)||repositoryState.grammarGuides.find(row=>repositoryGrammarKey(row.pattern)===repositoryGrammarKey(label));
  if(!guide||!entry||!repositoryState.grammarLinks.some(link=>link.repository_id===entry.id&&link.grammar_id===guide.id)) return;
  repositoryState.grammarLabel=guide.pattern;
  repositoryState.grammarGuideId=guide.id;
  repositoryState.grammarReturnScroll=window.scrollY||0;
  repositoryState.mode='grammar';
  renderRepository(); scrollTo({top:0,behavior:'smooth'});
  $('#repoGrammarTitle')?.focus({preventScroll:true});
}

function closeRepositoryGrammar(){
  const standalone=repositoryState.routeEntry?.routeStandalone;
  repositoryState.mode=standalone?'grammar-library':'detail'; renderRepository();
  const chip=Array.from(document.querySelectorAll('[data-repo-guide]')).find(node=>node.dataset.repoGuide===repositoryState.grammarGuideId);
  chip?.focus({preventScroll:true});
  scrollTo({top:repositoryState.grammarReturnScroll,behavior:'auto'});
}

function repositoryGrammarNavLink(guide,prefix=''){
  if(!guide) return '';
  const label=renderRepositoryFurigana(guide.pattern,repositoryPlainFromFurigana(guide.pattern));
  return `<button type="button" class="repo-grammar-nav" data-repo-guide="${esc(guide.id)}">${prefix?`<span>${esc(prefix)}</span>`:''}<strong lang="ja">${label}</strong><span class="repo-grammar-nav-arrow" aria-hidden="true">→</span></button>`;
}

const REPOSITORY_GUIDE_ICONS={
  Overview:'fa-circle-info',
  Formation:'fa-layer-group',
  'Usage and nuance':'fa-compass',
  'Forms / variants':'fa-shapes',
  'Combined forms':'fa-link',
  Clarifications:'fa-circle-question',
  'My examples':'fa-pen-to-square',
  'Reference examples':'fa-book-open',
  'Related grammar':'fa-diagram-project',
  'Used in your books':'fa-book'
};
function repositoryGuideHeading(title){
  const icon=REPOSITORY_GUIDE_ICONS[title]||'fa-bookmark';
  return `<h2><span class="repo-guide-heading-icon" aria-hidden="true"><i class="fa-solid ${icon}"></i></span>${esc(title)}</h2>`;
}
function repositoryGrammarMatchMarkup(variant,relatedSource){
  if(!variant) return {badge:'',detail:''};
  const related=!!relatedSource,label=related?'Related':'Matched',kicker=related?'Related match':'Matched form';
  const badgeClass=related?'repo-match-badge related':'repo-match-badge matched';
  const badge=`<span class="${badgeClass}"><i class="fa-solid ${related?'fa-code-branch':'fa-check'}" aria-hidden="true"></i><span>${label}</span></span>`;
  const detail=`<span class="repo-match-detail"><span class="repo-match-kicker">${kicker}</span><strong class="repo-match-form" lang="ja">${esc(variant.form)}</strong>${related?`<span>Via ${esc(relatedSource.pattern)}</span>`:''}${variant.explanation?`<span>${esc(variant.explanation)}</span>`:''}</span>`;
  return {badge,detail};
}

function repositoryGrammarMarkup(entry){
  const label=repositoryState.grammarLabel, guide=repositoryGrammarGuide(label,entry);
  const lessons=repositoryGrammarCatalogue().filter(row=>repositoryGrammarKey(row.canonical)===repositoryGrammarKey(guide?.pattern||label));
  const contextLinks=guide&&!entry.routeStandalone?repositoryState.grammarLinks.filter(link=>link.repository_id===entry.id&&link.grammar_id===guide.id):[];
  const text=value=>renderRepositoryFurigana(value,repositoryPlainFromFurigana(value));
  const pending=guide&&(guide.guide_status==='pending'||guide.is_placeholder),linkedCount=guide?new Set(repositoryState.grammarLinks.filter(link=>link.grammar_id===guide.id).map(link=>link.repository_id)).size:0;
  const practice=guide?window.JLHSupplementary?.grammarMarkup(guide.id)||'':'';
  const usedInBooks=lessons.length?`<section class="panel repo-used-in-books"><div class="eyebrow">Course context</div>${repositoryGuideHeading('Used in your books')}<div class="repo-used-in-books-list">${lessons.map(row=>{const programme=(window.PROGRAMMES||[]).find(item=>item.id===row.programmeId);return `<button type="button" class="repo-link compact-card" data-repo-grammar-lesson="${row.lesson}" data-repo-grammar-index="${row.index}" data-repo-grammar-programme="${esc(row.programmeId||'tobira-beginning-ii-12w')}"><strong>${esc(programme?.title||programme?.shortTitle||'Mapped textbook')}</strong><span>Lesson ${row.lesson} · Grammar ${row.index}</span></button>`;}).join('')}</div></section>`:'';
  const body=guide?`
    <article class="repo-guide-article">
      <section class="repo-guide-section">${repositoryGuideHeading('Overview')}${guide.summary?`<p>${text(guide.summary)}</p>`:''}${guide.is_placeholder?'<p class="subtitle">This canonical guide is waiting for a full grammar-guide import.</p>':''}</section>
      <section class="repo-guide-section">${repositoryGuideHeading('Formation')}${guide.formation.length?`<ul>${guide.formation.map(item=>`<li>${text(item)}</li>`).join('')}</ul>`:'<p class="subtitle">No formation notes yet.</p>'}</section>
      <section class="repo-guide-section">${repositoryGuideHeading('Usage and nuance')}${guide.usage.map(item=>`<p>${text(item)}</p>`).join('')}${guide.nuance.map(item=>`<p>${text(item)}</p>`).join('')}</section>
      ${repositoryVariantsMarkup(guide)}
    </article>
    ${repositoryClarificationsMarkup(guide,text)}
    ${repositoryMyExamplesMarkup(guide)}
    ${repositoryReferenceExamplesMarkup(guide,text)}
    ${guide.related.length?`<section class="repo-guide-section repo-related-grammar">${repositoryGuideHeading('Related grammar')}<nav class="repo-grammar-nav-list" aria-label="Related grammar">${guide.related.map(item=>repositoryGrammarNavLink(item)).join('')}</nav></section>`:''}
  `:`<section class="panel"><h2>Explanation not yet in the guide library</h2><p>This label does not yet have a standalone Learning Hub explanation. The saved sentence context below is not a substitute for a grammar reference.</p><a class="repo-link" href="https://www.google.com/search?q=${encodeURIComponent(label+' Japanese grammar explanation')}" target="_blank" rel="noopener noreferrer">Search grammar references ↗</a></section>`;
  const furtherStudy=`<section class="panel repo-further-study"><div class="eyebrow">References &amp; further study</div><div class="grammar-source-list">${window.JLHDictionary?.referenceMarkup()||''}${window.JLHNinjal?.panelMarkup(label)||''}${guide?.references?.map(source=>`<div class="resource-row grammar-source-row"><div class="resource-row-copy"><strong>${esc(source.title)}</strong><span>External grammar reference.</span></div><a class="resource-action resource-action-secondary" href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">Open ↗</a></div>`).join('')||''}</div></section>`;
  return `<section class="repo-page repo-grammar-page">
    <header class="repo-grammar-header app-page-header"><div><button type="button" class="app-page-breadcrumb" id="repoGrammarBack">← ${entry.routeStandalone?'Grammar Library':'Back to sentence'}</button><div class="eyebrow">Grammar reference</div><h1 id="repoGrammarTitle" tabindex="-1">${guide?text(guide.title):esc(label)}</h1>${guide?.meaning?`<p class="repo-grammar-meaning">${text(guide.meaning)}</p>`:''}${guide&&(guide.jlpt_level||guide.register)?`<div class="repo-grammar-meta">${guide.jlpt_level?`<span>${esc(guide.jlpt_level)}</span>`:''}${guide.register?`<span>${esc(guide.register)}</span>`:''}</div>`:''}</div>${pending?`<div class="app-page-toolbar"><button type="button" class="smallbtn" id="repoViewPending">View pending guides</button><button type="button" class="smallbtn primary" id="repoCopySingleGuidePrompt">Copy generation prompt</button></div>`:''}</header>
    <div class="repo-grammar-content">
      ${pending?`<section class="panel repo-guide-pending"><strong>Guide pending</strong><span>Referenced by ${linkedCount} saved sentence${linkedCount===1?'':'s'}.</span></section>`:''}
      ${entry.routeStandalone?'':`<section class="panel repo-sentence-context"><h2>In this sentence</h2><p class="repo-context-sentence" lang="ja"><strong>${repositoryJapaneseWithSurfaces(entry,contextLinks.map(link=>link.surface))}</strong></p>${contextLinks.map(link=>`<div class="repo-context-link"><div class="repo-context-mapping"><span lang="ja">${esc(link.surface)}</span><span aria-hidden="true">→</span><strong lang="ja">${esc(guide?.pattern||label)}</strong></div>${link.note?`<p class="repo-context-note">${esc(link.note)}</p>`:''}</div>`).join('')}${entry.english?`<p>${esc(entry.english)}</p>`:''}${entry.explanation?`<h3>Saved sentence explanation</h3><p class="repo-grammar-context">${esc(entry.explanation)}</p>`:''}</section>`}
      ${practice}
      ${body}
      ${usedInBooks}
      ${!repositoryState.grammarLibraryReady?'<p class="subtitle">Saved grammar library unavailable. Apply the separate grammar migration if needed, then reload.</p>':''}
      ${furtherStudy}
    </div>
  </section>`;
}

function repositoryVariantsMarkup(guide){
  const normal=guide.variants.filter(item=>item.variant_type!=='combined_form');
  const combined=guide.variants.filter(item=>item.variant_type==='combined_form');
  const text=value=>renderRepositoryFurigana(value,repositoryPlainFromFurigana(value));
  const rows=items=>items.map(item=>{const related=repositoryState.grammarGuides.find(row=>row.id===item.related_grammar_id);return `<article class="repo-variant compact-card"><strong lang="ja">${text(item.form)}</strong><span>${esc(item.variant_type.replaceAll('_',' '))}</span><p>${esc(item.explanation)}</p>${related?`<div class="repo-variant-related">${repositoryGrammarNavLink(related,'Related')}</div>`:''}</article>`;}).join('');
  return `${normal.length?`<section class="repo-guide-section">${repositoryGuideHeading('Forms / variants')}<div class="repo-variant-list">${rows(normal)}</div></section>`:''}${combined.length?`<section class="repo-guide-section">${repositoryGuideHeading('Combined forms')}<div class="repo-variant-list">${rows(combined)}</div></section>`:''}`;
}

function repositoryClarificationsMarkup(guide,text){
  if(!guide.clarifications.length) return '';
  return `<section class="panel repo-clarifications">${repositoryGuideHeading('Clarifications')}${guide.clarifications.map((item,index)=>`<details ${index===0?'open':''}><summary>${esc(item.title)}</summary>${item.question?`<p><strong>${esc(item.question)}</strong></p>`:''}<p>${text(item.explanation)}</p>${item.contrasts?.length?`<div class="repo-contrast-grid">${item.contrasts.map(contrast=>`<article class="repo-contrast-card compact-card"><p lang="ja"><strong>${text(contrast.japanese_furigana||contrast.japanese)}</strong></p><p>${esc(contrast.english)}</p><small>${text(contrast.note)}</small></article>`).join('')}</div>`:''}</details>`).join('')}</section>`;
}

function repositoryMyExamplesMarkup(guide){
  return `<section class="panel repo-my-examples">${repositoryGuideHeading('My examples')}${guide.myExamples.length?guide.myExamples.map(({entry,link})=>`<button type="button" class="repo-my-example" data-repo-entry="${esc(entry.id)}"><strong lang="ja">${repositoryJapaneseWithSurfaces(entry,[link.surface])}</strong>${link.surface?`<span class="repo-example-mapping" lang="ja">${esc(link.surface)} → ${esc(guide.pattern)}</span>`:''}${link.note?`<small>${esc(link.note)}</small>`:''}${entry.english?`<span>${esc(entry.english)}</span>`:''}</button>`).join(''):'<p class="subtitle">No saved sentences are linked to this grammar yet.</p>'}</section>`;
}

function repositoryReferenceExamplesMarkup(guide,text){
  return `<section class="repo-guide-section repo-reference-examples">${repositoryGuideHeading('Reference examples')}${guide.reference_examples?.length?`<div class="repo-reference-example-list">${guide.reference_examples.map(example=>`<article class="repo-grammar-example compact-card"><p lang="ja"><strong>${text(example.japanese_furigana||example.japanese)}</strong></p><p>${esc(example.english)}</p>${example.source?`<small>${esc(example.source)}</small>`:''}</article>`).join('')}</div>`:'<p class="subtitle">No reference examples yet.</p>'}</section>`;
}

function repositoryGrammarLibraryMarkup(){
  const query=repositoryState.grammarQuery.trim().toLowerCase(),matches=[],matchedIds=new Set();
  const isPending=guide=>guide.guide_status==='pending'||guide.is_placeholder;
  const linkCount=guide=>new Set(repositoryState.grammarLinks.filter(link=>link.grammar_id===guide.id).map(link=>link.repository_id)).size;
  const encountered=guide=>guide.discovered_from_sentence||linkCount(guide)>0;
  const filter=repositoryState.grammarFilter;
  for(const guide of repositoryState.grammarGuides){
    const variants=repositoryState.grammarVariants.filter(row=>row.grammar_id===guide.id);
    const variant=variants.find(row=>row.form.toLowerCase().includes(query));
    const haystack=[guide.pattern,guide.meaning,guide.summary,...variants.map(row=>row.form)].join(' ').toLowerCase();
    const visible=filter==='all'||(filter==='complete'&&!isPending(guide))||(filter==='pending'&&isPending(guide))||(filter==='encountered'&&encountered(guide));
    if(visible&&(!query||haystack.includes(query))){matches.push({guide,variant});matchedIds.add(guide.id);}
  }
  if(query){
    for(const variant of repositoryState.grammarVariants.filter(row=>row.related_grammar_id&&row.form.toLowerCase().includes(query))){
      if(matchedIds.has(variant.related_grammar_id)) continue;
      const guide=repositoryState.grammarGuides.find(row=>row.id===variant.related_grammar_id);
      const source=repositoryState.grammarGuides.find(row=>row.id===variant.grammar_id);
      const visible=guide&&(filter==='all'||(filter==='complete'&&!isPending(guide))||(filter==='pending'&&isPending(guide))||(filter==='encountered'&&encountered(guide)));
      if(visible){matches.push({guide,variant,relatedSource:source});matchedIds.add(guide.id);}
    }
  }
  if(filter==='pending') matches.sort((a,b)=>Number(encountered(b.guide))-Number(encountered(a.guide))||linkCount(b.guide)-linkCount(a.guide)||new Date(b.guide.last_encountered_at||b.guide.created_at)-new Date(a.guide.last_encountered_at||a.guide.created_at));
  const pendingCount=repositoryState.grammarGuides.filter(isPending).length,completeCount=repositoryState.grammarGuides.length-pendingCount,directCount=repositoryState.grammarGuides.filter(encountered).length;
  const visiblePending=matches.map(row=>row.guide).filter(isPending),selectedVisible=visiblePending.filter(guide=>repositoryState.pendingGuideIds.has(guide.id));
  const filters=[['all',`All ${repositoryState.grammarGuides.length}`],['complete',`Complete ${completeCount}`],['pending',`Pending ${pendingCount}`],['encountered',`Encountered in my sentences ${directCount}`]];
  const card=({guide,variant,relatedSource})=>{const pending=isPending(guide),count=linkCount(guide),match=pending?{badge:'',detail:''}:repositoryGrammarMatchMarkup(variant,relatedSource);return `<article class="repo-grammar-card-wrap ${pending?'is-pending':''}">${filter==='pending'&&pending?`<label class="repo-pending-select"><input type="checkbox" data-pending-guide="${esc(guide.id)}" ${repositoryState.pendingGuideIds.has(guide.id)?'checked':''}><span>Select</span></label>`:''}<button type="button" class="repo-grammar-card" data-repo-guide="${esc(guide.id)}"><span class="repo-grammar-card-head"><strong lang="ja">${renderRepositoryFurigana(guide.pattern,repositoryPlainFromFurigana(guide.pattern))}</strong>${match.badge}</span><span class="repo-grammar-card-meaning">${esc(guide.meaning)}</span>${match.detail}${pending?`<small>Pending · ${count} linked sentence${count===1?'':'s'}${encountered(guide)?' · encountered directly':''}</small><small>First ${repositoryDate(guide.first_encountered_at||guide.created_at)} · Last ${repositoryDate(guide.last_encountered_at||guide.updated_at)}</small>`:''}</button></article>`;};
  return `<section class="repo-page"><div class="repo-page-head app-page-header"><div><button class="app-page-breadcrumb" id="repoGrammarLibraryBack">← Repository</button><div class="eyebrow">Canonical grammar</div><h1>Grammar Library</h1><p>Reusable grammar concepts from your saved Japanese.</p></div><div class="app-page-toolbar"><button class="smallbtn" id="repoImport">Import JSON</button></div></div><div class="repo-grammar-filters app-compact-stats" role="group" aria-label="Grammar guide filters">${filters.map(([value,label])=>`<button type="button" class="smallbtn ${filter===value?'primary':''}" data-grammar-filter="${value}">${label}</button>`).join('')}</div><section class="panel repo-grammar-search"><label><span>Search patterns, meanings or forms</span><input id="repoGrammarSearch" type="search" value="${esc(repositoryState.grammarQuery)}" placeholder="Try てたら, ちゃった or ている"></label></section>${filter==='pending'?`<section class="panel repo-pending-actions"><div><strong>Pending Guides</strong><span>${visiblePending.length} visible · ${selectedVisible.length} selected</span></div><div><button type="button" class="smallbtn" id="repoPendingSelectAll" ${visiblePending.length?'':'disabled'}>Select all visible</button><button type="button" class="smallbtn primary" id="repoCopyPendingPrompt" ${selectedVisible.length?'':'disabled'}>Copy guide-generation prompt</button></div></section>`:''}<div class="repo-grammar-library-grid">${matches.length?matches.map(card).join(''):'<div class="empty panel">No canonical grammar guides match this search.</div>'}</div></section>`;
}

function repositoryPendingGuidePrompt(guides){
  const selected=guides.slice(0,10);
  return `Create complete Learning Hub \`grammar_guide\` JSON for these pending canonical guides:\n\n${selected.map(guide=>`- ${repositoryPlainFromFurigana(guide.pattern)}`).join('\n')}\n\nFollow the current Learning Hub project instructions.\n\nRequirements:\n- one complete \`grammar_guide\` JSON object per canonical guide;\n- preserve the exact canonical names above;\n- do not create surface-form guides;\n- return all guide objects in one valid JSON array for batch import;\n- do not generate sentence JSON.`;
}

function repositoryCard(entry){
  const lead=entry.japanese||entry.original_japanese||entry.intent_english||'Untitled entry';
  const leadMarkup=entry.japanese?repositoryJapanese(entry):renderRepositoryFurigana(entry.original_japanese_furigana,entry.original_japanese);
  const meaning=entry.english||entry.intent_english||'';
  return `<button type="button" class="repo-entry-card" data-repo-entry="${entry.id}">
    <span class="repo-entry-top"><span class="repo-kind">${entry.entry_type==='correction'?'Correction':'Sentence'}${entry.migaku_exported_at?' · Migaku ✓':''}</span><span class="repo-status ${entry.status}">${repositoryStatusLabel(entry.status)}</span></span>
    <strong lang="ja">${entry.japanese||entry.original_japanese?leadMarkup:esc(lead)}</strong>${meaning?`<span>${esc(meaning)}</span>`:''}
    <small>${entry.lesson_number?`Lesson ${entry.lesson_number} · `:''}${esc(entry.register||'neutral')} · ${repositoryDate(entry.updated_at)}</small>
  </button>`;
}

function repositoryBrowseMarkup(){
  const entries=filteredRepositoryEntries();
  const counts=REPOSITORY_STATUSES.map(status=>[status,repositoryState.entries.filter(x=>x.status===status).length]);
  return `<section class="repo-page">
    <div class="repo-page-head app-page-heading app-page-header"><div><div class="eyebrow">Japanese Repository</div><h1>Capture and reuse Japanese</h1><p>Sentences, corrections and grammar you actually encounter.</p></div><div class="repo-head-actions app-page-toolbar"><button class="smallbtn primary" id="repoAdd">＋ Capture</button><button class="smallbtn" id="repoImport">Import JSON</button><button class="smallbtn" id="repoGrammarLibrary">Grammar Library</button><details class="repo-export-menu"><summary class="smallbtn">Export <span aria-hidden="true">▾</span></summary><div class="repo-export-actions"><button class="smallbtn migaku-btn" id="repoAnkiBulk" ${entries.length?'':'disabled'}>Export Anki</button><button class="smallbtn" id="repoMigakuBulk" ${entries.length?'':'disabled'}>Export TSV</button></div></details></div></div>
    <section class="repo-stats">${counts.map(([status,count])=>`<button type="button" data-repo-status-jump="${status}"><strong>${count}</strong><span>${repositoryStatusLabel(status)}</span></button>`).join('')}</section>
    <section class="repo-toolbar panel"><label class="repo-search"><span>Search</span><input id="repoSearch" type="search" value="${esc(repositoryState.query)}" placeholder="Japanese, English, grammar, tags or notes…"></label><label><span>Type</span><select id="repoKind"><option value="all">All</option><option value="sentence" ${repositoryState.kind==='sentence'?'selected':''}>Sentences</option><option value="correction" ${repositoryState.kind==='correction'?'selected':''}>Corrections</option></select></label><label><span>Status</span><select id="repoStatus"><option value="all">All</option>${REPOSITORY_STATUSES.map(x=>`<option value="${x}" ${repositoryState.status===x?'selected':''}>${repositoryStatusLabel(x)}</option>`).join('')}</select></label><label><span>Register</span><select id="repoRegister"><option value="all">All</option>${REPOSITORY_REGISTERS.map(x=>`<option value="${x}" ${repositoryState.register===x?'selected':''}>${x[0].toUpperCase()+x.slice(1)}</option>`).join('')}</select></label><label><span>Migaku</span><select id="repoMigakuFilter"><option value="all">All</option><option value="pending" ${repositoryState.migaku==='pending'?'selected':''}>Not added</option><option value="exported" ${repositoryState.migaku==='exported'?'selected':''}>Added</option></select></label></section>
    <section class="repo-content-grid"><div><div class="repo-results-head"><strong>${entries.length} entr${entries.length===1?'y':'ies'}</strong><button type="button" class="textbtn" id="repoClearFilters">Clear filters</button></div><div class="repo-entry-list">${entries.length?entries.map(repositoryCard).join(''):`<div class="empty repo-empty"><strong>No matching sentences.</strong><span>Capture something you encountered, attempted or asked how to say.</span></div>`}</div></div>${repositoryPatternsMarkup()}</section>
  </section>`;
}

window.JLHOpenGrammarLibrary=()=>{repositoryState.selectedId=null;repositoryState.routeEntry=null;repositoryState.mode='grammar-library';renderRepository();};
window.JLHOpenGrammarLibraryFor=label=>{repositoryState.selectedId=null;repositoryState.routeEntry=null;repositoryState.grammarQuery=String(label||'');repositoryState.mode='grammar-library';renderRepository();};

function repositoryPatternsMarkup(){
  const corrections=repositoryState.entries.filter(x=>x.entry_type==='correction');
  const counts=new Map();
  for(const entry of corrections) for(const error of (entry.error_types||[])) counts.set(error,(counts.get(error)||0)+1);
  const patterns=[...counts.entries()].sort((a,b)=>b[1]-a[1]);
  return `<aside class="panel repo-patterns"><div class="eyebrow">Correction patterns</div><h2>What keeps recurring</h2><p class="subtitle">Built from the error labels attached to your corrections.</p>${patterns.length?`<div class="repo-pattern-list">${patterns.slice(0,8).map(([name,count])=>`<button type="button" data-repo-pattern="${esc(name)}"><span>${esc(name)}</span><strong>${count}</strong></button>`).join('')}</div>`:`<div class="empty">Patterns will appear after corrected sentences have error labels.</div>`}</aside>`;
}

function repositoryDetailMarkup(entry){
  const revisions=repositoryState.revisions.filter(x=>x.repository_id===entry.id);
  return `<section class="repo-page repo-detail">
    <div class="repo-detail-toolbar"><button class="smallbtn" id="repoBack">← Repository</button><div><button class="smallbtn migaku-btn" id="repoOpenMigaku">Migaku handoff</button><button class="smallbtn" id="repoEdit">Edit</button><button class="smallbtn danger" id="repoDelete">Delete</button></div></div>
    <section class="repo-detail-hero app-page-header"><div class="repo-entry-top"><span class="repo-kind">${entry.entry_type==='correction'?'Personal correction':'Captured sentence'}</span><span class="repo-status ${entry.status}">${repositoryStatusLabel(entry.status)}</span></div><h1 lang="ja">${entry.japanese?repositoryJapanese(entry):renderRepositoryFurigana(entry.original_japanese_furigana,entry.original_japanese||'Untitled')}</h1>${entry.english?`<p>${esc(entry.english)}</p>`:''}<small>Updated ${repositoryDate(entry.updated_at)}</small></section>
    ${entry.entry_type==='correction'?`<section class="repo-correction-flow"><article><span>1 · Intended meaning</span><p>${esc(entry.intent_english||'—')}</p></article><article><span>2 · My Japanese</span><p lang="ja">${entry.original_japanese?repositoryJapanese(entry,true):'—'}</p></article><article class="corrected"><span>3 · Corrected Japanese</span><p lang="ja">${entry.japanese?repositoryJapanese(entry):'—'}</p></article><article><span>4 · Why</span><p>${esc(entry.explanation||'—')}</p></article></section>`:''}
    <section class="repo-detail-grid"><article class="panel"><div class="eyebrow">Connections</div><h2>Grammar and lessons</h2><div class="repo-chip-row">${repositoryGrammarLinks(entry)||'<span class="subtitle">No grammar linked yet.</span>'}</div>${repositoryLessonButton(entry)}${entry.book_id?`<div class="repo-source-row"><span>Book</span><strong>${esc(entry.book_id)}</strong></div>`:''}</article><article class="panel"><div class="eyebrow">Context</div><h2>How this sentence is used</h2><dl class="repo-facts"><div><dt>Register</dt><dd>${esc(entry.register||'neutral')}</dd></div><div><dt>Source</dt><dd>${esc(entry.source_type||'personal')}${entry.source_detail?` · ${esc(entry.source_detail)}`:''}</dd></div></dl><div class="repo-chip-row">${(entry.tags||[]).map(tag=>`<span class="repo-chip">${esc(tag)}</span>`).join('')}</div>${entry.notes?`<p class="repo-notes">${esc(entry.notes)}</p>`:''}</article></section>
    ${entry.error_types?.length?`<section class="panel repo-errors"><div class="eyebrow">Correction labels</div><div class="repo-chip-row">${entry.error_types.map(x=>`<span class="repo-chip error">${esc(x)}</span>`).join('')}</div></section>`:''}
    ${repositoryMigakuMarkup(entry)}
    <details class="panel repo-history"><summary>Correction history (${revisions.length})</summary>${revisions.length?revisions.map(row=>`<article><strong>${repositoryDate(row.created_at)}</strong><span lang="ja">${row.japanese?repositoryJapanese(row):repositoryJapanese(row,true)}</span><small>${esc(row.change_note||'Previous saved version')}</small></article>`).join(''):'<div class="empty">No earlier versions yet. A snapshot is added whenever this entry is edited.</div>'}</details>
  </section>`;
}

function repositoryMigakuMarkup(entry){
  const added=entry.migaku_exported_at;
  return `<details class="panel repo-migaku" id="repoMigakuPanel">
    <summary><span><strong>Migaku handoff</strong><small>${added?`Marked as added ${repositoryDate(added)}`:'Create the card in Migaku; the Hub keeps the source record.'}</small></span><b>${added?'Added ✓':'Open'}</b></summary>
    <div class="repo-migaku-body">
      <p class="subtitle">Use the Migaku browser extension on the clean Japanese below, copy the fields manually, or download a portable TSV row. Mark it as added only after the card exists in Migaku.</p>
      <div class="repo-migaku-sentence" lang="ja">${esc(entry.japanese||entry.original_japanese||'')}</div>
      <div class="repo-migaku-actions"><button type="button" class="smallbtn" id="repoCopyJapanese">Copy Japanese</button><button type="button" class="smallbtn" id="repoCopyMigaku">Copy all fields</button><button type="button" class="smallbtn migaku-btn" id="repoDownloadAnki">Download Anki deck</button><button type="button" class="smallbtn" id="repoDownloadMigaku">Download TSV</button><button type="button" class="smallbtn ${added?'':'primary'}" id="repoMarkMigaku">${added?'Remove Migaku marker':'Mark added to Migaku'}</button></div>
      <div class="repo-migaku-fields"><div><span>Meaning</span><p>${esc(entry.english||entry.intent_english||'—')}</p></div><div><span>Source</span><p>${esc([entry.source_type,entry.source_detail].filter(Boolean).join(' · ')||'Personal repository')}</p></div><div><span>Grammar</span><p>${esc((entry.grammar_points||[]).join(', ')||'—')}</p></div><div><span>Tags</span><p>${esc((entry.tags||[]).join(', ')||'—')}</p></div></div>
    </div>
  </details>`;
}

function repositoryField(label,control,wide=false){ return `<label class="${wide?'wide':''}"><span>${label}</span>${control}</label>`; }

function repositoryFormMarkup(entry={}){
  const editing=!!entry.id, type=entry.entry_type||'sentence';
  return `<section class="repo-page repo-form-page"><div class="repo-detail-toolbar"><button class="smallbtn" id="repoCancel">← Cancel</button></div><section class="repo-form-head"><div class="eyebrow">${editing?'Update entry':'New capture'}</div><h1>${editing?'Edit Japanese':'Capture useful Japanese'}</h1><p>Save something you encountered, attempted or asked how to express.</p></section><form id="repositoryForm" class="repo-form panel">
    <input type="hidden" name="id" value="${esc(entry.id||'')}">
    ${repositoryField('Entry type',`<select name="entry_type" id="repoEntryType"><option value="sentence" ${type==='sentence'?'selected':''}>Encountered / useful sentence</option><option value="correction" ${type==='correction'?'selected':''}>My Japanese correction</option></select>`)}
    ${repositoryField('Status',`<select name="status">${REPOSITORY_STATUSES.map(x=>`<option value="${x}" ${(entry.status||'learning')===x?'selected':''}>${repositoryStatusLabel(x)}</option>`).join('')}</select>`)}
    <div class="repo-correction-fields wide" id="repoCorrectionFields">
      ${repositoryField('What I intended to say',`<textarea name="intent_english" placeholder="The meaning you wanted to express">${esc(entry.intent_english||'')}</textarea>`,true)}
      ${repositoryField('My original Japanese',`<textarea name="original_japanese" lang="ja" placeholder="Your attempt before correction">${esc(entry.original_japanese||'')}</textarea>`,true)}
      ${repositoryField('Original Japanese with furigana',`<input name="original_japanese_furigana" class="repo-furigana-input" value="${esc(entry.original_japanese_furigana||'')}" placeholder="Example: [日本語|にほんご]"><small>Use [漢字|かんじ] notation. Leave kana and punctuation outside the brackets.</small><div class="repo-furigana-preview" data-furigana-preview="original"></div>`,true)}
    </div>
    ${repositoryField(type==='correction'?'Corrected Japanese':'Japanese',`<textarea name="japanese" lang="ja" required placeholder="Natural Japanese sentence">${esc(entry.japanese||'')}</textarea>`,true)}
    ${repositoryField('Japanese with furigana',`<input name="japanese_furigana" class="repo-furigana-input" value="${esc(entry.japanese_furigana||'')}" placeholder="Example: いいよ！[何時|なんじ]がいい？"><small>Use [漢字|かんじ] notation. The visible Japanese must exactly match the plain sentence.</small><div class="repo-furigana-preview" data-furigana-preview="corrected"></div>`,true)}
    ${repositoryField('English meaning',`<textarea name="english" placeholder="Clear meaning in context">${esc(entry.english||'')}</textarea>`,true)}
    ${repositoryField('Explanation',`<textarea name="explanation" placeholder="Why this wording or correction works">${esc(entry.explanation||'')}</textarea>`,true)}
    ${repositoryField('Canonical grammar links',`<input name="grammar_points" value="${esc((entry.grammar_points||[]).join(', '))}" readonly placeholder="Add links with Learning Hub JSON"><small>Grammar links include a canonical concept, the sentence surface and a note, so they are managed through JSON import.</small>`,true)}
    ${repositoryField('Lesson',`<select name="lesson_number"><option value="">Not linked</option>${(window.CURRICULUM?.lessons||[]).map(x=>`<option value="${x.n}" ${Number(entry.lesson_number)===Number(x.n)?'selected':''}>Lesson ${x.n} · ${esc(x.title)}</option>`).join('')}</select>`)}
    ${repositoryField('Book / resource',`<select name="book_id"><option value="">Not linked</option>${(window.BOOKS||[]).map(x=>`<option value="${esc(x.id)}" ${entry.book_id===x.id?'selected':''}>${esc(x.title)}</option>`).join('')}</select>`)}
    ${repositoryField('Register',`<select name="register">${REPOSITORY_REGISTERS.map(x=>`<option value="${x}" ${(entry.register||'neutral')===x?'selected':''}>${x[0].toUpperCase()+x.slice(1)}</option>`).join('')}</select>`)}
    ${repositoryField('Source type',`<select name="source_type"><option value="personal">Personal / ChatGPT</option><option value="book" ${entry.source_type==='book'?'selected':''}>Book</option><option value="conversation" ${entry.source_type==='conversation'?'selected':''}>Conversation</option><option value="media" ${entry.source_type==='media'?'selected':''}>Media</option><option value="other" ${entry.source_type==='other'?'selected':''}>Other</option></select>`)}
    ${repositoryField('Source detail',`<input name="source_detail" value="${esc(entry.source_detail||'')}" placeholder="Chat, page, episode, situation…">`,true)}
    ${repositoryField('Tags',`<input name="tags" value="${esc((entry.tags||[]).join(', '))}" placeholder="travel, daily life, work…">`,true)}
    <fieldset class="repo-error-fields wide" id="repoErrorFields"><legend>What was corrected?</legend><div>${REPOSITORY_ERROR_TYPES.map(x=>`<label><input type="checkbox" name="error_types" value="${esc(x)}" ${(entry.error_types||[]).includes(x)?'checked':''}> ${esc(x)}</label>`).join('')}</div></fieldset>
    ${repositoryField('Private notes',`<textarea name="notes" placeholder="Nuance, alternatives, reminders…">${esc(entry.notes||'')}</textarea>`,true)}
    <div class="repo-form-actions wide"><button type="button" class="smallbtn" id="repoCancelBottom">Cancel</button><button type="submit" class="smallbtn primary">${editing?'Save changes':'Save to repository'}</button></div>
  </form></section>`;
}

function repositoryImportMarkup(){
  return `<section class="repo-page repo-form-page"><div class="repo-detail-toolbar"><button class="smallbtn" id="repoCancel">← Cancel</button></div><section class="repo-form-head"><div class="eyebrow">Canonical grammar</div><h1>Import Learning Hub JSON</h1><p>Import sentences, one <code>grammar_guide</code>, a JSON array of grammar guides, or one <code>grammar_clarification</code>.</p><p>Sentence surfaces such as <code>見てたら</code> and <code>食べちゃった</code> are evidence for canonical concepts; they never become guides automatically.</p><p>All readings must use <code>[漢字|かんじ]</code>. Preview before saving.</p></section><section class="panel repo-import"><label><span>JSON</span><textarea id="repoImportJson" spellcheck="false" placeholder="Paste Learning Hub JSON here…">${esc(repositoryImportDraft())}</textarea></label><div id="repoImportPreview" class="repo-import-preview" role="status" aria-live="polite">${repositoryImportDraft()?'Draft restored. Preview it again before importing.':'Paste JSON, then preview it.'}</div><div class="repo-form-actions repo-import-actions"><button class="smallbtn" id="repoClearImport" type="button" ${repositoryImportDraft()?'':'disabled'}>Clear</button><span class="repo-import-action-spacer"></span><button class="smallbtn" id="repoPreviewImport" type="button">Preview</button><button class="smallbtn primary" id="repoRunImport" type="button" disabled>Import</button></div></section></section>`;
}

function renderRepository(){
  $('#hero').hidden=true; $('#bottomArea').hidden=true; $('#weekView').hidden=true; $('#mainContent').hidden=false;
  if(typeof renderNav==='function') renderNav();
  if(repositoryState.loading&&!repositoryState.loaded){ $('#mainContent').innerHTML='<section class="repo-page"><div class="panel repo-loading">Loading your Japanese Repository…</div></section>'; return; }
  if(repositoryState.error&&!repositoryState.loaded){ $('#mainContent').innerHTML=`<section class="repo-page"><div class="panel repo-setup"><h1>Repository setup needed</h1><p>${esc(repositoryState.error)}</p><p>Run <code>migrations/20260830_japanese_repository.sql</code> in the Supabase SQL Editor, then reload.</p><button class="smallbtn" id="repoRetry">Retry</button></div></section>`; $('#repoRetry').onclick=()=>loadRepositoryData(true); return; }
  const selected=repositoryState.entries.find(x=>x.id===repositoryState.selectedId)||repositoryState.routeEntry;
  if(repositoryState.mode==='form') $('#mainContent').innerHTML=repositoryFormMarkup(selected||{});
  else if(repositoryState.mode==='import') $('#mainContent').innerHTML=repositoryImportMarkup();
  else if(repositoryState.mode==='grammar-library') $('#mainContent').innerHTML=repositoryGrammarLibraryMarkup();
  else if(repositoryState.mode==='grammar'&&selected) $('#mainContent').innerHTML=repositoryGrammarMarkup(selected);
  else if(repositoryState.mode==='dictionary'&&window.JLHDictionary) $('#mainContent').innerHTML=window.JLHDictionary.markup();
  else if(repositoryState.mode==='detail'&&selected) $('#mainContent').innerHTML=repositoryDetailMarkup(selected);
  else { repositoryState.mode='browse'; $('#mainContent').innerHTML=repositoryBrowseMarkup(); }
  bindRepositoryEvents(selected);
  window.JLHRouter?.sync();
}

function cleanMigakuField(value){
  return String(value??'').replace(/[\t\r\n]+/g,' ').replace(/\s{2,}/g,' ').trim();
}

function repositoryMigakuTsv(entries){
  const headers=['Japanese','Furigana notation','English','Explanation','Grammar','Tags','Source','Repository ID'];
  const rows=entries.map(entry=>[
    entry.japanese||entry.original_japanese||'',entry.japanese_furigana||entry.original_japanese_furigana||'',
    entry.english||entry.intent_english||'',entry.explanation||'',(entry.grammar_points||[]).join('; '),(entry.tags||[]).join('; '),
    [entry.source_type,entry.source_detail].filter(Boolean).join(' · '),entry.id||''
  ].map(cleanMigakuField));
  return '\ufeff'+[headers,...rows].map(row=>row.join('\t')).join('\n');
}

function repositoryAnkiFurigana(notation,plain=''){
  if(!notation) return esc(plain||'');
  const source=String(notation),pattern=/\[([^\]|]+)\|([^\]]+)\]/g;
  let html='',last=0,match;
  while((match=pattern.exec(source))){
    html+=esc(source.slice(last,match.index));
    html+=`<ruby>${esc(match[1])}<rt>${esc(match[2])}</rt></ruby>`;
    last=pattern.lastIndex;
  }
  return html+esc(source.slice(last));
}

function repositoryAnkiTag(value){
  return String(value||'').trim().replace(/\s+/g,'_').replace(/[^\p{L}\p{N}_:.-]+/gu,'_').replace(/^_+|_+$/g,'').slice(0,80);
}

function repositoryAnkiEntries(entries){
  return entries.map(entry=>{
    const notes=[];
    if(entry.notes) notes.push(esc(entry.notes).replace(/\n/g,'<br>'));
    if(entry.original_japanese){
      const original=entry.original_japanese_furigana?repositoryAnkiFurigana(entry.original_japanese_furigana,entry.original_japanese):esc(entry.original_japanese);
      notes.push(`<b>My original Japanese:</b> ${original}`);
    }
    if(entry.error_types?.length) notes.push(`<b>Correction labels:</b> ${esc(entry.error_types.join(', '))}`);
    if(entry.grammar_points?.length) notes.push(`<b>Grammar:</b> ${esc(entry.grammar_points.join(', '))}`);
    const source=[entry.source_type,entry.source_detail].filter(Boolean).join(' · ');
    return {
      id:String(entry.id||''),
      targetWord:'',
      sentence:entry.japanese_furigana?repositoryAnkiFurigana(entry.japanese_furigana,entry.japanese):esc(entry.japanese||entry.original_japanese||''),
      sentenceTranslation:esc(entry.english||entry.intent_english||''),
      definition:esc(entry.explanation||'').replace(/\n/g,'<br>'),
      notes:notes.join('<br>'),
      sentenceAudio:'',
      image:'',
      source:esc([source,entry.id?`Repository ${entry.id}`:''].filter(Boolean).join(' · ')),
      tags:['learning-hub',`repository::${entry.id}`,...(entry.tags||[]).map(repositoryAnkiTag),...(entry.grammar_points||[]).map(x=>`grammar::${repositoryAnkiTag(x)}`)].filter(Boolean)
    };
  });
}

async function downloadRepositoryAnki(entries,button){
  if(!entries.length){toast('No repository entries match the current filters.');return;}
  if(!window.AnkiPackageExporter?.buildDeck){toast('Anki exporter failed to load. Reload the page and try again.');return;}
  const oldLabel=button?.textContent;if(button){button.disabled=true;button.textContent='Building deck…';}
  try{
    const bytes=await window.AnkiPackageExporter.buildDeck(repositoryAnkiEntries(entries));
    const blob=new Blob([bytes],{type:'application/octet-stream'}),url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download='japanese-learning-hub.apkg';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    toast(`${entries.length}-card Anki deck exported`);
  }catch(error){
    console.error('Anki export failed',error);toast(error?.message||'Anki deck export failed.');
  }finally{
    if(button){button.disabled=false;button.textContent=oldLabel;}
  }
}

function repositoryMigakuCopyText(entry){
  return [
    `Japanese\n${entry.japanese||entry.original_japanese||''}`,
    entry.japanese_furigana||entry.original_japanese_furigana?`Furigana notation\n${entry.japanese_furigana||entry.original_japanese_furigana}`:'',
    `English\n${entry.english||entry.intent_english||''}`,
    entry.explanation?`Explanation\n${entry.explanation}`:'',
    entry.grammar_points?.length?`Grammar\n${entry.grammar_points.join(', ')}`:'',
    entry.tags?.length?`Tags\n${entry.tags.join(', ')}`:'',
    entry.source_type||entry.source_detail?`Source\n${[entry.source_type,entry.source_detail].filter(Boolean).join(' · ')}`:''
  ].filter(Boolean).join('\n\n');
}

async function copyRepositoryText(value,message){
  try{
    await navigator.clipboard.writeText(value);
    toast(message);
  }catch(error){
    const area=document.createElement('textarea');area.value=value;area.style.position='fixed';area.style.opacity='0';document.body.append(area);area.select();
    const copied=document.execCommand('copy');area.remove();toast(copied?message:'Copy failed. Select the text manually.');
  }
}

function downloadRepositoryTsv(entries,filename='japanese-learning-hub-migaku.tsv'){
  if(!entries.length){toast('No repository entries match the current filters.');return;}
  const blob=new Blob([repositoryMigakuTsv(entries)],{type:'text/tab-separated-values;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  toast(`${entries.length} entr${entries.length===1?'y':'ies'} exported`);
}

async function markRepositoryMigaku(entry,exported){
  if(!entry||!db||!state.user)return;
  const value=exported?new Date().toISOString():null;
  const {data,error}=await db.from('japanese_repository').update({migaku_exported_at:value}).eq('id',entry.id).eq('user_id',state.user.id).select().single();
  if(error){toast(error.message);return;}
  repositoryState.entries=repositoryState.entries.map(row=>row.id===entry.id?data:row);
  repositoryState.selectedId=entry.id;repositoryState.mode='detail';renderRepository();toast(exported?'Marked as added to Migaku':'Migaku marker removed');
  if(exported) requestAnimationFrame(()=>{const panel=$('#repoMigakuPanel');if(panel){panel.open=true;panel.scrollIntoView({block:'center'});}});
}

function bindRepositoryEvents(selected){
  $('#repoDictionaryOpen')?.addEventListener('click',()=>window.JLHDictionary?.open(selected));
  if(repositoryState.mode==='dictionary') window.JLHDictionary?.bind();
  document.querySelectorAll('[data-repo-grammar]').forEach(button=>button.onclick=()=>openRepositoryGrammar(button.dataset.repoGrammar));
  window.JLHSupplementary?.bind(document,{db,user:state.user,message:toast,openGuide:id=>window.JLHRouter?.navigate(`/grammar/${encodeURIComponent(id)}`)});
  document.querySelectorAll('[data-repo-grammar-lesson]').forEach(button=>button.onclick=()=>{const intermediate=button.dataset.repoGrammarProgramme==='tobira-intermediate-future';openGuidedLesson(Number(button.dataset.repoGrammarLesson),`${intermediate?'ti':'b2'}-l${button.dataset.repoGrammarLesson}-${intermediate?'grammar-':'guide-grammar-'}${button.dataset.repoGrammarIndex}`,intermediate?'tobira-intermediate-future':null);});
  $('#repoGrammarBack')?.addEventListener('click',closeRepositoryGrammar);
  document.querySelectorAll('[data-repo-guide]').forEach(x=>x.onclick=()=>{
    const guide=repositoryState.grammarGuides.find(row=>row.id===x.dataset.repoGuide);if(!guide)return;
    repositoryState.grammarGuideId=guide.id;repositoryState.grammarLabel=guide.pattern;
    repositoryState.routeEntry=repositoryState.selectedId?null:{id:'guide:'+guide.id,routeStandalone:true};repositoryState.mode='grammar';renderRepository();
  });
  document.querySelectorAll('[data-repo-entry]').forEach(x=>x.onclick=()=>openRepositoryEntry(x.dataset.repoEntry));
  document.querySelectorAll('[data-repo-lesson]').forEach(x=>x.onclick=()=>{state.lesson=Number(x.dataset.repoLesson);state.view='lesson';render();scrollTo({top:0,behavior:'smooth'});});
  document.querySelectorAll('[data-repo-status-jump]').forEach(x=>x.onclick=()=>{repositoryState.status=x.dataset.repoStatusJump;renderRepository();});
  document.querySelectorAll('[data-repo-pattern]').forEach(x=>x.onclick=()=>{repositoryState.query=x.dataset.repoPattern;repositoryState.kind='correction';renderRepository();});
  document.querySelectorAll('[data-grammar-filter]').forEach(x=>x.onclick=()=>{repositoryState.grammarFilter=x.dataset.grammarFilter;repositoryState.pendingGuideIds=new Set();renderRepository();});
  document.querySelectorAll('[data-pending-guide]').forEach(x=>x.onchange=()=>{x.checked?repositoryState.pendingGuideIds.add(x.dataset.pendingGuide):repositoryState.pendingGuideIds.delete(x.dataset.pendingGuide);renderRepository();});
  $('#repoPendingSelectAll')?.addEventListener('click',()=>{const visible=Array.from(document.querySelectorAll('[data-pending-guide]')).map(x=>x.dataset.pendingGuide);const allSelected=visible.every(id=>repositoryState.pendingGuideIds.has(id));for(const id of visible)allSelected?repositoryState.pendingGuideIds.delete(id):repositoryState.pendingGuideIds.add(id);renderRepository();});
  $('#repoCopyPendingPrompt')?.addEventListener('click',()=>{const guides=repositoryState.grammarGuides.filter(guide=>repositoryState.pendingGuideIds.has(guide.id));copyRepositoryText(repositoryPendingGuidePrompt(guides),'Pending guide prompt copied');});
  $('#repoViewPending')?.addEventListener('click',()=>{repositoryState.selectedId=null;repositoryState.routeEntry=null;repositoryState.mode='grammar-library';repositoryState.grammarFilter='pending';repositoryState.pendingGuideIds=new Set();renderRepository();});
  $('#repoCopySingleGuidePrompt')?.addEventListener('click',()=>{const guide=repositoryState.grammarGuides.find(row=>row.id===repositoryState.grammarGuideId);if(guide)copyRepositoryText(repositoryPendingGuidePrompt([guide]),'Guide-generation prompt copied');});
  $('#repoSearch')?.addEventListener('input',e=>{repositoryState.query=e.target.value;renderRepository();$('#repoSearch')?.focus();});
  $('#repoGrammarSearch')?.addEventListener('input',e=>{repositoryState.grammarQuery=e.target.value;renderRepository();$('#repoGrammarSearch')?.focus();});
  $('#repoKind')?.addEventListener('change',e=>{repositoryState.kind=e.target.value;renderRepository();});
  $('#repoStatus')?.addEventListener('change',e=>{repositoryState.status=e.target.value;renderRepository();});
  $('#repoRegister')?.addEventListener('change',e=>{repositoryState.register=e.target.value;renderRepository();});
  $('#repoMigakuFilter')?.addEventListener('change',e=>{repositoryState.migaku=e.target.value;renderRepository();});
  $('#repoClearFilters')?.addEventListener('click',()=>{repositoryState.query='';repositoryState.kind='all';repositoryState.status='all';repositoryState.register='all';repositoryState.migaku='all';renderRepository();});
  $('#repoMigakuBulk')?.addEventListener('click',()=>downloadRepositoryTsv(filteredRepositoryEntries()));
  $('#repoAnkiBulk')?.addEventListener('click',e=>downloadRepositoryAnki(filteredRepositoryEntries(),e.currentTarget));
  $('#repoAdd')?.addEventListener('click',()=>{repositoryState.selectedId=null;repositoryState.mode='form';renderRepository();});
  $('#repoGrammarLibrary')?.addEventListener('click',()=>{repositoryState.selectedId=null;repositoryState.routeEntry=null;repositoryState.mode='grammar-library';renderRepository();});
  $('#repoImport')?.addEventListener('click',()=>{repositoryState.mode='import';renderRepository();});
  const back=()=>{repositoryState.mode='browse';repositoryState.selectedId=null;repositoryState.routeEntry=null;renderRepository();};
  $('#repoBack')?.addEventListener('click',back); $('#repoGrammarLibraryBack')?.addEventListener('click',back); $('#repoCancel')?.addEventListener('click',back); $('#repoCancelBottom')?.addEventListener('click',back);
  $('#repoEdit')?.addEventListener('click',()=>{repositoryState.mode='form';renderRepository();});
  $('#repoDelete')?.addEventListener('click',()=>deleteRepositoryEntry(selected));
  $('#repoOpenMigaku')?.addEventListener('click',()=>{const panel=$('#repoMigakuPanel');if(panel){panel.open=true;panel.scrollIntoView({behavior:'smooth',block:'center'});}});
  $('#repoCopyJapanese')?.addEventListener('click',()=>copyRepositoryText(selected?.japanese||selected?.original_japanese||'','Japanese copied'));
  $('#repoCopyMigaku')?.addEventListener('click',()=>copyRepositoryText(repositoryMigakuCopyText(selected),'Migaku fields copied'));
  $('#repoDownloadMigaku')?.addEventListener('click',()=>downloadRepositoryTsv(selected?[selected]:[],`learning-hub-${selected?.id||'sentence'}-migaku.tsv`));
  $('#repoDownloadAnki')?.addEventListener('click',e=>downloadRepositoryAnki(selected?[selected]:[],e.currentTarget));
  $('#repoMarkMigaku')?.addEventListener('click',()=>markRepositoryMigaku(selected,!selected?.migaku_exported_at));
  $('#repositoryForm')?.addEventListener('submit',saveRepositoryEntry);
  const type=$('#repoEntryType');
  const syncType=()=>{const correction=type?.value==='correction';$('#repoCorrectionFields')?.classList.toggle('is-hidden',!correction);$('#repoErrorFields')?.classList.toggle('is-hidden',!correction);};
  type?.addEventListener('change',syncType); syncType();
  const updateFuriganaPreviews=()=>{
    const form=$('#repositoryForm'); if(!form)return;
    const corrected=form.elements.japanese_furigana?.value||'', original=form.elements.original_japanese_furigana?.value||'';
    const correctedPreview=document.querySelector('[data-furigana-preview="corrected"]');
    const originalPreview=document.querySelector('[data-furigana-preview="original"]');
    if(correctedPreview) correctedPreview.innerHTML=corrected?renderRepositoryFurigana(corrected,form.elements.japanese?.value):'<span>Preview appears here</span>';
    if(originalPreview) originalPreview.innerHTML=original?renderRepositoryFurigana(original,form.elements.original_japanese?.value):'<span>Preview appears here</span>';
  };
  document.querySelectorAll('.repo-furigana-input,[name="japanese"],[name="original_japanese"]').forEach(input=>input.addEventListener('input',updateFuriganaPreviews));
  updateFuriganaPreviews();
  $('#repoPreviewImport')?.addEventListener('click',previewRepositoryImport);
  $('#repoRunImport')?.addEventListener('click',runRepositoryImport);
  $('#repoImportJson')?.addEventListener('input',()=>{
    repositorySaveImportDraft($('#repoImportJson').value);
    pendingRepositoryImport=null; repositoryImportSnapshot='';
    $('#repoRunImport').disabled=true;
    if($('#repoClearImport'))$('#repoClearImport').disabled=!$('#repoImportJson').value;
    $('#repoRunImport').textContent='Import';
    $('#repoImportPreview').textContent='JSON changed. Preview again before importing.';
  });
  $('#repoClearImport')?.addEventListener('click',()=>{
    repositoryClearImportDraft();pendingRepositoryImport=null;repositoryImportSnapshot='';
    $('#repoImportJson').value='';$('#repoImportPreview').textContent='Draft cleared. Paste JSON, then preview it.';
    $('#repoRunImport').disabled=true;$('#repoRunImport').textContent='Import';$('#repoClearImport').disabled=true;$('#repoImportJson').focus();
  });
}

function repositoryPayload(form){
  const data=new FormData(form), lesson=data.get('lesson_number');
  return {
    entry_type:data.get('entry_type')||'sentence', status:data.get('status')||'learning',
    intent_english:String(data.get('intent_english')||'').trim(), original_japanese:String(data.get('original_japanese')||'').trim(), original_japanese_furigana:String(data.get('original_japanese_furigana')||'').trim(),
    japanese:String(data.get('japanese')||'').trim(), japanese_furigana:String(data.get('japanese_furigana')||'').trim(), english:String(data.get('english')||'').trim(), explanation:String(data.get('explanation')||'').trim(),
    grammar_points:repositoryArray(data.get('grammar_points')), tags:repositoryArray(data.get('tags')),
    lesson_number:lesson?Number(lesson):null, book_id:String(data.get('book_id')||'')||null,
    register:data.get('register')||'neutral', source_type:data.get('source_type')||'personal', source_detail:String(data.get('source_detail')||'').trim(),
    error_types:data.getAll('error_types'), notes:String(data.get('notes')||'').trim()
  };
}

async function saveRepositoryEntry(event){
  event.preventDefault();
  const form=event.currentTarget, button=event.submitter, id=new FormData(form).get('id'), payload=repositoryPayload(form);
  if(!payload.japanese){toast('Add the Japanese sentence first.');return;}
  if(!repositoryFuriganaMatches(payload.japanese,payload.japanese_furigana)){toast('The furigana notation does not match the plain Japanese sentence.');return;}
  if(!repositoryFuriganaMatches(payload.original_japanese,payload.original_japanese_furigana)){toast('The original-sentence furigana does not match the plain Japanese.');return;}
  if(button) button.disabled=true;
  window.JLHRepositorySaving=true;
  try{
    if(id){
      const previous=repositoryState.entries.find(x=>x.id===id);
      if(previous){
        const {error:revisionError}=await db.from('japanese_repository_revisions').insert({user_id:state.user.id,repository_id:id,original_japanese:previous.original_japanese||'',original_japanese_furigana:previous.original_japanese_furigana||'',japanese:previous.japanese||'',japanese_furigana:previous.japanese_furigana||'',english:previous.english||'',explanation:previous.explanation||'',change_note:'Saved before editing'});
        if(revisionError) throw revisionError;
      }
      const {data,error}=await db.from('japanese_repository').update(payload).eq('id',id).eq('user_id',state.user.id).select().single();
      if(error) throw error;
      repositoryState.entries=repositoryState.entries.map(x=>x.id===id?data:x);
      repositoryState.revisions=[]; await loadRepositoryData(true);
      repositoryState.selectedId=id; repositoryState.mode='detail'; toast('Repository entry updated');
    }else{
      const {data,error}=await db.from('japanese_repository').insert({...payload,user_id:state.user.id}).select().single();
      if(error) throw error;
      repositoryState.entries.unshift(data); repositoryState.selectedId=data.id; repositoryState.mode='detail'; toast('Saved to Japanese Repository');
    }
    renderRepository();
  }catch(error){toast(error?.message||'Unable to save repository entry.');}
  finally{window.JLHRepositorySaving=false;if(button)button.disabled=false;}
}

async function deleteRepositoryEntry(entry){
  if(!entry||!confirm('Delete this repository entry and its correction history?')) return;
  const {error}=await db.from('japanese_repository').delete().eq('id',entry.id).eq('user_id',state.user.id);
  if(error){toast(error.message);return;}
  repositoryState.entries=repositoryState.entries.filter(x=>x.id!==entry.id);
  repositoryState.revisions=repositoryState.revisions.filter(x=>x.repository_id!==entry.id);
  repositoryState.selectedId=null;repositoryState.mode='browse';renderRepository();toast('Repository entry deleted');
}

function normaliseRepositoryImport(raw){
  const rows=Array.isArray(raw)?raw:[raw];
  return rows.map(row=>({
    entry_type:row.entry_type==='correction'?'correction':'sentence', status:REPOSITORY_STATUSES.includes(row.status)?row.status:'learning',
    intent_english:String(row.intent_english||''), original_japanese:String(row.original_japanese||''), original_japanese_furigana:String(row.original_japanese_furigana||''), japanese:String(row.japanese||''), japanese_furigana:String(row.japanese_furigana||''),
    english:String(row.english||''), explanation:String(row.explanation||''), grammar_points:Array.isArray(row.grammar_points)?row.grammar_points.map(item=>typeof item==='object'?String(item?.canonical||''):String(item)).filter(Boolean):[], tags:repositoryArray(row.tags),
    lesson_number:(Number(row.lesson_number)>=11&&Number(row.lesson_number)<=20)?Number(row.lesson_number):null,
    book_id:row.book_id||null, register:REPOSITORY_REGISTERS.includes(row.register)?row.register:'neutral', source_type:row.source_type||'personal',
    source_detail:String(row.source_detail||'ChatGPT import'), error_types:repositoryArray(row.error_types).filter(x=>REPOSITORY_ERROR_TYPES.includes(x)), notes:String(row.notes||'')
  })).filter(row=>row.japanese);
}

let pendingRepositoryImport=null;
let repositoryImportSnapshot='';
let repositoryImportRunning=false;

function repositoryCanonical(value){
  if(Array.isArray(value)) return '['+value.map(repositoryCanonical).join(',')+']';
  if(value&&typeof value==='object') return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+repositoryCanonical(value[k])).join(',')+'}';
  return JSON.stringify(value);
}

function repositoryClarificationKey(title){
  return String(title||'').normalize('NFKC').trim().replace(/\s+/gu,'').toLowerCase();
}

function repositoryStringList(raw,name,allowEmpty=true){
  if(!Array.isArray(raw)||(!allowEmpty&&!raw.length)||raw.some(item=>typeof item!=='string'||!item.trim())) throw new Error(`${name} must be ${allowEmpty?'an':'a non-empty'} array of strings.`);
  return raw.map(item=>item.trim());
}

function repositoryValidateExample(raw,name='example'){
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(key=>!['japanese','japanese_furigana','english','source'].includes(key))) throw new Error(`Invalid ${name} fields.`);
  for(const key of ['japanese','japanese_furigana','english']) if(typeof raw[key]!=='string'||!raw[key].trim()) throw new Error(`${name} ${key} is required.`);
  if(!repositoryFuriganaMatches(raw.japanese,raw.japanese_furigana)) throw new Error(`${name} furigana does not match: ${raw.japanese}`);
  if(raw.source!==undefined&&typeof raw.source!=='string') throw new Error(`${name} source must be a string.`);
  return {japanese:raw.japanese,japanese_furigana:raw.japanese_furigana,english:raw.english,...(raw.source?{source:raw.source}:{})};
}

function repositoryValidateContrasts(raw){
  if(raw===undefined) return [];
  if(!Array.isArray(raw)||raw.length<2||raw.length>12) throw new Error('clarification contrasts must contain between 2 and 12 items.');
  return raw.map(item=>{
    if(!item||typeof item!=='object'||Array.isArray(item)||Object.keys(item).some(key=>!['japanese','japanese_furigana','english','note'].includes(key))) throw new Error('Invalid clarification contrast fields.');
    for(const key of ['japanese','japanese_furigana','english','note']) if(typeof item[key]!=='string'||!item[key].trim()) throw new Error(`clarification contrast ${key} is required.`);
    if(!repositoryFuriganaMatches(item.japanese,item.japanese_furigana)) throw new Error(`clarification contrast furigana does not match: ${item.japanese}`);
    return {japanese:item.japanese,japanese_furigana:item.japanese_furigana,english:item.english,note:item.note};
  });
}

function repositoryValidateClarification(raw,withCanonical=true){
  const allowed=['entry_type','canonical','guide_slug','title','question','explanation','contrasts','sort_order'];
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(key=>!allowed.includes(key))) throw new Error('Invalid grammar clarification fields.');
  if(withCanonical&&(typeof raw.canonical!=='string'||!repositoryGrammarKey(raw.canonical))) throw new Error('clarification canonical is required.');
  for(const key of ['title','question','explanation']) if(typeof raw[key]!=='string'||!raw[key].trim()) throw new Error(`clarification ${key} is required.`);
  if(raw.guide_slug!==undefined&&!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(raw.guide_slug)) throw new Error('guide_slug must contain lowercase letters, numbers and hyphens only.');
  return {canonical:raw.canonical,guide_slug:raw.guide_slug||'',title:raw.title,question:raw.question,explanation:raw.explanation,contrasts:repositoryValidateContrasts(raw.contrasts),sort_order:Number.isInteger(raw.sort_order)?raw.sort_order:0};
}

function repositoryValidateGrammarGuide(raw){
  const allowed=['entry_type','slug','canonical','meaning','summary','formation','usage','nuance','register','jlpt_level','variants','combined_forms','clarifications','related_grammar','reference_examples','references'];
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.entry_type!=='grammar_guide'||Object.keys(raw).some(key=>!allowed.includes(key))) throw new Error('Invalid grammar_guide fields.');
  for(const key of ['canonical','meaning','summary','register','jlpt_level']) if(typeof raw[key]!=='string') throw new Error(`grammar guide ${key} must be a string.`);
  if(!repositoryGrammarKey(raw.canonical)) throw new Error('grammar guide canonical is required.');
  if(raw.slug!==undefined&&!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(raw.slug)) throw new Error('slug must contain lowercase letters, numbers and hyphens only.');
  const variantAllowed=['form','variant_type','explanation','related_canonical'];
  const parseVariants=(items,type)=>{
    if(!Array.isArray(items)) throw new Error(`${type} must be an array.`);
    return items.map(item=>{
      if(!item||typeof item!=='object'||Array.isArray(item)||Object.keys(item).some(key=>!variantAllowed.includes(key))) throw new Error(`Invalid ${type} fields.`);
      if(typeof item.form!=='string'||!item.form.trim()||typeof item.explanation!=='string') throw new Error(`${type} form and explanation are required.`);
      const variantType=type==='combined_forms'?'combined_form':item.variant_type;
      if(!['formation','contraction','combined_form','spoken_form','orthographic_variant'].includes(variantType)) throw new Error(`Invalid variant_type: ${variantType}`);
      if(item.related_canonical!==undefined&&typeof item.related_canonical!=='string') throw new Error('related_canonical must be a string.');
      return {form:item.form,variant_type:variantType,explanation:item.explanation,related_canonical:item.related_canonical||''};
    });
  };
  if(!Array.isArray(raw.references)) throw new Error('references must be an array.');
  const references=raw.references.map(item=>{
    if(!item||typeof item!=='object'||Array.isArray(item)||Object.keys(item).some(key=>!['title','url'].includes(key))||typeof item.title!=='string'||!item.title.trim()||typeof item.url!=='string') throw new Error('Invalid reference fields.');
    let url;try{url=new URL(item.url);}catch{throw new Error('Reference URL is invalid.');}
    if(url.protocol!=='https:') throw new Error('Reference URLs must use HTTPS.');
    return {title:item.title,url:item.url};
  });
  return {slug:raw.slug||'',canonical:raw.canonical,meaning:raw.meaning,summary:raw.summary,
    formation:repositoryStringList(raw.formation,'formation'),usage:repositoryStringList(raw.usage,'usage'),nuance:repositoryStringList(raw.nuance,'nuance'),register:raw.register,jlpt_level:raw.jlpt_level,
    variants:[...parseVariants(raw.variants,'variants'),...parseVariants(raw.combined_forms,'combined_forms')],
    clarifications:(raw.clarifications||[]).map(item=>repositoryValidateClarification(item,false)),related_grammar:repositoryStringList(raw.related_grammar,'related_grammar'),
    reference_examples:(raw.reference_examples||[]).map(item=>repositoryValidateExample(item,'reference example')),references};
}

function repositoryValidateGrammarAnnotations(raw,japanese){
  if(!Array.isArray(raw)) throw new Error('grammar_points must be an array of canonical annotation objects.');
  const seen=new Set();
  return raw.map((item,index)=>{
    if(!item||typeof item!=='object'||Array.isArray(item)||Object.keys(item).some(key=>!['canonical','surface','note','guide_slug'].includes(key))) throw new Error(`Grammar point ${index+1} must use canonical, surface and note.`);
    for(const key of ['canonical','surface','note']) if(typeof item[key]!=='string') throw new Error(`Grammar point ${index+1} ${key} must be a string.`);
    if(!repositoryGrammarKey(item.canonical)) throw new Error(`Grammar point ${index+1} canonical is required.`);
    if(item.surface&&!japanese.includes(item.surface)) throw new Error(`Grammar surface "${item.surface}" is not present in the Japanese sentence.`);
    if(item.guide_slug!==undefined&&!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.guide_slug)) throw new Error('guide_slug must contain lowercase letters, numbers and hyphens only.');
    const key=(item.guide_slug||repositoryGrammarKey(item.canonical))+'\u001f'+item.surface;
    if(seen.has(key)) throw new Error(`Duplicate canonical grammar annotation: ${item.canonical} / ${item.surface}`);
    seen.add(key);return {canonical:item.canonical,surface:item.surface,note:item.note,guide_slug:item.guide_slug||''};
  });
}

function repositoryPlanImport(raw){
  const rows=Array.isArray(raw)?raw:[raw],warnings=[];
  if(!rows.length||rows.length>100) throw new Error('Import between 1 and 100 entries at a time.');
  const items=rows.map((row,index)=>{
    if(!row||typeof row!=='object'||Array.isArray(row)||typeof row.japanese!=='string'||!row.japanese.trim()) throw new Error(`Entry ${index+1}: a Japanese sentence is required.`);
    if(row.entry_type==='grammar_guide'||row.entry_type==='grammar_clarification') throw new Error('Grammar guides and clarifications must be imported one object at a time.');
    const entry=normaliseRepositoryImport(row)[0];
    const unknown=Object.keys(row).filter(k=>!Object.hasOwn(entry,k));
    if(unknown.length) throw new Error(`Entry ${index+1}: unknown fields ${unknown.join(', ')}.`);
    if(!repositoryFuriganaMatches(entry.japanese,entry.japanese_furigana)||!repositoryFuriganaMatches(entry.original_japanese,entry.original_japanese_furigana)) throw new Error(`Furigana does not match the plain Japanese: ${entry.japanese}`);
    if(!entry.japanese_furigana) warnings.push(`Entry ${index+1}: no japanese_furigana supplied. The app does not generate readings.`);
    const annotations=repositoryValidateGrammarAnnotations(row.grammar_points||[],entry.japanese);
    entry.grammar_points=[...new Set(annotations.map(item=>item.canonical))];
    const existing=entry.entry_type==='sentence'?repositoryState.entries.find(item=>item.entry_type==='sentence'&&item.japanese===entry.japanese):null;
    const import_fields=REPOSITORY_IMPORT_UPDATE_FIELDS.filter(field=>Object.hasOwn(row,field));
    return {entry,grammar_points:annotations,import_fields,existing_id:existing?.id||null};
  });
  return {items,warnings};
}

function previewRepositoryImport(){
  if(repositoryImportRunning) return;
  try{
    repositoryImportSnapshot=$('#repoImportJson').value;
    if(new TextEncoder().encode(repositoryImportSnapshot).length>2097152) throw new Error('Import at most 2 MB at a time.');
    const parsed=JSON.parse(repositoryImportSnapshot);
    if(!repositoryState.grammarLibraryReady) throw new Error('Apply migrations/20260906_canonical_grammar_redesign.sql, then reload before importing. Nothing has been changed.');
    if(Array.isArray(parsed)&&parsed.length&&parsed.every(item=>item?.entry_type==='grammar_guide')){
      if(parsed.length>10) throw new Error('Import at most 10 grammar guides in one batch.');
      const guides=parsed.map(repositoryValidateGrammarGuide),keys=new Set();
      for(const guide of guides){const key=repositoryGrammarKey(guide.canonical);if(keys.has(key))throw new Error(`Duplicate canonical guide in batch: ${guide.canonical}`);keys.add(key);}
      const operations=guides.map(guide=>{const existing=repositoryState.grammarGuides.find(item=>repositoryGrammarKey(item.pattern)===repositoryGrammarKey(guide.canonical));return {guide,operation:!existing?'new':existing.is_placeholder||existing.guide_status==='pending'?'complete':'update'};});
      pendingRepositoryImport={kind:'guides',payload:guides};
      const counts=type=>operations.filter(item=>item.operation===type).length;
      $('#repoImportPreview').innerHTML=`<strong>${guides.length} grammar guides</strong><span>${counts('complete')} pending guides will be completed · ${counts('new')} new guides · ${counts('update')} existing complete guides will be updated</span>${operations.map(item=>`<span lang="ja">${esc(item.guide.canonical)} · ${item.operation}</span>`).join('')}`;
      $('#repoRunImport').textContent='Save grammar guides';$('#repoRunImport').disabled=false;return;
    }
    if(parsed?.entry_type==='grammar_guide'){
      const guide=repositoryValidateGrammarGuide(parsed);pendingRepositoryImport={kind:'guide',payload:guide};
      const existing=repositoryState.grammarGuides.find(item=>repositoryGrammarKey(item.pattern)===repositoryGrammarKey(guide.canonical));
      const operation=!existing?'New guide':existing.is_placeholder||existing.guide_status==='pending'?'Completes pending guide':'Updates existing complete guide';
      $('#repoImportPreview').innerHTML=`<strong>Canonical guide · ${esc(guide.canonical)}</strong><span>${operation} · ${guide.variants.length} searchable forms · ${guide.clarifications.length} clarifications · ${guide.reference_examples.length} reference examples</span>`;
      $('#repoRunImport').textContent='Save grammar guide';$('#repoRunImport').disabled=false;return;
    }
    if(parsed?.entry_type==='grammar_clarification'){
      const clarification=repositoryValidateClarification(parsed);pendingRepositoryImport={kind:'clarification',payload:clarification};
      $('#repoImportPreview').innerHTML=`<strong>Clarification for ${esc(clarification.canonical)}</strong><span>${esc(clarification.title)} · no sentence changes</span>`;
      $('#repoRunImport').textContent='Save clarification';$('#repoRunImport').disabled=false;return;
    }
    const plan=repositoryPlanImport(parsed);
    pendingRepositoryImport={kind:'sentences',payload:plan.items};
    const links=plan.items.reduce((sum,item)=>sum+item.grammar_points.length,0),existing=plan.items.filter(item=>item.existing_id).length,created=plan.items.length-existing;
    const sentenceSummary=[existing?`${existing} existing sentence${existing===1?'':'s'} will be updated`:'',created?`${created} new sentence${created===1?'':'s'} will be added`:''].filter(Boolean).join(' · ');
    const placeholders=new Set(plan.items.flatMap(item=>item.grammar_points).filter(point=>!repositoryState.grammarGuides.some(guide=>repositoryGrammarKey(guide.pattern)===repositoryGrammarKey(point.canonical))).map(point=>point.canonical));
    $('#repoImportPreview').innerHTML=`<strong>${sentenceSummary} · ${links} canonical grammar link${links===1?'':'s'}</strong>${placeholders.size?`<span>${placeholders.size} missing canonical guide${placeholders.size===1?'':'s'} will be created as minimal placeholders: ${[...placeholders].map(esc).join(', ')}</span>`:''}${plan.items.slice(0,5).map(item=>`<span lang="ja">${repositoryJapanese(item.entry)}</span>`).join('')}${plan.warnings.map(value=>`<p>${esc(value)}</p>`).join('')}`;
    $('#repoRunImport').textContent='Import sentences';$('#repoRunImport').disabled=false;
  }catch(error){pendingRepositoryImport=null;repositoryImportSnapshot='';$('#repoImportPreview').innerHTML=`<span class="repo-import-error">${esc(error.message)}</span>`;$('#repoRunImport').textContent='Import';$('#repoRunImport').disabled=true;}
}

async function runRepositoryImport(){
  if(repositoryImportRunning||!pendingRepositoryImport||!state.user) return;
  if($('#repoImportJson')?.value!==repositoryImportSnapshot){toast('Preview the current JSON first.');return;}
  const button=$('#repoRunImport'),userId=state.user.id;
  const pending=pendingRepositoryImport;
  repositoryImportRunning=true; button.disabled=true;
  const input=$('#repoImportJson'); if(input)input.disabled=true;
  try{
    const sentencePayload=pending.kind==='sentences'?pending.payload.map(({existing_id,...item})=>item):null;
    let data;
    if(pending.kind==='guides'){
      const result=await db.rpc('upsert_canonical_grammar_guides',{p_guides:pending.payload});
      if(result.error)throw result.error;
      data=result.data;
      if(!Array.isArray(data?.items)||data.items.length!==pending.payload.length) throw new Error('Grammar guide batch import returned incomplete diagnostic data.');
      pending.payload.forEach((guide,index)=>{
        const returned=data.items[index];
        if(repositoryGrammarKey(returned?.incoming_canonical)!==repositoryGrammarKey(guide.canonical)||repositoryGrammarKey(returned?.returned_pattern)!==repositoryGrammarKey(guide.canonical)){
          throw new Error(`Grammar guide import mismatch: expected ${guide.canonical}, database updated ${returned?.returned_pattern||'an unknown guide'}`);
        }
      });
    }else{
      const calls={sentences:['import_repository_with_canonical_grammar',{p_entries:sentencePayload}],guide:['upsert_canonical_grammar_guide',{p_guide:pending.payload}],clarification:['append_canonical_grammar_clarification',{p_clarification:pending.payload}]};
      const [name,args]=calls[pending.kind],result=await db.rpc(name,args);if(result.error)throw result.error;data=result.data;
      if(pending.kind==='guide'&&repositoryGrammarKey(data?.guide?.pattern)!==repositoryGrammarKey(pending.payload.canonical)){
        throw new Error(`Grammar guide import mismatch: expected ${pending.payload.canonical}, database updated ${data?.guide?.pattern||'an unknown guide'}`);
      }
    }
    if(state.user?.id!==userId) return;
    repositoryState.mode=['guide','guides','clarification'].includes(pending.kind)?'grammar-library':'browse';
    await loadRepositoryData(true);
    if(pending.kind==='guides'){
      const incomplete=pending.payload.filter(imported=>{
        const guide=repositoryState.grammarGuides.find(candidate=>repositoryGrammarKey(candidate.pattern)===repositoryGrammarKey(imported.canonical));
        return !guide||guide.guide_status!=='complete'||guide.is_placeholder!==false;
      });
      if(incomplete.length){
        const completed=pending.payload.length-incomplete.length;
        throw new Error(`Batch import incomplete: ${completed} of ${pending.payload.length} guides completed. Still pending: ${incomplete.map(guide=>guide.canonical).join(', ')}`);
      }
    }
    repositoryClearImportDraft();
    pendingRepositoryImport=null;repositoryImportSnapshot='';
    const sentenceResult=data=>[data.updated_count?`${data.updated_count} updated`:'',data.created_count?`${data.created_count} added`:''].filter(Boolean).join(' · ')||`${data.entries.length} imported`;
    toast(pending.kind==='sentences'?`Repository sentences: ${sentenceResult(data)}`:pending.kind==='guide'?`Canonical guide ${data.guide.pattern} saved`:pending.kind==='guides'?`${data.guides.length} canonical grammar guides saved`:`Clarification saved to ${data.guide.pattern}; sentences unchanged`);
  }catch(error){
    if(state.user?.id===userId) toast(`${error?.message||'Import failed.'} Reload and check your entries before retrying if the connection was interrupted.`);
  }finally{
    repositoryImportRunning=false;
    if(input?.isConnected)input.disabled=false;
    if(button.isConnected)button.disabled=!pendingRepositoryImport;
  }
}
