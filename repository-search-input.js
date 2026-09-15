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
    if(input instanceof HTMLInputElement&&SEARCH_IDS.has(input.id))composing.add(input.id);
  },true);

  document.addEventListener('compositionend',event=>{
    const input=event.target;
    if(input instanceof HTMLInputElement&&SEARCH_IDS.has(input.id)){
      composing.delete(input.id);
      stateFor(input.id,input.value);
    }
  },true);

  document.addEventListener('input',event=>{
    const input=event.target;
    if(!(input instanceof HTMLInputElement)||!SEARCH_IDS.has(input.id))return;

    const id=input.id;
    const start=input.selectionStart;
    const end=input.selectionEnd;
    const direction=input.selectionDirection;

    if(event.isComposing||composing.has(id)){
      stateFor(id,input.value);
      event.stopImmediatePropagation();
      return;
    }

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
 * Phase 5/6A: sentence imports attach only to existing canonical guides.
 * If an incoming "canonical" is actually a saved variant/combined form,
 * Preview blocks the import and suggests the authoritative canonical label.
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
      const variants=repositoryState.grammarVariants||[];
      const points=pendingRepositoryImport.payload.flatMap(item=>item.grammar_points||[]);
      const unresolved=[...new Set(
        points
          .map(point=>point?.canonical)
          .filter(Boolean)
          .filter(canonical=>!guides.some(
            guide=>repositoryGrammarKey(guide.pattern)===repositoryGrammarKey(canonical)
          ))
      )];

      if(!unresolved.length)return result;

      const suggestions=unresolved.map(label=>{
        const key=repositoryGrammarKey(label);
        const matches=variants
          .filter(variant=>repositoryGrammarKey(variant.form)===key)
          .map(variant=>guides.find(guide=>guide.id===variant.grammar_id))
          .filter(Boolean);
        const unique=[...new Map(matches.map(guide=>[guide.id,guide])).values()];
        return {label,matches:unique};
      });

      const preview=document.querySelector('#repoImportPreview');
      const run=document.querySelector('#repoRunImport');

      if(preview){
        const suggestionMarkup=suggestions.map(({label,matches})=>{
          if(!matches.length)return `<span>${esc(label)} → no saved canonical match</span>`;
          if(matches.length===1)return `<span>${esc(label)} → use canonical <strong>${esc(matches[0].pattern)}</strong></span>`;
          return `<span>${esc(label)} → ambiguous saved forms: ${matches.map(g=>`<strong>${esc(g.pattern)}</strong>`).join(', ')}</span>`;
        }).join('');

        preview.innerHTML=
          `<span class="repo-import-error"><strong>Canonical grammar mismatch.</strong> `
          +`The sentence import references ${unresolved.length} label${unresolved.length===1?'':'s'} `
          +`that ${unresolved.length===1?'is':'are'} not canonical Grammar Library identities. `
          +`Sentence imports do not create placeholder guides.</span>`
          +suggestionMarkup
          +`<span>Correct the JSON canonical field and preview again. Keep the original wording in surface.</span>`;
      }

      if(run){
        run.disabled=true;
        run.textContent='Import sentences';
      }

      pendingRepositoryImport=null;
      repositoryImportSnapshot='';
    }catch(error){
      const preview=document.querySelector('#repoImportPreview');
      const run=document.querySelector('#repoRunImport');
      if(preview)preview.innerHTML=`<span class="repo-import-error">${esc(error?.message||'Canonical grammar preflight failed.')}</span>`;
      if(run)run.disabled=true;
      pendingRepositoryImport=null;
      repositoryImportSnapshot='';
    }

    return result;
  };
})();
