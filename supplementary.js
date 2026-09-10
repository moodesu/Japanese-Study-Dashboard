/* Optional study resources joined to the canonical Grammar Library.
 * Copyrighted files remain private; this module handles metadata and the
 * existing textbook-pdfs signed-link flow only. */
(function(){
  const WORKBOOK_SLUG='multimedia-basic-grammar';
  const data={resources:[],parts:[],units:[],links:[],loaded:false,loading:false,error:'',query:'',filter:'all'};
  let loadPromise=null;

  const html=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const grammarKey=value=>String(value||'').normalize('NFKC').trim().replace(/^[~〜～]+/u,'').replace(/\s+/gu,'').toLowerCase();
  const workbook=()=>data.resources.find(item=>item.slug===WORKBOOK_SLUG);
  const unitById=id=>data.units.find(item=>item.id===id);
  const partById=id=>data.parts.find(item=>item.id===id);
  const enrichedUnit=unit=>unit?{...unit,resource:workbook(),part:partById(unit.resource_part_id)}:null;
  const practicesForGrammar=id=>data.links.filter(link=>link.grammar_id===id).map(link=>({link,unit:enrichedUnit(unitById(link.supplementary_unit_id))})).filter(item=>item.unit);

  function load(db,user,force=false){
    if(!db||!user||(data.loaded&&!force))return Promise.resolve(data);
    if(data.loading)return loadPromise||Promise.resolve(data);
    data.loading=true;data.error='';
    loadPromise=(async()=>{
      try{
        const [resources,parts,units,links]=await Promise.all([
          db.from('supplementary_resources').select('*').eq('user_id',user.id).order('title'),
          db.from('supplementary_resource_parts').select('*').order('sort_order'),
          db.from('supplementary_units').select('*').order('sort_order'),
          db.from('grammar_supplementary_links').select('*').eq('user_id',user.id)
        ]);
        const failed=[resources,parts,units,links].find(result=>result.error);
        if(failed)throw failed.error;
        data.resources=resources.data||[];data.parts=parts.data||[];data.units=units.data||[];data.links=links.data||[];data.loaded=true;
      }catch(error){
        data.error=error?.message||'Supplementary resources are unavailable.';
        data.resources=[];data.parts=[];data.units=[];data.links=[];data.loaded=false;
      }finally{data.loading=false;loadPromise=null;}
      return data;
    })();
    return loadPromise;
  }

  function reset(){data.resources=[];data.parts=[];data.units=[];data.links=[];data.loaded=false;data.loading=false;data.error='';}

  function grammarMarkup(grammarId){
    const practices=practicesForGrammar(grammarId);
    if(!practices.length)return '';
    const exact=practices.filter(item=>item.link.relationship!=='related'),related=practices.filter(item=>item.link.relationship==='related');
    const group=(title,items)=>items.length?`<div class="supplementary-practice-group"><h3>${html(title)}</h3>${items.map(({link,unit})=>`<article class="supplementary-practice-row compact-card"><div><strong>${html(unit.resource?.english_title||unit.resource?.title)}</strong><span>Unit ${unit.unit_number} · ${html(unit.source_heading)} · p.${unit.printed_page}</span>${link.note?`<small>${html(link.note)}</small>`:''}</div><button type="button" class="resource-action" data-supplementary-unit="${html(unit.id)}"><i class="fa-solid fa-book-open" aria-hidden="true"></i> Open practice</button></article>`).join('')}</div>`:'';
    return `<section class="panel supplementary-grammar-practice"><div class="eyebrow">Optional practice</div><h2><span class="repo-guide-heading-icon" aria-hidden="true"><i class="fa-solid fa-book-open-reader"></i></span>Practice</h2>${group('Multimedia Basic Grammar Workbook',exact)}${group('Related basic practice',related)}</section>`;
  }

  function lessonMarkup(canonical,guides){
    const canonicals=Array.isArray(canonical)?canonical:[canonical];
    const matchedGuides=canonicals.map(label=>(guides||[]).find(item=>grammarKey(item.pattern)===grammarKey(label))).filter(Boolean);
    const seen=new Set();
    const practices=matchedGuides.flatMap(guide=>practicesForGrammar(guide.id)).filter(({link,unit})=>{
      const key=`${unit.id}:${link.relationship}`;
      if(seen.has(key))return false;
      seen.add(key);return true;
    });
    if(!practices.length)return '';
    return `<div class="guide-workspace-section guide-supplementary-practice"><strong>Optional grammar practice</strong><div class="guide-actions">${practices.map(({link,unit})=>`<button type="button" class="${link.relationship==='related'?'secondary-action':'resource-action'}" data-supplementary-unit="${html(unit.id)}"><i class="fa-solid fa-book-open" aria-hidden="true"></i> ${link.relationship==='related'?'Related basic practice':'Practice'} · Unit ${unit.unit_number}</button>`).join('')}</div></div>`;
  }

  function browserMarkup(){
    const resource=workbook();
    if(data.loading&&!data.loaded)return '<section class="panel supplementary-empty">Loading supplementary resources…</section>';
    if(data.error)return `<section class="panel supplementary-empty"><h2>Supplementary resources unavailable</h2><p>${html(data.error)}</p><p class="subtitle">Apply the separate supplementary-resource migration, then reload.</p></section>`;
    if(!resource)return '<section class="panel supplementary-empty"><h2>Workbook metadata unavailable</h2><p>Apply the supplementary-resource migration, then reload.</p></section>';
    const linkedIds=new Set(data.links.map(link=>link.supplementary_unit_id));
    const query=data.query.trim().toLowerCase();
    const units=data.units.filter(unit=>unit.resource_id===resource.id).filter(unit=>data.filter==='linked'?linkedIds.has(unit.id):data.filter==='unlinked'?!linkedIds.has(unit.id):true).filter(unit=>!query||`${unit.unit_number} ${unit.source_heading}`.toLowerCase().includes(query));
    return `<section class="supplementary-page"><header class="app-page-header supplementary-header"><div><button type="button" class="app-page-breadcrumb" id="supplementaryBack">← Learning Hub</button><div class="eyebrow">Supplementary grammar practice</div><h1 lang="ja">${html(resource.title)}</h1><p>${html(resource.english_title)}</p><small>${data.units.filter(unit=>unit.resource_id===resource.id).length} optional practice units · independent of programme progress</small></div></header><section class="panel supplementary-controls"><label><span>Search units</span><input id="supplementarySearch" type="search" value="${html(data.query)}" placeholder="Unit number or grammar heading"></label><div class="supplementary-filters" role="group" aria-label="Workbook filters">${[['all','All'],['linked','Linked to Grammar Library'],['unlinked','Unlinked']].map(([value,label])=>`<button type="button" class="smallbtn ${data.filter===value?'primary':''}" data-supplementary-filter="${value}">${label}</button>`).join('')}</div></section><div class="supplementary-unit-list">${units.length?units.map(unit=>`<article class="supplementary-unit"><div><span>Unit ${unit.unit_number} · p.${unit.printed_page}</span><h2 lang="ja">${html(unit.source_heading)}</h2>${linkedIds.has(unit.id)?'<small>Linked to the canonical Grammar Library</small>':'<small>Workbook unit · not yet linked to a canonical guide</small>'}</div><div class="supplementary-unit-actions"><button type="button" class="resource-action" data-supplementary-unit="${html(unit.id)}"><i class="fa-solid fa-book-open" aria-hidden="true"></i> Open practice</button>${data.links.filter(link=>link.supplementary_unit_id===unit.id).map(link=>`<button type="button" class="secondary-action" data-supplementary-guide="${html(link.grammar_id)}">Grammar guide</button>`).join('')}</div></article>`).join(''):'<div class="empty panel">No workbook units match this filter.</div>'}</div></section>`;
  }

  function hubCardMarkup(){
    const resource=workbook();
    if(!resource)return '';
    const count=data.units.filter(unit=>unit.resource_id===resource.id).length;
    return `<article class="resource-card supplementary-resource-card"><div class="book-card-top"><span class="resource-type">Grammar workbook</span><span class="book-status available">Optional</span></div><h3 lang="ja">${html(resource.title)}</h3><p>${html(resource.english_title)}</p><div class="book-meta"><span>${count} standalone grammar practice units</span><span>Private supplementary resource</span></div><button type="button" class="secondary-action" data-open-supplementary="${WORKBOOK_SLUG}"><i class="fa-solid fa-book-open" aria-hidden="true"></i> Browse exercises</button></article>`;
  }

  function reserveTab(label){
    if(typeof window.reserveTextbookPdfTab==='function')return window.reserveTextbookPdfTab(label);
    const tab=window.open('about:blank','_blank');
    if(!tab)return null;
    try{tab.opener=null;tab.document.title=label;tab.document.body.textContent='Preparing private practice PDF…';}catch(error){}
    return tab;
  }

  async function openPractice(unitId,db,user,message){
    const unit=enrichedUnit(unitById(unitId));
    if(!unit?.part){message?.('This workbook unit is not mapped to a PDF part.');return;}
    const tab=reserveTab(`Workbook Unit ${unit.unit_number}`);
    try{
      if(!db||!user)throw new Error('Sign in to open private workbook practice.');
      if(typeof window.signedTextbookPdfUrl!=='function')throw new Error('The private PDF service is unavailable.');
      const url=await window.signedTextbookPdfUrl({path:unit.part.storage_path});
      const target=`${url}#page=${unit.local_pdf_page}&zoom=page-width`;
      if(tab&&!tab.closed){tab.location.replace(target);return;}
      message?.('Your browser blocked the new practice tab. Allow pop-ups for the Learning Hub and try again.');
    }catch(error){try{tab?.close();}catch(closeError){}message?.(error?.message||'Unable to open private workbook practice.');}
  }

  function bind(root,options={}){
    root?.querySelectorAll('[data-supplementary-unit]').forEach(button=>button.onclick=()=>openPractice(button.dataset.supplementaryUnit,options.db,options.user,options.message));
    root?.querySelectorAll('[data-supplementary-guide]').forEach(button=>button.onclick=()=>options.openGuide?.(button.dataset.supplementaryGuide));
    root?.querySelectorAll('[data-supplementary-filter]').forEach(button=>button.onclick=()=>{data.filter=button.dataset.supplementaryFilter;options.rerender?.();});
    const search=root?.querySelector('#supplementarySearch');if(search)search.oninput=event=>{data.query=event.target.value;options.rerender?.();requestAnimationFrame(()=>{const restored=document.querySelector('#supplementarySearch');restored?.focus();restored?.setSelectionRange(data.query.length,data.query.length);});};
  }

  window.JLHSupplementary={data,slug:WORKBOOK_SLUG,load,reset,grammarMarkup,lessonMarkup,browserMarkup,hubCardMarkup,bind,openPractice,practicesForGrammar,grammarKey};
})();
