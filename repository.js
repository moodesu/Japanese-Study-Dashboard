const repositoryState = {
  entries: [],
  revisions: [],
  grammarGuides: [],
  grammarLinks: [],
  grammarLibraryReady: false,
  grammarLibraryError: '',
  grammarGuideId: null,
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
  showFurigana: localStorage.getItem('repositoryShowFurigana')!=='false'
};

const REPOSITORY_STATUSES = ['reference','learning','review','known'];
const REPOSITORY_REGISTERS = ['neutral','casual','polite','formal','written'];
const REPOSITORY_ERROR_TYPES = [
  'Particles','Verb form','Word choice','Word order','Register','Omission',
  'Grammar pattern','Naturalness','Kanji / spelling','Other'
];

function repositoryArray(value){
  if(Array.isArray(value)) return value.filter(Boolean).map(String);
  if(typeof value!=='string') return [];
  return value.split(',').map(x=>x.trim()).filter(Boolean);
}

function repositoryGrammarCatalogue(){
  const rows=[];
  for(const lesson of (window.CURRICULUM?.lessons||[])){
    for(const [index,grammar] of (lesson.textbook?.grammar||[]).entries()){
      if(!rows.some(row=>row.label===grammar)) rows.push({label:grammar,lesson:lesson.n,index:index+1});
    }
  }
  return rows;
}

function repositoryEntrySearchText(entry){
  return [entry.japanese,entry.japanese_furigana,entry.english,entry.intent_english,entry.original_japanese,entry.original_japanese_furigana,
    entry.explanation,entry.source_detail,entry.notes,...(entry.grammar_points||[]),
    ...(entry.tags||[]),...(entry.error_types||[])].filter(Boolean).join(' ').toLowerCase();
}

function renderRepositoryFurigana(notation,plain=''){
  if(!repositoryState.showFurigana||!notation) return esc(plain||notation||'');
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

function repositoryFuriganaToggle(){
  return `<button type="button" class="smallbtn repo-furigana-toggle" id="repoFuriganaToggle" aria-pressed="${repositoryState.showFurigana}">${repositoryState.showFurigana?'振 Furigana on':'振 Furigana off'}</button>`;
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
    const [{data:entries,error},{data:revisions,error:revisionError},guides,links]=await Promise.all([
      db.from('japanese_repository').select('*').eq('user_id',state.user.id).order('updated_at',{ascending:false}),
      db.from('japanese_repository_revisions').select('*').eq('user_id',userId).order('created_at',{ascending:false}),
      db.from('japanese_grammar_guides').select('*').eq('user_id',userId),
      db.from('japanese_repository_grammar').select('*').eq('user_id',userId)
    ]);
    if(state.user?.id!==userId) return;
    if(error) throw error;
    if(revisionError) throw revisionError;
    repositoryState.entries=entries||[];
    repositoryState.revisions=revisions||[];
    repositoryState.grammarLibraryReady=!guides.error&&!links.error;
    repositoryState.grammarLibraryError=guides.error?.message||links.error?.message||'';
    repositoryState.grammarGuides=guides.data||[];
    repositoryState.grammarLinks=links.data||[];
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
  repositoryState.grammarGuides=[]; repositoryState.grammarLinks=[];
  repositoryState.grammarLibraryReady=false; repositoryState.grammarLibraryError='';
  repositoryState.grammarGuideId=null; pendingRepositoryImport=[]; repositoryImportSnapshot='';
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
  const lesson=window.CURRICULUM?.lessons?.find(x=>Number(x.n)===Number(entry.lesson_number));
  return `<button type="button" class="repo-link" data-repo-lesson="${entry.lesson_number}"><span>Lesson ${entry.lesson_number}</span><strong>${esc(lesson?.title||'Open lesson')}</strong></button>`;
}

function repositoryGrammarLinks(entry){
  return (entry.grammar_points||[]).map(grammar=>{
    return `<button type="button" class="repo-chip grammar" data-repo-grammar="${esc(grammar)}" aria-label="Open grammar: ${esc(grammar)}">${esc(grammar)} →</button>`;
  }).join('');
}

function repositoryGrammarKey(label){
  return String(label||'').normalize('NFKC').trim().replace(/^[~〜～]+/u,'').replace(/\s+/gu,'').toLowerCase();
}

function repositoryGrammarGuide(label,entry){
  const key=repositoryGrammarKey(label);
  if(entry){
    const link=repositoryState.grammarLinks.find(x=>x.repository_id===entry.id&&x.label===label);
    const saved=repositoryState.grammarGuides.find(x=>x.id===(repositoryState.grammarGuideId||link?.grammar_id)&&x.grammar_key===key);
    if(saved) return repositorySavedGuide(saved);
    // An unlinked label cannot identify a meaning. Let the reader choose explicitly.
    if(repositoryState.grammarGuides.some(x=>x.grammar_key===key)) return undefined;
  }
  return (window.REPOSITORY_GRAMMAR_GUIDES||[]).find(guide=>guide.aliases.some(alias=>repositoryGrammarKey(alias)===key));
}

function repositorySavedGuide(guide){
  const content=guide.content;
  return {id:guide.id,title:guide.label,meaning:content.meaning,imported:true,sense:guide.sense,
    forms:content.formation.map(pattern=>({pattern,meaning:''})),
    sections:[{title:'Explanation',paragraphs:[content.explanation]}],
    examples:content.examples.map(x=>({japanese:x.japanese_furigana||x.japanese,english:x.english,note:''})),sources:[]};
}

function openRepositoryGrammar(label){
  const entry=repositoryState.entries.find(row=>row.id===repositoryState.selectedId);
  if(!entry?.grammar_points?.includes(label)) return;
  repositoryState.grammarLabel=label;
  repositoryState.grammarGuideId=null;
  repositoryState.grammarReturnScroll=window.scrollY||0;
  repositoryState.mode='grammar';
  renderRepository(); scrollTo({top:0,behavior:'smooth'});
  $('#repoGrammarTitle')?.focus({preventScroll:true});
}

function closeRepositoryGrammar(){
  repositoryState.mode='detail'; renderRepository();
  const chip=Array.from(document.querySelectorAll('[data-repo-grammar]')).find(node=>node.dataset.repoGrammar===repositoryState.grammarLabel);
  chip?.focus({preventScroll:true});
  scrollTo({top:repositoryState.grammarReturnScroll,behavior:'auto'});
}

function repositoryGrammarMarkup(entry){
  const label=repositoryState.grammarLabel, guide=repositoryGrammarGuide(label,entry);
  const key=repositoryGrammarKey(label);
  const lessons=repositoryGrammarCatalogue().filter(row=>repositoryGrammarKey(row.label)===key);
  const text=value=>renderRepositoryFurigana(value,repositoryPlainFromFurigana(value));
  const body=guide?`
    <section class="panel"><h2>Meaning</h2><p>${text(guide.meaning)}</p></section>
    <section class="panel"><h2>Formation</h2><dl class="repo-grammar-forms">${guide.forms.map(form=>`<div><dt>${text(form.pattern)}</dt><dd>${text(form.meaning)}</dd></div>`).join('')}</dl></section>
    ${guide.sections.map(section=>`<section class="panel"><h2>${esc(section.title)}</h2>${section.paragraphs.map(paragraph=>`<p>${text(paragraph)}</p>`).join('')}</section>`).join('')}
    <section class="panel"><h2>Examples</h2>${guide.examples.map(example=>`<article class="repo-grammar-example"><p lang="ja"><strong>${text(example.japanese)}</strong></p><p>${esc(example.english)}</p><small>${text(example.note)}</small></article>`).join('')}</section>
    ${guide.imported?`<section class="panel"><h2>Imported grammar guide</h2><p>AI-generated · Unverified. Check important details against a trusted grammar reference.</p><small>Meaning ID: ${esc(guide.sense)}</small></section>`:`<section class="panel"><h2>Read more</h2><p>Learning Hub summary with original examples. Reference explanations:</p>${guide.sources.map(source=>`<a class="repo-link" href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.title)} ↗</a>`).join('')}</section>`}
  `:`<section class="panel"><h2>Explanation not yet in the guide library</h2><p>This label does not yet have a standalone Learning Hub explanation. The saved sentence context below is not a substitute for a grammar reference.</p><a class="repo-link" href="https://www.google.com/search?q=${encodeURIComponent(label+' Japanese grammar explanation')}" target="_blank" rel="noopener noreferrer">Search grammar references ↗</a></section>`;
  return `<section class="repo-page repo-grammar-page">
    <div class="repo-detail-toolbar"><button type="button" class="smallbtn" id="repoGrammarBack">← Back to sentence</button>${repositoryFuriganaToggle()}</div>
    <header><div class="eyebrow">Grammar reference</div><h1 id="repoGrammarTitle" tabindex="-1">${guide?text(guide.title):esc(label)}</h1></header>
    <div class="repo-grammar-content">
      ${entry.routeStandalone?'':`<section class="panel"><h2>Your saved sentence</h2><p lang="ja"><strong>${repositoryJapanese(entry)}</strong></p>${entry.english?`<p>${esc(entry.english)}</p>`:''}${entry.explanation?`<h3>Saved sentence explanation</h3><p class="repo-grammar-context">${esc(entry.explanation)}</p>`:''}</section>`}
      ${window.JLHDictionary?.referenceMarkup()||''}
      ${window.JLHNinjal?.panelMarkup(label)||''}
      ${body}
      ${!guide&&repositoryState.grammarGuides.some(x=>x.grammar_key===key)?`<section class="panel"><h2>Choose the intended meaning</h2><p>This sentence has no saved meaning link. These guides share its grammar label; choose one to read, or re-import the sentence with its grammar explanation to save an exact link.</p>${repositoryState.grammarGuides.filter(x=>x.grammar_key===key).map(x=>`<button type="button" class="repo-link" data-repo-guide="${esc(x.id)}">${esc(x.content.meaning)} · ${esc(x.sense)}</button>`).join('')}</section>`:''}
      ${!repositoryState.grammarLibraryReady?'<p class="subtitle">Saved grammar library unavailable. Apply the separate grammar migration if needed, then reload.</p>':''}
      ${lessons.length?`<section class="panel"><h2>Textbook connection</h2>${lessons.map(row=>`<button type="button" class="repo-link" data-repo-grammar-lesson="${row.lesson}" data-repo-grammar-index="${row.index}">Lesson ${row.lesson} · Grammar ${row.index}: ${esc(row.label)}</button>`).join('')}</section>`:''}
    </div>
  </section>`;
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
    <div class="repo-page-head"><div><div class="eyebrow">Personal Japanese knowledge</div><h1>Japanese Repository</h1><p>Keep the Japanese you encounter, attempt and actually want to use.</p></div><div class="repo-head-actions">${repositoryFuriganaToggle()}<button class="smallbtn migaku-btn" id="repoAnkiBulk" ${entries.length?'':'disabled'}>Export filtered Anki</button><button class="smallbtn" id="repoMigakuBulk" ${entries.length?'':'disabled'}>Export filtered TSV</button><button class="smallbtn" id="repoImport">Import JSON</button><button class="smallbtn primary" id="repoAdd">＋ Capture</button></div></div>
    <section class="repo-stats">${counts.map(([status,count])=>`<button type="button" data-repo-status-jump="${status}"><strong>${count}</strong><span>${repositoryStatusLabel(status)}</span></button>`).join('')}</section>
    <section class="repo-toolbar panel"><label class="repo-search"><span>Search</span><input id="repoSearch" type="search" value="${esc(repositoryState.query)}" placeholder="Japanese, English, grammar, tags or notes…"></label><label><span>Type</span><select id="repoKind"><option value="all">All</option><option value="sentence" ${repositoryState.kind==='sentence'?'selected':''}>Sentences</option><option value="correction" ${repositoryState.kind==='correction'?'selected':''}>Corrections</option></select></label><label><span>Status</span><select id="repoStatus"><option value="all">All</option>${REPOSITORY_STATUSES.map(x=>`<option value="${x}" ${repositoryState.status===x?'selected':''}>${repositoryStatusLabel(x)}</option>`).join('')}</select></label><label><span>Register</span><select id="repoRegister"><option value="all">All</option>${REPOSITORY_REGISTERS.map(x=>`<option value="${x}" ${repositoryState.register===x?'selected':''}>${x[0].toUpperCase()+x.slice(1)}</option>`).join('')}</select></label><label><span>Migaku</span><select id="repoMigakuFilter"><option value="all">All</option><option value="pending" ${repositoryState.migaku==='pending'?'selected':''}>Not added</option><option value="exported" ${repositoryState.migaku==='exported'?'selected':''}>Added</option></select></label></section>
    <section class="repo-content-grid"><div><div class="repo-results-head"><strong>${entries.length} entr${entries.length===1?'y':'ies'}</strong><button type="button" class="textbtn" id="repoClearFilters">Clear filters</button></div><div class="repo-entry-list">${entries.length?entries.map(repositoryCard).join(''):`<div class="empty repo-empty"><strong>No matching sentences.</strong><span>Capture something you encountered, attempted or asked how to say.</span></div>`}</div></div>${repositoryPatternsMarkup()}</section>
  </section>`;
}

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
    <div class="repo-detail-toolbar"><button class="smallbtn" id="repoBack">← Repository</button><div>${repositoryFuriganaToggle()}<button class="smallbtn migaku-btn" id="repoOpenMigaku">Migaku handoff</button><button class="smallbtn" id="repoEdit">Edit</button><button class="smallbtn danger" id="repoDelete">Delete</button></div></div>
    <section class="repo-detail-hero"><div class="repo-entry-top"><span class="repo-kind">${entry.entry_type==='correction'?'Personal correction':'Captured sentence'}</span><span class="repo-status ${entry.status}">${repositoryStatusLabel(entry.status)}</span></div><h1 lang="ja">${entry.japanese?repositoryJapanese(entry):renderRepositoryFurigana(entry.original_japanese_furigana,entry.original_japanese||'Untitled')}</h1>${entry.english?`<p>${esc(entry.english)}</p>`:''}<small>Updated ${repositoryDate(entry.updated_at)}</small></section>
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
  const grammar=repositoryGrammarCatalogue();
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
    ${repositoryField('Grammar links',`<input name="grammar_points" list="repoGrammarList" value="${esc((entry.grammar_points||[]).join(', '))}" placeholder="Comma-separated grammar points"><datalist id="repoGrammarList">${grammar.map(x=>`<option value="${esc(x.label)}">Lesson ${x.lesson}</option>`).join('')}</datalist>`,true)}
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
  const example=JSON.stringify({japanese:'いいと思う。',japanese_furigana:'いいと[思|おも]う。',english:'I think it is good.',grammar_points:['〜と思う'],grammar_explanations:[{label:'〜と思う',sense:'expressing-an-opinion',meaning:'I think that…',formation:['Plain-form clause + と思う'],explanation:'と marks the content of a thought; 思う expresses what the speaker thinks. Nouns and な-adjectives usually take だ before と in affirmative non-past statements.',examples:[{japanese:'いいと思う。',japanese_furigana:'いいと[思|おも]う。',english:'I think it is good.'}]}],register:'casual',tags:['import-test'],source_type:'personal',source_detail:'ChatGPT'},null,2);
  return `<section class="repo-page repo-form-page"><div class="repo-detail-toolbar"><button class="smallbtn" id="repoCancel">← Cancel</button></div><section class="repo-form-head"><div class="eyebrow">Chat capture</div><h1>Import repository entries</h1><p>Paste one JSON object or an array of objects produced from a chat. Preview before saving.</p><p>Keep grammar labels in <code>grammar_points</code>. Add <code>grammar_explanations</code> to create reusable grammar pages. Each explanation needs a stable <code>sense</code> ID to distinguish different meanings. Older JSON still imports without creating guides.</p><p>Readings must be supplied in <code>japanese_furigana</code> using <code>[漢字|かんじ]</code>. Imported grammar guides are labelled AI-generated and unverified.</p></section><section class="panel repo-import"><label><span>JSON</span><textarea id="repoImportJson" spellcheck="false" placeholder="Paste JSON here…">${esc(example)}</textarea></label><div id="repoImportPreview" class="repo-import-preview" role="status" aria-live="polite"></div><div class="repo-form-actions"><button class="smallbtn" id="repoPreviewImport" type="button">Preview</button><button class="smallbtn primary" id="repoRunImport" type="button" disabled>Import entries</button></div></section></section>`;
}

function renderRepository(){
  $('#hero').hidden=true; $('#bottomArea').hidden=true; $('#weekView').hidden=true; $('#mainContent').hidden=false;
  if(repositoryState.loading&&!repositoryState.loaded){ $('#mainContent').innerHTML='<section class="repo-page"><div class="panel repo-loading">Loading your Japanese Repository…</div></section>'; return; }
  if(repositoryState.error&&!repositoryState.loaded){ $('#mainContent').innerHTML=`<section class="repo-page"><div class="panel repo-setup"><h1>Repository setup needed</h1><p>${esc(repositoryState.error)}</p><p>Run <code>migrations/20260830_japanese_repository.sql</code> in the Supabase SQL Editor, then reload.</p><button class="smallbtn" id="repoRetry">Retry</button></div></section>`; $('#repoRetry').onclick=()=>loadRepositoryData(true); return; }
  const selected=repositoryState.entries.find(x=>x.id===repositoryState.selectedId)||repositoryState.routeEntry;
  if(repositoryState.mode==='form') $('#mainContent').innerHTML=repositoryFormMarkup(selected||{});
  else if(repositoryState.mode==='import') $('#mainContent').innerHTML=repositoryImportMarkup();
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
  document.querySelectorAll('[data-repo-grammar-lesson]').forEach(button=>button.onclick=()=>openGuidedLesson(Number(button.dataset.repoGrammarLesson),`b2-l${button.dataset.repoGrammarLesson}-guide-grammar-${button.dataset.repoGrammarIndex}`));
  $('#repoGrammarBack')?.addEventListener('click',closeRepositoryGrammar);
  document.querySelectorAll('[data-repo-guide]').forEach(x=>x.onclick=()=>{repositoryState.grammarGuideId=x.dataset.repoGuide;renderRepository();});
  document.querySelectorAll('[data-repo-entry]').forEach(x=>x.onclick=()=>openRepositoryEntry(x.dataset.repoEntry));
  document.querySelectorAll('[data-repo-lesson]').forEach(x=>x.onclick=()=>{state.lesson=Number(x.dataset.repoLesson);state.view='lesson';render();scrollTo({top:0,behavior:'smooth'});});
  document.querySelectorAll('[data-repo-status-jump]').forEach(x=>x.onclick=()=>{repositoryState.status=x.dataset.repoStatusJump;renderRepository();});
  document.querySelectorAll('[data-repo-pattern]').forEach(x=>x.onclick=()=>{repositoryState.query=x.dataset.repoPattern;repositoryState.kind='correction';renderRepository();});
  $('#repoSearch')?.addEventListener('input',e=>{repositoryState.query=e.target.value;renderRepository();$('#repoSearch')?.focus();});
  $('#repoKind')?.addEventListener('change',e=>{repositoryState.kind=e.target.value;renderRepository();});
  $('#repoStatus')?.addEventListener('change',e=>{repositoryState.status=e.target.value;renderRepository();});
  $('#repoRegister')?.addEventListener('change',e=>{repositoryState.register=e.target.value;renderRepository();});
  $('#repoMigakuFilter')?.addEventListener('change',e=>{repositoryState.migaku=e.target.value;renderRepository();});
  $('#repoClearFilters')?.addEventListener('click',()=>{repositoryState.query='';repositoryState.kind='all';repositoryState.status='all';repositoryState.register='all';repositoryState.migaku='all';renderRepository();});
  $('#repoMigakuBulk')?.addEventListener('click',()=>downloadRepositoryTsv(filteredRepositoryEntries()));
  $('#repoAnkiBulk')?.addEventListener('click',e=>downloadRepositoryAnki(filteredRepositoryEntries(),e.currentTarget));
  $('#repoAdd')?.addEventListener('click',()=>{repositoryState.selectedId=null;repositoryState.mode='form';renderRepository();});
  $('#repoImport')?.addEventListener('click',()=>{repositoryState.mode='import';renderRepository();});
  const back=()=>{repositoryState.mode='browse';repositoryState.selectedId=null;renderRepository();};
  $('#repoBack')?.addEventListener('click',back); $('#repoCancel')?.addEventListener('click',back); $('#repoCancelBottom')?.addEventListener('click',back);
  $('#repoEdit')?.addEventListener('click',()=>{repositoryState.mode='form';renderRepository();});
  $('#repoDelete')?.addEventListener('click',()=>deleteRepositoryEntry(selected));
  $('#repoOpenMigaku')?.addEventListener('click',()=>{const panel=$('#repoMigakuPanel');if(panel){panel.open=true;panel.scrollIntoView({behavior:'smooth',block:'center'});}});
  $('#repoCopyJapanese')?.addEventListener('click',()=>copyRepositoryText(selected?.japanese||selected?.original_japanese||'','Japanese copied'));
  $('#repoCopyMigaku')?.addEventListener('click',()=>copyRepositoryText(repositoryMigakuCopyText(selected),'Migaku fields copied'));
  $('#repoDownloadMigaku')?.addEventListener('click',()=>downloadRepositoryTsv(selected?[selected]:[],`learning-hub-${selected?.id||'sentence'}-migaku.tsv`));
  $('#repoDownloadAnki')?.addEventListener('click',e=>downloadRepositoryAnki(selected?[selected]:[],e.currentTarget));
  $('#repoMarkMigaku')?.addEventListener('click',()=>markRepositoryMigaku(selected,!selected?.migaku_exported_at));
  $('#repoFuriganaToggle')?.addEventListener('click',()=>{
    repositoryState.showFurigana=!repositoryState.showFurigana;
    localStorage.setItem('repositoryShowFurigana',String(repositoryState.showFurigana));
    renderRepository();
  });
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
    pendingRepositoryImport=[]; repositoryImportSnapshot='';
    $('#repoRunImport').disabled=true;
    $('#repoImportPreview').textContent='JSON changed. Preview again before importing.';
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
    english:String(row.english||''), explanation:String(row.explanation||''), grammar_points:repositoryArray(row.grammar_points), tags:repositoryArray(row.tags),
    lesson_number:(Number(row.lesson_number)>=11&&Number(row.lesson_number)<=20)?Number(row.lesson_number):null,
    book_id:row.book_id||null, register:REPOSITORY_REGISTERS.includes(row.register)?row.register:'neutral', source_type:row.source_type||'personal',
    source_detail:String(row.source_detail||'ChatGPT import'), error_types:repositoryArray(row.error_types).filter(x=>REPOSITORY_ERROR_TYPES.includes(x)), notes:String(row.notes||'')
  })).filter(row=>row.japanese);
}

let pendingRepositoryImport=[];
let repositoryImportSnapshot='';
let repositoryImportRunning=false;

function repositoryCanonical(value){
  if(Array.isArray(value)) return '['+value.map(repositoryCanonical).join(',')+']';
  if(value&&typeof value==='object') return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+repositoryCanonical(value[k])).join(',')+'}';
  return JSON.stringify(value);
}

function repositoryValidateGuide(raw,entry){
  const fail=message=>{throw new Error(`Grammar explanation: ${message}`);};
  if(!raw||typeof raw!=='object'||Array.isArray(raw)) fail('expected an object.');
  const allowed=['label','sense','meaning','formation','explanation','examples'];
  if(Object.keys(raw).some(k=>!allowed.includes(k))) fail('unknown field; use label, sense, meaning, formation, explanation and examples.');
  for(const k of ['label','sense','meaning','explanation']) if(typeof raw[k]!=='string'||!raw[k].trim()) fail(`${k} is required.`);
  if(!repositoryGrammarKey(raw.label)) fail('label must contain a grammar pattern.');
  if(!entry.grammar_points.includes(raw.label)) fail(`${raw.label} must also appear exactly in grammar_points.`);
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(raw.sense)||raw.sense.length>100) fail('sense must be a stable lowercase meaning ID, such as expressing-an-opinion.');
  if(!Array.isArray(raw.formation)||!raw.formation.length||raw.formation.some(x=>typeof x!=='string'||!x.trim())) fail('formation must be a non-empty array of strings.');
  if(!Array.isArray(raw.examples)||!raw.examples.length) fail('at least one example is required.');
  const examples=raw.examples.map(x=>{
    if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).some(k=>!['japanese','japanese_furigana','english'].includes(k))) fail('invalid example fields.');
    for(const k of ['japanese','english']) if(typeof x[k]!=='string'||!x[k].trim()) fail(`example ${k} is required.`);
    if(x.japanese_furigana!==undefined&&typeof x.japanese_furigana!=='string') fail('example furigana must be a string.');
    if(!repositoryFuriganaMatches(x.japanese,x.japanese_furigana)) fail(`example furigana does not match: ${x.japanese}`);
    return {japanese:x.japanese,japanese_furigana:x.japanese_furigana||'',english:x.english};
  });
  return {label:raw.label,sense:raw.sense,content:{meaning:raw.meaning,formation:raw.formation,explanation:raw.explanation,examples}};
}

function repositoryPlanImport(raw){
  const rows=Array.isArray(raw)?raw:[raw],warnings=[],conflicts=[],seen=new Map();
  if(!rows.length||rows.length>100) throw new Error('Import between 1 and 100 entries at a time.');
  const items=rows.map((row,index)=>{
    if(!row||typeof row!=='object'||Array.isArray(row)||typeof row.japanese!=='string'||!row.japanese.trim()) throw new Error(`Entry ${index+1}: a Japanese sentence is required.`);
    const entry=normaliseRepositoryImport(row)[0];
    const unknown=Object.keys(row).filter(k=>!Object.hasOwn(entry,k)&&k!=='grammar_explanations');
    if(unknown.length) warnings.push(`Entry ${index+1}: ignored fields ${unknown.join(', ')}. Use grammar_points, source_type and source_detail (not grammar or source).`);
    if(!repositoryFuriganaMatches(entry.japanese,entry.japanese_furigana)||!repositoryFuriganaMatches(entry.original_japanese,entry.original_japanese_furigana)) throw new Error(`Furigana does not match the plain Japanese: ${entry.japanese}`);
    if(!entry.japanese_furigana) warnings.push(`Entry ${index+1}: no japanese_furigana supplied. The app does not generate readings.`);
    if(row.grammar_explanations!==undefined&&!Array.isArray(row.grammar_explanations)) throw new Error('grammar_explanations must be an array.');
    const guides=(row.grammar_explanations||[]).map(x=>repositoryValidateGuide(x,entry));
    if(new Set(guides.map(x=>x.label)).size!==guides.length) throw new Error('Supply only one explanation per grammar label in each entry.');
    for(const label of entry.grammar_points) if(!guides.some(x=>x.label===label)) warnings.push(`Entry ${index+1}: ${label} has no imported explanation or saved meaning link.`);
    for(const guide of guides){
      const key=repositoryGrammarKey(guide.label)+'\u001f'+guide.sense;
      const saved=repositoryState.grammarGuides.find(x=>x.grammar_key===repositoryGrammarKey(guide.label)&&x.sense===guide.sense);
      const existing=saved||seen.get(key);
      if(existing){
        if(repositoryCanonical(existing.content)!==repositoryCanonical(guide.content)){
          guide.conflict=conflicts.length;
          conflicts.push({guide,existing,saved:!!saved});
        }else guide.reused=true;
      }
      // Later entries always compare against the content that will actually be kept.
      seen.set(key,existing||guide);
      if(guide.content.examples.some(x=>!x.japanese_furigana)) warnings.push(`${guide.label}: an example has no furigana.`);
    }
    return {entry,guides};
  });
  return {items,warnings,conflicts};
}

function previewRepositoryImport(){
  if(repositoryImportRunning) return;
  try{
    repositoryImportSnapshot=$('#repoImportJson').value;
    if(new TextEncoder().encode(repositoryImportSnapshot).length>2097152) throw new Error('Import at most 2 MB at a time.');
    const plan=repositoryPlanImport(JSON.parse(repositoryImportSnapshot));
    if(plan.items.some(x=>x.guides.length)&&!repositoryState.grammarLibraryReady) throw new Error('The grammar library is unavailable. Apply migrations/20260903_repository_grammar_library.sql, then reload. Nothing has been imported.');
    pendingRepositoryImport=plan.items;
    const guides=plan.items.flatMap(x=>x.guides);
    $('#repoImportPreview').innerHTML=`<strong>${plan.items.length} entries · ${guides.filter(x=>!x.reused&&x.conflict===undefined).length} new guides · ${guides.filter(x=>x.reused).length} reused links · ${plan.conflicts.length} conflicts</strong>${plan.items.slice(0,5).map(x=>`<span lang="ja">${repositoryJapanese(x.entry)}</span>`).join('')}${plan.warnings.map(x=>`<p>${esc(x)}</p>`).join('')}${plan.conflicts.map((x,i)=>`<section class="panel"><h3>${esc(x.guide.label)} · ${esc(x.guide.sense)}</h3><p>This meaning already has different content. It will not be overwritten.</p><details><summary>Compare explanations</summary><h4>${x.saved?'Saved':'First in this import'}</h4><pre>${esc(JSON.stringify(x.existing.content,null,2))}</pre><h4>Incoming</h4><pre>${esc(JSON.stringify(x.guide.content,null,2))}</pre></details><label><input type="checkbox" data-repo-conflict="${i}"> Use the ${x.saved?'saved':'first'} explanation for this sentence</label><p>Otherwise, cancel or correct the JSON. Use a different sense ID only for a genuinely different meaning.</p></section>`).join('')}`;
    document.querySelectorAll('[data-repo-conflict]').forEach(input=>input.addEventListener('change',()=>{
      const conflict=plan.conflicts[Number(input.dataset.repoConflict)];
      if(input.checked) conflict.guide.expected_content=conflict.existing.content;
      else delete conflict.guide.expected_content;
      $('#repoRunImport').disabled=plan.conflicts.some(x=>!x.guide.expected_content);
    }));
    $('#repoRunImport').disabled=!!plan.conflicts.length;
  }catch(error){pendingRepositoryImport=[];repositoryImportSnapshot='';$('#repoImportPreview').innerHTML=`<span class="repo-import-error">${esc(error.message)}</span>`;$('#repoRunImport').disabled=true;}
}

async function runRepositoryImport(){
  if(repositoryImportRunning||!pendingRepositoryImport.length||!state.user) return;
  if($('#repoImportJson')?.value!==repositoryImportSnapshot){toast('Preview the current JSON first.');return;}
  if(pendingRepositoryImport.some(x=>x.guides.some(g=>g.conflict!==undefined&&!g.expected_content))) return;
  const button=$('#repoRunImport'),userId=state.user.id;
  const items=pendingRepositoryImport;
  repositoryImportRunning=true; button.disabled=true;
  const input=$('#repoImportJson'); if(input)input.disabled=true;
  try{
    let entries;
    if(items.some(x=>x.guides.length)){
      const payload=items.map(x=>({entry:x.entry,guides:x.guides.map(({label,sense,content,expected_content})=>({label,sense,content,...(expected_content?{expected_content}:{})}))}));
      const {data,error}=await db.rpc('import_repository_with_grammar',{p_entries:payload});
      if(error) throw error;
      if(state.user?.id!==userId) return;
      entries=data.entries;
      repositoryState.grammarGuides=[...new Map([...repositoryState.grammarGuides,...data.guides].map(x=>[x.id,x])).values()];
      repositoryState.grammarLinks=[...repositoryState.grammarLinks,...data.links];
    }else{
      const {data,error}=await db.from('japanese_repository').insert(items.map(x=>({...x.entry,user_id:userId}))).select();
      if(error) throw error;
      entries=data;
    }
    if(state.user?.id!==userId) return;
    repositoryState.entries=[...entries,...repositoryState.entries];pendingRepositoryImport=[];repositoryImportSnapshot='';repositoryState.mode='browse';renderRepository();toast(`${entries.length} repository entries imported`);
  }catch(error){
    if(state.user?.id===userId) toast(`${error?.message||'Import failed.'} Reload and check your entries before retrying if the connection was interrupted.`);
  }finally{
    repositoryImportRunning=false;
    if(input?.isConnected)input.disabled=false;
    if(button.isConnected)button.disabled=!pendingRepositoryImport.length;
  }
}
