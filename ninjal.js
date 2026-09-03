// NINJAL grammar resources: inert, attributed snapshot; no private data or API calls.
(function(){
  'use strict';
  const SOURCE='https://doi.org/10.15084/0002000610';
  const SITE='https://www2.ninjal.ac.jp/bunkeibank/';
  const LICENSE='https://creativecommons.org/licenses/by/4.0/';
  const DATA_URL=new URL('assets/ninjal-bunkei.json',document.baseURI).href;
  let pending=null;
  const panels=new WeakMap();
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const plain=value=>String(value??'').replace(/〓([^〓〔〕]+)〔([^〕]*)〕/gu,'$1').replace(/<\/?s>|[｛｝]/gu,'');
  const key=value=>plain(value).normalize('NFKC').trim().replace(/^[~〜～]+/u,'').replace(/\s+/gu,'').toLowerCase();
  // Explicit textbook labels only. Never strip English meaning hints and then
  // silently attach a different use of の, そうだ, ようだ, etc.
  const aliases={
    '～時 [when]':['〜とき'],
    '～みたい／よう [resemblance]':['〜みたいだ（比喩）','〜ようだ（比喩）'],
    'V-てから [after V-ing]':['〜てから'],
    'potential forms of verbs':['〜れる・〜られる（可能）','〜ことができる'],
    'V前に / V後で':['〜前に','〜後で'],
    '～たら [if/when]':['〜たら'],
    '～みたい／よう [conjecture]':['〜みたいだ（推量）','〜ようだ（推量）'],
    "volitional forms / V-ようと思う [think I'll V]":['〜う・〜よう','〜うと思う・〜ようと思う'],
    '～そうだ [hearsay]':['〜そうだ（伝聞）'],
    '～ながら [simultaneous actions]':['〜ながら'],
    '～てはいけない [prohibition]':['〜てはいけない'],
    '～なくてはいけない [obligation]':['〜なくてはいけない'],
    '～なくてもいい [lack of obligation]':['〜なくてもいい'],
    'intransitive verb＋ている [resulting state]':['〜ている'],
    'transitive verb＋てある [purposeful state]':['〜てある'],
    '～てしまう [regret/completion]':['〜てしまう'],
    '～かもしれない [possibility]':['〜かもしれない'],
    'S1し、S2し [multiple reasons]':['〜し'],
    '～たらどうですか [suggestion]':['〜たらどうですか'],
    '～ましょうか [offer]':['〜ましょうか'],
    '～てあげる／くれる／もらう':['〜てあげる','〜てくれる','〜てもらう'],
    '～た／～ない方がいい':['〜ほうがいい'],
    '～やすい／にくい':['〜やすい','〜にくい'],
    '～て [reason]':['〜て（接続）'],
    'passive forms':['〜れる・〜られる（受身）'],
    '～しか～ない [only]':['〜しか〜ない'],
    'Vつもり':['〜つもりだ'],
    '間／間に [while]':['〜間','〜間に'],
    '～ので [reason]':['〜ので'],
    'causative forms and sentences':['〜せる・〜させる'],
    '～と [conditional]':['〜と（条件）'],
    '～といいですね／～といいんですが':['〜といい（願望）'],
    '～ために [purpose]':['〜ために（目的）'],
    'Vまで / Vまでに':['〜まで','〜までに'],
    'V-ますなさい [mild commands]':['〜なさい'],
    'causative-passive sentences':['〜される・〜せられる・〜させられる'],
    '～はずだ [expectation]':['〜はずだ'],
    'honorific expressions':['〜れる・〜られる（尊敬）'],
    'おV-ますください / お・ごVNください':['お〜ください','ご〜ください'],
    '～ても [even]':['〜ても'],
    'Vようになる [come to V]':['〜ようになる'],
    'Vことにする / Vことにしている':['〜ことにする','〜ことにしている'],
    '～なら [conditional]':['〜なら'],
    '～でしょう／だろう [conjecture]':['〜でしょう']
  };
  const aliasIndex=new Map(Object.entries(aliases).map(([label,ids])=>[key(label),ids]));
  const related=new Map([
    ['てたら',{ids:['〜たら'],note:'Related reference: 〜てたら is a contraction of 〜ていたら. This entry explains たら; it is not an exact match for the complete expression.'}],
    ['ていたら',{ids:['〜たら'],note:'Related reference: this entry explains たら, not the whole 〜ていたら construction.'}]
  ]);

  function rich(value){
    // Recognise only source ruby, emphasis and exact <s> tokens. All other
    // source text is escaped; XML/HTML from the dataset is never injected.
    const input=String(value??'');
    const tokens=/〓([^〓〔〕]+)〔([^〕]*)〕|(<\/?s>)|([｛｝])/gu;
    const stack=[];let out='',cursor=0;
    for(const match of input.matchAll(tokens)){
      out+=escape(input.slice(cursor,match.index));cursor=match.index+match[0].length;
      if(match[1]!==undefined) out+=`<ruby>${escape(match[1])}<rt>${escape(match[2])}</rt></ruby>`;
      else {
        const token=match[0],tag=token.includes('s')?'s':'strong',closing=token==='</s>'||token==='｝';
        if(!closing){out+=`<${tag}>`;stack.push(tag);}
        else if(stack.at(-1)===tag){out+=`</${stack.pop()}>`;}
      }
    }
    out+=escape(input.slice(cursor));
    while(stack.length)out+=`</${stack.pop()}>`;
    return out;
  }

  async function load(){
    if(!pending)pending=(async()=>{
      const response=await fetch(DATA_URL,{credentials:'omit'});
      if(!response.ok)throw new Error('NINJAL data unavailable');
      const data=await response.json();
      if(data.version!=='2026.01'||data.entries?.length!==800||!data.entries.every(e=>typeof e.id==='string'&&Array.isArray(e.senses)))throw new Error('Invalid NINJAL dataset');
      return data;
    })().catch(error=>{pending=null;throw error;});
    return pending;
  }

  function matchEntries(data,query,allowPartial=false){
    const term=key(query);
    if(!term)return {entries:[],note:'Enter a grammar pattern, for example てくる or たら.'};
    const mapped=aliasIndex.get(term);
    if(mapped)return {entries:mapped.map(id=>data.entries.find(e=>e.id===id)).filter(Boolean),note:'References mapped to this lesson topic. Check the separate meanings below; this is not an automatic match to a sentence.'};
    const relation=related.get(term);
    if(relation)return {entries:data.entries.filter(e=>relation.ids.includes(e.id)),note:relation.note};
    const exact=data.entries.filter(e=>[e.id,e.pattern,e.reading].some(v=>{
      const full=key(v);return full===term||full.replace(/\([^)]*\)$/u,'')===term;
    }));
    if(exact.length)return {entries:exact,note:'Matching pattern headings. Choose the intended use; examples are kept within their source meaning and formation.'};
    if(allowPartial&&term.length>=2){
      const hits=data.entries.filter(e=>[e.id,e.pattern,e.reading].some(v=>key(v).includes(term)));
      return {entries:hits.slice(0,15),note:hits.length?`Related headings, not confirmed equivalents. ${hits.length>15?'Showing the first 15 matches; refine the pattern to narrow them down.':''}`:'No matching pattern heading in this snapshot. Try a standard Japanese form or browse the source site.'};
    }
    return {entries:[],note:'No exact reference mapped for this label. Search a standard Japanese grammar form below. Broad textbook topics are not automatically equated with similarly named patterns.'};
  }

  function attribution(){
    return `<p class="ninjal-credit">Source: <a href="${SOURCE}" target="_blank" rel="noopener noreferrer">NINJAL · 日本語文型データベース 2026.01</a> · Prashant Pardeshi / Yuriko Sunakawa · <a href="${LICENSE}" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>. Converted from XML for the Hub; original Japanese and supplied readings retained. English interface labels are Hub additions. No English translations added.</p>`;
  }

  function exampleMarkup(example){
    return `<li class="ninjal-example">${example.scene?`<p class="ninjal-scene" lang="ja">${rich(example.scene)}</p>`:''}<p lang="ja">${rich(example.text)}</p>${example.note?`<p class="ninjal-note" lang="ja">${rich(example.note)}</p>`:''}</li>`;
  }

  function entryMarkup(entry){
    return `<article class="ninjal-entry"><h4 lang="ja">${rich(entry.pattern)}</h4><a href="${SITE}headwords/${encodeURIComponent(entry.id)}.html" target="_blank" rel="noopener noreferrer">View original entry ↗</a>${entry.explanation?`<p lang="ja">${rich(entry.explanation)}</p>`:''}
      ${entry.senses.map(sense=>`<details class="ninjal-sense"><summary>Meaning ${escape(sense.id)} · <span lang="ja">${rich(sense.category)}</span></summary>
        <div class="ninjal-sense-body"><p lang="ja">${rich(sense.usage)}</p>
        ${sense.notes.map(note=>`<p class="ninjal-note"><strong>${escape(note.label)}:</strong> <span lang="ja">${rich(note.text)}</span></p>`).join('')}
        ${sense.connections.map(connection=>`<section class="ninjal-connection"><h5>Formation · <span lang="ja">${rich(connection.form)}</span></h5>
          <ol>${connection.examples.slice(0,3).map(exampleMarkup).join('')}</ol>
          ${connection.examples.length>3?`<details><summary>Show ${connection.examples.length-3} more examples</summary><ol start="4">${connection.examples.slice(3).map(exampleMarkup).join('')}</ol></details>`:''}
        </section>`).join('')}</div></details>`).join('')}
    </article>`;
  }

  function panelMarkup(label){
    return `<details class="ninjal-panel" data-ninjal-label="${escape(label)}"><summary>NINJAL grammar resources &amp; examples</summary><div class="ninjal-body"><p>Open to load Japanese explanations and examples with source furigana.</p></div></details>`;
  }

  function paint(panel,query,manual=false){
    const cache=panels.get(panel);if(!cache?.data)return;
    const result=matchEntries(cache.data,query,manual);
    cache.query=query;cache.manual=manual;
    panel.querySelector('.ninjal-body').innerHTML=`
      <p class="ninjal-context">For: ${escape(panel.dataset.ninjalLabel)}</p>
      <form class="ninjal-search"><label>Find a grammar pattern<input name="pattern" type="search" value="${escape(query)}" placeholder="例：てくる、たら" maxlength="160"></label><button class="smallbtn" type="submit">Search patterns</button></form>
      <label class="ninjal-toggle"><input type="checkbox" data-ninjal-furigana ${cache.furigana?'checked':''}> Show source furigana</label>
      <p class="ninjal-status" role="status">${escape(result.note)}</p>
      <div class="ninjal-results">${result.entries.map(entryMarkup).join('')}</div>
      <p><a href="${SITE}" target="_blank" rel="noopener noreferrer">Browse Bunkeibank ↗</a></p>${attribution()}`;
    panel.classList.toggle('ninjal-no-furigana',!cache.furigana);
  }

  async function openPanel(panel){
    if(panels.get(panel)?.data||panels.get(panel)?.loading)return;
    const cache={loading:true,furigana:true};panels.set(panel,cache);
    const body=panel.querySelector('.ninjal-body');
    body.innerHTML='<p role="status">Loading NINJAL grammar examples…</p>';
    try{
      cache.data=await load();cache.loading=false;
      if(!panel.isConnected)return;
      paint(panel,panel.dataset.ninjalLabel);
    }catch(error){
      cache.loading=false;
      if(panel.isConnected)body.innerHTML=`<p role="status">Examples could not be loaded. Your lesson and saved grammar are unchanged.</p><button class="smallbtn" type="button" data-ninjal-retry>Retry</button><p><a href="${SITE}" target="_blank" rel="noopener noreferrer">Open Bunkeibank ↗</a></p>`;
    }
  }

  document.addEventListener('toggle',event=>{
    if(event.target.matches?.('.ninjal-panel')&&event.target.open)openPanel(event.target);
  },true);
  document.addEventListener('click',event=>{
    const retry=event.target.closest?.('[data-ninjal-retry]');if(retry)openPanel(retry.closest('.ninjal-panel'));
  });
  document.addEventListener('submit',event=>{
    if(!event.target.matches?.('.ninjal-search'))return;
    event.preventDefault();const panel=event.target.closest('.ninjal-panel');
    const query=event.target.querySelector('[name="pattern"]').value.trim();
    paint(panel,query,true);panel.querySelector('[name="pattern"]')?.focus({preventScroll:true});
  });
  document.addEventListener('change',event=>{
    if(!event.target.matches?.('[data-ninjal-furigana]'))return;
    const panel=event.target.closest('.ninjal-panel'),cache=panels.get(panel);
    if(cache){cache.furigana=event.target.checked;panel.classList.toggle('ninjal-no-furigana',!cache.furigana);}
  });
  window.JLHNinjal={panelMarkup,matchEntries,rich,plain,aliases,load};
})();
