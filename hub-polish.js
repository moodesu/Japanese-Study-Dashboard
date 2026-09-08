/* Hub section icons.
 * Loaded after app.js; replaces only the Hub section markup helper. */
(function(){
  const icons={
    'active-programme':'fa-compass',
    'planned-programmes':'fa-calendar-plus',
    'completed-programmes':'fa-circle-check',
    'books':'fa-book',
    'study-tools':'fa-toolbox'
  };

  const escValue=value=>String(value??'').replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));

  window.hubSectionMarkup=function({id,title,subtitle='',eyebrow='',content,className=''}){
    const collapsed=window.hubSectionCollapsed(id);
    const contentId=`hub-section-${id}-content`;
    const icon=icons[id]||'fa-layer-group';
    return `<section class="library-section hub-collapsible-section ${className} ${collapsed?'is-collapsed':''}" data-hub-section="${escValue(id)}">
      <header class="hub-section-header">
        <button type="button" class="hub-section-toggle" data-hub-section-toggle="${escValue(id)}" aria-expanded="${collapsed?'false':'true'}" aria-controls="${escValue(contentId)}">
          <i class="fa-solid fa-chevron-down hub-section-chevron" aria-hidden="true"></i>
          <span class="hub-section-icon" aria-hidden="true"><i class="fa-solid ${icon}"></i></span>
          <span class="hub-section-heading">
            ${eyebrow?`<span class="eyebrow">${escValue(eyebrow)}</span>`:''}
            <span class="hub-section-title">${escValue(title)}</span>
            ${subtitle?`<span class="subtitle">${escValue(subtitle)}</span>`:''}
          </span>
        </button>
      </header>
      <div class="hub-section-content" id="${escValue(contentId)}"${collapsed?' hidden':''}>${content}</div>
    </section>`;
  };
})();


/* Grammar Library presentation pass. No grammar data or routing is changed. */
(function(){
  const guideIcons={
    'Overview':'fa-circle-info',
    'Formation':'fa-layer-group',
    'Usage and nuance':'fa-compass',
    'Forms / variants':'fa-shapes',
    'Combined forms':'fa-link',
    'Clarifications':'fa-circle-question',
    'My examples':'fa-pen-to-square',
    'Reference examples':'fa-book-open',
    'Related grammar':'fa-diagram-project',
    'Used in your books':'fa-book',
    'Practice':'fa-book-open-reader',
    'Grammar and lessons':'fa-link',
    'In this sentence':'fa-quote-left'
  };

  function matchBadge(cardWrap){
    if(!cardWrap || cardWrap.classList.contains('is-pending')) return;
    const card=cardWrap.querySelector(':scope > .repo-grammar-card');
    if(!card || cardWrap.querySelector('.repo-match-badge')) return;

    const detail=[...card.querySelectorAll(':scope > small')].find(node=>
      /^(Matched:|Related match via )/.test(node.textContent.trim())
    );
    if(!detail) return;

    const raw=detail.textContent.trim();
    const related=raw.startsWith('Related match via ');
    const badge=document.createElement('span');
    badge.className=`repo-match-badge ${related?'related':'matched'}`;
    badge.setAttribute('aria-hidden','true');
    badge.innerHTML=`<i class="fa-solid ${related?'fa-code-branch':'fa-check'}"></i><span>${related?'Related':'Matched'}</span>`;
    cardWrap.appendChild(badge);

    detail.classList.add('repo-match-detail');
    const kicker=document.createElement('span');
    kicker.className='repo-match-kicker';
    kicker.textContent=related?'Related match':'Matched form';
    detail.prepend(kicker);
  }

  function decorateGuideHeading(heading){
    if(!heading || heading.querySelector('.repo-guide-heading-icon')) return;
    const label=heading.textContent.trim();
    const marker=document.createElement('span');
    marker.className='repo-guide-heading-icon';
    marker.setAttribute('aria-hidden','true');
    marker.innerHTML=`<i class="fa-solid ${guideIcons[label]||'fa-bookmark'}"></i>`;
    heading.prepend(marker);
  }

  function syncGrammarNav(root){
    const grammarActive=!!root?.querySelector('.repo-grammar-page, .repo-grammar-library-grid');
    const repoButton=document.querySelector('.repo-nav-btn');
    const grammarButton=document.querySelector('.grammar-nav-btn');
    if(grammarActive){
      repoButton?.classList.remove('active');
      grammarButton?.classList.add('active');
      grammarButton?.setAttribute('aria-current','page');
      repoButton?.removeAttribute('aria-current');
    }else{
      grammarButton?.classList.remove('active');
      grammarButton?.removeAttribute('aria-current');
    }
  }

  function polishGrammar(){
    const root=document.querySelector('#mainContent');
    if(!root) return;
    root.querySelectorAll('.repo-grammar-card-wrap').forEach(matchBadge);
    root.querySelectorAll(
      '.repo-grammar-page .repo-guide-section > h2,'+
      '.repo-grammar-page .panel > h2'
    ).forEach(decorateGuideHeading);
    syncGrammarNav(root);
  }

  const root=document.querySelector('#mainContent');
  if(!root) return;

  let queued=false;
  const queuePolish=()=>{
    if(queued) return;
    queued=true;
    requestAnimationFrame(()=>{
      queued=false;
      polishGrammar();
    });
  };

  new MutationObserver(queuePolish).observe(root,{childList:true,subtree:true});
  queuePolish();
})();
