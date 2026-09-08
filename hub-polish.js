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
