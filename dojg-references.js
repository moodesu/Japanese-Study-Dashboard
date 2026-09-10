/* Direct DOJG references on canonical Grammar Guide pages.
 * Robust renderer: locates the existing generic Dictionary resource row
 * directly instead of depending on page-specific wrapper class names.
 */
window.JLHDOJGReferences=(()=>{
  const cache=new Map();
  const pending=new Map();
  const volumeOrder={Basic:0,Intermediate:1,Advanced:2};
  const volumeTitle={
    Basic:'A Dictionary of Basic Japanese Grammar',
    Intermediate:'A Dictionary of Intermediate Japanese Grammar',
    Advanced:'A Dictionary of Advanced Japanese Grammar'
  };
  let scheduled=false;

  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));

  function currentGuide(){
    if(typeof repositoryState==='undefined')return null;
    if(repositoryState.grammarGuideId){
      const row=repositoryState.grammarGuides.find(x=>x.id===repositoryState.grammarGuideId);
      if(row)return row;
    }
    if(typeof repositoryGrammarKey!=='function')return null;
    const key=repositoryGrammarKey(repositoryState.grammarLabel);
    return repositoryState.grammarGuides.find(x=>repositoryGrammarKey(x.pattern)===key)||null;
  }

  function currentContext(){
    return repositoryState.entries.find(x=>x.id===repositoryState.selectedId)
      ||repositoryState.routeEntry
      ||null;
  }

  function findGenericRow(){
    return Array.from(document.querySelectorAll('.grammar-source-row,.resource-row')).find(row=>{
      const strong=row.querySelector('strong');
      return strong?.textContent?.trim()==='A Dictionary of Japanese Grammar'
        && row.querySelector('#repoDictionaryOpen,[id="repoDictionaryOpen"]');
    })||null;
  }

  async function rowsFor(guideId){
    if(cache.has(guideId))return cache.get(guideId);
    if(pending.has(guideId))return pending.get(guideId);

    const promise=(async()=>{
      if(typeof db==='undefined'||typeof state==='undefined'||!db||!state.user)return [];
      const userId=state.user.id;

      const {data:refs,error:refError}=await db
        .from('grammar_dictionary_references')
        .select('dictionary_entry_id,relationship,source_volume')
        .eq('user_id',userId)
        .eq('grammar_id',guideId);
      if(refError)throw refError;
      if(!refs?.length)return [];

      const ids=[...new Set(refs.map(x=>x.dictionary_entry_id).filter(Boolean))];
      const {data:entries,error:entryError}=await db
        .from('japanese_dictionary_entries')
        .select('id,headword,volume,summary')
        .eq('user_id',userId)
        .in('id',ids);
      if(entryError)throw entryError;

      const byId=new Map((entries||[]).map(x=>[x.id,x]));
      return refs
        .map(ref=>({ref,entry:byId.get(ref.dictionary_entry_id)}))
        .filter(x=>x.entry)
        .sort((a,b)=>
          (volumeOrder[a.ref.source_volume]??9)-(volumeOrder[b.ref.source_volume]??9)
          ||String(a.entry.headword).localeCompare(String(b.entry.headword),'ja')
        );
    })();

    pending.set(guideId,promise);
    try{
      const rows=await promise;
      cache.set(guideId,rows);
      return rows;
    }finally{
      pending.delete(guideId);
    }
  }

  function relationshipLabel(value){
    if(value==='expanded')return 'Expanded reference';
    if(value==='related')return 'Related reference';
    return 'Primary reference';
  }

  function markup({ref,entry}){
    const volume=ref.source_volume||entry.volume||'';
    const title=volumeTitle[volume]||'A Dictionary of Japanese Grammar';
    const detail=[volume,entry.headword,relationshipLabel(ref.relationship)].filter(Boolean).join(' · ');
    return `<div class="resource-row grammar-source-row dojg-direct-reference" data-dojg-reference-row data-dojg-entry="${esc(entry.id)}"><div class="resource-row-copy"><strong>${esc(title)}</strong><span>${esc(detail)}</span></div><button type="button" class="resource-action resource-action-secondary" data-dojg-open="${esc(entry.id)}">Open reference ↗</button></div>`;
  }

  async function render(){
    scheduled=false;
    if(typeof state==='undefined'||state.view!=='repository')return;
    if(typeof repositoryState==='undefined'||repositoryState.mode!=='grammar')return;

    const guide=currentGuide();
    const generic=findGenericRow();
    if(!guide||!generic)return;

    const guideId=guide.id;
    let rows;
    try{
      rows=await rowsFor(guideId);
    }catch(error){
      console.warn('DOJG reference metadata unavailable',error);
      generic.hidden=false;
      return;
    }

    if(repositoryState.mode!=='grammar'||currentGuide()?.id!==guideId)return;
    const liveGeneric=findGenericRow();
    if(!liveGeneric)return;

    document.querySelectorAll('[data-dojg-reference-row]').forEach(node=>node.remove());

    if(!rows.length){
      liveGeneric.hidden=false;
      return;
    }

    liveGeneric.hidden=true;
    liveGeneric.insertAdjacentHTML('beforebegin',rows.map(markup).join(''));
  }

  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>render());
  }

  async function openExact(id){
    if(!id||typeof repositoryState==='undefined')return;
    const guide=currentGuide();
    const context=currentContext();
    if(!guide||!context||!window.JLHDictionary?.open)return;
    repositoryState.grammarLabel=guide.pattern;
    repositoryState.grammarGuideId=guide.id;
    await window.JLHDictionary.open(context,{id});
  }

  document.addEventListener('click',event=>{
    const button=event.target?.closest?.('[data-dojg-open]');
    if(!button)return;
    event.preventDefault();
    openExact(button.dataset.dojgOpen);
  });

  const observer=new MutationObserver(schedule);
  function start(){
    observer.observe(document.body,{subtree:true,childList:true});
    schedule();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();

  return {rowsFor,render,clear:()=>cache.clear()};
})();
