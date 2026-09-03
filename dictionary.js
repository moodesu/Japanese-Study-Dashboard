/* Private dictionary references. Dictionary content never belongs in this file. */
window.JLHDictionary=(()=>{
  const BUCKET='japanese-grammar-dictionary';
  const HASH=/^[a-f0-9]{64}$/;
  const IMAGE=/^[a-f0-9]{64}\.png$/;
  const VOLUMES=['Basic','Intermediate','Advanced'];
  let serial=0;
  let session={};
  const reset=()=>{serial++;session={};};
  const active=token=>token===serial&&state.user?.id===session.userId&&state.view==='repository'&&repositoryState.mode==='dictionary';
  const paint=()=>{if(active(serial))renderRepository();};
  const fail=error=>error?.message||'Dictionary request failed. Please try again.';
  const busy=()=>!!(session.loading||session.uploading||session.saving);

  function identity(entry){
    const label=repositoryState.grammarLabel;
    const guide=repositoryGrammarGuide(label,entry);
    return {label,grammar_key:repositoryGrammarKey(label),
      sense:guide?.imported?guide.sense:guide?`builtin:${guide.id}`:`sentence:${entry.id}`};
  }
  function terms(label){
    const key=repositoryGrammarKey(label);
    const results=[key];
    if(key==='てたら'||key==='ていたら')results.push('たら');
    if(key==='てくる')results.push('くる');
    if(key==='と思う'||key==='だと思う')results.push('と','思う');
    return [...new Set(results)].filter(Boolean);
  }
  function referenceMarkup(){
    return '<section class="panel"><h2>Dictionary reference</h2><p>Read A Dictionary of Japanese Grammar separately from your imported explanation.</p><button type="button" class="smallbtn" id="repoDictionaryOpen">Open dictionary reference</button></section>';
  }
  async function open(entry){
    if(!entry||!state.user||!db)return;
    const token=++serial;
    session={...identity(entry),userId:state.user.id,returnScroll:window.scrollY||0,query:'',results:[],loading:true,count:0,error:'',schemaReady:false,linkedId:null};
    repositoryState.mode='dictionary';paint();scrollTo({top:0,behavior:'smooth'});
    try{
      const [catalogue,link]=await Promise.all([
        db.from('japanese_dictionary_entries').select('id',{count:'exact',head:true}).eq('user_id',session.userId),
        db.from('japanese_dictionary_links').select('entry_id').eq('user_id',session.userId).eq('grammar_key',session.grammar_key).eq('sense',session.sense).maybeSingle()
      ]);
      if(!active(token))return;
      if(catalogue.error||link.error)throw catalogue.error||link.error;
      session.schemaReady=true;session.count=catalogue.count||0;session.linkedId=link.data?.entry_id||null;session.loading=false;
      if(session.linkedId)await read(session.linkedId);
      else if(session.count)await search(terms(session.label)[0]);
      else {session.setup=true;paint();}
    }catch(error){if(active(token)){session.loading=false;session.error=fail(error);paint();}}
  }
  function back(){
    if(session.uploading){toast('Wait for dictionary setup to finish before leaving this page.');return;}
    const position=session.returnScroll;
    serial++;session={};repositoryState.mode='grammar';renderRepository();
    $('#repoDictionaryOpen')?.focus({preventScroll:true});scrollTo({top:position||0,behavior:'auto'});
  }
  async function search(query){
    if(busy())return;
    const token=++serial;
    session.query=String(query||'').trim().slice(0,100);session.loading=true;session.error='';session.reader=null;session.setup=false;session.urls=[];paint();
    try{
      const {data,error}=await db.rpc('search_japanese_dictionary',{p_query:session.query});
      if(!active(token))return;
      if(error)throw error;
      session.results=data||[];
    }catch(error){if(active(token))session.error=fail(error);}
    finally{if(active(token)){session.loading=false;paint();$('#dictionaryQuery')?.focus();}}
  }
  async function read(id){
    if(busy()||!HASH.test(id))return;
    const token=++serial;
    session.reader=null;session.urls=[];session.loading=true;session.error='';session.setup=false;session.imageError='';paint();
    try{
      const {data,error}=await db.from('japanese_dictionary_entries').select('*').eq('user_id',session.userId).eq('id',id).single();
      if(!active(token))return;
      if(error)throw error;
      session.reader=data;session.readings=null;session.readingsError='';
      await Promise.all([imageUrls(token),loadReadings(token,data.id)]);
    }catch(error){if(active(token))session.error=fail(error);}
    finally{if(active(token)){session.loading=false;paint();$('#dictionaryTitle')?.focus();}}
  }
  async function imageUrls(token){
    const files=session.reader?.image_files||[];
    if(files.some(x=>!IMAGE.test(x)))throw new Error('This entry contains an invalid image reference.');
    if(!files.length)return;
    const paths=files.map(x=>`${session.userId}/${x}`);
    const {data,error}=await db.storage.from(BUCKET).createSignedUrls(paths,300);
    if(!active(token))return;
    if(error){session.imageError=fail(error);return;}
    // Only use responses for the exact requested paths; never accept URLs from entry HTML.
    session.urls=paths.map(path=>{
      const row=(data||[]).find(x=>x.path===path);
      if(!row?.signedUrl||row.error)return null;
      try {const url=new URL(row.signedUrl);return url.protocol==='https:'?url.href:null;}catch{return null;}
    });
    if(session.urls.some(x=>!x))session.imageError='Some reference images are unavailable. Complete dictionary setup or refresh the image links.';
  }
  async function loadReadings(token,id){
    try{
      const {data,error}=await db.from('japanese_dictionary_readings').select('readings').eq('user_id',session.userId).eq('entry_id',id).maybeSingle();
      if(!active(token))return;
      if(error)throw error;
      if(data?.readings){validateReadings(data.readings);session.readings=data.readings;}
    }catch(error){if(active(token))session.readingsError='Furigana could not be loaded. Check your connection and that migrations/20260903_dictionary_readings.sql has been applied. The original dictionary is still available.';}
  }

  // Annotations contain only text offsets and kana, never HTML. They cannot
  // replace source text. A mismatch safely falls back to the original node.
  function readingTextNodes(root){
    const nodes=[];
    function walk(node){
      if(node.nodeType===3){nodes.push(node);return;}
      if(node.nodeType!==1||['ruby','rt','rp'].includes(node.localName))return;
      for(const child of Array.from(node.childNodes))walk(child);
    }
    for(const child of Array.from(root.childNodes))walk(child);
    return nodes;
  }
  function validateReadingNode(node){
    if(!node||typeof node.text!=='string'||node.text.length>100000||!Array.isArray(node.spans)||node.spans.length>5000)throw new Error('Invalid furigana text.');
    let previous=0;
    for(const span of node.spans){
      if(!Array.isArray(span)||span.length!==3||!Number.isInteger(span[0])||!Number.isInteger(span[1])||span[0]<previous||span[1]<=span[0]||span[1]>node.text.length||typeof span[2]!=='string'||!/^[ぁ-ゖァ-ヺー]{1,100}$/.test(span[2])||!/[\p{Script=Han}々〆]/u.test(node.text.slice(span[0],span[1])))throw new Error('Invalid furigana span.');
      previous=span[1];
    }
  }
  function validateReadings(value){
    if(!value||value.version!==1||typeof value.generator!=='string'||value.generator.length>100||!Array.isArray(value.body)||value.body.length>5000||new TextEncoder().encode(JSON.stringify(value)).length>400000)throw new Error('Invalid furigana data.');
    validateReadingNode(value.headword);
    const indexes=new Set();
    for(const node of value.body){
      if(!Number.isInteger(node.index)||node.index<0||node.index>20000||indexes.has(node.index))throw new Error('Invalid furigana text index.');
      indexes.add(node.index);validateReadingNode(node);
    }
    return value;
  }
  function applyReading(node,annotation){
    if(!annotation||node.textContent!==annotation.text)return;
    const fragment=document.createDocumentFragment();let start=0;
    for(const [from,to,reading] of annotation.spans){
      fragment.appendChild(document.createTextNode(annotation.text.slice(start,from)));
      const ruby=document.createElement('ruby'),rt=document.createElement('rt');
      ruby.appendChild(document.createTextNode(annotation.text.slice(from,to)));rt.textContent=reading;ruby.appendChild(rt);fragment.appendChild(ruby);start=to;
    }
    fragment.appendChild(document.createTextNode(annotation.text.slice(start)));node.replaceWith(fragment);
  }
  function readingMarkup(html,readings,headword=false,show=repositoryState.showFurigana){
    const root=document.createElement('div');root.innerHTML=headword?esc(html):safeHtml(html);
    if(show&&readings){
      try{
        validateReadings(readings);
        const nodes=readingTextNodes(root);
        if(headword){if(nodes[0])applyReading(nodes[0],readings.headword);}
        else for(const annotation of readings.body)if(nodes[annotation.index])applyReading(nodes[annotation.index],annotation);
      }catch{/* Invalid overlays never prevent reading the original entry. */}
    }
    if(!show)root.querySelectorAll('rt,rp').forEach(node=>node.remove());
    return root.innerHTML;
  }
  function readingsSetupMarkup(disabled){
    return `<section class="panel"><h2>Add dictionary furigana</h2><p>Choose <code>dictionary-readings.json</code> from the separate furigana data download. This adds automatically generated readings to your existing entries without uploading images or changing saved references.</p><label>Furigana data <input id="dictionaryReadingsFile" type="file" accept=".json,application/json" ${disabled}></label><p id="dictionaryReadingsSummary">Choose the file, then confirm the upload.</p><button type="button" class="smallbtn primary" id="dictionaryReadingsInstall" disabled>Upload furigana only</button><p id="dictionaryReadingsProgress" role="status" aria-live="polite"></p></section>`;
  }
  function validateReadingsFile(raw){
    if(raw?.format!=='jlh-dictionary-readings-v1'||!Array.isArray(raw.entries)||!raw.entries.length||raw.entries.length>2000)throw new Error('Choose the dictionary-readings.json file from the furigana data download.');
    const ids=new Set();
    for(const row of raw.entries){
      if(!row||!HASH.test(row.entry_id)||ids.has(row.entry_id))throw new Error('Invalid or duplicate dictionary ID in furigana data.');
      ids.add(row.entry_id);validateReadings(row.readings);
    }
    return raw.entries;
  }
  async function prepareReadings(){
    if(busy())return;
    const token=++serial;session.preparedReadings=null;
    const button=$('#dictionaryReadingsInstall');button.disabled=true;
    try{
      const files=Array.from($('#dictionaryReadingsFile').files||[]);
      if(files.length!==1||files[0].size>20000000)throw new Error('Choose one furigana JSON file, up to 20 MB.');
      const entries=validateReadingsFile(JSON.parse(await files[0].text()));
      if(!active(token))return;
      session.preparedReadings=entries;
      $('#dictionaryReadingsSummary').textContent=`${entries.length} entries ready. No images will be uploaded. Readings are automatic and may contain mistakes.`;button.disabled=false;
    }catch(error){if(active(token))$('#dictionaryReadingsSummary').textContent=fail(error);}
  }
  async function installReadings(){
    if(busy()||!session.preparedReadings||!session.schemaReady)return;
    const token=++serial,entries=session.preparedReadings,userId=session.userId;
    session.uploading=true;session.error='';
    document.querySelectorAll('.dictionary-page button,.dictionary-page input').forEach(node=>node.disabled=true);
    const check=()=>{if(!active(token))throw new Error('Furigana setup stopped because the session or page changed.');};
    try{
      // Preflight ownership and availability before the first write. Only IDs,
      // not dictionary text or images, are fetched for this check.
      const existing=new Set();
      for(let start=0;start<entries.length;start+=100){
        const {data,error}=await db.from('japanese_dictionary_entries').select('id').eq('user_id',userId).in('id',entries.slice(start,start+100).map(x=>x.entry_id));
        check();if(error)throw error;for(const row of data||[])existing.add(row.id);
      }
      if(entries.some(row=>!existing.has(row.entry_id)))throw new Error('Install the matching dictionary data first; some entries in this furigana file are not in your dictionary.');
      for(let start=0;start<entries.length;start+=25){
        const {error}=await db.from('japanese_dictionary_readings').upsert(entries.slice(start,start+25).map(row=>({user_id:userId,entry_id:row.entry_id,readings:row.readings})),{onConflict:'user_id,entry_id'});
        check();if(error)throw error;
        $('#dictionaryReadingsProgress').textContent=`Furigana ready: ${Math.min(start+25,entries.length)}/${entries.length}`;
      }
      session.uploading=false;session.preparedReadings=null;session.setup=false;
      toast('Dictionary furigana added. Use the Furigana toggle in the reader.');
      if(session.reader)await read(session.reader.id);else await search(terms(session.label)[0]);
    }catch(error){if(active(token)){session.error=fail(error)+' Apply migrations/20260903_dictionary_readings.sql if needed, then select the file and retry. Completed batches are safe to repeat.';session.uploading=false;session.preparedReadings=null;paint();}}
    finally{if(token===serial)session.uploading=false;}
  }
  async function refreshImages(){
    if(busy()||!session.reader)return;
    const token=++serial;session.loading=true;session.imageError='';
    try{await imageUrls(token);}catch(error){if(active(token))session.imageError=fail(error);}
    finally{if(active(token)){session.loading=false;paint();}}
  }
  async function saveLink(remove=false){
    if(busy()||(!remove&&!session.reader))return;
    const token=serial,userId=session.userId;
    session.saving=true;session.error='';paint();
    try{
      let result;
      if(remove)result=await db.from('japanese_dictionary_links').delete().eq('user_id',userId).eq('grammar_key',session.grammar_key).eq('sense',session.sense);
      else result=await db.from('japanese_dictionary_links').upsert({user_id:userId,grammar_key:session.grammar_key,sense:session.sense,entry_id:session.reader.id},{onConflict:'user_id,grammar_key,sense'});
      if(!active(token))return;
      if(result.error)throw result.error;
      session.linkedId=remove?null:session.reader.id;toast(remove?'Dictionary reference removed':'Dictionary reference saved for this grammar meaning');
    }catch(error){if(active(token))session.error=fail(error);}
    finally{if(active(token)){session.saving=false;paint();}}
  }

  // Rebuild an allowlisted DOM in an inert template: no scripts, styles, URLs,
  // event handlers, embedded documents or network-fetching tags survive.
  function safeHtml(html){
    const template=document.createElement('template');template.innerHTML=String(html||'');
    const out=document.createElement('div');
    const allowed=new Set('div p span br table tbody thead tr td th ul ol li b strong em i u small sup sub ruby rt rp'.split(' '));
    const blocked=new Set('script style link img iframe object embed svg math template audio video source form input button'.split(' '));
    const classes=new Set('header edition pos sub-header meaning related counterpart formation concept cloze politeness antonym bold'.split(' '));
    function copy(node,parent){
      if(node.nodeType===3){parent.appendChild(document.createTextNode(node.textContent));return;}
      if(node.nodeType!==1)return;
      const tag=node.localName.toLowerCase();if(blocked.has(tag))return;
      const target=allowed.has(tag)?document.createElement(tag):parent;
      if(target!==parent){
        const safe=(node.getAttribute('class')||'').split(/\s+/).filter(x=>classes.has(x));
        if(safe.length)target.className=safe.join(' ');
        for(const attr of ['rowspan','colspan'])if(['td','th'].includes(tag)&&/^[1-9]\d?$/.test(node.getAttribute(attr)||''))target.setAttribute(attr,node.getAttribute(attr));
        parent.appendChild(target);
      }
      for(const child of Array.from(node.childNodes))copy(child,target);
    }
    for(const node of Array.from(template.content.childNodes))copy(node,out);
    return out.innerHTML;
  }
  function markup(){
    const disabled=busy()?'disabled':'';
    let body='';
    if(!session.schemaReady&&!session.loading)body='<section class="panel"><h2>Dictionary setup required</h2><p>Apply <code>migrations/20260903_private_dictionary.sql</code> in Supabase, then return here. Existing grammar explanations are unchanged.</p></section>';
    else if(session.setup)body=`<section class="panel"><h2>Set up your private dictionary</h2><p>Extract <code>Japanese-Dictionary-private-data.zip</code> outside your Git/Netlify project. Select its <code>private-dictionary-data</code> folder below. This uploads the entries and PNG images to your signed-in account’s private Supabase storage.</p><p>Keep this page open during setup. A retry resumes missing content without duplicating entries or replacing existing files.</p><label>Dictionary folder <input id="dictionaryFolder" type="file" webkitdirectory multiple ${disabled}></label><p id="dictionarySetupSummary">Choose the extracted folder to continue.</p><button type="button" class="smallbtn primary" id="dictionaryInstall" disabled>Upload to my private dictionary</button><p id="dictionaryProgress" role="status" aria-live="polite">${esc(session.progress||'')}</p></section>`;
    else if(session.reader){
      const entry=session.reader;
      body=`<section class="panel"><div class="dictionary-actions"><button class="smallbtn" id="dictionaryResults" ${disabled}>← Search results</button><button class="smallbtn primary" id="dictionaryLink" ${disabled||session.linkedId===entry.id?'disabled':''}>${session.linkedId===entry.id?'Saved reference':'Use this entry for '+esc(session.label)}</button>${session.linkedId?`<button class="smallbtn" id="dictionaryUnlink" ${disabled}>Remove saved reference</button>`:''}</div><h2 id="dictionaryTitle" tabindex="-1">${readingMarkup(entry.headword,session.readings,true)}</h2><p class="subtitle">A Dictionary of Japanese Grammar · ${esc(entry.volume)} · Dictionary source, separate from the AI explanation</p><p class="dictionary-reading-note">${session.readings?'Furigana is automatically generated and unverified; names and ambiguous words may be misread.':'Furigana has not been added for this entry. Open Dictionary setup to upload the readings-only file.'}</p>${session.readingsError?`<p role="status">${esc(session.readingsError)}</p>`:''}<div class="dictionary-body">${readingMarkup(entry.body_html,session.readings)}</div></section>${entry.image_files.length?`<section class="panel"><h2>Notes and reference images</h2><p>These are original images; their text and readings cannot follow the app’s furigana toggle.</p><div class="dictionary-actions"><label>Image size <select id="dictionaryZoom"><option value="100">Fit width</option><option value="150">150%</option><option value="200">200%</option></select></label><button class="smallbtn" id="dictionaryRefreshImages" ${disabled}>Refresh image links</button></div>${session.imageError?`<p role="alert">${esc(session.imageError)}</p>`:''}${(session.urls||[]).map((url,i)=>url?`<div class="dictionary-image-scroll"><img class="dictionary-scan" src="${esc(url)}" alt="Dictionary notes for ${esc(entry.headword)}, image ${i+1}" referrerpolicy="no-referrer"></div>`:'').join('')}</section>`:''}`;
    }else if(session.schemaReady)body=`<section class="panel"><form id="dictionarySearch"><label>Find a dictionary entry <input id="dictionaryQuery" maxlength="100" value="${esc(session.query||'')}" ${disabled}></label><button class="smallbtn" ${disabled}>Search</button></form><div class="dictionary-actions">${terms(session.label).map(term=>`<button class="smallbtn" data-dictionary-term="${esc(term)}" ${disabled}>${esc(term)}</button>`).join('')}${session.linkedId?`<button class="smallbtn" id="dictionarySaved" ${disabled}>Open saved reference</button>`:''}</div><p>Suggestions are not automatic links. Open an entry and confirm that its meaning fits your sentence.</p>${(session.results||[]).map(row=>`<button type="button" class="repo-link dictionary-result" data-dictionary-entry="${esc(row.id)}" ${disabled}><strong>${esc(row.headword)} · ${esc(row.volume)}</strong><span>${esc(row.summary)}</span></button>`).join('')}${!session.loading&&!session.results?.length?'<p>No matching entries. Try a base form or shorter label. For example, look up たら for 〜てたら.</p>':''}${session.results?.length===30?'<p>Showing the first 30 matches. Narrow your search for more specific results.</p>':''}</section>`;
    if(session.setup&&session.schemaReady)body+=readingsSetupMarkup(disabled);
    return `<section class="repo-page dictionary-page"><div class="repo-detail-toolbar"><button class="smallbtn" id="dictionaryBack" ${session.uploading?'disabled':''}>← Back to grammar</button>${session.reader&&!session.setup&&!session.uploading?repositoryFuriganaToggle():''}${session.schemaReady?`<button class="smallbtn" id="dictionarySetup" ${disabled}>Dictionary setup</button>`:''}</div><h1>Dictionary reference: ${esc(session.label||'')}</h1><p class="subtitle">${session.count||0} private entries · ${session.sense?.startsWith('sentence:')?'Reference applies to this sentence only until it has a grammar guide.':'Reference is shared by this grammar meaning.'}</p>${session.error?`<p class="panel" role="alert">${esc(session.error)}</p>`:''}${session.loading?'<p role="status">Loading dictionary…</p>':''}${body}</section>`;
  }
  function bind(){
    $('#dictionaryReadingsFile')?.addEventListener('change',prepareReadings);
    $('#dictionaryReadingsInstall')?.addEventListener('click',installReadings);
    $('#dictionaryBack')?.addEventListener('click',back);
    $('#dictionarySearch')?.addEventListener('submit',event=>{event.preventDefault();search($('#dictionaryQuery').value);});
    document.querySelectorAll('[data-dictionary-entry]').forEach(x=>x.onclick=()=>read(x.dataset.dictionaryEntry));
    document.querySelectorAll('[data-dictionary-term]').forEach(x=>x.onclick=()=>search(x.dataset.dictionaryTerm));
    $('#dictionarySaved')?.addEventListener('click',()=>read(session.linkedId));
    $('#dictionaryResults')?.addEventListener('click',()=>search(session.query||terms(session.label)[0]));
    $('#dictionaryLink')?.addEventListener('click',()=>saveLink());
    $('#dictionaryUnlink')?.addEventListener('click',()=>saveLink(true));
    $('#dictionarySetup')?.addEventListener('click',()=>{if(!busy()){session.setup=true;session.error='';paint();}});
    $('#dictionaryRefreshImages')?.addEventListener('click',refreshImages);
    $('#dictionaryZoom')?.addEventListener('change',event=>{
      const size=Number(event.target.value);
      if(![100,150,200].includes(size))return;
      document.querySelectorAll('.dictionary-scan').forEach(img=>{img.style.width=size+'%';img.style.maxWidth='none';});
    });
    document.querySelectorAll('.dictionary-scan').forEach(img=>img.addEventListener('error',()=>{session.imageError='Image could not load. Use Refresh image links, or complete dictionary setup if it was interrupted.';const note=document.createElement('p');note.textContent=session.imageError;img.replaceWith(note);}));
    $('#dictionaryFolder')?.addEventListener('change',prepareSetup);
    $('#dictionaryInstall')?.addEventListener('click',install);
  }

  function validateManifest(raw){
    if(raw?.format!=='jlh-private-dictionary-v1'||!Array.isArray(raw.entries)||!raw.entries.length||raw.entries.length>2000)throw new Error('Select the converted Learning Hub dictionary folder, not the original MDX ZIP.');
    const ids=new Set();
    for(const row of raw.entries){
      if(!row||!HASH.test(row.id)||ids.has(row.id)||typeof row.headword!=='string'||!row.headword||row.headword.length>300||!VOLUMES.includes(row.volume)||typeof row.summary!=='string'||typeof row.body_html!=='string'||new TextEncoder().encode(row.body_html).length>200000||!Array.isArray(row.aliases)||row.aliases.length>100||row.aliases.some(x=>typeof x!=='string')||!Array.isArray(row.image_files)||row.image_files.length>20||row.image_files.some(x=>!IMAGE.test(x)))throw new Error('Invalid or duplicate dictionary entry in the setup file.');
      ids.add(row.id);
    }
    return raw.entries;
  }
  async function prepareSetup(){
    const token=++serial;session.prepared=null;
    const button=$('#dictionaryInstall');button.disabled=true;
    try{
      const files=Array.from($('#dictionaryFolder').files||[]);
      const manifests=files.filter(f=>f.name==='dictionary-data.json');
      if(manifests.length!==1||manifests[0].size>10000000)throw new Error('Choose the folder containing exactly one dictionary-data.json and its images.');
      const entries=validateManifest(JSON.parse(await manifests[0].text()));
      if(!active(token))return;
      const images=new Map();
      for(const f of files)if(IMAGE.test(f.name)){
        if(images.has(f.name))throw new Error('The chosen folder contains duplicate image names.');
        images.set(f.name,f);
      }
      const needed=[...new Set(entries.flatMap(x=>x.image_files))];
      for(const name of needed)if(!images.has(name)||images.get(name).size>5242880)throw new Error('A required PNG is missing or exceeds 5 MB. Choose the complete extracted folder.');
      session.prepared={entries,images,needed};
      $('#dictionarySetupSummary').textContent=`${entries.length} entries and ${needed.length} images ready. Other files will be ignored. Nothing is uploaded until you click Upload.`;
      button.disabled=false;
    }catch(error){if(active(token))$('#dictionarySetupSummary').textContent=fail(error);}
  }
  async function digest(bytes){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');}
  async function install(){
    if(busy()||!session.prepared||!session.schemaReady)return;
    const token=++serial,{entries,images,needed}=session.prepared,userId=session.userId;
    session.uploading=true;session.error='';
    $('#dictionaryInstall').disabled=true;$('#dictionaryFolder').disabled=true;$('#dictionaryBack').disabled=true;
    const progress=message=>{if(active(token)){session.progress=message;$('#dictionaryProgress').textContent=message;}};
    const check=()=>{if(!active(token))throw new Error('Dictionary setup stopped because the session or page changed.');};
    try{
      // Validate all image bytes before the first external write. No script or other resource is uploaded.
      let verified=0;
      for(const name of needed){
        check();const bytes=new Uint8Array(await images.get(name).arrayBuffer());
        if(![137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v)||await digest(bytes)!==name.slice(0,64))throw new Error('An image is corrupt or does not match its content hash. Re-extract the private-data ZIP.');
        progress(`Checking images: ${++verified}/${needed.length}`);
      }
      check();
      const stored=new Set();
      for(let offset=0;;offset+=1000){
        const {data,error}=await db.storage.from(BUCKET).list(userId,{limit:1000,offset,sortBy:{column:'name',order:'asc'}});
        check();if(error)throw error;
        for(const item of data||[])if(item.id)stored.add(item.name);
        if(!data||data.length<1000)break;
      }
      let completed=0;
      // Bounded sequential uploads allow safe resumption and avoid publishing any data by accident.
      for(const name of needed){
        check();
        if(!stored.has(name)){
          const {error}=await db.storage.from(BUCKET).upload(`${userId}/${name}`,images.get(name),{contentType:'image/png',upsert:false,cacheControl:'300'});
          check();if(error)throw error;
        }
        progress(`Images ready: ${++completed}/${needed.length}`);
      }
      for(let start=0;start<entries.length;start+=50){
        check();
        const batch=entries.slice(start,start+50).map(row=>({user_id:userId,id:row.id,headword:row.headword,volume:row.volume,aliases:row.aliases,summary:row.summary,body_html:safeHtml(row.body_html),image_files:row.image_files}));
        const {error}=await db.from('japanese_dictionary_entries').upsert(batch,{onConflict:'user_id,id',ignoreDuplicates:true});
        check();if(error)throw error;
        progress(`Entries ready: ${Math.min(start+50,entries.length)}/${entries.length}`);
      }
      session.count=entries.length;session.prepared=null;session.uploading=false;session.setup=false;
      toast('Private dictionary setup complete');await search(terms(session.label)[0]);
    }catch(error){if(active(token)){session.error=fail(error)+' Setup may be incomplete. Select the same folder and retry to resume.';session.uploading=false;session.prepared=null;paint();}}
    finally{if(token===serial)session.uploading=false;}
  }
  window.addEventListener('beforeunload',event=>{if(session.uploading){event.preventDefault();event.returnValue='';}});
  return {reset,open,markup,bind,referenceMarkup,safeHtml,validateManifest,terms,identity,readingTextNodes,readingMarkup,validateReadings,validateReadingsFile};
})();
