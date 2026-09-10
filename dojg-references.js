/* Direct DOJG references on canonical Grammar Guide pages.
 * Uses the reviewed grammar_dictionary_references bridge created in Phase 2.
 * Dictionary content remains private in Supabase; this module loads only the
 * small reference metadata required for the currently open grammar guide. */
window.JLHDOJGReferences=(()=>{
  const cache=new Map();
  const pending=new Map();
  const volumeOrder={Basic:0,Intermediate:1,Advanced:2};
  const volumeTitle={
    Basic:'A Dictionary of Basic Japanese Grammar',
    Intermediate:'A Dictionary of Intermediate Japanese Grammar',
    Advanced:'A Dictionary of Advanced Japanese Grammar'
  };
  let renderQueued=false;

  const html=value=>String(value??'').replace(/[&<>"']/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));

  function currentGuide(){
    if(typeof repositoryState==='undefined')return null;
    if(repositoryState.grammarGuideId){
      const exact=repositoryState.grammarGuides.find(row=>row.id===repositoryState.grammarGuideId);
      if(exact)return exact;
    }
    if(typeof repositoryGrammarKey!=='function')return null;
    const key=repositoryGrammarKey(repositoryState.grammarLabel);
    return repositoryState.grammarGuides.find(row=>repositoryGrammarKey(row.pattern)===key)||null;
  }

  function currentContext(){
    return repositoryState.entries.find(row=>row.id===repositoryState.selectedId)
      ||repositoryState.routeEntry
      ||null;
  }

  async function referencesForGuide(guideId){
    if(cache.has(guideId))return cache.get(guideId);
    if(pending.has(guideId))return pending.get(guideId);

    const request=(async()=>{
      if(typeof db==='undefined'||typeof state==='undefined'||!db||!state.user)return [];
      const userId=state.user.id;
      const {data:links,error:linkError}=await db
        .from('grammar_dictionary_references')
        .select('dictionary_entry_id,relationship,source_volume')
        .eq('user_id',userId)
        .eq('grammar_id',guideId);
      if(linkError)throw linkError;
      if(!links?.length)return [];

      const ids=[...new Set(links.map(row=>row.dictionary_entry_id).filter(Boolean))];
      const {data:entries,error:entryError}=await db
        .from('japanese_dictionary_entries')
        .select('id,headword,volume,summary')
        .eq('user_id',userId)
        .in('id',ids);
      if(entryError)throw entryError;

      const entryById=new Map((entries||[]).map(row=>[row.id,row]));
      return links
        .map(link=>({link,entry:entryById.get(link.dictionary_entry_id)}))
        .filter(row=>row.entry)
        .sort((a,b)=>
          (volumeOrder[a.link.source_volume]??9)-(volumeOrder[b.link.source_volume]??9)
          ||String(a.entry.headword).localeCompare(String(b.entry.headword),'ja')
        );
    })();

    pending.set(guideId,request);
    try{
      const rows=await request;
      cache.set(guideId,rows);
      return rows;
    }finally{
      pending.delete(guideId);
    }
  }

  function genericDictionaryRow(container){
    return Array.from(container.querySelectorAll('.grammar-source-row')).find(row=>
      row.querySelector('strong')?.textContent?.trim()==='A Dictionary of Japanese Grammar'
    )||null;
  }

  function relationshipLabel(value){
    return value==='expanded'?'Expanded reference':value==='related'?'Related reference':'Primary reference';
  }

  function rowMarkup({link,entry}){
    const volume=link.source_volume||entry.volume||'';
    const title=volumeTitle[volume]||'A Dictionary of Japanese Grammar';
    const detail=[volume,entry.headword,relationshipLabel(link.relationship)].filter(Boolean).join(' · ');
    return `<div class="resource-row grammar-source-row dojg-direct-reference" data-dojg-reference-row data-dojg-entry="${html(entry.id)}"><div class="resource-row-copy"><strong>${html(title)}</strong><span>${html(detail)}</span></div><button type="button" class="resource-action resource-action-secondary" data-dojg-open="${html(entry.id)}">Open reference ↗</button></div>`;
  }

  async function render(){
    renderQueued=false;
    if(typeof state==='undefined'||state.view!=='repository'||typeof repositoryState==='undefined'||repositoryState.mode!=='grammar')return;
    const guide=currentGuide();
    if(!guide)return;
    const container=document.querySelector('.repo-further-study .grammar-source-list');
    if(!container)return;

    const guideId=guide.id;
    let rows;
    try{
      rows=await referencesForGuide(guideId);
    }catch(error){
      console.warn('DOJG reference metadata unavailable',error);
      return;
    }

    if(repositoryState.mode!=='grammar'||currentGuide()?.id!==guideId)return;
    const liveContainer=document.querySelector('.repo-further-study .grammar-source-list');
    if(!liveContainer)return;

    liveContainer.querySelectorAll('[data-dojg-reference-row]').forEach(node=>node.remove());
    const generic=genericDictionaryRow(liveContainer);

    if(!rows.length){
      if(generic)generic.hidden=false;
      return;
    }

    if(generic)generic.hidden=true;
    const anchor=generic||liveContainer.firstElementChild;
    const markup=rows.map(rowMarkup).join('');
    if(anchor)anchor.insertAdjacentHTML('beforebegin',markup);
    else liveContainer.insertAdjacentHTML('afterbegin',markup);
  }

  function scheduleRender(){
    if(renderQueued)return;
    renderQueued=true;
    requestAnimationFrame(render);
  }

  async function openExact(entryId){
    if(!entryId||typeof repositoryState==='undefined')return;
    const guide=currentGuide(),context=currentContext();
    if(!guide||!context||!window.JLHDictionary?.open)return;
    repositoryState.grammarLabel=guide.pattern;
    repositoryState.grammarGuideId=guide.id;
    await window.JLHDictionary.open(context,{id:entryId});
  }

  document.addEventListener('click',event=>{
    const button=event.target?.closest?.('[data-dojg-open]');
    if(!button)return;
    event.preventDefault();
    openExact(button.dataset.dojgOpen);
  });

  const observer=new MutationObserver(scheduleRender);
  function start(){
    observer.observe(document.body,{subtree:true,childList:true});
    scheduleRender();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();

  return {referencesForGuide,render,clear:()=>cache.clear()};
})();
