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
