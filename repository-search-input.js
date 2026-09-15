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

    // repository.js handles this ordinary input and rerenders. Restore
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
 * Phase 6C: live canonical validation for sentence JSON.
 *
 * repository.js performs structural validation and prepares the import plan.
 * This second-stage validator resolves any non-canonical labels against the
 * authenticated user's live Grammar Library via resolve_canonical_grammar_label().
 *
 * Rules:
 *   - exact canonical labels pass unchanged;
 *   - a uniquely owned saved variant is normalised to its canonical guide;
 *   - an ambiguous saved form is blocked and its candidate canonicals shown;
 *   - an unknown form is blocked;
 *   - surface text is never changed.
 */
(()=>{
  if(typeof window.previewRepositoryImport!=='function')return;

  const basePreview=window.previewRepositoryImport;
  let validationSequence=0;

  function localCanonical(label){
    const key=repositoryGrammarKey(label);
    return (repositoryState.grammarGuides||[]).find(
      guide=>repositoryGrammarKey(guide.pattern)===key
    )||null;
  }

  function uniqueMatches(rows){
    return [...new Map((rows||[]).filter(Boolean).map(row=>[row.grammar_id,row])).values()];
  }

  function sentencePreviewHtml(items,normalisations){
    const links=items.reduce((sum,item)=>sum+(item.grammar_points||[]).length,0);
    const existing=items.filter(item=>item.existing_id).length;
    const created=items.length-existing;
    const sentenceSummary=[
      existing?`${existing} existing sentence${existing===1?'':'s'} will be updated`:'',
      created?`${created} new sentence${created===1?'':'s'} will be added`:''
    ].filter(Boolean).join(' · ');

    const normalisedMarkup=normalisations.length
      ? `<span><strong>Canonical validation:</strong> ${normalisations.length} label${normalisations.length===1?'':'s'} normalised against the live Grammar Library.</span>`
        +normalisations.map(item=>`<span lang="ja">${esc(item.from)} → <strong>${esc(item.to)}</strong> <small>(${esc(item.match_type||'variant')})</small></span>`).join('')
      : `<span><strong>Canonical validation:</strong> all grammar labels match the live Grammar Library.</span>`;

    const sentenceMarkup=items.slice(0,5)
      .map(item=>`<span lang="ja">${repositoryJapanese(item.entry)}</span>`).join('');

    const warnings=items
      .map((item,index)=>!item.entry.japanese_furigana?`Entry ${index+1}: no japanese_furigana supplied. The app does not generate readings.`:'')
      .filter(Boolean)
      .map(value=>`<p>${esc(value)}</p>`).join('');

    return `<strong>${sentenceSummary} · ${links} canonical grammar link${links===1?'':'s'}</strong>`
      +normalisedMarkup+sentenceMarkup+warnings;
  }

  window.previewRepositoryImport=async function(...args){
    const sequence=++validationSequence;
    const result=basePreview.apply(this,args);

    if(typeof pendingRepositoryImport==='undefined'
      ||pendingRepositoryImport?.kind!=='sentences'
      ||typeof db==='undefined'
      ||!db){
      return result;
    }

    const input=document.querySelector('#repoImportJson');
    const preview=document.querySelector('#repoImportPreview');
    const run=document.querySelector('#repoRunImport');
    const snapshot=input?.value||'';

    if(run)run.disabled=true;
    if(preview){
      preview.insertAdjacentHTML(
        'beforeend',
        '<span><strong>Canonical validation:</strong> checking the live Grammar Library…</span>'
      );
    }

    try{
      const labels=[...new Set(
        pendingRepositoryImport.payload
          .flatMap(item=>item.grammar_points||[])
          .map(point=>point?.canonical)
          .filter(Boolean)
          .filter(label=>!localCanonical(label))
      )];

      const resolved=new Map();
      await Promise.all(labels.map(async label=>{
        const response=await db.rpc('resolve_canonical_grammar_label',{p_label:label});
        if(response.error)throw response.error;
        resolved.set(label,uniqueMatches(response.data));
      }));

      // Ignore a completed network response if the user edited/repreviewed while
      // it was in flight.
      if(sequence!==validationSequence||!input||input.value!==snapshot)return result;
      if(typeof pendingRepositoryImport==='undefined'||pendingRepositoryImport?.kind!=='sentences')return result;

      const unknown=[];
      const ambiguous=[];
      const normalisations=[];

      for(const label of labels){
        const matches=resolved.get(label)||[];
        if(!matches.length){
          unknown.push(label);
        }else if(matches.length>1){
          ambiguous.push({label,matches});
        }else{
          const match=matches[0];
          if(repositoryGrammarKey(match.canonical)!==repositoryGrammarKey(label)){
            normalisations.push({
              from:label,
              to:match.canonical,
              match_type:match.variant_type||match.match_type||'variant'
            });
          }
        }
      }

      if(unknown.length||ambiguous.length){
        const detail=[
          ...unknown.map(label=>`<span lang="ja">${esc(label)} → no canonical or saved variant match</span>`),
          ...ambiguous.map(({label,matches})=>
            `<span lang="ja">${esc(label)} → ambiguous: ${matches.map(match=>`<strong>${esc(match.canonical)}</strong>`).join(' + ')}</span>`
          )
        ].join('');

        if(preview){
          preview.innerHTML=
            `<span class="repo-import-error"><strong>Canonical validation failed.</strong> `
            +`Sentence imports must resolve completely against the existing Grammar Library. `
            +`Unknown labels need catalogue reconciliation; ambiguous combined forms must be represented by their contributing canonical annotations.</span>`
            +detail;
        }
        pendingRepositoryImport=null;
        repositoryImportSnapshot='';
        if(run){run.disabled=true;run.textContent='Import sentences';}
        return result;
      }

      const mapping=new Map();
      for(const label of labels){
        const matches=resolved.get(label)||[];
        if(matches.length===1)mapping.set(label,matches[0].canonical);
      }

      for(const item of pendingRepositoryImport.payload){
        item.grammar_points=(item.grammar_points||[]).map(point=>{
          const canonical=mapping.get(point.canonical)||point.canonical;
          return {...point,canonical};
        });
        item.entry.grammar_points=[...new Set(item.grammar_points.map(point=>point.canonical))];
      }

      // Keep the exact original JSON as the import snapshot. The normalized
      // canonical annotations live only in the validated pending payload.
      repositoryImportSnapshot=snapshot;

      if(preview){
        preview.innerHTML=sentencePreviewHtml(pendingRepositoryImport.payload,normalisations);
      }
      if(run){
        run.disabled=false;
        run.textContent='Import sentences';
      }
      return result;
    }catch(error){
      if(sequence!==validationSequence||!input||input.value!==snapshot)return result;
      pendingRepositoryImport=null;
      repositoryImportSnapshot='';
      if(preview){
        preview.innerHTML=`<span class="repo-import-error">${esc(error?.message||'Live canonical validation failed.')}</span>`;
      }
      if(run){run.disabled=true;run.textContent='Import sentences';}
      return result;
    }
  };
})();
