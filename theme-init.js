try {
  document.documentElement.dataset.theme = localStorage.getItem('studyTheme') ||
    (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
} catch (error) {
  document.documentElement.dataset.theme = 'light';
}
try {
  const saved=localStorage.getItem('siteShowFurigana');
  const legacy=localStorage.getItem('repositoryShowFurigana');
  document.documentElement.dataset.furigana=(saved??legacy)!=='false'?'on':'off';
} catch (error) {
  document.documentElement.dataset.furigana='on';
}

/* --------------------------------------------------------------------------
   Session-wide DOM state persistence
   --------------------------------------------------------------------------
   Rerenders replace large parts of the application DOM. Native <details>
   elements and aria-expanded/aria-controls pairs otherwise lose their visual
   state even when the user has only switched to a PDF/video/reference tab.

   This layer is intentionally route-scoped and session-scoped:
   - native <details> open/closed state is restored after any rerender;
   - stable aria-expanded controls restore the visibility of their target;
   - scroll position is restored when returning from another browser tab;
   - no study/content state is written here;
   - no state survives a new browser session.
   -------------------------------------------------------------------------- */
(function installLearningHubDomState(){
  if(window.__learningHubDomStateInstalled)return;
  window.__learningHubDomStateInstalled=true;

  const STORAGE_KEY='learningHub.domState.v1';
  const MAX_ROUTES=40;
  let restoring=false;
  let restoreScheduled=false;
  let hiddenRoute=null;
  let hiddenScrollY=0;

  const routeKey=()=>location.pathname||'/';

  function readStore(){
    try{
      const value=JSON.parse(sessionStorage.getItem(STORAGE_KEY)||'null');
      return value&&typeof value==='object'?value:{routes:{}};
    }catch(error){
      return {routes:{}};
    }
  }

  function writeStore(store){
    try{
      const routes=store.routes||{};
      const keys=Object.keys(routes).sort((a,b)=>(routes[b]?.updatedAt||0)-(routes[a]?.updatedAt||0));
      for(const key of keys.slice(MAX_ROUTES))delete routes[key];
      sessionStorage.setItem(STORAGE_KEY,JSON.stringify({routes}));
    }catch(error){}
  }

  function routeState(create=false){
    const store=readStore();
    const key=routeKey();
    if(!store.routes)store.routes={};
    if(create&&!store.routes[key])store.routes[key]={details:{},expanded:{},updatedAt:Date.now()};
    return {store,key,state:store.routes[key]||null};
  }

  function stableDataIdentity(element){
    const priority=[
      'guideWorkspace','guideTask','guideAudioBox','guideAudio','hubSection',
      'supplementaryUnit','openSupplementary','repoGuide','repoGrammarLesson',
      'mobileView','task','todayTask'
    ];
    for(const key of priority){
      const value=element.dataset?.[key];
      if(value)return `data-${key}:${value}`;
    }
    const attrs=[...element.attributes||[]]
      .filter(attr=>attr.name.startsWith('data-')&&attr.value)
      .sort((a,b)=>a.name.localeCompare(b.name));
    if(attrs.length)return attrs.slice(0,2).map(attr=>`${attr.name}:${attr.value}`).join('|');
    return '';
  }

  function detailsIdentity(element){
    if(element.id)return `id:${element.id}`;
    const dataId=stableDataIdentity(element);
    if(dataId)return dataId;
    const summary=element.querySelector(':scope > summary');
    const text=(summary?.textContent||'').replace(/\s+/g,' ').trim().slice(0,120);
    if(text)return `summary:${text}`;
    return '';
  }

  function expandedIdentity(element){
    if(element.id)return `id:${element.id}`;
    const controls=element.getAttribute('aria-controls');
    if(controls)return `controls:${controls}`;
    const dataId=stableDataIdentity(element);
    return dataId||'';
  }

  function saveDetail(element){
    if(restoring||!(element instanceof HTMLDetailsElement))return;
    const id=detailsIdentity(element);
    if(!id)return;
    const record=routeState(true);
    record.state.details[id]=Boolean(element.open);
    record.state.updatedAt=Date.now();
    writeStore(record.store);
  }

  function saveExpanded(element){
    if(restoring||!(element instanceof Element)||!element.hasAttribute('aria-expanded'))return;
    const id=expandedIdentity(element);
    if(!id)return;
    const record=routeState(true);
    record.state.expanded[id]=element.getAttribute('aria-expanded')==='true';
    record.state.updatedAt=Date.now();
    writeStore(record.store);
  }

  function captureAll(){
    if(!document.documentElement)return;
    const record=routeState(true);
    document.querySelectorAll('details').forEach(element=>{
      const id=detailsIdentity(element);
      if(id)record.state.details[id]=Boolean(element.open);
    });
    document.querySelectorAll('[aria-expanded]').forEach(element=>{
      const id=expandedIdentity(element);
      if(id)record.state.expanded[id]=element.getAttribute('aria-expanded')==='true';
    });
    record.state.updatedAt=Date.now();
    writeStore(record.store);
  }

  function restoreAll(){
    if(!document.documentElement)return;
    const record=routeState(false);
    if(!record.state)return;

    restoring=true;
    try{
      document.querySelectorAll('details').forEach(element=>{
        const id=detailsIdentity(element);
        if(!id||!Object.prototype.hasOwnProperty.call(record.state.details||{},id))return;
        element.open=Boolean(record.state.details[id]);
      });

      document.querySelectorAll('[aria-expanded]').forEach(element=>{
        const id=expandedIdentity(element);
        if(!id||!Object.prototype.hasOwnProperty.call(record.state.expanded||{},id))return;
        const open=Boolean(record.state.expanded[id]);
        element.setAttribute('aria-expanded',open?'true':'false');

        const controls=element.getAttribute('aria-controls');
        if(!controls)return;
        const target=document.getElementById(controls);
        if(target&&target.hasAttribute('hidden'))target.hidden=!open;
      });
    }finally{
      restoring=false;
    }
  }

  function scheduleRestore(){
    if(restoreScheduled)return;
    restoreScheduled=true;
    requestAnimationFrame(()=>{
      restoreScheduled=false;
      restoreAll();
    });
  }

  function restoreReturnScroll(){
    if(hiddenRoute!==routeKey())return;
    const target=hiddenScrollY;
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      if(hiddenRoute===routeKey()&&Math.abs(window.scrollY-target)>2)window.scrollTo({top:target,left:0,behavior:'auto'});
    }));
  }

  function bind(){
    document.addEventListener('toggle',event=>{
      if(event.target instanceof HTMLDetailsElement)saveDetail(event.target);
    },true);

    const observer=new MutationObserver(mutations=>{
      let added=false;
      for(const mutation of mutations){
        if(mutation.type==='attributes'){
          if(mutation.attributeName==='open'&&mutation.target instanceof HTMLDetailsElement)saveDetail(mutation.target);
          if(mutation.attributeName==='aria-expanded')saveExpanded(mutation.target);
        }else if(mutation.type==='childList'&&mutation.addedNodes.length){
          added=true;
        }
      }
      if(added)scheduleRestore();
    });

    observer.observe(document.documentElement,{
      subtree:true,
      childList:true,
      attributes:true,
      attributeFilter:['open','aria-expanded']
    });

    document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState==='hidden'){
        captureAll();
        hiddenRoute=routeKey();
        hiddenScrollY=window.scrollY;
      }else{
        restoreAll();
        restoreReturnScroll();
      }
    });

    window.addEventListener('pagehide',()=>{
      captureAll();
      hiddenRoute=routeKey();
      hiddenScrollY=window.scrollY;
    });

    window.addEventListener('pageshow',()=>{
      restoreAll();
      restoreReturnScroll();
    });

    window.addEventListener('popstate',scheduleRestore);

    for(const method of ['pushState','replaceState']){
      const original=history[method];
      if(typeof original!=='function')continue;
      history[method]=function(...args){
        captureAll();
        const result=original.apply(this,args);
        scheduleRestore();
        return result;
      };
    }

    restoreAll();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});
  else bind();

  window.JLHDomState={
    capture:captureAll,
    restore:restoreAll,
    clear(){
      try{sessionStorage.removeItem(STORAGE_KEY);}catch(error){}
    }
  };
})();


/* --------------------------------------------------------------------------
   Phase 1 grammar integration cleanup
   --------------------------------------------------------------------------
   1. Lesson workspaces show direct/strong GID support only. Broader "related"
      GID references remain available on the canonical Grammar Guide.
   2. Grammar Library exact-canonical searches suppress variant-only cards when
      an exact canonical guide exists (e.g. 〜てくる no longer also presents 来る
      as an equal "Matched" result).
   -------------------------------------------------------------------------- */
(function installPhase1GrammarCleanup(){
  if(window.__phase1GrammarCleanupInstalled)return;
  window.__phase1GrammarCleanupInstalled=true;

  const grammarKey=value=>String(value||'')
    .normalize('NFKC')
    .trim()
    .replace(/^[~〜～]+/u,'')
    .replace(/\s+/gu,'')
    .toLowerCase();

  const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));

  function installSupplementaryLessonFilter(){
    const supplementary=window.JLHSupplementary;
    if(!supplementary||supplementary.__phase1LessonFilterInstalled)return false;

    supplementary.lessonMarkup=function(canonical,guides){
      const canonicals=Array.isArray(canonical)?canonical:[canonical];
      const matchedGuides=canonicals
        .map(label=>(guides||[]).find(item=>grammarKey(item.pattern)===grammarKey(label)))
        .filter(Boolean);

      const seen=new Set();
      const items=matchedGuides
        .flatMap(guide=>supplementary.practicesForGrammar(guide.id))
        .filter(({link,unit})=>{
          const isReference=unit?.resource?.resource_type==='grammar_reference';

          // Lesson workspaces should show the resource sections that directly
          // teach/support this occurrence. Broad conceptual GID references
          // belong on the canonical guide, not beside the lesson task.
          if(isReference&&link.relationship==='related')return false;

          const key=`${unit.id}:${link.relationship}`;
          if(seen.has(key))return false;
          seen.add(key);
          return true;
        });

      if(!items.length)return '';

      return `<div class="guide-workspace-section guide-supplementary-practice"><strong>Grammar support</strong><div class="guide-actions">${items.map(({link,unit})=>{
        const isReference=unit?.resource?.resource_type==='grammar_reference';
        if(isReference){
          return `<button type="button" class="secondary-action" data-supplementary-unit="${escapeHtml(unit.id)}"><i class="fa-solid fa-book-open" aria-hidden="true"></i> Grammar in Depth · p.${unit.printed_page}</button>`;
        }
        return `<button type="button" class="${link.relationship==='related'?'secondary-action':'resource-action'}" data-supplementary-unit="${escapeHtml(unit.id)}"><i class="fa-solid fa-book-open" aria-hidden="true"></i> ${link.relationship==='related'?'Related basic practice':'Practice'} · Unit ${unit.unit_number}</button>`;
      }).join('')}</div></div>`;
    };

    supplementary.__phase1LessonFilterInstalled=true;
    return true;
  }

  function normalizeGrammarLibraryExactSearch(){
    if(typeof repositoryState==='undefined')return;

    const query=String(repositoryState.grammarQuery||'').trim();
    const grid=document.querySelector('.repo-grammar-library-grid');
    if(!query||!grid)return;

    const key=grammarKey(query);
    const exact=(repositoryState.grammarGuides||[]).find(
      guide=>grammarKey(guide.pattern)===key
    );
    if(!exact)return;

    grid.querySelectorAll('.repo-grammar-card').forEach(card=>{
      const wrapper=card.closest('.repo-grammar-card-wrap')||card;
      const guide=(repositoryState.grammarGuides||[]).find(
        item=>String(item.id)===String(card.dataset.repoGuide)
      );
      if(!guide)return;

      if(String(guide.id)===String(exact.id)){
        wrapper.hidden=false;
        return;
      }

      // Keep another card only if the query matches its canonical label or
      // descriptive text directly. Variant-only matches are subordinate to
      // the exact canonical result and should not look like equal matches.
      const directText=[guide.pattern,guide.meaning,guide.summary]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      wrapper.hidden=!directText.includes(query.toLowerCase());
    });
  }

  function install(){
    installSupplementaryLessonFilter();
    normalizeGrammarLibraryExactSearch();

    const observer=new MutationObserver(()=>{
      installSupplementaryLessonFilter();
      normalizeGrammarLibraryExactSearch();
    });
    observer.observe(document.body,{subtree:true,childList:true});
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',install,{once:true});
  }else{
    install();
  }
})();
