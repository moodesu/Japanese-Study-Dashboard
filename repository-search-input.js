/* Preserve caret and IME composition in Repository / Grammar Library search.
 *
 * repository.js rerenders the page on every input event. That replaces the
 * search <input>, which resets the caret and can also interrupt Japanese IME
 * composition. This capture-phase guard preserves the post-keystroke caret
 * and defers rerendering while an IME composition is active.
 */
(()=>{
  const SEARCH_IDS=new Set(['repoSearch','repoGrammarSearch']);
  const composing=new Set();

  function stateFor(id,value){
    if(typeof repositoryState==='undefined')return;
    if(id==='repoGrammarSearch')repositoryState.grammarQuery=value;
    else if(id==='repoSearch')repositoryState.query=value;
  }

  document.addEventListener('compositionstart',event=>{
    const input=event.target;
    if(input instanceof HTMLInputElement&&SEARCH_IDS.has(input.id)){
      composing.add(input.id);
    }
  },true);

  document.addEventListener('compositionend',event=>{
    const input=event.target;
    if(input instanceof HTMLInputElement&&SEARCH_IDS.has(input.id)){
      composing.delete(input.id);
      stateFor(input.id,input.value);
      // The browser normally emits the committed input event immediately
      // after compositionend; that event performs the normal rerender.
    }
  },true);

  document.addEventListener('input',event=>{
    const input=event.target;
    if(!(input instanceof HTMLInputElement)||!SEARCH_IDS.has(input.id))return;

    const id=input.id;
    const start=input.selectionStart;
    const end=input.selectionEnd;
    const direction=input.selectionDirection;

    // Replacing the input node during an active IME composition destroys the
    // composition buffer. Keep state current but let the existing input stay
    // mounted until the committed input event arrives.
    if(event.isComposing||composing.has(id)){
      stateFor(id,input.value);
      event.stopImmediatePropagation();
      return;
    }

    // repository.js now handles this ordinary input and rerenders. Restore
    // focus/caret onto the replacement input after the event dispatch ends.
    queueMicrotask(()=>{
      const replacement=document.getElementById(id);
      if(!(replacement instanceof HTMLInputElement))return;
      replacement.focus({preventScroll:true});
      if(Number.isInteger(start)&&Number.isInteger(end)){
        try{replacement.setSelectionRange(start,end,direction||'none');}catch{}
      }
    });
  },true);
})();


/*
 * Phase 5: canonical sentence imports attach only to guides that already
 * exist in the canonical Grammar Library.
 *
 * The catalogue is now authoritative. Sentence JSON may annotate a surface
 * form, but importing that sentence must never manufacture a new grammar
 * identity or a pending placeholder. A missing canonical is therefore an
 * annotation/catalogue mismatch that must be corrected explicitly.
 */
(()=>{
  if(typeof window.previewRepositoryImport!=='function')return;

  const originalPreviewRepositoryImport=window.previewRepositoryImport;

  window.previewRepositoryImport=function(...args){
    const result=originalPreviewRepositoryImport.apply(this,args);

    try{
      if(typeof pendingRepositoryImport==='undefined'
        ||pendingRepositoryImport?.kind!=='sentences'
        ||typeof repositoryState==='undefined'){
        return result;
      }

      const guides=repositoryState.grammarGuides||[];
      const unresolved=[...new Set(
        pendingRepositoryImport.payload
          .flatMap(item=>item.grammar_points||[])
          .map(point=>point?.canonical)
          .filter(Boolean)
          .filter(canonical=>!guides.some(
            guide=>repositoryGrammarKey(guide.pattern)===repositoryGrammarKey(canonical)
          ))
      )];

      if(!unresolved.length)return result;

      const preview=document.querySelector('#repoImportPreview');
      const run=document.querySelector('#repoRunImport');

      if(preview){
        preview.innerHTML=
          `<span class="repo-import-error"><strong>Canonical grammar mismatch.</strong> `
          +`The sentence import references ${unresolved.length} canonical guide${unresolved.length===1?'':'s'} `
          +`that ${unresolved.length===1?'is':'are'} not in the Grammar Library: `
          +`${unresolved.map(esc).join(', ')}. `
          +`Sentence imports no longer create placeholder grammar guides. `
          +`Correct the canonical annotation or add/reconcile the guide explicitly, then preview again.</span>`;
      }

      if(run){
        run.disabled=true;
        run.textContent='Import sentences';
      }

      // Prevent programmatic/stale execution after a failed canonical preflight.
      pendingRepositoryImport=null;
      repositoryImportSnapshot='';
    }catch(error){
      const preview=document.querySelector('#repoImportPreview');
      const run=document.querySelector('#repoRunImport');
      if(preview){
        preview.innerHTML=`<span class="repo-import-error">${esc(error?.message||'Canonical grammar preflight failed.')}</span>`;
      }
      if(run)run.disabled=true;
      pendingRepositoryImport=null;
      repositoryImportSnapshot='';
    }

    return result;
  };
})();
