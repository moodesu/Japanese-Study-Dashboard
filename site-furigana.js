// One persistent furigana control for supplied ruby and plain Japanese text.
(function(){
  'use strict';
  const STORAGE_KEY='siteShowFurigana';
  const DICT_URL=new URL('vendor/kuromoji-dict/',document.baseURI).href;
  const HAN=/[\p{Script=Han}々〆]/u;
  const KANA=/^[ぁ-ゖァ-ヺー]$/u;
  const EXCLUDED='ruby,rt,rp,script,style,textarea,input,select,option,code,pre,[contenteditable="true"],.no-auto-furigana';
  let enabled=initialValue(),tokenizer=null,pending=null,generation=0,observer=null,scheduled=false;

  function initialValue(){
    try{
      const saved=localStorage.getItem(STORAGE_KEY);
      if(saved!==null)return saved!=='false';
      const legacy=localStorage.getItem('repositoryShowFurigana');
      return legacy===null?true:legacy!=='false';
    }catch{return true;}
  }
  function hiragana(value){return String(value||'').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60));}
  function trimReading(surface,reading){
    let from=0,to=surface.length,value=hiragana(reading);
    while(from<to&&KANA.test(surface[from])&&hiragana(surface[from])===value[0]){from++;value=value.slice(1);}
    while(to>from&&KANA.test(surface[to-1])&&hiragana(surface[to-1])===value.at(-1)){to--;value=value.slice(0,-1);}
    return {from,to,reading:value};
  }
  function spansForText(value,engine){
    if(!HAN.test(value)||!engine)return [];
    const spans=[];let cursor=0;
    for(const token of engine.tokenize(value)){
      const surface=token.surface_form||'';
      const start=value.indexOf(surface,cursor);
      if(start<0)continue;
      cursor=start+surface.length;
      if(!HAN.test(surface)||!token.reading||token.reading==='*')continue;
      const trimmed=trimReading(surface,token.reading);
      if(trimmed.to<=trimmed.from||!trimmed.reading||!/^[ぁ-ゖー]+$/u.test(trimmed.reading))continue;
      const base=surface.slice(trimmed.from,trimmed.to);
      if(!HAN.test(base))continue;
      spans.push([start+trimmed.from,start+trimmed.to,trimmed.reading]);
    }
    return spans;
  }
  function eligible(node){
    return node?.nodeType===3&&node.isConnected&&HAN.test(node.textContent||'')&&!node.parentElement?.closest(EXCLUDED);
  }
  function annotateNode(node,engine){
    if(!eligible(node))return 0;
    const value=node.textContent,spans=spansForText(value,engine);
    if(!spans.length)return 0;
    const fragment=document.createDocumentFragment();let cursor=0;
    for(const [from,to,reading] of spans){
      if(from<cursor||to>value.length)continue;
      fragment.append(document.createTextNode(value.slice(cursor,from)));
      const ruby=document.createElement('ruby'),rt=document.createElement('rt');
      ruby.dataset.autoFurigana='';ruby.append(document.createTextNode(value.slice(from,to)));
      rt.textContent=reading;ruby.append(rt);fragment.append(ruby);cursor=to;
    }
    fragment.append(document.createTextNode(value.slice(cursor)));node.replaceWith(fragment);return spans.length;
  }
  function textNodes(root){
    const nodes=[];
    if(root?.nodeType===3){if(eligible(root))nodes.push(root);return nodes;}
    if(!root?.querySelectorAll)return nodes;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    let node;while((node=walker.nextNode()))if(eligible(node))nodes.push(node);
    return nodes;
  }
  function loadTokenizer(){
    if(tokenizer)return Promise.resolve(tokenizer);
    if(!pending)pending=new Promise((resolve,reject)=>{
      if(!window.kuromoji)return reject(new Error('Reading engine unavailable'));
      window.kuromoji.builder({dicPath:DICT_URL}).build((error,value)=>error?reject(error):resolve(value));
    }).then(value=>{tokenizer=value;return value;}).catch(error=>{pending=null;throw error;});
    return pending;
  }
  function updateControl(status=''){
    const button=document.getElementById('siteFuriganaToggle');if(!button)return;
    const label=status==='loading'?'振 Preparing…':`振 Furigana ${enabled?'on':'off'}`;
    button.setAttribute('aria-pressed',String(enabled));
    button.setAttribute('aria-busy',String(status==='loading'));
    if(button.textContent!==label)button.textContent=label;
    button.title=status==='error'?'Automatic readings could not be prepared. Supplied readings remain available.':'Toggle furigana throughout the Learning Hub. Automatic readings are unverified.';
  }
  async function decorate(root=document.body){
    if(!enabled)return 0;
    if(!textNodes(root).length){updateControl();return 0;}
    const token=generation;updateControl(tokenizer?'':'loading');
    try{
      const engine=await loadTokenizer();if(!enabled||token!==generation)return 0;
      let count=0;for(const node of textNodes(root))count+=annotateNode(node,engine);
      updateControl();return count;
    }catch{if(token===generation)updateControl('error');return 0;}
  }
  function schedule(){
    if(!enabled||scheduled)return;scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;decorate(document.body);});
  }
  function setEnabled(value,persist=true){
    enabled=!!value;generation++;
    document.documentElement.dataset.furigana=enabled?'on':'off';
    if(persist)try{localStorage.setItem(STORAGE_KEY,String(enabled));}catch{}
    updateControl();if(enabled)decorate(document.body);
  }
  function init(){
    document.documentElement.dataset.furigana=enabled?'on':'off';updateControl();
    document.getElementById('siteFuriganaToggle')?.addEventListener('click',()=>setEnabled(!enabled));
    observer=new MutationObserver(schedule);observer.observe(document.body,{childList:true,subtree:true});
    if(enabled)decorate(document.body);
  }
  window.JLHFurigana={init,decorate,setEnabled,get enabled(){return enabled;},spansForText,trimReading,hiragana,annotateNode};
  init();
})();
