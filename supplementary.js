/* Optional study resources joined to the canonical Grammar Library.
 * Copyrighted files remain private; this module handles metadata and the
 * existing textbook-pdfs signed-link flow only. */
(function(){
  const WORKBOOK_SLUG='multimedia-basic-grammar';
  const GID_SLUG='grammar-in-depth-beginning-japanese';
  const data={
    resources:[],parts:[],units:[],links:[],
    loaded:false,loading:false,error:'',
    query:'',filter:'all',selectedSlug:WORKBOOK_SLUG
  };
  let loadPromise=null;

  const html=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const grammarKey=value=>String(value||'').normalize('NFKC').trim().replace(/^[~〜～]+/u,'').replace(/\s+/gu,'').toLowerCase();
  const resourceBySlug=slug=>data.resources.find(item=>item.slug===slug);
  const resourceById=id=>data.resources.find(item=>item.id===id);
  const workbook=()=>resourceBySlug(WORKBOOK_SLUG);
  const grammarInDepth=()=>resourceBySlug(GID_SLUG);
  const currentResource=()=>resourceBySlug(data.selectedSlug)||workbook()||data.resources[0];
  const unitById=id=>data.units.find(item=>item.id===id);
  const partById=id=>data.parts.find(item=>item.id===id);
  const enrichedUnit=unit=>unit?{...unit,resource:resourceById(unit.resource_id),part:partById(unit.resource_part_id)}:null;
  const practicesForGrammar=id=>data.links
    .filter(link=>link.grammar_id===id)
    .map(link=>({link,unit:enrichedUnit(unitById(link.supplementary_unit_id))}))
    .filter(item=>item.unit);
  const isReference=unit=>unit?.resource?.resource_type==='grammar_reference';

  function selectResource(slug){
    if(slug)data.selectedSlug=slug;
    data.query='';
    data.filter='all';
  }

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
        data.resources=resources.data||[];
        data.parts=parts.data||[];
        data.units=units.data||[];
        data.links=links.data||[];
        if(!resourceBySlug(data.selectedSlug))data.selectedSlug=resourceBySlug(WORKBOOK_SLUG)?WORKBOOK_SLUG:(data.resources[0]?.slug||WORKBOOK_SLUG);
        data.loaded=true;
      }catch(error){
        data.error=error?.message||'Supplementary resources are unavailable.';
        data.resources=[];data.parts=[];data.units=[];data.links=[];data.loaded=false;
      }finally{data.loading=false;loadPromise=null;}
      return data;
    })();
    return loadPromise;
  }

  function reset(){
    data.resources=[];data.parts=[];data.units=[];data.links=[];
    data.loaded=false;data.loading=false;data.error='';data.query='';data.filter='all';
    data.selectedSlug=WORKBOOK_SLUG;
  }

  function practiceGroup(title,items){
    if(!items.length)return '';
    return `<div class="supplementary-practice-group"><h3>${html(title)}</h3>${items.map(({link,unit})=>`<article class="supplementary-practice-row compact-card"><div><strong>${html(unit.resource?.english_title||unit.resource?.title)}</strong><span>Unit ${unit.unit_number} · ${html(unit.source_heading)} · p.${unit.printed_page}</span>${link.note?`<small>${html(link.note)}</small>`:''}</div><button type="button" class="resource-action" data-supplementary-unit="${html(unit.id)}"><i class="fa-solid fa-book-open" aria-hidden="true"></i> Open practice</button></article>`).join('')}</div>`;
  }

  function referenceRows(items){
    if(!items.length)return '';
    return `<section class="panel repo-further-study supplementary-grammar-reference"><div class="eyebrow">Tobira reference</div><h2><span class="repo-guide-heading-icon" aria-hidden="true"><i class="fa-solid fa-book-open"></i></span>Grammar in Depth</h2><div class="grammar-source-list">${items.map(({link,unit})=>`<article class="resource-row"><div class="resource-row-copy"><strong>${html(unit.resource?.title||'Grammar in Depth')}</strong><span>${html(unit.source_heading)} · p.${unit.printed_page}</span>${link.note?`<small>${html(link.note)}</small>`:''}</div><button type="button" class="resource-action resource-action-secondary" data-supplementary-unit="${html(unit.id)}"><i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i> Open reference</button></article>`).join('')}</div></section>`;
  }

  function grammarMarkup(grammarId){
    const items=practicesForGrammar(grammarId);
    if(!items.length)return '';
    const practiceItems=items.filter(item=>!isReference(item.unit));
    const references=items.filter(item=>isReference(item.unit));
    const exact=practiceItems.filter(item=>item.link.relationship!=='related');
    const related=practiceItems.filter(item=>item.link.relationship==='related');
    const practice=(exact.length||related.length)
      ?`<section class="panel supplementary-grammar-practice"><div class="eyebrow">Optional practice</div><h2><span class="repo-guide-heading-icon" aria-hidden="true"><i class="fa-solid fa-book-open-reader"></i></span>Practice</h2>${practiceGroup('Multimedia Basic Grammar Workbook',exact)}${practiceGroup('Related basic practice',related)}</section>`
      :'';
    return practice+referenceRows(references);
  }

  function lessonMarkup(canonical,guides){
    const canonicals=Array.isArray(canonical)?canonical:[canonical];
    const matchedGuides=canonicals.map(label=>(guides||[]).find(item=>grammarKey(item.pattern)===grammarKey(label))).filter(Boolean);
    const seen=new Set();
    const items=matchedGuides.flatMap(guide=>practicesForGrammar(guide.id)).filter(({link,unit})=>{
      const key=`${unit.id}:${link.relationship}`;
      if(seen.has(key))return false;
      seen.add(key);return true;
    });
    if(!items.length)return '';
    return `<div class="guide-workspace-section guide-supplementary-practice"><strong>Grammar support</strong><div class="guide-actions">${items.map(({link,unit})=>{
      if(isReference(unit)){
        return `<button type="button" class="secondary-action" data-supplementary-unit="${html(unit.id)}"><i class="fa-solid fa-book-open" aria-hidden="true"></i> Grammar in Depth · p.${unit.printed_page}</button>`;
      }
      return `<button type="button" class="${link.relationship==='related'?'secondary-action':'resource-action'}" data-supplementary-unit="${html(unit.id)}"><i class="fa-solid fa-book-open" aria-hidden="true"></i> ${link.relationship==='related'?'Related basic practice':'Practice'} · Unit ${unit.unit_number}</button>`;
    }).join('')}</div></div>`;
  }

  function browserMarkup(){
    const resource=currentResource();
    if(data.loading&&!data.loaded)return '<section class="panel supplementary-empty">Loading supplementary resources…</section>';
    if(data.error)return `<section class="panel supplementary-empty"><h2>Supplementary resources unavailable</h2><p>${html(data.error)}</p><p class="subtitle">Apply the supplementary-resource migration, then reload.</p></section>`;
    if(!resource)return '<section class="panel supplementary-empty"><h2>Resource metadata unavailable</h2><p>Apply the supplementary-resource migration, then reload.</p></section>';

    const reference=resource.resource_type==='grammar_reference';
    const linkedIds=new Set(data.links.map(link=>link.supplementary_unit_id));
    const query=data.query.trim().toLowerCase();
    const allUnits=data.units.filter(unit=>unit.resource_id===resource.id);
    const units=allUnits
      .filter(unit=>data.filter==='linked'?linkedIds.has(unit.id):data.filter==='unlinked'?!linkedIds.has(unit.id):true)
      .filter(unit=>!query||`${unit.unit_number} ${unit.source_heading}`.toLowerCase().includes(query));

    const eyebrow=reference?'TOBIRA I / II grammar reference':'Supplementary grammar practice';
    const countText=reference?`${allUnits.length} mapped reference sections · Part 2 aligns with TOBIRA II`:`${allUnits.length} optional practice units · independent of programme progress`;
    const searchLabel=reference?'Search sections':'Search units';
    const placeholder=reference?'Section or grammar topic':'Unit number or grammar heading';
    const ariaLabel=reference?'Reference filters':'Workbook filters';
    const itemLabel=reference?'Section':'Unit';
    const actionLabel=reference?'Open reference':'Open practice';
    const linkedText=reference?'Linked to the canonical Grammar Library':'Linked to the canonical Grammar Library';
    const unlinkedText=reference?'Reference section · not yet linked to a canonical guide':'Workbook unit · not yet linked to a canonical guide';

    return `<section class="supplementary-page"><header class="app-page-header supplementary-header"><div><button type="button" class="app-page-breadcrumb" id="supplementaryBack">← Learning Hub</button><div class="eyebrow">${eyebrow}</div><h1 lang="ja">${html(resource.title)}</h1>${resource.english_title&&resource.english_title!==resource.title?`<p>${html(resource.english_title)}</p>`:''}<small>${countText}</small></div></header><section class="panel supplementary-controls"><label><span>${searchLabel}</span><input id="supplementarySearch" type="search" value="${html(data.query)}" placeholder="${placeholder}"></label><div class="supplementary-filters" role="group" aria-label="${ariaLabel}">${[['all','All'],['linked','Linked to Grammar Library'],['unlinked','Unlinked']].map(([value,label])=>`<button type="button" class="smallbtn ${data.filter===value?'primary':''}" data-supplementary-filter="${value}">${label}</button>`).join('')}</div></section><div class="supplementary-unit-list">${units.length?units.map(unit=>`<article class="supplementary-unit"><div><span>${itemLabel} ${unit.unit_number} · p.${unit.printed_page}</span><h2 lang="ja">${html(unit.source_heading)}</h2><small>${linkedIds.has(unit.id)?linkedText:unlinkedText}</small></div><div class="supplementary-unit-actions"><button type="button" class="resource-action" data-supplementary-unit="${html(unit.id)}"><i class="fa-solid fa-book-open" aria-hidden="true"></i> ${actionLabel}</button>${data.links.filter(link=>link.supplementary_unit_id===unit.id).map(link=>`<button type="button" class="secondary-action" data-supplementary-guide="${html(link.grammar_id)}">Grammar guide</button>`).join('')}</div></article>`).join(''):`<div class="empty panel">No ${reference?'reference sections':'workbook units'} match this filter.</div>`}</div></section>`;
  }

  function hubCard(resource){
    const count=data.units.filter(unit=>unit.resource_id===resource.id).length;
    const reference=resource.resource_type==='grammar_reference';
    return `<article class="resource-card supplementary-resource-card"><div class="book-card-top"><span class="resource-type">${reference?'Grammar reference':'Grammar workbook'}</span><span class="book-status available">${reference?'TOBIRA II':'Optional'}</span></div><h3 lang="ja">${html(resource.title)}</h3>${resource.english_title&&resource.english_title!==resource.title?`<p>${html(resource.english_title)}</p>`:`<p>${html(resource.description||'')}</p>`}<div class="book-meta"><span>${count} ${reference?'mapped reference sections':'standalone grammar practice units'}</span><span>Private supplementary resource</span></div><button type="button" class="secondary-action" data-open-supplementary="${html(resource.slug)}"><i class="fa-solid fa-book-open" aria-hidden="true"></i> ${reference?'Browse reference':'Browse exercises'}</button></article>`;
  }

  function hubCardMarkup(){
    return [workbook(),grammarInDepth()].filter(Boolean).map(hubCard).join('');
  }

  function reserveTab(label){
    if(typeof window.reserveTextbookPdfTab==='function')return window.reserveTextbookPdfTab(label);
    const tab=window.open('about:blank','_blank');
    if(!tab)return null;
    try{tab.opener=null;tab.document.title=label;tab.document.body.textContent='Preparing private PDF…';}catch(error){}
    return tab;
  }

  async function openPractice(unitId,db,user,message){
    const unit=enrichedUnit(unitById(unitId));
    const reference=isReference(unit);
    if(!unit?.part){message?.(`This ${reference?'reference section':'workbook unit'} is not mapped to a PDF.`);return;}
    const tab=reserveTab(reference?`Grammar in Depth · p.${unit.printed_page}`:`Workbook Unit ${unit.unit_number}`);
    try{
      if(!db||!user)throw new Error(`Sign in to open the private ${reference?'reference':'workbook practice'}.`);
      if(typeof window.signedTextbookPdfUrl!=='function')throw new Error('The private PDF service is unavailable.');
      const url=await window.signedTextbookPdfUrl({path:unit.part.storage_path});
      const target=`${url}#page=${unit.local_pdf_page}&zoom=page-width`;
      if(tab&&!tab.closed){tab.location.replace(target);return;}
      message?.(`Your browser blocked the new ${reference?'reference':'practice'} tab. Allow pop-ups for the Learning Hub and try again.`);
    }catch(error){
      try{tab?.close();}catch(closeError){}
      message?.(error?.message||`Unable to open private ${reference?'reference':'workbook practice'}.`);
    }
  }

  function bind(root,options={}){
    root?.querySelectorAll('[data-supplementary-unit]').forEach(button=>button.onclick=()=>openPractice(button.dataset.supplementaryUnit,options.db,options.user,options.message));
    root?.querySelectorAll('[data-supplementary-guide]').forEach(button=>button.onclick=()=>options.openGuide?.(button.dataset.supplementaryGuide));
    root?.querySelectorAll('[data-supplementary-filter]').forEach(button=>button.onclick=()=>{data.filter=button.dataset.supplementaryFilter;options.rerender?.();});
    const search=root?.querySelector('#supplementarySearch');
    if(search)search.oninput=event=>{
      data.query=event.target.value;
      options.rerender?.();
      requestAnimationFrame(()=>{
        const restored=document.querySelector('#supplementarySearch');
        restored?.focus();
        restored?.setSelectionRange(data.query.length,data.query.length);
      });
    };
  }

  /* The main app already owns navigation for data-open-supplementary.
   * Capture the requested slug before that click handler switches views. */
  document.addEventListener('click',event=>{
    const button=event.target?.closest?.('[data-open-supplementary]');
    if(button?.dataset?.openSupplementary)selectResource(button.dataset.openSupplementary);
  },true);

  /* Grammar-guide pages render supplementary rows outside the lesson/browser
   * bind cycle. Handle only otherwise-unbound unit buttons here. */
  document.addEventListener('click',event=>{
    const button=event.target?.closest?.('[data-supplementary-unit]');
    if(!button||button.onclick)return;
    const appDb=typeof db!=='undefined'?db:null;
    const appUser=typeof state!=='undefined'?state.user:null;
    const message=typeof toast==='function'?toast:undefined;
    openPractice(button.dataset.supplementaryUnit,appDb,appUser,message);
  });

  window.JLHSupplementary={
    data,slug:WORKBOOK_SLUG,grammarInDepthSlug:GID_SLUG,
    load,reset,selectResource,grammarMarkup,lessonMarkup,browserMarkup,
    hubCardMarkup,bind,openPractice,practicesForGrammar,grammarKey
  };
})();
