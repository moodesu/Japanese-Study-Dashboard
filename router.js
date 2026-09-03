/* URL navigation for the existing Learning Hub. History stores UI positions,
 * never dictionary bodies, drafts, credentials or signed media URLs. */
window.JLHRouter=(()=>{
  const encode=value=>encodeURIComponent(String(value));
  const bookId=()=>window.CURRICULUM?.bookId||'tobira-beginning-ii';
  const lessonURL=(n,task)=>`/books/${encode(bookId())}/lessons/${Number(n)}${task?'?step='+encode(task):''}`;
  const entryURL=id=>'/repository/entries/'+encode(id);
  const query=(path,values)=>{const p=new URLSearchParams();for(const [key,value] of Object.entries(values))if(value!==null&&value!==undefined&&value!==''&&value!=='all')p.set(key,value);return path+(p.size?'?'+p:'');};
  let started=false,applying=false,sequence=0,pending=true,userId=null,current='',index=0,sessionId='',reverting=false;
  let baseline=null,modalTask=null,lessonTask=null,routeError=null,positionTimer=null;
  const here=()=>location.pathname+location.search;
  const selected=()=>repositoryState.entries.find(x=>x.id===repositoryState.selectedId)||repositoryState.routeEntry;
  function parse(input){
    const url=new URL(input,location.origin);if(url.origin!==location.origin)throw Error('External route');
    const p=url.pathname.replace(/\/+$/,'')||'/',q=url.searchParams;
    const parts=p.split('/').slice(1).map(decodeURIComponent);
    let r={path:p,q,task:q.get('task')||null,step:q.get('step')||null};
    if(p==='/'||p==='/index.html')r.type='home';
    else if(p==='/plan'||/^\/plan\/week\/[0-9]+$/.test(p)){r.type='plan';r.week=parts[2]?Number(parts[2])-1:0;if(r.week<0||r.week>11)throw Error('Week not found');}
    else if(p==='/books'||p==='/hub')r.type='books';
    else if(parts[0]==='books'&&parts.length===2){r.type='book';r.book=parts[1];}
    else if(parts[0]==='books'&&parts[2]==='lessons'&&parts.length===4&&/^\d+$/.test(parts[3])){r.type='lesson';r.book=parts[1];r.lesson=Number(parts[3]);}
    else if(p==='/wanikani')r.type='wanikani';
    else if(p==='/repository')r.type='repository';
    else if(p==='/repository/new')r.type='new';
    else if(p==='/repository/import')r.type='import';
    else if(parts[0]==='repository'&&parts[1]==='entries'&&parts[2]){
      r.entry=parts[2];
      if(parts.length===3)r.type='entry';
      else if(parts.length===4&&parts[3]==='edit')r.type='edit';
      else if(parts.length===5&&parts[3]==='grammar'){r.type='grammar';r.label=parts[4];r.guide=q.get('guide');}
    }else if(parts[0]==='grammar'&&parts.length===2){r.type='grammar';r.guide=parts[1];r.entry=q.get('entry');}
    else if(parts[0]==='dictionary'&&parts.length<=2){r.type='dictionary';r.id=parts[1]==='setup'?null:parts[1]||null;r.setup=parts[1]==='setup';r.entry=q.get('entry');r.guide=q.get('guide');r.label=q.get('label');if(r.id&&!/^[a-f0-9]{64}$/.test(r.id))throw Error('Dictionary entry not found');}
    if(!r.type)throw Error('Page not found');return r;
  }
  function grammarURL(entry=selected(),label=repositoryState.grammarLabel,guideId=repositoryState.grammarGuideId){
    if(!entry)return '/repository';
    const guide=repositoryGrammarGuide(label,entry);
    if(guide?.id)return query('/grammar/'+encode(guide.id),{entry:entry.routeStandalone?'':entry.id});
    return query(entryURL(entry.id)+'/grammar/'+encode(label),{guide:guideId});
  }
  function dictionaryURL(overrides={}){
    const d=window.JLHDictionary?.routeState?.()||{},entry=selected();
    const values={entry:entry&&!entry.routeStandalone?entry.id:'',guide:repositoryGrammarGuide(repositoryState.grammarLabel,entry)?.id||'',label:repositoryState.grammarLabel,q:d.query||'',...overrides};
    const id=Object.hasOwn(overrides,'id')?overrides.id:d.id;
    const setup=Object.hasOwn(overrides,'setup')?overrides.setup:d.setup;
    delete values.id;delete values.setup;
    return query('/dictionary'+(setup?'/setup':id?'/'+encode(id):''),values);
  }
  function fromState(){
    let path='/';
    if(state.view==='plan')path=`/plan/week/${state.week+1}`;
    else if(state.view==='lesson')path=lessonURL(state.lesson,lessonTask?.lesson===state.lesson?lessonTask.id:null);
    else if(state.view==='library')path=state.libraryItem?'/books/'+encode(state.libraryItem):'/books';
    else if(state.view==='wanikani')path='/wanikani';
    else if(state.view==='repository'){
      const r=repositoryState;
      if(r.mode==='dictionary')return dictionaryURL();
      if(r.mode==='grammar')return grammarURL();
      if(r.mode==='form')return r.selectedId?entryURL(r.selectedId)+'/edit':'/repository/new';
      if(r.mode==='import')return '/repository/import';
      if(r.mode==='detail'&&r.selectedId)return entryURL(r.selectedId);
      return query('/repository',{q:r.query,kind:r.kind,status:r.status,register:r.register,migaku:r.migaku});
    }
    if(modalTask){const u=new URL(path,location.origin);u.searchParams.set('task',modalTask);path=u.pathname+u.search;}
    return path;
  }
  function draft(){
    const form=document.querySelector('#repositoryForm');
    if(form)return JSON.stringify(Array.from(form.querySelectorAll('input,textarea,select')).map(x=>[x.name,x.type==='checkbox'?x.checked:x.value]));
    const input=document.querySelector('#repoImportJson');return input?input.value:null;
  }
  function blocked(){return !!(window.JLHDictionary?.navigationBusy?.()||window.JLHRepositorySaving||
    (typeof repositoryImportRunning!=='undefined'&&repositoryImportRunning));}
  function canLeave(){
    if(blocked()){toast('Please wait for the current save or upload to finish.');return false;}
    const value=draft();return baseline===null||value===null||baseline===value||confirm('Leave this page and discard your unsaved changes?');
  }
  function position(){
    const focus=document.activeElement;
    return {x:window.scrollX||0,y:window.scrollY||0,focus:focus?.id||'',details:Array.from(document.querySelectorAll('#mainContent details')).map((x,i)=>x.open?i:-1).filter(i=>i>=0)};
  }
  function remember(){
    if(!started||here()!==current)return;
    const old=history.state?.jlh;
    history.replaceState({jlh:{session:sessionId,index,position:position(),...(old?.parent?{parent:old.parent}:{})}},'',location.href);
  }
  function write(url,replace=false){
    const parent=current;remember();if(!replace)index++;
    history[replace?'replaceState':'pushState']({jlh:{session:sessionId,index,position:null,parent:replace?history.state?.jlh?.parent:parent}},'',url);
    current=url;
  }
  function title(){
    const d=window.JLHDictionary?.routeState?.();
    const labels={dashboard:'Home',plan:`Plan · Week ${state.week+1}`,lesson:`Lesson ${state.lesson}`,library:state.libraryItem?(window.BOOKS||[]).find(x=>x.id===state.libraryItem)?.title:'Book library',wanikani:'WaniKani',repository:repositoryState.mode==='dictionary'?(d?.title||'Dictionary'):repositoryState.mode==='grammar'?repositoryState.grammarLabel:repositoryState.mode==='detail'?'Saved sentence':repositoryState.mode==='form'?'Edit sentence':repositoryState.mode==='import'?'Import sentences':'Japanese Repository'};
    document.title=(routeError?'Page unavailable':labels[state.view]||'Learning Hub')+' · Japanese Learning Hub';
  }
  function showError(message){
    routeError=message;$('#hero').hidden=true;$('#bottomArea').hidden=true;$('#weekView').hidden=true;$('#mainContent').hidden=false;
    $('#mainContent').innerHTML=`<section class="panel"><h1>Page unavailable</h1><p>${esc(message)}</p><p>The link may be invalid, deleted, or unavailable to this account.</p><a class="smallbtn" data-jlh-route href="/">Home</a> <a class="smallbtn" data-jlh-route href="/repository">Repository</a> <button class="smallbtn" id="routeRetry">Retry</button></section>`;
    $('#routeRetry').onclick=()=>navigate(current,{replace:true});title();
  }
  function restore(saved,token){
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      if(token!==sequence)return;
      if(saved){
        const open=new Set(saved.details||[]);document.querySelectorAll('#mainContent details').forEach((node,i)=>{node.open=open.has(i);});
        if(saved.focus)document.getElementById(saved.focus)?.focus({preventScroll:true});
        scrollTo({left:saved.x||0,top:saved.y||0,behavior:'instant'});
      }else if(!modalTask&&!lessonTask){document.querySelector('#mainContent h1,#mainContent h2')?.setAttribute('tabindex','-1');document.querySelector('#mainContent h1,#mainContent h2')?.focus({preventScroll:true});scrollTo({top:0,behavior:'instant'});}
    }));
  }
  async function repositoryReady(){
    if(repositoryState.loading){await new Promise(resolve=>{const timer=setInterval(()=>{if(!repositoryState.loading||!state.user){clearInterval(timer);resolve();}},30);});}
    if(!repositoryState.loaded)await loadRepositoryData();
    if(!repositoryState.loaded)throw Error(repositoryState.error||'The Repository could not be loaded. Try again.');
  }
  function grammarContext(r){
    let entry=r.entry?repositoryState.entries.find(x=>x.id===r.entry):null;
    if(r.entry&&!entry)throw Error('This saved sentence is unavailable.');
    if(r.guide){
      const saved=repositoryState.grammarGuides.find(x=>x.id===r.guide);
      const built=(window.REPOSITORY_GRAMMAR_GUIDES||[]).find(x=>x.id===r.guide);
      if(!saved&&!built)throw Error('This grammar meaning is unavailable.');
      const label=saved?.label||built.title;
      if(entry){r.label=(entry.grammar_points||[]).find(x=>repositoryGrammarKey(x)===repositoryGrammarKey(label));if(!r.label)throw Error('The grammar link does not match this sentence.');}
      else {r.label=label;entry={id:'guide:'+r.guide,routeStandalone:true,grammar_points:[label]};}
    }
    if(entry&&r.label&&!(entry.grammar_points||[]).includes(r.label))throw Error('This grammar point is not linked to the sentence.');
    repositoryState.routeEntry=entry?.routeStandalone?entry:null;repositoryState.selectedId=entry?.routeStandalone?null:entry?.id||null;
    repositoryState.grammarLabel=r.label||'';repositoryState.grammarGuideId=r.guide||null;
    return entry;
  }
  async function apply(url,saved){
    const token=++sequence,owner=state.user?.id;applying=true;routeError=null;baseline=null;modalTask=null;lessonTask=null;
    window.JLHDictionary?.reset();repositoryState.routeEntry=null;
    for(const id of ['modal','searchDialog'])if($('#'+id)?.open)$('#'+id).close();
    try{
      const r=parse(url);
      if(['repository','entry','edit','new','import','grammar','dictionary'].includes(r.type)){
        state.view='repository';repositoryState.mode='browse';repositoryState.selectedId=null;
        render();await repositoryReady();if(token!==sequence||owner!==state.user?.id)return;
        if(r.type==='repository'){
          for(const key of ['kind','status','register','migaku'])repositoryState[key]=r.q.get(key)||'all';repositoryState.query=r.q.get('q')||'';
        }else if(['entry','edit'].includes(r.type)){
          if(!repositoryState.entries.some(x=>x.id===r.entry))throw Error('This saved sentence is unavailable.');
          repositoryState.selectedId=r.entry;repositoryState.mode=r.type==='edit'?'form':'detail';
        }else if(r.type==='new'||r.type==='import')repositoryState.mode=r.type==='new'?'form':'import';
        else {
          const entry=grammarContext(r);repositoryState.mode=r.type==='grammar'?'grammar':'dictionary';
          if(r.type==='dictionary')await window.JLHDictionary.open(entry,{id:r.id,setup:r.setup,query:r.q.get('q'),fromRoute:true});
          else if(!entry)throw Error('The grammar explanation is unavailable.');
        }
      }else if(r.type==='home')state.view='dashboard';
      else if(r.type==='plan'){state.view='plan';state.week=r.week;}
      else if(r.type==='wanikani')state.view='wanikani';
      else if(r.type==='books'){state.view='library';state.libraryItem=null;}
      else if(r.type==='book'){
        if(!(window.BOOKS||[]).some(x=>x.id===r.book))throw Error('Book not found.');
        state.view='library';state.libraryItem=r.book;
      }else if(r.type==='lesson'){
        if(r.book!==bookId()||!lessonByNumber(r.lesson))throw Error('This lesson does not have a study workspace. Open its book map instead.');
        state.view='lesson';state.lesson=r.lesson;
        if(r.step){const tasks=flattenGuideSteps(lessonGuideSteps(lessonByNumber(r.lesson)));if(!tasks.some(x=>x.id===r.step||x.taskId===r.step))throw Error('This lesson task is unavailable.');lessonTask={lesson:r.lesson,id:r.step};state.guideTarget=r.step;}
      }
      if(token!==sequence||owner!==state.user?.id)return;
      render();
      if(r.task){
        const task=findTaskById(r.task);if(!task)throw Error('This study task is unavailable.');modalTask=r.task;openTask(r.task);
      }
      baseline=draft();
    }catch(error){if(token===sequence&&owner===state.user?.id){renderNav();showError(error.message||'Unable to open this page.');}}
    finally{if(token===sequence){applying=false;if(owner===state.user?.id){
      if(!routeError){const resolved=fromState();if(resolved!==current)write(resolved,true);}
      decorate();title();restore(saved,token);
    }}}
  }
  function navigate(input,options={}){
    const url=new URL(input,location.origin);if(url.origin!==location.origin)return;
    if(!options.allowed&&!canLeave())return;
    const destination=url.pathname+url.search;
    if(!options.pop)write(destination,options.replace||destination===current);
    else current=destination;
    if(!state.ready||!state.user){pending=true;return;}
    pending=false;return apply(destination,options.position);
  }
  function beforeRender(){
    if(!started)return false;
    if(!state.ready||!state.user){
      if(userId){
        sequence++;applying=true;userId=null;pending=true;baseline=null;routeError=null;modalTask=null;
        for(const id of ['modal','searchDialog'])if($('#'+id)?.open)$('#'+id).close();
        clearPrivateSessionCaches();$('#mainContent')?.replaceChildren();applying=false;
      }
      document.title='Sign in · Japanese Learning Hub';return false;
    }
    if(userId&&userId!==state.user.id){sequence++;applying=false;baseline=null;clearPrivateSessionCaches();pending=true;}
    if(userId!==state.user.id){userId=state.user.id;pending=true;}
    if(pending&&!applying){pending=false;navigate(here(),{replace:true,allowed:true,position:history.state?.jlh?.position});return true;}
    return false;
  }
  function sync(){
    if(!started||!state.ready||!state.user)return;
    if(routeError){showError(routeError);return;}
    decorate();title();if(applying||pending)return;
    const url=fromState();
    if(url!==current){const sameList=url.split('?')[0]==='/repository'&&current.split('?')[0]==='/repository';write(url,sameList);baseline=draft();}
    else if(baseline===null)baseline=draft();
  }
  function taskOpened(id){modalTask=id;sync();}
  function taskClosed(){
    if(applying||!modalTask||$('#modal')?.open)return;modalTask=null;
    const parent=history.state?.jlh?.parent;
    if(parent&&new URL(parent,location.origin).pathname===location.pathname)history.back();else sync();
  }
  function guideOpened(id){lessonTask=id?{lesson:state.lesson,id}:null;sync();}
  function routeFor(node){
    const d=node.dataset||{},id=node.id,entry=selected();
    if(d.view)return ({dashboard:'/',plan:'/plan/week/'+(state.week+1),lesson:lessonURL(state.lesson),library:'/books',repository:'/repository',wanikani:'/wanikani'})[d.view];
    if(d.week!==undefined)return '/plan/week/'+(Number(d.week)+1);
    if(d.lesson)return lessonURL(d.lesson);
    if(d.openBook)return '/books/'+encode(d.openBook);
    if(d.repoEntry)return entryURL(d.repoEntry);
    if(d.repoGrammar)return grammarURL(entry,d.repoGrammar,null);
    if(d.repoGuide)return query('/grammar/'+encode(d.repoGuide),{entry:entry&&!entry.routeStandalone?entry.id:''});
    if(d.repoLesson)return lessonURL(d.repoLesson);
    if(d.repoGrammarLesson)return lessonURL(d.repoGrammarLesson,`b2-l${d.repoGrammarLesson}-guide-grammar-${d.repoGrammarIndex}`);
    if(d.guidedTask)return lessonURL(d.guidedLesson,d.guidedTask);
    if(d.guideStepNav||d.guideScroll)return lessonURL(state.lesson,d.guideStepNav||d.guideScroll);
    if(d.task||d.todayTask||d.reviewTask){const u=new URL(current||'/',location.origin);u.searchParams.set('task',d.task||d.todayTask||d.reviewTask);return u.pathname+u.search;}
    if(d.dictionaryEntry)return dictionaryURL({id:d.dictionaryEntry,setup:false});
    if(d.dictionaryTerm)return dictionaryURL({id:null,setup:false,q:d.dictionaryTerm});
    if(d.searchType){
      if(d.searchType==='Sentence')return entryURL(d.searchId);
      if(d.searchType==='Lesson')return lessonURL(d.searchId.replace('lesson-',''));
      if(d.searchType==='Book')return '/books/'+encode(d.searchId);
      return query('/',{task:d.searchId});
    }
    if(id==='resumeWeek'||id==='openWeekToday')return '/plan/week/'+(currentWeekIndex()+1);
    if(id==='openNext'||id==='openNextTask'){
      const next=nextIncomplete();if(next)return next.task.lesson?lessonURL(next.task.lesson,next.task.id):query('/plan/week/'+(next.week+1),{task:next.task.id});
    }
    if(id==='openRelatedLesson'){
      const task=findTaskById(modalTask);if(task?.lesson)return lessonURL(task.lesson,task.id);
    }
    const map={backDashboard:'/',backPlan:'/plan/week/'+(state.week+1),backToLibrary:'/books',repoBack:'/repository',repoAdd:'/repository/new',repoImport:'/repository/import',repoEdit:entry?entryURL(entry.id)+'/edit':null,repoCancel:entry?entryURL(entry.id):'/repository',repoCancelBottom:entry?entryURL(entry.id):'/repository',repoGrammarBack:entry&&!entry.routeStandalone?entryURL(entry.id):'/repository',repoDictionaryOpen:dictionaryURL({id:null,setup:false}),dictionaryBack:entry?grammarURL(entry):'/repository',dictionarySetup:dictionaryURL({setup:true}),dictionaryResults:dictionaryURL({id:null,setup:false}),dictionarySaved:dictionaryURL({id:window.JLHDictionary?.routeState?.().linkedId,setup:false}),prevLesson:state.lesson>11?lessonURL(state.lesson-1):null,nextLesson:state.lesson<20?lessonURL(state.lesson+1):null,prevWeek:state.week>0?'/plan/week/'+state.week:null,nextWeek:state.week<11?'/plan/week/'+(state.week+2):null,openWkDashboard:'/wanikani'};
    return map[id]||null;
  }
  function decorate(){
    if(!started)return;
    document.querySelectorAll('[data-view],[data-week],[data-lesson],[data-open-book],[data-repo-entry],[data-repo-grammar],[data-repo-guide],[data-repo-lesson],[data-repo-grammar-lesson],[data-guided-task],[data-guide-step-nav],[data-guide-scroll],[data-task],[data-today-task],[data-review-task],[data-dictionary-entry],[data-dictionary-term],[data-search-type],#backDashboard,#backPlan,#backToLibrary,#repoBack,#repoAdd,#repoImport,#repoEdit,#repoCancel,#repoCancelBottom,#repoGrammarBack,#repoDictionaryOpen,#dictionaryBack,#dictionarySetup,#dictionaryResults,#dictionarySaved,#prevLesson,#nextLesson,#prevWeek,#nextWeek,#openWkDashboard,#resumeWeek,#openWeekToday,#openNext,#openNextTask,#openRelatedLesson').forEach(node=>{
      if(node.localName==='a'||node.disabled)return;
      const url=routeFor(node);if(!url)return;
      if(node.localName!=='button'&&!node.matches('[data-open-book]')){
        const label=node.querySelector('.tasktitle,.component-title');if(label&&!label.querySelector('a')){const a=document.createElement('a');a.href=url;a.dataset.jlhRoute='';a.className='route-link';while(label.firstChild)a.appendChild(label.firstChild);label.appendChild(a);}return;
      }
      const link=document.createElement('a');
      for(const attr of Array.from(node.attributes))if(!['type','role','tabindex','disabled'].includes(attr.name))link.setAttribute(attr.name,attr.value);
      link.href=url;link.dataset.jlhRoute='';link.classList.add('route-link');
      while(node.firstChild)link.appendChild(node.firstChild);node.replaceWith(link);
    });
  }
  function start(){
    if(started)return;started=true;current=here();
    const old=history.state?.jlh;sessionId=old?.session||String(Date.now())+Math.random().toString(36).slice(2);index=old?.index||0;
    history.replaceState({jlh:{session:sessionId,index,position:old?.position||null,parent:old?.parent}},'',location.href);
    history.scrollRestoration='manual';
    document.addEventListener('click',event=>{
      const link=event.target.closest('a[data-jlh-route]');
      if(link){
        // Stop legacy task delegates for modifier clicks, but retain native tabs.
        event.stopImmediatePropagation();
        if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||link.target==='_blank')return;
        event.preventDefault();navigate(link.getAttribute('href'));return;
      }
      const trigger=event.target.closest('[data-view],#logout,#repoCancel,#repoCancelBottom');
      if(trigger&&!canLeave()){event.preventDefault();event.stopImmediatePropagation();}
    },true);
    window.addEventListener('popstate',event=>{
      if(reverting){reverting=false;return;}
      const target=event.state?.jlh;
      if(!canLeave()){
        if(target?.session===sessionId&&Number.isInteger(target.index)&&target.index!==index){reverting=true;history.go(index-target.index);}
        else history.replaceState({jlh:{session:sessionId,index,position:position()}},'',current);
        return;
      }
      if(target?.session===sessionId)index=target.index;
      navigate(here(),{pop:true,allowed:true,position:target?.position});
    });
    window.addEventListener('scroll',()=>{clearTimeout(positionTimer);positionTimer=setTimeout(remember,100);},{passive:true});
    window.addEventListener('beforeunload',event=>{remember();if(blocked()||(baseline!==null&&draft()!==null&&draft()!==baseline)){event.preventDefault();event.returnValue='';}});
  }
  return {start,beforeRender,sync,navigate,decorate,parse,fromState,grammarURL,dictionaryURL,lessonURL,entryURL,taskOpened,taskClosed,guideOpened,canLeave,isNavigating:()=>applying||pending};
})();
