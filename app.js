const SB = window.SUPABASE_CONFIG || {};
const hasSupabase = !!(SB.url && SB.anonKey && !SB.url.includes('YOUR_') && !SB.anonKey.includes('YOUR_'));
const db = hasSupabase && window.supabase ? window.supabase.createClient(SB.url, SB.anonKey) : null;
const AUDIO_LIBRARY = window.LESSON_AUDIO || {lessons:{},categories:[]};
const audioUrlCache = new Map();

const WK = window.WANIKANI_CONFIG || {};
const hasWaniKani = !!(WK.endpoint && db);
let waniKaniState = { status:'idle', data:null, error:null, fetchedAt:null };
let waniKaniPromise = null;
const WK_CACHE_KEY = 'wanikaniDashboardCache';
const WK_CACHE_TTL = 60 * 60 * 1000;
const WK_DETAIL_CACHE_KEY = 'wanikaniDashboardDetailCache';
const WK_DETAIL_CACHE_TTL = 60 * 60 * 1000;
let waniKaniDetailState = { status:'idle', data:null, error:null, fetchedAt:null };
let waniKaniDetailPromise = null;

function readWaniKaniCache(){
  try{
    const c=JSON.parse(localStorage.getItem(WK_CACHE_KEY)||'null');
    if(c && c.fetchedAt && Date.now()-c.fetchedAt < WK_CACHE_TTL) return c;
  }catch(e){}
  return null;
}
function clearPrivateSessionCaches(){
  localStorage.removeItem(WK_CACHE_KEY);
  localStorage.removeItem(WK_DETAIL_CACHE_KEY);
  audioUrlCache.clear();
  waniKaniState={status:'idle',data:null,error:null,fetchedAt:null};
  waniKaniDetailState={status:'idle',data:null,error:null,fetchedAt:null};
  if(typeof resetRepositorySession==='function') resetRepositorySession();
}
function countAvailableReviews(summary){
  const now=Date.now();
  return (summary?.reviews||[]).reduce((n,b)=>{
    const t=Date.parse(b.available_at||'');
    return n + (Number.isFinite(t) && t<=now ? (b.subject_ids?.length||0) : 0);
  },0);
}
function countLessons(summary){ return (summary?.lessons||[]).reduce((n,b)=>n+(b.subject_ids?.length||0),0); }
function nextReview(summary){
  const raw=summary?.next_reviews_at;
  if(!raw) return null;
  const d=new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}
async function fetchWaniKani(){
  if(!hasWaniKani) return null;
  const [userRes,summaryRes]=await Promise.all([
    fetchWaniKaniEndpoint('user'),
    fetchWaniKaniEndpoint('summary')
  ]);
  const user=userRes, summary=summaryRes;
  return {user:user.data,summary:summary.data,fetchedAt:Date.now()};
}
async function fetchWaniKaniEndpoint(endpoint,params={}){
  if(!db||!state.user) throw new Error('Sign in to load WaniKani.');
  const {data,error}=await db.auth.getSession();
  if(error||!data.session?.access_token) throw new Error('Your session has expired. Sign in again.');
  const url=new URL(WK.endpoint,window.location.origin);
  url.searchParams.set('endpoint',endpoint);
  Object.entries(params).forEach(([key,value])=>{if(value!==null&&value!==undefined&&value!=='')url.searchParams.set(key,String(value));});
  const response=await fetch(url,{headers:{Authorization:`Bearer ${data.session.access_token}`,Accept:'application/json'}});
  let body=null;
  try{body=await response.json();}catch(error){}
  if(!response.ok){
    const message=typeof body?.error==='string'?body.error:body?.error?.message;
    throw new Error(message||`WaniKani service error (${response.status})`);
  }
  return body;
}
async function loadWaniKani(force=false){
  if(!hasWaniKani){ waniKaniState={status:'unconfigured',data:null,error:null,fetchedAt:null}; renderWaniKani(); return; }
  if(!force){
    const cached=readWaniKaniCache();
    if(cached){ waniKaniState={status:'ready',data:cached.data,error:null,fetchedAt:cached.fetchedAt}; renderWaniKani(); return; }
  }
  if(waniKaniPromise) return waniKaniPromise;
  waniKaniState.status='loading'; waniKaniState.error=null; renderWaniKani();
  waniKaniPromise=fetchWaniKani().then(data=>{
    waniKaniState={status:'ready',data,error:null,fetchedAt:data.fetchedAt};
    localStorage.setItem(WK_CACHE_KEY,JSON.stringify({data,fetchedAt:data.fetchedAt}));
    renderWaniKani();
  }).catch(err=>{
    waniKaniState={status:'error',data:null,error:err?.message||'Unable to load WaniKani',fetchedAt:null};
    renderWaniKani();
  }).finally(()=>{waniKaniPromise=null;});
  return waniKaniPromise;
}
function readWaniKaniDetailCache(){
  try{
    const c=JSON.parse(localStorage.getItem(WK_DETAIL_CACHE_KEY)||'null');
    if(c && c.fetchedAt && Date.now()-c.fetchedAt < WK_DETAIL_CACHE_TTL) return c;
  }catch(e){}
  return null;
}
async function fetchAllWaniKaniAssignments(){
  const all=[];
  let pageAfterId=null;
  do{
    const body=await fetchWaniKaniEndpoint('assignments',{page_after_id:pageAfterId});
    all.push(...(body.data||[]));
    pageAfterId=null;
    if(body.pages?.next_url){
      try{pageAfterId=new URL(body.pages.next_url).searchParams.get('page_after_id');}catch(error){}
    }
  }while(pageAfterId);
  return all;
}
function buildWaniKaniDetail(assignments, summary, user){
  const stageNames=['Lesson','Apprentice 1','Apprentice 2','Apprentice 3','Apprentice 4','Guru 1','Guru 2','Master','Enlightened','Burned'];
  const srs={};
  const byType={radical:0,kanji:0,vocabulary:0,kana_vocabulary:0};
  const currentLevel={radical:0,kanji:0};
  const currentLevelPassed={radical:0,kanji:0};
  const currentLevelTotal={radical:0,kanji:0};
  let recentLessons=0;
  const now=Date.now();
  for(const row of assignments){
    const d=row.data||{};
    if(d.hidden) continue;
    const stage=Number.isFinite(+d.srs_stage)?+d.srs_stage:0;
    const key=stageNames[stage]||`Stage ${stage}`;
    srs[key]=(srs[key]||0)+1;
    if(byType[d.subject_type]!==undefined) byType[d.subject_type]++;
    if(Number(d.level)===Number(user?.level) && (d.subject_type==='radical'||d.subject_type==='kanji')){
      currentLevelTotal[d.subject_type]++;
      if(d.passed_at) currentLevelPassed[d.subject_type]++;
      if(d.subject_type==='radical') currentLevel.radical++; else currentLevel.kanji++;
    }
    if(d.started_at){
      const started=Date.parse(d.started_at);
      if(Number.isFinite(started) && now-started < 14*24*3600000) recentLessons++;
    }
  }
  const forecast=(summary?.reviews||[]).map(b=>({
    available_at:b.available_at,
    count:b.subject_ids?.length||0
  })).sort((a,b)=>Date.parse(a.available_at)-Date.parse(b.available_at));
  const nextLevelReview=assignments
    .filter(r=>Number(r.data?.level)===Number(user?.level) && r.data?.available_at)
    .map(r=>new Date(r.data.available_at))
    .filter(d=>!Number.isNaN(d.getTime()))
    .sort((a,b)=>a-b)[0]||null;
  return {stageNames,srs,byType,currentLevelPassed,currentLevelTotal,recentLessons,forecast,nextLevelReview};
}
async function loadWaniKaniDetail(force=false){
  if(!hasWaniKani){waniKaniDetailState={status:'unconfigured',data:null,error:null,fetchedAt:null};renderWaniKaniDashboard();return;}
  if(!force){
    const cached=readWaniKaniDetailCache();
    if(cached){waniKaniDetailState={status:'ready',data:cached.data,error:null,fetchedAt:cached.fetchedAt};renderWaniKaniDashboard();return;}
  }
  if(waniKaniDetailPromise) return waniKaniDetailPromise;
  waniKaniDetailState={status:'loading',data:null,error:null,fetchedAt:null};renderWaniKaniDashboard();
  waniKaniDetailPromise=fetchAllWaniKaniAssignments().then(assignments=>{
    const base=waniKaniState.data||readWaniKaniCache()?.data;
    if(!base) throw new Error('Load the basic WaniKani data first.');
    const data={detail:buildWaniKaniDetail(assignments,base.summary,base.user),user:base.user,summary:base.summary};
    const fetchedAt=Date.now();
    waniKaniDetailState={status:'ready',data,error:null,fetchedAt};
    localStorage.setItem(WK_DETAIL_CACHE_KEY,JSON.stringify({data,fetchedAt}));
    renderWaniKaniDashboard();
  }).catch(err=>{waniKaniDetailState={status:'error',data:null,error:err?.message||'Unable to load detailed WaniKani data',fetchedAt:null};renderWaniKaniDashboard();}).finally(()=>{waniKaniDetailPromise=null;});
  return waniKaniDetailPromise;
}
function wkTimeLabel(d){
  if(!d) return '—';
  const x=d instanceof Date?d:new Date(d);
  if(Number.isNaN(x.getTime())) return '—';
  return x.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'});
}
function wkDateLabel(d){
  const x=d instanceof Date?d:new Date(d);
  if(Number.isNaN(x.getTime())) return '—';
  return x.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});
}
function renderWaniKaniDashboard(){
  if(state.view!=='wanikani') return;
  $('#hero').hidden=true; $('#bottomArea').hidden=true; $('#weekView').hidden=true; $('#mainContent').hidden=false;
  if(waniKaniDetailState.status==='unconfigured'){
    $('#mainContent').innerHTML=`<section class="wk-page"><div class="wk-page-head"><div><div class="eyebrow">Supporting resource</div><h1>WaniKani</h1><p class="subtitle">The private WaniKani service has not been configured.</p></div></div></section>`; return;
  }
  if(waniKaniDetailState.status==='loading'){
    $('#mainContent').innerHTML=`<section class="wk-page"><div class="wk-page-head"><div><div class="eyebrow">Supporting resource</div><h1>WaniKani dashboard</h1><p class="subtitle">Loading your SRS data…</p></div></div><div class="panel wk-loading">Loading detailed assignments. This is cached for one hour.</div></section>`; return;
  }
  if(waniKaniDetailState.status==='error'){
    $('#mainContent').innerHTML=`<section class="wk-page"><div class="wk-page-head"><div><div class="eyebrow">Supporting resource</div><h1>WaniKani dashboard</h1><p class="subtitle">${esc(waniKaniDetailState.error)}</p></div><button class="smallbtn" id="wkDetailRetry">Retry</button></div></section>`;
    $('#wkDetailRetry').onclick=()=>loadWaniKaniDetail(true); return;
  }
  const d=waniKaniDetailState.data||{}, u=d.user||{}, s=d.summary||{}, x=d.detail||{};
  const reviews=countAvailableReviews(s), lessons=countLessons(s), next=nextReview(s);
  const stages=['Apprentice','Guru','Master','Enlightened','Burned'];
  const stageCounts=stages.map(name=>{
    if(name==='Apprentice') return ['Apprentice 1','Apprentice 2','Apprentice 3','Apprentice 4'].reduce((n,k)=>n+(x.srs?.[k]||0),0);
    if(name==='Guru') return ['Guru 1','Guru 2'].reduce((n,k)=>n+(x.srs?.[k]||0),0);
    return x.srs?.[name]||0;
  });
  const maxStage=Math.max(...stageCounts,1);
  const forecast=(x.forecast||[]).slice(0,12);
  const maxForecast=Math.max(...forecast.map(b=>b.count),1);
  const fetched=waniKaniDetailState.fetchedAt?new Date(waniKaniDetailState.fetchedAt).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'}):'—';
  const radicalPct=x.currentLevelTotal?.radical?Math.round(x.currentLevelPassed.radical/x.currentLevelTotal.radical*100):0;
  const kanjiPct=x.currentLevelTotal?.kanji?Math.round(x.currentLevelPassed.kanji/x.currentLevelTotal.kanji*100):0;
  $('#mainContent').innerHTML=`
    <section class="wk-page">
      <div class="wk-page-head"><div><div class="eyebrow">Supporting resource</div><h1>WaniKani dashboard</h1><p class="subtitle">Level ${esc(u.level??'—')} · ${esc(u.username||'')} · detailed SRS view</p></div><div class="wk-page-actions"><button class="smallbtn" id="wkDetailRefresh">↻ Refresh</button><a class="smallbtn" href="https://www.wanikani.com" target="_blank" rel="noopener">Open WaniKani ↗</a></div></div>
      <section class="wk-overview-grid"><article class="wk-stat-card wk-level-card"><span class="eyebrow">Current level</span><strong>${esc(u.level??'—')}</strong><span>${esc(u.subscription?.max_level_granted??'')} max level access</span></article><article class="wk-stat-card"><strong>${reviews}</strong><span>Reviews due now</span></article><article class="wk-stat-card"><strong>${lessons}</strong><span>Lessons available</span></article><article class="wk-stat-card"><strong>${esc(formatWkNextReview(next))}</strong><span>Next review</span></article></section>
      <section class="wk-grid"><article class="panel"><div class="panelhead"><div><h2>Upcoming reviews</h2><p class="subtitle">The next review buckets returned by WaniKani.</p></div></div><div class="wk-forecast">${forecast.length?forecast.map(b=>`<div class="wk-forecast-col"><div class="wk-forecast-count">${b.count}</div><div class="wk-forecast-bar"><i style="height:${Math.max(5,b.count/maxForecast*100)}%"></i></div><small>${wkTimeLabel(b.available_at)}</small></div>`).join(''):'<div class="empty">No upcoming review buckets returned.</div>'}</div></article><article class="panel"><div class="panelhead"><div><h2>SRS distribution</h2><p class="subtitle">Current assignment counts by major WaniKani SRS group.</p></div></div><div class="wk-srs-list">${stages.map((name,i)=>`<div class="wk-srs-row"><span>${name}</span><div class="wk-srs-track"><i style="width:${stageCounts[i]/maxStage*100}%"></i></div><strong>${stageCounts[i]}</strong></div>`).join('')}</div></article></section>
      <section class="wk-grid"><article class="panel"><div class="panelhead"><div><h2>Current level progress</h2><p class="subtitle">Radicals and kanji assigned to your current level.</p></div></div><div class="wk-progress-block"><div class="wk-progress-head"><span>Radicals</span><strong>${radicalPct}%</strong></div><div class="progress"><i style="width:${radicalPct}%"></i></div><small>${x.currentLevelPassed?.radical||0} of ${x.currentLevelTotal?.radical||0} passed</small></div><div class="wk-progress-block"><div class="wk-progress-head"><span>Kanji</span><strong>${kanjiPct}%</strong></div><div class="progress"><i style="width:${kanjiPct}%"></i></div><small>${x.currentLevelPassed?.kanji||0} of ${x.currentLevelTotal?.kanji||0} passed</small></div></article><article class="panel"><div class="panelhead"><div><h2>Review tools</h2><p class="subtitle">Shortcuts into WaniKani for focused review work.</p></div></div><div class="wk-tool-list"><a class="wk-tool" href="https://www.wanikani.com/review" target="_blank" rel="noopener"><strong>Reviews</strong><span>${reviews} currently due</span></a><a class="wk-tool" href="https://www.wanikani.com/lesson" target="_blank" rel="noopener"><strong>Lessons</strong><span>${lessons} available</span></a><a class="wk-tool" href="https://www.wanikani.com/dashboard" target="_blank" rel="noopener"><strong>WaniKani dashboard</strong><span>Open the full native dashboard</span></a></div></article></section>
      <div class="wk-footnote">Detailed data updated ${esc(fetched)} · cached for 1 hour. Assignments are read-only here; reviews and lessons remain in WaniKani.</div>
    </section>`;
  $('#wkDetailRefresh').onclick=()=>loadWaniKaniDetail(true);
}
function formatWkNextReview(d){
  if(!d) return 'None scheduled';
  const diff=d.getTime()-Date.now();
  if(diff<=0) return 'Available now';
  const h=Math.floor(diff/3600000), m=Math.floor((diff%3600000)/60000);
  if(h<24) return `in ${h}h${m?` ${m}m`:''}`;
  return d.toLocaleDateString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
}
function renderWaniKani(){
  const el=$('#wanikaniCard'); if(!el) return;
  el.classList.add('wk-mini-card');
  if(waniKaniState.status==='unconfigured'){
    el.innerHTML=`<button type="button" class="wk-mini-inner" id="openWkDashboard"><div class="panelhead"><div><div class="eyebrow">Supporting resource</div><h3>WaniKani</h3><p class="subtitle">Private WaniKani service not configured.</p></div><span class="wk-mini-arrow">→</span></div></button>`;
  }else if(waniKaniState.status==='loading'){
    el.innerHTML=`<button type="button" class="wk-mini-inner" id="openWkDashboard"><div class="panelhead"><div><div class="eyebrow">Supporting resource</div><h3>WaniKani</h3><p class="subtitle">Loading current stats…</p></div><span class="wk-mini-arrow">→</span></div></button>`;
  }else if(waniKaniState.status==='error'){
    el.innerHTML=`<div class="wk-mini-inner"><div class="panelhead"><div><div class="eyebrow">Supporting resource</div><h3>WaniKani</h3><p class="subtitle">${esc(waniKaniState.error)}</p></div><button class="smallbtn" id="wkRetry">Retry</button></div></div>`;
    $('#wkRetry').onclick=()=>loadWaniKani(true); return;
  }else{
    const d=waniKaniState.data||{}, u=d.user||{}, s=d.summary||{};
    const reviews=countAvailableReviews(s), lessons=countLessons(s), next=nextReview(s);
    el.innerHTML=`<button type="button" class="wk-mini-inner" id="openWkDashboard"><div class="panelhead"><div><div class="eyebrow">Supporting resource</div><h3>WaniKani</h3><p class="subtitle">Level ${esc(u.level??'—')} · ${esc(u.username||'')}</p></div><span class="wk-mini-arrow">→</span></div><div class="wk-mini-stats"><div><strong>${reviews}</strong><span>Reviews</span></div><div><strong>${lessons}</strong><span>Lessons</span></div><div><strong>${esc(formatWkNextReview(next))}</strong><span>Next review</span></div></div><div class="wk-footer">Open full WaniKani dashboard</div></button>`;
  }
  $('#openWkDashboard')?.addEventListener('click',()=>{state.view='wanikani';render();scrollTo({top:0,behavior:'smooth'});loadWaniKaniDetail();});
}

const POMO_DURATIONS = { work: 25*60, short: 5*60, long: 15*60 }; // fallback defaults
const POMO_CYCLE_LENGTH = 4; // fallback default

const state = {
  view: 'dashboard',
  week: 0,
  libraryItem: null,
  programmeId: localStorage.getItem('activeProgrammeId') || (window.PROGRAMME_SETTINGS?.activeId || 'tobira-beginning-ii-12w'),
  lesson: 11,
  startDate: localStorage.getItem('studyStartDate') || '2026-08-31',
  taskState: JSON.parse(localStorage.getItem('taskState') || '{}'),
  notes: localStorage.getItem('appNotes') || '',
  user: null,
  ready: false,
  pomodoroSettings: JSON.parse(localStorage.getItem('pomodoroSettings') || 'null') || { work:25, short:5, long:15, cycle:4 },
  pomodoro: JSON.parse(localStorage.getItem('pomodoroState') || 'null') || {
    status: 'idle', mode: 'work', remaining: POMO_DURATIONS.work,
    taskId: null, cycle: 0, endAt: null, startedAt: null
  },
  sessions: JSON.parse(localStorage.getItem('pomodoroSessions') || '[]'),
  lessonVideos: [],
  lessonVideosLoaded: false,
  lessonVideosError: false,
  guideTarget: null,
  pomoOpen: localStorage.getItem('pomodoroOpen') === 'true',
  focusMode: false,
  searchOpen: false
};

let audioPlaybackState = (()=>{
  try{
    const saved=JSON.parse(localStorage.getItem('lessonAudioPlayback')||'null');
    return saved && typeof saved==='object' ? saved : {lastPath:null,positions:{},speed:1};
  }catch(e){
    return {lastPath:null,positions:{},speed:1};
  }
})();

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function applyTheme(theme,persist=true){
  const value=theme==='dark'?'dark':'light', dark=value==='dark';
  document.documentElement.dataset.theme=value;
  if(persist) localStorage.setItem('studyTheme',value);
  const button=$('#themeToggle');
  if(button){
    button.textContent=dark?'☀':'☾';
    button.title=dark?'Switch to light mode':'Switch to dark mode';
    button.setAttribute('aria-label',button.title);
  }
  const meta=document.querySelector('meta[name="theme-color"]');
  if(meta) meta.content=dark?'#0f1722':'#18263b';
}
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const fmt = d => d.toLocaleDateString(undefined, {weekday:'long', month:'short', day:'numeric'});
const fmtMinutes = m => `${Math.floor(m/60)}h${m%60?` ${m%60}m`:''}`;
const dateKey = d => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`; };
const lessonForWeek = w => w < 10 ? CURRICULUM.lessons[w] : null;
const consolidationLessons = w => w === 10 ? CURRICULUM.lessons.slice(0,5) : CURRICULUM.lessons.slice(5,10);
const activeProgramme = () => (window.PROGRAMMES||[]).find(p=>p.id===state.programmeId) || (window.PROGRAMMES||[])[0];
const activeBook = () => { const p=activeProgramme(); return (window.BOOKS||[]).find(b=>b.id===(p?.bookId || CURRICULUM.bookId || '')) || {title:CURRICULUM.book||'Active curriculum',level:'',series:''}; };
const programmeCurriculum = p => p?.curriculumKey==='CURRICULUM' ? window.CURRICULUM : null;
function updateBackToTop(){ const button=$('#backToTop'); if(button) button.hidden=window.scrollY<500||!state.user; }
function selectProgramme(id){ const p=(window.PROGRAMMES||[]).find(x=>x.id===id); if(!p||p.status!=='active') return; state.programmeId=id; localStorage.setItem('activeProgrammeId',id); toast('Programme selected'); render(); }
function programmeSummary(p){ const b=(window.BOOKS||[]).find(x=>x.id===p.bookId); return {book:b, ready:p.status==='active' && !!programmeCurriculum(p)}; }

function lessonByNumber(n){ return CURRICULUM.lessons.find(l => l.n === Number(n)); }
function defFor(key){ return TASK_TYPES.find(x => x.key === key); }
function pageFor(l, key){
  const def = defFor(key);
  if(def?.book === 'Textbook'){
    const p = l.textbook?.pages?.[key];
    return { book:'Textbook', page:p || `${l.textbook.start}–${l.textbook.end}` };
  }
  for (const b of ['workbook2','workbook1']) {
    if (l[b]?.[key] != null) return { book: b === 'workbook2' ? 'Workbook 2' : 'Workbook 1', page: l[b][key] };
  }
  return null;
}
function makeTask(l, key, opts={}){
  const def = defFor(key), ref = pageFor(l,key);
  if(!def || !ref) return null;
  const section = (l.sections||[]).find(x=>x.taskKey===key);
  return { id:`b2-l${l.n}-${key}`, lesson:l.n, key, title:def.label, book:ref.book, page:ref.page, duration:def.duration, desc:def.desc, section:section?.label||null, sectionPages:section?.pages||null, sectionSteps:section?.steps||[], sectionItems:section?.items||[], ...opts };
}
function lessonTasks(l){ return TASK_TYPES.map(d=>makeTask(l,d.key)).filter(Boolean); }
function weeklyTasks(w,d){
  if(w>=10) return consolidationTasks(w,d);
  const l=lessonForWeek(w);
  const schedule=[
    ['textbook_vocab','vocab'],
    ['textbook_kanji','kanji'],
    ['textbook_grammar','particle','grammar1'],
    ['textbook_conversation','textbook_talk'],
    ['textbook_reading','reading','writing'],
    ['textbook_listening','listening','comp1'],
    ['grammar2','comp2','review']
  ][d];
  return schedule.map(k=>makeTask(l,k)).filter(Boolean);
}
function consolidationTasks(w,d){
  const ls=consolidationLessons(w), label=w===10?'Lessons 11–15':'Lessons 16–20';
  if(d===6) return [{id:`b2-w${w+1}-d7-mastery`,key:'mastery',title:`Mastery check · ${label}`,duration:'45–60 min',book:'Dashboard',desc:'Re-test every lesson area marked shaky, studying or review. Include textbook grammar production, reading/listening and workbook errors.'}];
  const l=ls[d];
  if(!l) return [{id:`b2-w${w+1}-d${d+1}-catchup`,key:'catchup',title:`Consolidation · ${label}`,duration:'45–60 min',book:'Your notes',desc:'Use this session for unfinished work and the weakest remaining areas.'}];
  const key=['textbook_grammar','textbook_reading','textbook_listening','grammar1','reading','writing','comp1'][d];
  const t=makeTask(l,key);
  return t?[{...t,id:`b2-consolidation-w${w+1}-l${l.n}-${key}`,title:`L${l.n} · ${t.title}`,desc:t.desc+' This is a consolidation pass: prioritise anything previously marked shaky or weak.'}]:[{id:`b2-w${w+1}-d${d+1}-targeted`,key:'targeted',title:`L${l.n} · targeted review`,duration:'45–60 min',book:'Your notes',desc:'Review the weakest remaining component from this lesson and update its mastery.'}];
}

function habits(w,d){
  return OPTIONAL_TASKS.map(x => ({id:`habit-w${w+1}-d${d+1}-${x.key}`,key:x.key,title:x.label,duration:x.duration,book:'Habit',desc:x.desc,habit:true}));
}
function ts(id){ return state.taskState[id] || {completed:false,mastery:'not_started',confidence:null,notes:'',completed_at:null}; }
function saveLocal(){
  localStorage.setItem('taskState',JSON.stringify(state.taskState));
  localStorage.setItem('appNotes',state.notes);
  localStorage.setItem('studyStartDate',state.startDate);
}
async function cloudSave(id){
  if(!db || !state.user) return;
  const t = ts(id);
  const {error} = await db.from('task_state').upsert({user_id:state.user.id,task_id:id,completed:t.completed,completed_at:t.completed_at,mastery:t.mastery,confidence:t.confidence,notes:t.notes},{onConflict:'user_id,task_id'});
  if(error) toast('Cloud save failed; your local copy is safe.');
}
function setTask(id,p){ state.taskState[id]={...ts(id),...p}; saveLocal(); render(); cloudSave(id); }
function toggle(id){ const t=ts(id); setTask(id,{completed:!t.completed,completed_at:!t.completed?new Date().toISOString():null,mastery:!t.completed && t.mastery==='not_started'?'studying':t.mastery}); }
function weekDates(w){ const s=new Date(state.startDate+'T00:00:00'); return Array.from({length:7},(_,i)=>addDays(s,w*7+i)); }
function allTasks(w){ return Array.from({length:7},(_,d)=>weeklyTasks(w,d)).flat(); }
function allCoreTasks(){ return Array.from({length:12},(_,w)=>allTasks(w)).flat(); }
function progress(w){ const a=allTasks(w); return {done:a.filter(t=>ts(t.id).completed).length,total:a.length}; }
function overallProgress(){ const a=allCoreTasks(); return {done:a.filter(t=>ts(t.id).completed).length,total:a.length}; }
function lessonProgress(n){
  const a=lessonTasks(lessonByNumber(n));
  return {done:a.filter(t=>ts(t.id).completed).length,total:a.length,mastered:a.filter(t=>ts(t.id).mastery==='mastered').length};
}
function currentWeekIndex(){
  const start=new Date(state.startDate+'T00:00:00');
  const diff=Math.floor((new Date().setHours(0,0,0,0)-start.getTime())/86400000);
  return Math.max(0,Math.min(11,Math.floor(diff/7)));
}
function nextIncomplete(){
  const w=currentWeekIndex();
  for(let i=w;i<12;i++) for(const t of allTasks(i)) if(!ts(t.id).completed) return {task:t,week:i};
  for(let i=0;i<w;i++) for(const t of allTasks(i)) if(!ts(t.id).completed) return {task:t,week:i};
  return null;
}
function lessonStatus(n){
  const p=lessonProgress(n);
  if(p.mastered===p.total) return ['mastered','Mastered'];
  if(p.done===0) return ['not_started','Not started'];
  const shaky=lessonTasks(lessonByNumber(n)).filter(t=>['shaky','studying','review'].includes(ts(t.id).mastery)).length;
  return shaky ? ['studying','In progress · attention needed'] : ['studying','In progress'];
}

// ---- Pomodoro timer -------------------------------------------------
function pomodoroDuration(mode){
  const s=state.pomodoroSettings;
  const minutes = mode==='work'?s.work : mode==='long'?s.long : s.short;
  return Math.max(60,Math.round((minutes||POMO_DURATIONS[mode]/60||25)*60));
}
function savePomodoroSettings(){
  localStorage.setItem('pomodoroSettings', JSON.stringify(state.pomodoroSettings));
  if(db && state.user){
    db.from('user_preferences').upsert(
      {user_id:state.user.id, settings:{pomodoro:state.pomodoroSettings}},
      {onConflict:'user_id'}
    ).then(({error})=>{ if(error) toast('Settings saved locally; cloud sync failed.'); });
  }
}
function renderPomodoroSettings(){
  const s=state.pomodoroSettings;
  const work=$('#pomoWorkMin'), short=$('#pomoShortMin'), long=$('#pomoLongMin'), cycle=$('#pomoCycleLen');
  if(work) work.value=s.work;
  if(short) short.value=s.short;
  if(long) long.value=s.long;
  if(cycle) cycle.value=s.cycle;
}
function savePomodoro(){ localStorage.setItem('pomodoroState', JSON.stringify(state.pomodoro)); }
function saveSessions(){ localStorage.setItem('pomodoroSessions', JSON.stringify(state.sessions)); }
function taskLessonNumber(id){
  const m = /^b2-l(\d+)-/.exec(id||'') || /^b2-consolidation-w\d+-l(\d+)-/.exec(id||'');
  return m ? +m[1] : null;
}
function findTaskById(id){
  if(!id) return null;
  const core = allCoreTasks();
  const hab = Array.from({length:12},(_,w)=>Array.from({length:7},(_,d)=>habits(w,d)).flat()).flat();
  return [...core,...hab].find(t=>t.id===id) || null;
}
function taskSeconds(id){ return state.sessions.filter(s=>s.task_id===id).reduce((a,s)=>a+s.duration_seconds,0); }
function lessonSeconds(n){ return state.sessions.filter(s=>s.lesson===n).reduce((a,s)=>a+s.duration_seconds,0); }
function totalSeconds(){ return state.sessions.reduce((a,s)=>a+s.duration_seconds,0); }
function weekSeconds(days=7){
  const cutoff = Date.now()-days*86400000;
  return state.sessions.filter(s=>new Date(s.completed_at).getTime()>=cutoff).reduce((a,s)=>a+s.duration_seconds,0);
}
function fmtDuration(totalSec){
  if(!totalSec || totalSec<30) return '0m';
  const totalMin=Math.round(totalSec/60), h=Math.floor(totalMin/60), m=totalMin%60;
  return h ? `${h}h ${m}m` : `${m}m`;
}
function playChime(){
  try{
    const ctx=new (window.AudioContext||window.webkitAudioContext)();
    const now=ctx.currentTime;
    const master=ctx.createGain(); master.gain.value=0.5; master.connect(ctx.destination);
    const partials=[
      {ratio:1.00,gain:1.00,decay:3.2},
      {ratio:2.42,gain:0.55,decay:2.6},
      {ratio:3.86,gain:0.32,decay:2.0},
      {ratio:5.43,gain:0.18,decay:1.5},
      {ratio:7.10,gain:0.10,decay:1.0}
    ];
    const fundamental=220;
    partials.forEach(p=>{
      const osc=ctx.createOscillator(), gain=ctx.createGain();
      osc.type='sine'; osc.frequency.value=fundamental*p.ratio;
      osc.detune.value=(Math.random()*6-3);
      gain.gain.setValueAtTime(0.0001,now);
      gain.gain.exponentialRampToValueAtTime(p.gain,now+0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001,now+p.decay);
      osc.connect(gain); gain.connect(master);
      osc.start(now); osc.stop(now+p.decay+0.1);
    });
    const click=ctx.createOscillator(), clickGain=ctx.createGain();
    click.type='triangle'; click.frequency.value=fundamental*4;
    clickGain.gain.setValueAtTime(0.15,now);
    clickGain.gain.exponentialRampToValueAtTime(0.0001,now+0.05);
    click.connect(clickGain); clickGain.connect(master);
    click.start(now); click.stop(now+0.06);
  }catch(e){}
}
function ensureNotifyPermission(){
  if('Notification' in window && Notification.permission==='default') Notification.requestPermission();
}
function notify(title,body){
  if('Notification' in window && Notification.permission==='granted') new Notification(title,{body});
}
function syncRemaining(){
  const p=state.pomodoro;
  if(p.status==='running') p.remaining=Math.max(0,Math.round((p.endAt-Date.now())/1000));
}
function startPomodoro(taskId){
  ensureNotifyPermission();
  const p=state.pomodoro;
  if(taskId!==undefined) p.taskId=taskId;
  if(p.status!=='running'){
    p.status='running';
    if(!p.remaining) p.remaining=pomodoroDuration(p.mode);
    p.endAt=Date.now()+p.remaining*1000;
    p.startedAt=p.startedAt||new Date().toISOString();
  }
  state.pomoOpen=true; localStorage.setItem('pomodoroOpen','true');
  savePomodoro(); renderPomodoro(); renderNav();
}
function pausePomodoro(){
  const p=state.pomodoro;
  syncRemaining();
  p.status='paused';
  savePomodoro(); renderPomodoro();
}
function resetSession(){
  const p=state.pomodoro;
  p.status='idle'; p.remaining=pomodoroDuration(p.mode); p.endAt=null; p.startedAt=null;
  savePomodoro(); renderPomodoro();
}
function logSession(taskId,durationSeconds,startedAt,completedAt){
  if(!durationSeconds || durationSeconds<5) return;
  const session={
    id:'p-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),
    task_id:taskId||null,
    lesson:taskId?taskLessonNumber(taskId):null,
    duration_seconds:Math.round(durationSeconds),
    started_at:startedAt||new Date(Date.now()-durationSeconds*1000).toISOString(),
    completed_at:completedAt||new Date().toISOString(),
    synced:false
  };
  state.sessions.push(session);
  saveSessions();
  cloudLogSession(session);
}
async function cloudLogSession(session){
  if(!db||!state.user) return;
  const {error}=await db.from('pomodoro_sessions').insert({
    user_id:state.user.id, task_id:session.task_id, lesson:session.lesson,
    duration_seconds:session.duration_seconds, started_at:session.started_at, completed_at:session.completed_at
  });
  if(error){ toast('Study time saved locally; cloud sync failed.'); return; }
  session.synced=true; saveSessions();
}
function advanceMode(){
  const p=state.pomodoro;
  if(p.mode==='work'){
    p.cycle+=1;
    p.mode=(p.cycle%(state.pomodoroSettings.cycle||POMO_CYCLE_LENGTH)===0)?'long':'short';
    playChime(); toast('Focus session complete — take a break'); notify('Pomodoro complete','Time for a break.');
  }else{
    p.mode='work';
    playChime(); toast('Break over — back to it'); notify('Break over','Ready for another focus session?');
  }
  p.remaining=pomodoroDuration(p.mode); p.status='idle'; p.endAt=null; p.startedAt=null;
  savePomodoro(); renderPomodoro(); render();
}
function completeSession(){
  const p=state.pomodoro;
  syncRemaining();
  if(p.mode==='work') logSession(p.taskId,pomodoroDuration('work'),p.startedAt,new Date().toISOString());
  advanceMode();
}
function skipSession(){
  const p=state.pomodoro;
  if(p.status==='idle'){ advanceMode(); return; }
  syncRemaining();
  const elapsed=pomodoroDuration(p.mode)-p.remaining;
  if(p.mode==='work' && elapsed>0) logSession(p.taskId,elapsed,p.startedAt,new Date().toISOString());
  advanceMode();
}
function currentWeekDay(){
  const start=new Date(state.startDate+'T00:00:00'); const today=new Date(); today.setHours(0,0,0,0);
  const diffDays=Math.floor((today-start)/86400000);
  if(diffDays<0) return {w:0,d:0};
  return {w:Math.min(11,Math.floor(diffDays/7)), d:((diffDays%7)+7)%7};
}
function renderPomodoroQuickLink(){
  const sel=$('#pomoQuickLink'); if(!sel) return;
  const {w,d}=currentWeekDay();
  const opts=habits(w,d).map(t=>`<option value="${esc(t.id)}">${esc(t.title)}</option>`).join('');
  sel.innerHTML=`<option value="">Quick-link a habit…</option>${opts}`;
  sel.value = state.pomodoro.taskId && habits(w,d).some(t=>t.id===state.pomodoro.taskId) ? state.pomodoro.taskId : '';
}
function renderPomodoro(){
  const w=$('#pomodoroWidget'); if(!w) return;
  w.hidden = !(state.ready && state.user && state.pomoOpen);
  const p=state.pomodoro;
  syncRemaining();
  const dur=pomodoroDuration(p.mode);
  const mm=String(Math.floor(p.remaining/60)).padStart(2,'0'), ss=String(p.remaining%60).padStart(2,'0');
  $('#pomoTime').textContent=`${mm}:${ss}`;
  $('#pomoMode').textContent = p.mode==='work'?'Focus':(p.mode==='long'?'Long break':'Short break');
  $('#pomoCycle').textContent = p.cycle ? `#${p.cycle+1}` : '';
  $('#pomoBar').style.width = dur ? `${Math.min(100,(1-p.remaining/dur)*100)}%` : '0%';
  const task=findTaskById(p.taskId);
  $('#pomoTask').textContent = task ? task.title : 'No task linked';
  $('#pomoToggle').textContent = p.status==='running' ? 'Pause' : 'Start';
  renderPomodoroQuickLink();
}
setInterval(()=>{
  const p=state.pomodoro;
  if(p.status!=='running') return;
  const remaining=Math.max(0,Math.round((p.endAt-Date.now())/1000));
  p.remaining=remaining;
  if(remaining<=0) completeSession(); else renderPomodoro();
},1000);

function render(){
  if(!state.ready || !state.user){ renderGate(); return; }
  $('#appShell').hidden=false; $('#loginGate').hidden=true;
  renderHeader(); renderNav();
  if(state.view==='dashboard') renderDashboard();
  else if(state.view==='plan') renderWeek();
  else if(state.view==='lesson') renderLesson(state.lesson);
  else if(state.view==='wanikani') {
    renderWaniKaniDashboard();
    if(waniKaniDetailState.status==='idle') {
      loadWaniKani().then(()=>loadWaniKaniDetail()).catch(()=>{});
    }
  }
  else if(state.view==='repository') {
    renderRepository();
    if(!repositoryState.loaded&&!repositoryState.loading) loadRepositoryData();
  }
  else if(state.view==='library' && state.libraryItem) renderBookMap(state.libraryItem);
  else renderLibrary();
  $('#globalNotes').value=state.notes; $('#startDate').value=state.startDate; renderStatus();
  renderPomodoroSettings();
  renderPomodoro();
  updateBackToTop();
}
function renderGate(){
  $('#appShell').hidden=true; $('#loginGate').hidden=false;
  const w=$('#pomodoroWidget'); if(w) w.hidden=true;
  updateBackToTop();
  $('#gateStatus').textContent=hasSupabase?'Private study dashboard':'Supabase is not configured yet';
  $('#gateHint').textContent=hasSupabase?'Sign in to access your curriculum, progress and notes.':'Add your Supabase URL and publishable/anon key to supabase-config.js, then sign in.';
  $('#gateLogin').textContent='Login';
}
function renderHeader(){
  const w=state.week,l=lessonForWeek(w),p=progress(w),ds=weekDates(w),book=activeBook();
  $('#weekLabel').textContent=`Week ${w+1}`;
  $('#lessonLabel').textContent=l?`Lesson ${l.n}: ${l.title}`:(w===10?'Lessons 11–15: consolidation':'Lessons 16–20: consolidation');
  $('#lessonEnglish').textContent=l?l.english:`Re-test, repair and consolidate ${book.title}.`;
  const activeP=activeProgramme();
  const programmeLabel=$('#lessonLabel');
  if(activeP && programmeLabel && !l) programmeLabel.textContent=activeP.shortTitle||activeP.title;
  $('#dateRange').textContent=`${fmt(ds[0])} – ${fmt(ds[6])}`;
  $('#progressText').textContent=`${p.done}/${p.total} core tasks complete`;
  $('#progressBar').style.width=(p.total?p.done/p.total*100:0)+'%';
}
function renderNav(){
  $('#mainNav').innerHTML=`<button class="navbtn icon-nav-btn home-nav-btn ${state.view==='dashboard'?'active':''}" data-view="dashboard" title="Home" aria-label="Home">⌂</button><button class="navbtn ${state.view==='plan'?'active':''}" data-view="plan">Plan</button><button class="navbtn ${state.view==='lesson'?'active':''}" data-view="lesson">Lessons</button><button class="navbtn ${state.view==='library'?'active':''}" data-view="library">Hub</button><button class="navbtn icon-nav-btn repo-nav-btn ${state.view==='repository'?'active':''}" data-view="repository" title="Japanese Repository" aria-label="Japanese Repository">文</button><button class="navbtn icon-nav-btn" id="searchNavBtn" type="button" title="Search" aria-label="Search">⌕</button><button class="navbtn wk-nav-btn ${state.view==='wanikani'?'active':''}" data-view="wanikani" title="WaniKani" aria-label="WaniKani">漢</button><button class="navbtn pomo-nav-btn" id="pomoNavBtn" type="button" title="Pomodoro" aria-label="Open Pomodoro">🍅</button>`;
  $('#mainNav').querySelectorAll('.navbtn[data-view]').forEach(b=>b.onclick=()=>{state.view=b.dataset.view;if(state.view==='lesson'&&!lessonByNumber(state.lesson))state.lesson=11;render();scrollTo({top:0,behavior:'smooth'});});
  $('#searchNavBtn')?.addEventListener('click',openSearch);
  const pomoNav=$('#pomoNavBtn');
  if(pomoNav){
    pomoNav.classList.toggle('is-open',state.pomoOpen);
    pomoNav.classList.toggle('is-running',state.pomodoro.status==='running');
    pomoNav.onclick=()=>{state.pomoOpen=!state.pomoOpen;localStorage.setItem('pomodoroOpen',String(state.pomoOpen));renderPomodoro();renderNav();};
  }
  const pomoClose=$('#pomoClose');
  if(pomoClose) pomoClose.onclick=()=>{state.pomoOpen=false;localStorage.setItem('pomodoroOpen','false');renderPomodoro();renderNav();};
}

function renderBookMap(bookId){
  const book=(window.BOOKS||[]).find(b=>b.id===bookId);
  const map=(window.BOOK_MAPS||{})[bookId];
  if(!book || !map){ state.libraryItem=null; renderLibrary(); return; }

  $('#hero').hidden=true; $('#bottomArea').hidden=true; $('#weekView').hidden=true; $('#mainContent').hidden=false;

  const lessons=map.lessons||[];
  const projects=map.projects||[];
  const renderMappedLesson=l=>{
    const meta=[];
    if(l.conversation) meta.push({label:'Conversation',value:l.conversation});
    if(l.topic) meta.push({label:'Topic',value:l.topic});
    for(const range of (l.rangeDetails||[])) meta.push(range);
    const readings=l.readings||[];
    const canDo=l.canDo||[];
    const components=l.components||[];
    return `
      <article class="mapped-lesson">
        <div class="mapped-lesson-top"><span class="lessonnum">${l.n}</span><div>${l.unit?`<div class="eyebrow">${esc(l.unit)}</div>`:''}<h3>${esc(l.title)}</h3></div><strong>pp. ${esc(l.pages||'—')}</strong></div>
        ${meta.length?`<div class="mapped-meta">${meta.map(x=>`<div><span>${esc(x.label)}</span><strong>${esc(x.value)}</strong></div>`).join('')}</div>`:''}
        ${readings.length?`<div class="mapped-readings"><span>Readings</span>${readings.map(r=>`<span class="chip">${esc(r)}</span>`).join('')}</div>`:''}
        ${canDo.length?`<details class="mapped-cando"><summary>Can-Do goals (${canDo.length})</summary><ul>${canDo.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></details>`:''}
        ${components.length?`<div class="mapped-components">${components.map(x=>`<span class="chip">${esc(x)}</span>`).join('')}</div>`:''}
        ${l.project?`<div class="mapped-project"><span>Project</span><strong>${esc(l.project)}</strong></div>`:''}
      </article>`;
  };
  $('#mainContent').innerHTML=`
    <div class="book-detail-toolbar">
      <button class="smallbtn" id="backToLibrary">← Learning hub</button>
      <span class="book-status mapped">Mapped · not scheduled</span>
    </div>
    <section class="library-hero book-detail-hero">
      <div class="eyebrow">${esc(book.series)} · ${esc(book.level)}</div>
      <h1>${esc(book.title)}</h1>
      <p>${esc(book.description)}</p>
      <div class="book-detail-stats">
        <div><strong>${map.structure.lessons}</strong><span>lessons</span></div>
        <div><strong>${map.structure.units}</strong><span>${esc(map.structure.unitLabel||'units')}</span></div>
        <div><strong>${esc(map.structure.lessonPages)}</strong><span>lesson pages</span></div>
      </div>
    </section>
    <section class="library-section">
      <div class="panelhead"><div><h2>Book structure</h2><p class="subtitle">The source book's own organisation is preserved. This map is ready to become a programme later without making it one now.</p></div></div>
      <div class="book-structure-grid">${(map.learningModel||[]).map((x,i)=>`<div class="structure-item"><span>${i+1}</span><strong>${esc(x)}</strong></div>`).join('')}</div>
      <div class="book-reference-note">${esc(map.sourceNote)}</div>
    </section>
    <section class="library-section">
      <div class="panelhead"><div><h2>Lesson map</h2><p class="subtitle">${esc(map.lessonMapNote||'Exact main-text lesson ranges from the supplied book. The app deliberately does not invent subsection page numbers.')}</p></div></div>
      <div class="book-lesson-map">
        ${lessons.map(renderMappedLesson).join('')}
      </div>
    </section>
    ${projects.length?`<section class="library-section">
      <div class="panelhead"><div><h2>Unit projects</h2><p class="subtitle">Projects are integration work, not extra daily textbook pages.</p></div></div>
      <div class="project-map">${projects.map(p=>`<article class="project-map-card"><div class="eyebrow">${esc(p.unit)} · Lessons ${esc(p.lessons)}</div><h3>${esc(p.title)}</h3><p>${esc(p.note)}</p></article>`).join('')}</div>
    </section>`:''}
    <section class="library-section">
      <div class="panelhead"><div><h2>Programme status</h2><p class="subtitle">This book is mapped, but it is deliberately not part of your current schedule.</p></div></div>
      <div class="future-programme panel"><strong>Ready for the next step:</strong> ${esc(map.programmeNote||`Create a dedicated study programme when you decide how you want to use ${book.title}. The current Beginning Japanese II programme and its progress are unaffected.`)}</div>
    </section>`;
  $('#backToLibrary').onclick=()=>{state.libraryItem=null;state.view='library';render();scrollTo({top:0,behavior:'smooth'});};
}

function renderLibrary(){
  $('#hero').hidden=true; $('#bottomArea').hidden=true; $('#weekView').hidden=true; $('#mainContent').hidden=false;
  const books=window.BOOKS||[], resources=window.STUDY_RESOURCES||[], programmes=window.PROGRAMMES||[];
  const activeP=activeProgramme();
  $('#mainContent').innerHTML=`
    <section class="library-hero">
      <div class="eyebrow">Japanese learning hub</div>
      <h1>One place for every Japanese book you study</h1>
      <p>The hub separates <strong>books</strong> from <strong>study programmes</strong>. A book can exist in your library without being scheduled; a programme decides how and when its material is studied.</p>
      <div class="hub-current"><div><span class="eyebrow">Active programme</span><h2>${esc(activeP?.title||'No active programme')}</h2><p>${esc(activeP?.description||'')}</p></div><span class="book-status active">${esc(activeBook().title)}</span></div>
    </section>
    <section class="library-section"><div class="panelhead"><div><h2>Study programmes</h2><p class="subtitle">Choose a structured course when its contents have been mapped. Only the active programme generates the current schedule.</p></div></div><div class="programme-grid">${programmes.map(p=>{const x=programmeSummary(p),active=p.id===state.programmeId,mappedBook=!!(window.BOOK_MAPS||{})[p.bookId];const stageLabel=p.weeks?`${p.weeks} weeks`:mappedBook?'Book mapped':'Not mapped';const placeholder=mappedBook?'Book content is mapped. Programme scheduling and workbook task structure have not been configured yet.':'Contents/pages not mapped yet. Add the book data first; the same programme engine will then handle it.';return `<article class="programme-card ${active?'active-programme':''}"><div class="book-card-top"><span class="book-status ${p.status}">${active?'Active':p.status==='planned'?'Planned':'Available'}</span><span class="book-level">${stageLabel}</span></div><div class="eyebrow">${esc(x.book?.series||'Programme')}</div><h3>${esc(p.title)}</h3><p>${esc(p.description)}</p>${x.ready ? `<div class="programme-meta"><span>${p.targetHours?.[0]||12}–${p.targetHours?.[1]||18} h/week</span><span>${esc(x.book?.level||'')}</span></div>${active?'<span class="current-badge">Current programme</span>':'<button class="smallbtn primary" data-select-programme="'+esc(p.id)+'">Use this programme</button>'}` : `<div class="book-placeholder">${placeholder}</div>`}</article>`}).join('')}</div></section>
    <section class="library-section"><div class="panelhead"><div><h2>Book library</h2><p class="subtitle">Books are reusable resources. Workbooks and other companion material can be attached to a book without making them separate programmes.</p></div></div><div class="book-grid">${books.map(b=>{const p=programmes.find(x=>x.bookId===b.id);const mapped=!!(window.BOOK_MAPS||{})[b.id];return `<article class="book-card ${b.id===activeBook().id?'active-book':''} ${mapped?'mapped-book':''}" data-open-book="${esc(b.id)}" tabindex="0" role="button"><div class="book-card-top"><span class="book-status ${b.status}">${b.status==='active'?'In use':mapped?'Mapped':b.status==='planned'?'Planned':'Available'}</span><span class="book-level">${esc(b.level)}</span></div>${b.cover?`<div class="book-cover-visual"><img src="${esc(b.cover)}" alt="${esc(b.title)} cover" loading="lazy"></div>`:''}<div class="eyebrow">${esc(b.series)}</div><h3>${esc(b.title)}</h3><p>${esc(b.description)}</p><div class="book-meta">${p?`<span>Programme: ${esc(p.shortTitle||p.title)}</span>`:'<span>No programme mapped</span>'}${b.workbooks?.length?`<span>${b.workbooks.map(esc).join(' · ')}</span>`:''}${mapped?'<span>Open content map →</span>':''}</div></article>`}).join('')}</div></section>
    <section class="library-section"><div class="panelhead"><div><h2>Study tools & input</h2><p class="subtitle">Supporting resources stay independent from textbook programmes.</p></div></div><div class="resource-grid">${resources.map(r=>`<article class="resource-card"><div class="book-card-top"><span class="resource-type">${esc(r.type)}</span><span class="book-status ${r.status}">${r.status==='active'?'Active':'Available'}</span></div><h3>${esc(r.title)}</h3><p>${esc(r.description)}</p></article>`).join('')}</div></section>
    <section class="library-section architecture-note"><div class="eyebrow">How this scales</div><h2>Book → map → programme → schedule</h2><p>A future textbook can first become a mapped library resource. Only when you decide to study it should it become a programme with its own workload, tasks and progress.</p><div class="hub-flow"><span>Book</span><b>→</b><span>Map</span><b>→</b><span>Programme</span><b>→</b><span>Schedule</span><b>→</b><span>Progress</span></div></section>`;
  $('#mainContent').querySelectorAll('[data-select-programme]').forEach(b=>b.onclick=()=>selectProgramme(b.dataset.selectProgramme));
  $('#mainContent').querySelectorAll('.book-cover-visual img').forEach(img=>img.onerror=()=>{img.closest('.book-cover-visual').hidden=true;});
  $('#mainContent').querySelectorAll('[data-open-book]').forEach(b=>{
    const open=()=>{state.libraryItem=b.dataset.openBook;state.view='library';render();scrollTo({top:0,behavior:'smooth'});};
    b.onclick=open;
    b.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}};
  });
}

function lessonButton(l){
  const p=lessonProgress(l.n), pct=p.total?p.done/p.total*100:0, [cls,label]=lessonStatus(l.n);
  const secs=lessonSeconds(l.n), timeBit=secs?` · ${fmtDuration(secs)} studied`:'';
  return `<button class="lessonrow" data-lesson="${l.n}"><span class="lessonnum">${l.n}</span><span class="lessonrowmain"><strong>${esc(l.title)}</strong><small>${p.done}/${p.total} sections complete · ${p.mastered}/${p.total} mastered · ${label}${timeBit}</small><span class="mini-progress"><i style="width:${pct}%"></i></span></span><span class="lessonpct">${Math.round(pct)}%</span></button>`;
}
function activitySeconds(key){
  const re=new RegExp(`^habit-w\\d+-d\\d+-${key}$`);
  return state.sessions.filter(s=>s.task_id && re.test(s.task_id)).reduce((a,s)=>a+s.duration_seconds,0);
}
function topTaskSessions(limit=6){
  const map={};
  state.sessions.forEach(s=>{
    if(!s.task_id || /^habit-/.test(s.task_id)) return;
    map[s.task_id]=(map[s.task_id]||0)+s.duration_seconds;
  });
  return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,limit).map(([id,secs])=>({task:findTaskById(id),secs,id}));
}

/* WANIKANI_DETAILED_DASHBOARD */
function renderWaniKaniDashboardView() {
  const d = waniKaniState && waniKaniState.data;
  const u = d && d.user ? d.user : {};
  const s = d && d.summary ? d.summary : {};
  const assignments = Array.isArray(waniKaniState && waniKaniState.assignments)
    ? waniKaniState.assignments : [];

  const stageName = {1:'Apprentice',2:'Apprentice',3:'Apprentice',4:'Apprentice',
    5:'Guru',6:'Guru',7:'Master',8:'Enlightened',9:'Burned'};
  const counts = {Apprentice:0,Guru:0,Master:0,Enlightened:0,Burned:0};

  assignments.forEach(a => {
    const n = stageName[a.srs_stage];
    if (n) counts[n]++;
  });

  const level = u.level || '—';
  const levelProgress = u.subscription && u.subscription.max_level_granted
    ? Math.round((Number(level) / Number(u.subscription.max_level_granted)) * 100) : null;

  const availableLessons = s.lessons && s.lessons.length != null ? s.lessons.length :
    (s.lessons_available != null ? s.lessons_available : '—');
  const availableReviews = s.reviews && s.reviews.length != null ? s.reviews.length :
    (s.reviews_available != null ? s.reviews_available : '—');

  const updated = waniKaniState.updatedAt
    ? new Date(waniKaniState.updatedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})
    : 'Not yet';

  const pct = total => total ? Math.round((counts[total] / assignments.length) * 100) : 0;

  return `
    <div class="wk-page">
      <div class="wk-page-head">
        <div>
          <div class="eyebrow">WaniKani</div>
          <h1>WaniKani Dashboard</h1>
          <p class="subtitle">SRS progress, review workload and learning statistics.</p>
        </div>
        <button class="smallbtn primary" type="button">↻ Refresh</button>
      </div>

      <div class="wk-stat-grid">
        <div class="panel wk-stat"><span>Level</span><strong>${level}</strong>${levelProgress !== null ? `<small>${levelProgress}% of level 60</small>`:''}</div>
        <div class="panel wk-stat"><span>Reviews</span><strong>${availableReviews}</strong><small>currently available</small></div>
        <div class="panel wk-stat"><span>Lessons</span><strong>${availableLessons}</strong><small>currently available</small></div>
        <div class="panel wk-stat"><span>Updated</span><strong>${updated}</strong><small>WaniKani data</small></div>
      </div>

      <div class="wk-dashboard-grid">
        <section class="panel wk-card wk-srs">
          <div class="wk-card-title"><h3>SRS distribution</h3><span>${assignments.length || '—'} assignments</span></div>
          <div class="wk-srs-list">
            ${Object.entries(counts).map(([name,n]) => `
              <div class="wk-srs-row">
                <span>${name}</span><b>${n}</b>
                <i><em style="width:${assignments.length ? Math.round(n/assignments.length*100) : 0}%"></em></i>
              </div>`).join('')}
          </div>
        </section>

        <section class="panel wk-card">
          <div class="wk-card-title"><h3>Review workload</h3><span>Upcoming</span></div>
          <div class="wk-forecast">
            <div><strong>${availableReviews}</strong><span>Due now</span></div>
            <div><strong>${s.next_reviews_at ? new Date(s.next_reviews_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}) : '—'}</strong><span>Next review</span></div>
          </div>
          <div class="wk-actions">
            <a class="smallbtn" href="https://www.wanikani.com/review" target="_blank" rel="noopener">Reviews ↗</a>
            <a class="smallbtn" href="https://www.wanikani.com/subjects/lesson" target="_blank" rel="noopener">Lessons ↗</a>
          </div>
        </section>

        <section class="panel wk-card wk-wide">
          <div class="wk-card-title"><h3>Learning progress</h3><span>Items in the current dataset</span></div>
          <div class="wk-progress-cards">
            <div><span>Radicals</span><strong>${assignments.filter(a=>a.subject_type==='radical').length}</strong></div>
            <div><span>Kanji</span><strong>${assignments.filter(a=>a.subject_type==='kanji').length}</strong></div>
            <div><span>Vocabulary</span><strong>${assignments.filter(a=>a.subject_type==='vocabulary').length}</strong></div>
          </div>
          <p class="subtitle wk-note">Detailed item-level statistics appear when assignment data is available. This page remains independent of any particular textbook or programme.</p>
        </section>

        <section class="panel wk-card">
          <div class="wk-card-title"><h3>Review tools</h3><span>WaniKani</span></div>
          <div class="wk-tool-list">
            <a href="https://www.wanikani.com/review" target="_blank" rel="noopener">Start reviews <span>↗</span></a>
            <a href="https://www.wanikani.com/subjects/lesson" target="_blank" rel="noopener">Start lessons <span>↗</span></a>
            <a href="https://www.wanikani.com/dashboard" target="_blank" rel="noopener">Open WaniKani dashboard <span>↗</span></a>
          </div>
        </section>

        <section class="panel wk-card">
          <div class="wk-card-title"><h3>Integration</h3><span>Learning Hub</span></div>
          <p class="subtitle">WaniKani is an independent supporting resource. It is not included in textbook or programme completion.</p>
          <div class="wk-source">Last sync: ${updated}</div>
        </section>
      </div>
    </div>`;
}

const ROADMAP_ITEMS = [
  {id:'today-flow',title:'Tighten Today / Start Here',detail:'Make the next study action obvious and launchable from the dashboard.'},
  {id:'task-completion',title:'Improve task completion',detail:'Keep completion simple while recording useful time, confidence and notes.'},
  {id:'mobile-pass',title:'Mobile-first study pass',detail:'Keep the operational study flow comfortable on a phone.'},
  {id:'review-engine',title:'Lightweight review engine',detail:'Resurface completed work based on review flags, confidence and elapsed time.'},
  {id:'library',title:'Make the Library genuinely useful',detail:'Separate reusable resources from programmes and schedules.'},
  {id:'search',title:'Global search',detail:'Search lessons, tasks, books and study notes from one place.'},
  {id:'history',title:'Study history',detail:'Show recent study time and activity without turning the app into a gamification system.'},
  {id:'task-guidance',title:'Improve task guidance',detail:'Explain why a task exists and how it fits the textbook workflow.'},
  {id:'focus-mode',title:'Focus mode',detail:'Strip the interface down to the current task and timer.'},
  {id:'cross-resource',title:'Cross-resource learning model',detail:'Keep books, tools and activities independent so future resources can contribute to the same learning workflow.'},
  {id:'analytics',title:'Advanced analytics',detail:'Defer sophisticated analytics until real usage data tells us what is worth measuring.'}
];
const ROADMAP_DEFAULT_DONE = new Set(['today-flow','task-completion','mobile-pass','review-engine','library','search','history','task-guidance','focus-mode','cross-resource']);
function roadmapState(){try{return JSON.parse(localStorage.getItem('hubRoadmap')||'{}')}catch(e){return {}}}
function roadmapDone(id){const r=roadmapState();return Object.prototype.hasOwnProperty.call(r,id)?!!r[id]:ROADMAP_DEFAULT_DONE.has(id)}
function setRoadmapDone(id,done){const r=roadmapState();r[id]=!!done;localStorage.setItem('hubRoadmap',JSON.stringify(r));render();}
function reviewItems(){
  const now=Date.now(), out=[];
  for(const t of allCoreTasks()){
    const st=ts(t.id); if(!st.completed) continue;
    const completed=st.completed_at?new Date(st.completed_at).getTime():0;
    if(!completed) continue;
    const days=(now-completed)/86400000;
    const flagged=['shaky','review'].includes(st.mastery) || Number(st.confidence||9)<=2;
    const due=flagged ? days>=1 : days>=7;
    if(due) out.push({t,st,days,priority:flagged?0:1});
  }
  return out.sort((a,b)=>a.priority-b.priority||b.days-a.days).slice(0,8);
}
function studyContext(){
  const start=new Date(state.startDate+'T00:00:00'); const today=new Date(); today.setHours(0,0,0,0);
  if(today<start) return {w:0,d:0,date:start,preStart:true};
  const x=currentWeekDay(); return {w:x.w,d:x.d,date:addDays(start,x.w*7+x.d),preStart:false};
}
function todayTasks(){
  const {w,d}=studyContext();
  return weeklyTasks(w,d).filter(t=>!ts(t.id).completed).slice(0,4);
}
function taskPurpose(t){
  if(!t) return '';
  if(t.key?.includes('grammar')) return 'Build accurate control of the grammar introduced in the textbook, then practise it actively.';
  if(t.key?.includes('vocab')) return 'Turn the lesson vocabulary into recognition and retrieval you can use in context.';
  if(t.key?.includes('kanji')) return 'Build recognition and retrieval of the lesson kanji and compounds.';
  if(t.key?.includes('reading')) return 'Use the textbook reading strategy and check comprehension rather than simply rereading.';
  if(t.key?.includes('listening')) return 'Listen for meaning first, then replay to identify what you missed.';
  if(t.book?.startsWith('Workbook')) return 'Consolidate the corresponding textbook material through targeted written practice.';
  return 'Work through the referenced textbook material actively, then record anything that needs another pass.';
}
function openSearch(){
  const d=$('#searchDialog'); if(!d)return; d.showModal(); $('#globalSearch').value=''; $('#globalSearch').focus(); renderSearchResults('');
}
function searchIndex(q){
  q=q.trim().toLowerCase(); if(!q)return [];
  const rows=[];
  for(const t of allCoreTasks()) rows.push({type:'Task',title:t.title,meta:`${activeBook().title} · ${t.book}${t.page?' · p.'+t.page:''}`,id:t.id,score:(t.title+' '+t.book+' '+(t.section||'')).toLowerCase().includes(q)?2:1});
  for(const l of CURRICULUM.lessons) rows.push({type:'Lesson',title:`Lesson ${l.n}: ${l.title}`,meta:l.english||'',id:`lesson-${l.n}`,score:(l.title+' '+(l.english||'')).toLowerCase().includes(q)?2:1});
  for(const b of (window.BOOKS||[])) rows.push({type:'Book',title:b.title,meta:`${b.series} · ${b.level}`,id:b.id,score:(b.title+' '+b.series+' '+b.level+' '+(b.description||'')).toLowerCase().includes(q)?2:1});
  const noteRows=Object.entries(state.taskState).filter(([id,v])=>v.notes&&v.notes.toLowerCase().includes(q)).map(([id,v])=>({type:'Note',title:v.notes.slice(0,90),meta:`${findTaskById(id)?.title||id}`,id,score:3}));
  const repositoryRows=(typeof repositoryState!=='undefined'?repositoryState.entries:[]).filter(entry=>repositoryEntrySearchText(entry).includes(q)).map(entry=>({type:'Sentence',title:entry.japanese||entry.original_japanese,meta:entry.english||entry.intent_english||'Japanese Repository',id:entry.id,score:4}));
  return [...rows.filter(x=>(x.title+' '+x.meta).toLowerCase().includes(q)),...noteRows,...repositoryRows].sort((a,b)=>b.score-a.score).slice(0,40);
}
function renderSearchResults(q){
  const box=$('#searchResults'); if(!box)return; const rows=searchIndex(q);
  box.innerHTML=q.trim()? (rows.length?rows.map(x=>`<button class="search-result" data-search-type="${esc(x.type)}" data-search-id="${esc(x.id)}"><span class="search-type">${esc(x.type)}</span><strong>${esc(x.title)}</strong><small>${esc(x.meta)}</small></button>`).join(''):'<div class="empty">No matches.</div>'):'<div class="empty">Search lessons, tasks, books or your task notes.</div>';
  box.querySelectorAll('.search-result').forEach(b=>b.onclick=()=>{
    const type=b.dataset.searchType,id=b.dataset.searchId;
    $('#searchDialog').close();
    if(type==='Sentence'){
      openRepositoryEntry(id);
    }else if(type==='Lesson' || (type==='Note' && id.startsWith('lesson-'))){
      state.view='lesson';
      state.lesson=Number(id.replace('lesson-',''));
      render();
    }else if(type==='Task'||type==='Note'){
      openTask(id);
    }else{
      state.libraryItem=id;
      state.view='library';
      render();
    }
  });
}

function renderDashboard(){
  $('#hero').hidden=true; $('#bottomArea').hidden=true; $('#weekView').hidden=true; $('#mainContent').hidden=false;
  const overall=overallProgress(),w=currentWeekIndex(),wp=progress(w),next=nextIncomplete();
  const studyDay=studyContext(),today=todayTasks(), reviews=reviewItems();
  const dayLabel=studyDay.preStart?`Next study · ${fmt(studyDay.date)}`:`Today · ${fmt(studyDay.date)}`;
  const attention=CURRICULUM.lessons.flatMap(l=>lessonTasks(l).map(t=>({t,s:ts(t.id)}))).filter(x=>['shaky','studying','review'].includes(x.s.mastery)).slice(0,8);
  const activityRows=OPTIONAL_TASKS.map(x=>({label:x.label,secs:activitySeconds(x.key)})).sort((a,b)=>b.secs-a.secs);
  const maxActivity=Math.max(...activityRows.map(a=>a.secs),1);
  const topTasks=topTaskSessions(6);
  const weekTime=weekSeconds(7), recentTime=weekSeconds(30);
  const todayPct=today.length?0:100;
  $('#mainContent').innerHTML=`
    <section class="today-hero">
      <div><div class="eyebrow">${dayLabel}</div><h1>${studyDay.preStart?'Ready for Monday?':'What are you studying now?'}</h1><p>${esc(activeBook().title)} · Week ${w+1}. The dashboard is deliberately focused on the next useful action.</p></div>
      <div class="today-summary"><strong>${today.length?today.length:0}</strong><span>${today.length?'core tasks remaining today':'core tasks remaining'}</span></div>
    </section>
    <section class="today-layout">
      <article class="panel today-card"><div class="panelhead"><div><h2>Start here</h2><p class="subtitle">Open the guided lesson path and continue from the matching numbered step.</p></div><span class="today-complete">${todayPct}%</span></div>
        ${today.length?`<div class="focuslist">${today.map((t,i)=>{const s=ts(t.id),action=t.lesson?`data-guided-task="${esc(t.id)}" data-guided-lesson="${esc(t.lesson)}">Open path`:`data-today-task="${esc(t.id)}">Start`;return `<article class="focusitem"><span class="focus-number">${i+1}</span><div class="focusmain"><strong>${esc(t.title)}</strong><small>${esc(t.book)}${t.page?' · p.'+esc(t.page):''} · ${esc(t.duration)}</small><span>${esc(taskPurpose(t))}</span></div><button class="smallbtn primary" ${action}</button></article>`}).join('')}</div>`:'<div class="empty success-empty">Today’s core work is complete. Use the review queue below or stop for the day.</div>'}
        <div class="today-actions"><button class="smallbtn" id="openWeekToday">Open today in Study Plan</button>${next?'<button class="smallbtn" id="openNextTask">Next incomplete</button>':''}</div>
      </article>
      <article class="panel review-card"><div class="panelhead"><div><h2>Review queue</h2><p class="subtitle">Completed work returns here after an interval, with flagged or low-confidence items returning sooner.</p></div><span class="flag-count">${reviews.length} due</span></div>
        ${reviews.length?`<div class="attentionlist review-list">${reviews.map(x=>`<button class="attention" data-review-task="${esc(x.t.id)}"><span class="status-dot ${x.st.mastery}"></span><span><strong>${esc(x.t.title)}</strong><small>${esc(x.t.book)} · ${x.days<2?'due now':Math.floor(x.days)+'d since completion'}${x.st.confidence?' · confidence '+x.st.confidence+'/5':''}</small></span></button>`).join('')}</div>`:'<div class="empty">Nothing is due yet. Keep testing yourself honestly.</div>'}
      </article>
    </section>
    <section class="dashgrid secondary-dashboard">
      <article class="dashcard primarycard"><div class="eyebrow">Programme progress</div><h2>${esc(activeBook().title)}</h2><p>${overall.done} of ${overall.total} scheduled core tasks complete.</p><div class="bigprogress"><strong>${Math.round(overall.done/overall.total*100)||0}%</strong><span>overall completion</span></div><div class="progress"><i style="width:${overall.total?overall.done/overall.total*100:0}%"></i></div><div class="statstrip"><span><strong>${wp.done}</strong> this week</span><span><strong>${attention.length}</strong> attention</span><span><strong>${fmtDuration(recentTime)}</strong> last 30 days</span></div></article>
      <article class="dashcard"><div class="eyebrow">Current week</div><h3>Week ${w+1}</h3><p>${wp.done}/${wp.total} core tasks complete</p><p class="subtitle">${fmtDuration(weekTime)} studied in the last 7 days</p><button class="smallbtn primary" id="resumeWeek">Open this week</button></article>
      <article class="dashcard"><div class="eyebrow">Next up</div><h3>${next?esc(next.task.title):'Course complete'}</h3><p>${next?`Week ${next.week+1} · ${esc(next.task.book)}${next.task.page?' · p.'+esc(next.task.page):''}`:'You have completed every scheduled core task.'}</p>${next?'<button class="smallbtn primary" id="openNext">Open task</button>':''}</article>
    </section>
    <section class="dashboard-history panel"><div class="panelhead"><div><h2>Study history</h2><p class="subtitle">Logged focus time from the last 7 days. This is a record, not a score.</p></div><strong>${fmtDuration(weekTime)}</strong></div><div class="history-days">${Array.from({length:7},(_,i)=>{const d=addDays(new Date(),i-6),key=dateKey(d),secs=state.sessions.filter(x=>dateKey(new Date(x.completed_at))===key).reduce((a,x)=>a+x.duration_seconds,0);return `<div class="history-day"><strong>${fmtDuration(secs)}</strong><i style="height:${Math.max(6,Math.min(100,secs/3600*100))}%"></i><small>${d.toLocaleDateString(undefined,{weekday:'short'})}</small></div>`}).join('')}</div></section>
    <section class="dashboard-lower"><article class="panel"><div class="panelhead"><div><h3>Needs attention</h3><p class="subtitle">Optional flags and notes from your study tasks.</p></div></div>${attention.length?`<div class="attentionlist">${attention.map(x=>`<button class="attention" data-task="${esc(x.t.id)}"><span class="status-dot ${x.s.mastery}"></span><span><strong>${esc(x.t.title)}</strong><small>L${x.t.lesson} · ${esc(x.t.book)} · p.${x.t.page}</small></span></button>`).join('')}</div>`:'<div class="empty">Nothing flagged yet.</div>'}</article>
    <article class="panel"><div class="panelhead"><div><h3>Study time by activity</h3><p class="subtitle">Immersion and habit time logged through Pomodoro.</p></div></div><div class="timebars">${activityRows.map(a=>`<div class="timebar-row"><span>${esc(a.label)}</span><div class="timebar-track"><i style="width:${a.secs?Math.min(100,a.secs/maxActivity*100):0}%"></i></div><strong>${fmtDuration(a.secs)}</strong></div>`).join('')}</div></article></section>`;
  $('#resumeWeek')?.addEventListener('click',()=>{state.view='plan';state.week=w;render();});
  $('#openNext')?.addEventListener('click',()=>{next.task.lesson?openGuidedLesson(next.task.lesson,next.task.id):(state.week=next.week,state.view='plan',render(),setTimeout(()=>openTask(next.task.id),50));});
  $('#openNextTask')?.addEventListener('click',()=>{next.task.lesson?openGuidedLesson(next.task.lesson,next.task.id):(state.week=next.week,state.view='plan',render(),setTimeout(()=>openTask(next.task.id),50));});
  $('#openWeekToday')?.addEventListener('click',()=>{state.view='plan';state.week=w;render();});
}

function card(t){
  const s=ts(t.id);
  return `<article class="task ${s.completed?'done':''}" data-task="${esc(t.id)}"><input type="checkbox" data-check="${esc(t.id)}" ${s.completed?'checked':''}><div class="taskmain"><div class="tasktitle">${esc(t.title)}</div><div class="taskmeta">${esc(t.book)}${t.page?` · p.${t.page}`:''} · ${esc(t.duration)}</div><div class="taskhint">Tap for instructions, mastery and notes</div></div><span class="status-dot ${s.mastery}"></span></article>`;
}
function renderWeek(){
  $('#hero').hidden=false; $('#bottomArea').hidden=false; $('#weekView').hidden=false; $('#mainContent').hidden=true;
  const ds=weekDates(state.week);
  $('#weekView').innerHTML=`<div class="tabsrow"><button class="smallbtn" id="prevWeek">←</button><div class="weektabs" id="weekTabs"></div><button class="smallbtn" id="nextWeek">→</button></div><div class="week-overview"><div><div class="eyebrow">WEEK ${state.week+1}</div><h2>${esc(weekPlan(state.week).focus)}</h2><p class="subtitle">Core target: ${fmtMinutes(weekPlan(state.week).days.reduce((a,x)=>a+x.target,0))} this week, with optional input bringing the overall plan toward 15–20 hours.</p></div></div>${ds.map((date,d)=>{const core=weeklyTasks(state.week,d),hs=habits(state.week,d),plan=weekPlan(state.week).days[d]||{focus:'Core study',target:120,extra:'30 min Japanese input'},isToday=dateKey(date)===dateKey(new Date());return `<section class="day ${isToday?'today':''}"><div class="dayhead"><div><div class="eyebrow">${isToday?'TODAY · ':''}${date.toLocaleDateString(undefined,{weekday:'long'})}</div><h2>${fmt(date)}</h2><p class="dayfocus"><strong>${esc(plan.focus)}</strong> · target ${fmtMinutes(plan.target)} · ${esc(plan.extra)}</p></div><span class="daycount">${core.filter(t=>ts(t.id).completed).length}/${core.length}</span></div>${core.length?`<div class="tasklist">${core.map(card).join('')}</div>`:''}<details class="habits"><summary>Optional input <span>WaniKani · Migaku · shadowing · reading</span></summary><p class="habit-target">Recommended: ${esc(plan.extra)}</p><div class="habitlist">${hs.map(card).join('')}</div></details></section>`}).join('')}`;
  $('#weekView').querySelectorAll('[data-check]').forEach(e=>e.onchange=()=>toggle(e.dataset.check));
  $('#prevWeek').onclick=()=>{state.week=Math.max(0,state.week-1);render();};
  $('#nextWeek').onclick=()=>{state.week=Math.min(11,state.week+1);render();};
  renderTabs();
}
function renderTabs(){
  $('#weekTabs').innerHTML=Array.from({length:12},(_,i)=>`<button class="weektab ${i===state.week?'active':''}" data-week="${i}">W${i+1}</button>`).join('');
  $('#weekTabs').querySelectorAll('button').forEach(b=>b.onclick=()=>{state.week=+b.dataset.week;render();scrollTo({top:0,behavior:'smooth'});});
}
function componentRow(l,t){
  const s=ts(t.id), status=s.mastery==='not_started'?'Not started':s.mastery[0].toUpperCase()+s.mastery.slice(1);
  const secs=taskSeconds(t.id);
  return `<article class="component ${s.completed?'done':''}" data-task="${esc(t.id)}"><div class="component-top"><div><div class="component-title">${esc(t.title)}</div><div class="component-ref"><span class="booktag">${esc(t.book)}</span> <strong>p.${t.page}</strong> · ${esc(t.duration)}</div></div><span class="status-label ${s.mastery}">${status}</span></div><div class="component-bottom"><span>${s.completed?'✓ Completed':'Open study task'}</span><span>${secs?`<span class="time-badge">⏱ ${fmtDuration(secs)}</span>`:(s.confidence?`Confidence ${s.confidence}/5`:'')}</span></div></article>`;
}

function saveAudioPlaybackState(){
  localStorage.setItem('lessonAudioPlayback',JSON.stringify(audioPlaybackState));
}

function safeYouTubeUrl(value){
  try{
    const url=new URL(value);
    const host=url.hostname.toLowerCase().replace(/^www\./,'');
    return url.protocol==='https:' && ['youtube.com','youtu.be'].includes(host) ? url.href : null;
  }catch(e){ return null; }
}

function lessonVideoPanelMarkup(l){
  const videos=(state.lessonVideos||[]).filter(video=>Number(video.lesson)===l.n);
  const typeDefinitions=[
    {key:'vocabulary',label:'Vocabulary practice',guide:'Repeat aloud at a good tempo, then check the vocabulary and particles in the textbook.'},
    {key:'grammar',label:'Grammar instruction',guide:'For each item: watch the video, read the textbook explanation, then complete and check its audio exercise.'},
    {key:'dialogue',label:'Dialogue practice',guide:'Watch and speak along, then read the opening dialogue aloud with its audio.'}
  ];
  let body='';
  if(!state.lessonVideosLoaded){
    body='<div class="video-empty">Loading private video links…</div>';
  }else if(state.lessonVideosError){
    body='<div class="video-empty">Video links are unavailable. Check that the updated Supabase schema has been run.</div>';
  }else if(!videos.length){
    body='<div class="video-empty">No videos are mapped for this lesson yet. Import the completed CSV in Supabase to add them.</div>';
  }else{
    body=typeDefinitions.map(type=>{
      const rows=videos.filter(video=>video.video_type===type.key).sort((a,b)=>Number(a.sort_order)-Number(b.sort_order));
      if(!rows.length) return '';
      return `<div class="video-group"><div class="video-group-heading"><div><strong>${esc(type.label)}</strong><p>${esc(type.guide)}</p></div><span>${rows.length} ${rows.length===1?'video':'videos'}</span></div><div class="video-link-list">${rows.map(video=>{
        const url=safeYouTubeUrl(video.youtube_url);
        if(!url) return '';
        const grammarTarget=type.key==='grammar' && video.grammar_index ? l.textbook.grammar[Number(video.grammar_index)-1] : '';
        return `<a class="video-link" href="${esc(url)}" target="_blank" rel="noopener noreferrer"><span>${type.key==='grammar'&&video.grammar_index?`Grammar ${esc(video.grammar_index)}`:esc(type.label)}</span><strong>${esc(video.title)}</strong>${grammarTarget?`<small>${esc(grammarTarget)}</small>`:''}<b>Open on YouTube ↗</b></a>`;
      }).join('')}</div></div>`;
    }).join('');
  }
  return `<section class="panel lesson-video-panel"><div class="panelhead"><div><div class="eyebrow">Private video links</div><h2>Tobira lesson videos</h2><p class="subtitle">Follow the publisher's self-study sequence without storing video files in the app.</p></div><span class="audio-private-badge">Authenticated</span></div><div class="video-groups">${body}</div></section>`;
}

function audioPanelMarkup(n){
  const lessonAudio=AUDIO_LIBRARY.lessons?.[n];
  if(!lessonAudio) return '';
  const groups=(AUDIO_LIBRARY.categories||[]).map(category=>{
    const tracks=lessonAudio.groups?.[category.key]||[];
    if(!tracks.length) return '';
    return `<div class="audio-group" id="audio-group-${esc(category.key)}"><div class="audio-group-heading"><strong>${esc(category.label)}</strong><span>${esc(category.english)} · ${tracks.length}</span></div>${category.guide?`<p class="audio-group-guide">${esc(category.guide)}</p>`:''}<div class="audio-track-list">${tracks.map(track=>`<button type="button" class="audio-track" data-audio-path="${esc(track.path)}"><span>${esc(track.badge||String(track.number).padStart(2,'0'))}</span><strong>${esc(track.title)}</strong></button>`).join('')}</div></div>`;
  }).join('');
  return `<section class="panel lesson-audio-panel">
    <div class="panelhead"><div><div class="eyebrow">Private lesson audio</div><h2>Listen and shadow</h2><p class="subtitle">会話 · 単語リスト · 話しましょう · 読みましょう · 聞きましょう</p></div><span class="audio-private-badge">Authenticated</span></div>
    <div class="lesson-audio-layout">
      <div class="audio-groups">${groups}</div>
      <div class="audio-player-card">
        <div class="audio-now"><span id="audioNowCategory">Lesson ${n} audio</span><strong id="audioNowTitle">Choose a track</strong><small id="audioNowFile">Stored privately in Supabase</small></div>
        <audio id="lessonAudioPlayer" controls preload="metadata"></audio>
        <div class="audio-controls"><button type="button" class="smallbtn" id="audioPrevious" disabled>← Previous</button><button type="button" class="smallbtn" id="audioBack">−10s</button><button type="button" class="smallbtn" id="audioForward">+10s</button><button type="button" class="smallbtn" id="audioNext" disabled>Next →</button></div>
        <label class="audio-speed">Playback speed <select id="audioSpeed"><option value="0.75">0.75×</option><option value="1">1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="2">2×</option></select></label>
        <p class="audio-status" id="audioStatus">Select a track to create a temporary private playback link.</p>
      </div>
    </div>
  </section>`;
}

async function signedLessonAudioUrl(track){
  const cached=audioUrlCache.get(track.path);
  if(cached?.expiresAt>Date.now()+60000) return cached.url;
  if(!db||!state.user) throw new Error('Sign in to play private audio.');
  const {data,error}=await db.storage.from(AUDIO_LIBRARY.bucket).createSignedUrl(track.path,3600);
  if(error) throw error;
  const signedUrl=data?.signedUrl;
  if(!signedUrl) throw new Error('No playback URL was returned.');
  audioUrlCache.set(track.path,{url:signedUrl,expiresAt:Date.now()+3600000});
  return signedUrl;
}

function initLessonAudio(n){
  const lessonAudio=AUDIO_LIBRARY.lessons?.[n], player=$('#lessonAudioPlayer');
  if(!lessonAudio||!player) return;
  const tracks=lessonAudio.tracks||[];
  const buttons=[...document.querySelectorAll('.audio-track')];
  const status=$('#audioStatus'), title=$('#audioNowTitle'), file=$('#audioNowFile'), category=$('#audioNowCategory');
  const previous=$('#audioPrevious'), next=$('#audioNext'), speed=$('#audioSpeed');
  let currentIndex=-1, lastSavedSecond=-1;

  speed.value=String(audioPlaybackState.speed||1);
  player.playbackRate=Number(speed.value);

  function updateSelection(){
    buttons.forEach((button,index)=>button.classList.toggle('active',index===currentIndex));
    previous.disabled=currentIndex<=0;
    next.disabled=currentIndex<0||currentIndex>=tracks.length-1;
  }

  async function loadTrack(index,autoplay=false){
    const track=tracks[index]; if(!track) return;
    currentIndex=index; updateSelection();
    const categoryDef=(AUDIO_LIBRARY.categories||[]).find(x=>x.key===track.category);
    category.textContent=`${categoryDef?.label||''} · ${categoryDef?.english||''}`;
    title.textContent=track.title;
    file.textContent=track.filename;
    status.textContent='Preparing private audio…';
    try{
      const signedUrl=await signedLessonAudioUrl(track);
      player.src=signedUrl;
      player.playbackRate=Number(speed.value);
      audioPlaybackState.lastPath=track.path;
      saveAudioPlaybackState();
      player.onloadedmetadata=()=>{
        const saved=Number(audioPlaybackState.positions?.[track.path]||0);
        if(saved>0 && saved<player.duration-2) player.currentTime=saved;
        status.textContent=saved>0?`Resumed at ${Math.floor(saved/60)}:${String(Math.floor(saved%60)).padStart(2,'0')}.`:'Ready to play.';
        if(autoplay) player.play().catch(()=>{});
      };
      player.onerror=()=>{status.textContent='Audio file unavailable. Check that this MP3 was uploaded to the expected storage folder.';};
    }catch(error){
      status.textContent=error?.message||'Unable to open this audio track.';
    }
  }

  buttons.forEach((button,index)=>button.onclick=()=>loadTrack(index,true));
  previous.onclick=()=>loadTrack(currentIndex-1,true);
  next.onclick=()=>loadTrack(currentIndex+1,true);
  $('#audioBack').onclick=()=>{player.currentTime=Math.max(0,player.currentTime-10);};
  $('#audioForward').onclick=()=>{player.currentTime=Math.min(player.duration||Infinity,player.currentTime+10);};
  speed.onchange=()=>{
    audioPlaybackState.speed=Number(speed.value);
    player.playbackRate=audioPlaybackState.speed;
    saveAudioPlaybackState();
  };
  player.ontimeupdate=()=>{
    const track=tracks[currentIndex]; if(!track) return;
    const second=Math.floor(player.currentTime||0);
    if(second===lastSavedSecond||second%5!==0) return;
    lastSavedSecond=second;
    audioPlaybackState.positions={...(audioPlaybackState.positions||{}),[track.path]:second};
    saveAudioPlaybackState();
  };
  player.onended=()=>{
    const track=tracks[currentIndex];
    if(track){audioPlaybackState.positions={...(audioPlaybackState.positions||{}),[track.path]:0};saveAudioPlaybackState();}
    status.textContent=currentIndex<tracks.length-1?'Track complete. Choose Next to continue.':'Lesson audio complete.';
  };

  const rememberedIndex=tracks.findIndex(track=>track.path===audioPlaybackState.lastPath);
  if(rememberedIndex>=0) loadTrack(rememberedIndex,false);
}

function updateGuideTaskRecord(id,patch){
  state.taskState[id]={...ts(id),...patch};
  saveLocal();
  cloudSave(id);
}

function initGuideAudio(n){
  const lessonAudio=AUDIO_LIBRARY.lessons?.[n];
  if(!lessonAudio) return;
  const allBoxes=[...document.querySelectorAll('.guide-inline-audio')];
  document.querySelectorAll('.guide-audio-toggle').forEach(toggle=>{
    const workspace=toggle.closest('.guide-task-workspace');
    const box=workspace?.querySelector('.guide-inline-audio');
    if(!box) return;
    const category=toggle.dataset.guideAudio;
    const tracks=lessonAudio.groups?.[category]||[];
    const player=box.querySelector('.guide-inline-player');
    const selector=box.querySelector('.guide-audio-select');
    const speed=box.querySelector('.guide-audio-speed');
    const now=box.querySelector('.guide-audio-now');
    const status=box.querySelector('.guide-audio-status');
    const previous=box.querySelector('[data-audio-command="previous"]');
    const next=box.querySelector('[data-audio-command="next"]');
    let currentIndex=-1, lastSavedSecond=-1;

    speed.value=String(audioPlaybackState.speed||1);
    player.playbackRate=Number(speed.value);

    function updateControls(){
      selector.value=String(Math.max(0,currentIndex));
      previous.disabled=currentIndex<=0;
      next.disabled=currentIndex<0||currentIndex>=tracks.length-1;
    }

    async function loadTrack(index,autoplay=false){
      const track=tracks[index]; if(!track) return;
      document.querySelectorAll('.guide-inline-player').forEach(other=>{if(other!==player) other.pause();});
      currentIndex=index; updateControls();
      now.innerHTML=`<strong>${esc(track.title)}</strong><small>${esc(track.filename)}</small>`;
      status.textContent='Preparing private audio…';
      try{
        const url=await signedLessonAudioUrl(track);
        player.src=url;
        player.playbackRate=Number(speed.value);
        audioPlaybackState.lastPath=track.path;
        saveAudioPlaybackState();
        player.onloadedmetadata=()=>{
          const saved=Number(audioPlaybackState.positions?.[track.path]||0);
          if(saved>0&&saved<player.duration-2) player.currentTime=saved;
          status.textContent=saved>0?`Resumed at ${Math.floor(saved/60)}:${String(Math.floor(saved%60)).padStart(2,'0')}.`:'Ready to play.';
          if(autoplay) player.play().catch(()=>{});
        };
        player.onerror=()=>{status.textContent='Audio file unavailable. Check the expected Supabase object path.';};
      }catch(error){
        status.textContent=error?.message||'Unable to open this audio track.';
      }
    }

    toggle.onclick=()=>{
      allBoxes.forEach(other=>{
        if(other!==box){other.hidden=true;other.querySelector('audio')?.pause();}
      });
      box.hidden=false;
      const remembered=tracks.findIndex(track=>track.path===audioPlaybackState.lastPath);
      loadTrack(remembered>=0?remembered:Math.max(0,currentIndex),true);
      selector.focus({preventScroll:true});
    };
    box.querySelector('.guide-audio-close').onclick=()=>{player.pause();box.hidden=true;toggle.focus({preventScroll:true});};
    selector.onchange=()=>loadTrack(Number(selector.value),true);
    previous.onclick=()=>loadTrack(currentIndex-1,true);
    next.onclick=()=>loadTrack(currentIndex+1,true);
    box.querySelector('[data-audio-command="back"]').onclick=()=>{player.currentTime=Math.max(0,player.currentTime-10);};
    box.querySelector('[data-audio-command="forward"]').onclick=()=>{player.currentTime=Math.min(player.duration||Infinity,player.currentTime+10);};
    speed.onchange=()=>{
      audioPlaybackState.speed=Number(speed.value);
      player.playbackRate=audioPlaybackState.speed;
      saveAudioPlaybackState();
    };
    player.ontimeupdate=()=>{
      const track=tracks[currentIndex]; if(!track) return;
      const second=Math.floor(player.currentTime||0);
      if(second===lastSavedSecond||second%5!==0) return;
      lastSavedSecond=second;
      audioPlaybackState.positions={...(audioPlaybackState.positions||{}),[track.path]:second};
      saveAudioPlaybackState();
    };
    player.onended=()=>{
      const track=tracks[currentIndex];
      if(track){audioPlaybackState.positions={...(audioPlaybackState.positions||{}),[track.path]:0};saveAudioPlaybackState();}
      status.textContent=currentIndex<tracks.length-1?'Track complete. Choose Next to continue.':'This task’s audio is complete.';
    };
    updateControls();
  });
}

function initGuideTaskWorkspaces(l){
  document.querySelectorAll('[data-guide-notes]').forEach(input=>input.oninput=()=>updateGuideTaskRecord(input.dataset.guideNotes,{notes:input.value}));
  document.querySelectorAll('[data-guide-mastery]').forEach(select=>select.onchange=()=>updateGuideTaskRecord(select.dataset.guideMastery,{mastery:select.value}));
  document.querySelectorAll('[data-guide-confidence]').forEach(select=>select.onchange=()=>updateGuideTaskRecord(select.dataset.guideConfidence,{confidence:select.value?Number(select.value):null}));
  document.querySelectorAll('[data-guide-step-nav]').forEach(button=>button.onclick=()=>{
    document.getElementById(`guide-${button.dataset.guideStepNav}`)?.scrollIntoView({behavior:'smooth',block:'center'});
  });
  initGuideAudio(l.n);
}

function lessonVideosByType(l,type){
  return (state.lessonVideos||[])
    .filter(video=>Number(video.lesson)===l.n && video.video_type===type && safeYouTubeUrl(video.youtube_url))
    .sort((a,b)=>Number(a.sort_order)-Number(b.sort_order));
}

function grammarPageFromVideos(rows,fallback){
  for(const row of rows){
    const match=String(row.title||'').match(/\((pp?\.\s*[^)]+)\)/i);
    if(match) return match[1].replace(/\s+/g,'');
  }
  return `pp.${fallback}`;
}

function taskStudyChecklist(l,t){
  if(t?.sectionSteps?.length) return t.sectionSteps;
  const textbook=l?.textbook?.pages||{};
  const page=t?.page?`${t.book} p.${t.page}`:t?.book||'the referenced resource';
  const checks={
    vocab:[`Complete Lesson ${l.n} vocabulary practice on ${page} without copying from the textbook.`,`Check errors against Textbook pp.${textbook.vocab} and identify why each answer was missed.`,'Read corrected words and example sentences aloud, then retrieve them once more without looking.'],
    particle:[`Complete the Lesson ${l.n} particle practice on ${page}.`,`For every correction, explain what the chosen particle marks in that sentence.`,'Record recurring particle errors in this task’s notes.'],
    grammar1:[`Complete Grammar practice 1 on ${page} after studying the matching Lesson ${l.n} grammar videos and explanations.`,'Produce your own answer before checking the model.','Return to the exact grammar point for every error rather than rereading the whole section.'],
    grammar2:[`Complete Grammar practice 2 on ${page}, beginning with the least secure Lesson ${l.n} grammar points.`,'Answer without notes first, then check form and nuance.','Mark any grammar that still cannot be produced independently as Shaky or Review.'],
    comp1:[`Attempt Comprehensive practice 1 on ${page} as a closed-book Lesson ${l.n} retrieval test.`,'Check every error against its exact textbook section.','Repeat missed items after a short delay before marking the task complete.'],
    comp2:[`Attempt Comprehensive practice 2 on ${page} without notes.`,'Use mistakes to identify the final weak areas from Lesson '+l.n+'.','Update confidence and add a short note about anything requiring another pass.'],
    listening:[`Play the Lesson ${l.n} listening audio without reading the script and complete ${page}.`,'Check the script only after the first attempt and identify what was not heard.','Replay difficult lines and shadow them before checking the final answer.'],
    kanji:[`Complete the Lesson ${l.n} kanji practice on ${page} from memory.`,`Check readings and compounds against Textbook pp.${textbook.kanji}.`,'Retest missed kanji once before marking the task complete.'],
    reading:[`Read the passage on ${page} once for overall meaning without stopping at every unknown word.`,`Answer the questions, then check important unknown language against Textbook pp.${textbook.reading}.`,'Give a brief spoken or written summary from memory.'],
    writing:[`Complete the Lesson ${l.n} writing task on ${page} using the lesson’s target language.`,'Check accuracy and naturalness against the model without copying it.','Record one corrected sentence or recurring problem in the notes below.'],
    review:[`Complete the Lesson ${l.n} review on ${page} as a retrieval check.`,'Revisit only items that are not yet automatic.','Update mastery honestly before finishing the lesson.']
  };
  return checks[t?.key]||[t?.desc||`Complete the referenced work on ${page}.`,'Check your work and record anything that needs another pass.'];
}

function guideAudioMarkup(l,step){
  if(!step.audio) return '';
  const tracks=AUDIO_LIBRARY.lessons?.[l.n]?.groups?.[step.audio]||[];
  if(!tracks.length) return '<p class="guide-resource-note">No mapped audio tracks are available for this task.</p>';
  const category=(AUDIO_LIBRARY.categories||[]).find(item=>item.key===step.audio)||{};
  return `<div class="guide-audio-area">
    <button type="button" class="guide-action guide-audio-toggle" data-guide-audio="${esc(step.audio)}">▶ Play ${esc(category.english||step.audio)} audio here</button>
    <div class="guide-inline-audio" data-guide-audio-box="${esc(step.audio)}" hidden>
      <div class="guide-inline-audio-head"><div><span>${esc(category.label||'')}</span><strong>${esc(category.english||step.audio)} · ${tracks.length} ${tracks.length===1?'track':'tracks'}</strong></div><button type="button" class="guide-audio-close" aria-label="Close inline audio">×</button></div>
      ${category.guide?`<p>${esc(category.guide)}</p>`:''}
      <label class="guide-audio-select-label">Track <select class="guide-audio-select">${tracks.map((track,index)=>`<option value="${index}">${esc(track.badge||String(index+1).padStart(2,'0'))} · ${esc(track.title)}</option>`).join('')}</select></label>
      <div class="guide-audio-now"><strong>Choose a track</strong><small>Private Lesson ${l.n} audio</small></div>
      <audio class="guide-inline-player" controls preload="metadata"></audio>
      <div class="guide-inline-controls"><button type="button" data-audio-command="previous">← Previous</button><button type="button" data-audio-command="back">−10s</button><button type="button" data-audio-command="forward">+10s</button><button type="button" data-audio-command="next">Next →</button><label>Speed <select class="guide-audio-speed"><option value="0.75">0.75×</option><option value="1">1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="2">2×</option></select></label></div>
      <div class="guide-audio-status">Ready to load inside this task.</div>
    </div>
  </div>`;
}

function guideMasteryOptions(value){
  return [['not_started','Not started'],['studying','Studying'],['shaky','Shaky'],['mastered','Mastered'],['review','Review']]
    .map(([key,label])=>`<option value="${key}" ${value===key?'selected':''}>${label}</option>`).join('');
}

function guideConfidenceOptions(value){
  return `<option value="" ${value?'':'selected'}>Not rated</option>${[1,2,3,4,5].map(n=>`<option value="${n}" ${Number(value)===n?'selected':''}>${n}/5</option>`).join('')}`;
}

function lessonGuideSteps(l){
  const tasks=lessonTasks(l), task=key=>tasks.find(t=>t.key===key), steps=[];
  const addTask=(key,instruction,audio=null)=>{
    const t=task(key); if(!t) return;
    steps.push({id:t.id,taskId:t.id,title:t.title,resource:t.book,page:`p.${t.page}`,instruction,audio,checklist:taskStudyChecklist(l,t)});
  };
  const addVideo=(type,title,instruction,rows)=>{
    if(!rows.length) return;
    steps.push({id:`b2-l${l.n}-guide-video-${type}`,title,resource:'Publisher video',instruction,videos:rows,checklist:['Watch once for overall meaning.','Replay in short sections and repeat aloud.','Continue only when the key language can be followed at a comfortable pace.']});
  };

  steps.push({
    id:`b2-l${l.n}-guide-goals`, title:'Review the Can-do goals', resource:'Textbook',
    page:`p.${l.textbook.start}`, instruction:'Read the lesson goals first. Keep them in mind as the practical outcomes for this lesson.',
    details:l.textbook.cando, checklist:['Read each Can-do goal before starting the lesson.','Identify which goal currently feels least secure.','Use the goals to judge mastery at the end rather than relying only on completed pages.']
  });

  const vocabVideos=lessonVideosByType(l,'vocabulary');
  addVideo('vocabulary','Watch the vocabulary practice video','Repeat every item aloud at a natural tempo before opening the vocabulary list.',vocabVideos);
  addTask('textbook_vocab','Study the vocabulary in context, check particles and retrieve the words without looking.','vocabulary');
  addTask('vocab','Complete the matching vocabulary exercises, checking mistakes against the textbook.');
  addTask('textbook_kanji','Learn recognition, readings and example compounds before practising writing.');
  addTask('kanji','Practise the lesson kanji from memory; use WaniKani only as reinforcement.');

  const grammarVideos=lessonVideosByType(l,'grammar');
  (l.textbook.grammar||[]).forEach((name,index)=>{
    const item=index+1;
    const videos=grammarVideos.filter(video=>parseInt(String(video.grammar_index),10)===item);
    steps.push({
      id:`b2-l${l.n}-guide-grammar-${item}`, title:`Grammar ${item}: ${name}`, resource:'Textbook',
      page:grammarPageFromVideos(videos,l.textbook.pages.grammar), videos,
      checklist:videos.length
        ? ['Watch every linked video part in order.','Read the matching textbook explanation and examples.','Complete and check the audio-icon exercise.','Say an original example aloud without copying the model.']
        : ['Read the matching textbook explanation and examples.','Complete and check the audio-icon exercise.','Say an original example aloud without copying the model.'],
      instruction:videos.length
        ? 'Watch every linked part, read the textbook explanation, complete the audio-icon exercise, then say your own example aloud.'
        : 'Read the textbook explanation, complete the audio-icon exercise, then say your own example aloud. Add the publisher video link when available.'
    });
  });
  addTask('textbook_grammar','Finish any remaining textbook grammar exercises and mark uncertain points for review.');
  addTask('particle','Complete the particle practice and explain why each answer works.');
  addTask('grammar1','Complete Grammar practice 1 without copying the model answers.');
  addTask('grammar2','Complete Grammar practice 2 where present, focusing on the points that were least secure.');

  const dialogueVideos=lessonVideosByType(l,'dialogue');
  addVideo('dialogue','Watch and speak along with the dialogue','Follow the dialogue once for meaning, then replay and speak with the characters.',dialogueVideos);
  addTask('textbook_conversation','Listen once for the situation, read with the book, then repeat the conversation aloud.','conversation');
  addTask('textbook_talk','Complete the speaking activities aloud using the target language.','speaking');
  addTask('textbook_reading','Read once for overall meaning, then reread for detail and give a short summary.','reading');
  addTask('reading','Complete the workbook reading as a comprehension check.');
  addTask('writing','Complete the writing task and compare carefully with the model.');
  addTask('textbook_listening','Listen without the script first, diagnose misses, then replay and shadow.','listening');
  addTask('listening','Complete the workbook listening practice without reading the script on the first pass.','listening');
  addTask('comp1','Use Comprehensive practice 1 as a closed-book retrieval test.');
  addTask('comp2','Use Comprehensive practice 2 as the final application check.');
  addTask('review','Finish with the kanji review only if it exists for this lesson.');
  return steps;
}

function guideVideoLinks(videos=[]){
  return videos.map((video,index)=>{
    const url=safeYouTubeUrl(video.youtube_url); if(!url) return '';
    const part=videos.length>1?` · Part ${index+1}`:'';
    return `<a class="guide-action guide-video-action" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Watch video${part} ↗</a>`;
  }).join('');
}

function taskGoalFor(l,step){
  const key=step.taskId?.split('-').at(-1)||'';
  const goals=l.textbook.cando||[];
  if(!goals.length) return '';
  if(key.includes('reading')||key.includes('listening')||key==='writing') return goals.at(-1);
  if(key.includes('conversation')||key.includes('talk')) return goals[Math.min(1,goals.length-1)];
  return goals[0];
}

function guideTaskWorkspaceMarkup(l,step,index,steps,isNext){
  const status=ts(step.id), goal=taskGoalFor(l,step);
  const canRate=!!step.taskId||step.id.includes('-guide-grammar-');
  const details=step.details?.length?`<div class="guide-workspace-section"><strong>Lesson outcomes</strong><ul>${step.details.map(item=>`<li>${esc(item)}</li>`).join('')}</ul></div>`:'';
  const checklist=step.checklist?.length?`<div class="guide-workspace-section"><strong>Do this</strong><ol>${step.checklist.map(item=>`<li>${esc(item)}</li>`).join('')}</ol></div>`:'';
  const videos=step.videos?.length?`<div class="guide-workspace-section"><strong>Publisher video${step.videos.length===1?'':'s'}</strong><div class="guide-actions">${guideVideoLinks(step.videos)}</div></div>`:'';
  const previous=steps[index-1], next=steps[index+1];
  return `<details class="guide-task-workspace" ${isNext?'open':''}>
    <summary><span>${isNext?'Current task':'Task workspace'}</span><strong>Instructions · resources · notes</strong><b>Open</b></summary>
    <div class="guide-workspace-body">
      <div class="guide-lesson-context"><strong>Lesson ${l.n} · ${esc(l.english)}</strong>${goal?`<span>Can-do connection: ${esc(goal)}</span>`:''}</div>
      ${details}${checklist}${videos}${guideAudioMarkup(l,step)}
      <div class="guide-workspace-section guide-task-record"><strong>Task record</strong>
        <label>Notes<textarea class="guide-task-notes" data-guide-notes="${esc(step.id)}" placeholder="Errors, useful examples, or what needs another pass…">${esc(status.notes||'')}</textarea></label>
        ${canRate?`<div class="guide-rating-grid"><label>Mastery<select data-guide-mastery="${esc(step.id)}">${guideMasteryOptions(status.mastery)}</select></label><label>Confidence<select data-guide-confidence="${esc(step.id)}">${guideConfidenceOptions(status.confidence)}</select></label></div>`:''}
      </div>
      <nav class="guide-step-nav" aria-label="Guided lesson navigation">${previous?`<button type="button" data-guide-step-nav="${esc(previous.id)}">← Step ${index}</button>`:'<span></span>'}${next?`<button type="button" data-guide-step-nav="${esc(next.id)}">Step ${index+2} →</button>`:'<span></span>'}</nav>
    </div>
  </details>`;
}

function lessonGuideMarkup(l){
  const steps=lessonGuideSteps(l), done=steps.filter(step=>ts(step.id).completed).length;
  const nextIndex=steps.findIndex(step=>!ts(step.id).completed);
  const next=nextIndex>=0?steps[nextIndex]:null;
  return `<section class="panel lesson-guide" id="lessonGuide">
    <div class="lesson-guide-head"><div><div class="eyebrow">Guided lesson path</div><h2>Work from top to bottom</h2><p class="subtitle">One route through the textbook, publisher videos, private audio and both workbooks.</p></div><div class="guide-progress"><strong>${done}/${steps.length}</strong><span>steps complete</span></div></div>
    <div class="progress"><i style="width:${steps.length?done/steps.length*100:0}%"></i></div>
    ${next?`<button type="button" class="guide-next" data-guide-scroll="${esc(next.id)}"><span>Continue with step ${nextIndex+1}</span><strong>${esc(next.title)}</strong><b>Go to next step ↓</b></button>`:`<div class="guide-complete">Lesson path complete. Use the mastery check to decide what needs another pass.</div>`}
    <div class="guide-list">${steps.map((step,index)=>{
      const status=ts(step.id), page=step.page?` · ${step.page}`:'';
      return `<article class="guide-step ${status.completed?'done':''}" id="guide-${esc(step.id)}" data-guide-task="${esc(step.taskId||step.id)}">
        <div class="guide-step-number">${status.completed?'✓':index+1}</div>
        <div class="guide-step-main"><div class="guide-resource">${esc(step.resource)}${esc(page)}</div><h3>${esc(step.title)}</h3><p>${esc(step.instruction)}</p>${guideTaskWorkspaceMarkup(l,step,index,steps,index===nextIndex)}</div>
        <label class="guide-check"><input type="checkbox" data-guide-check="${esc(step.id)}" ${status.completed?'checked':''}><span>${status.completed?'Complete':'Mark complete'}</span></label>
      </article>`;
    }).join('')}</div>
  </section>`;
}

function focusGuideTarget(){
  const target=state.guideTarget; if(!target) return;
  state.guideTarget=null;
  requestAnimationFrame(()=>document.getElementById(`guide-${target}`)?.scrollIntoView({behavior:'smooth',block:'center'}));
}

function openGuidedLesson(lesson,taskId=null){
  state.lesson=Number(lesson); state.view='lesson'; state.guideTarget=taskId; render();
}

function renderLesson(n){
  const l=lessonByNumber(n); if(!l)return;
  $('#hero').hidden=true; $('#bottomArea').hidden=true; $('#weekView').hidden=true; $('#mainContent').hidden=false;
  const tasks=lessonTasks(l), w=n-11, p=lessonProgress(n), pct=p.total?p.done/p.total*100:0;
  const tb=tasks.filter(t=>t.book==='Textbook'), wb2=tasks.filter(t=>t.book==='Workbook 2'), wb1=tasks.filter(t=>t.book==='Workbook 1');
  const flagged=tasks.filter(t=>['shaky','studying','review'].includes(ts(t.id).mastery));
  const grammar=l.textbook.grammar.map((x,i)=>`<li><strong>${i+1}.</strong> ${esc(x)}</li>`).join('');
  const cando=l.textbook.cando.map(x=>`<li>${esc(x)}</li>`).join('');
  const textbookSections=(l.sections||[]).map(sec=>{
    const t=tasks.find(x=>x.key===sec.taskKey);
    const st=t?ts(t.id):{};
    const items=sec.items?.length?`<div class="section-items"><span>Includes</span><ul>${sec.items.map(x=>`<li>${esc(x.label)}</li>`).join('')}</ul></div>`:'';
    const steps=sec.steps?.length?`<div class="section-steps"><span>Study sequence</span><ol>${sec.steps.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></div>`:'';
    return `<div class="book-section ${t&&st.completed?'done':''}" data-task="${esc(t?.id||'')}"><div class="book-section-main"><span class="book-section-label">${esc(sec.label)}</span><strong>pp.${esc(sec.pages||'—')}</strong>${items}${steps}</div><span class="book-section-status">${t&&st.completed?'✓ Complete':'Open task'}</span></div>`;
  }).join('');
  const wb2Rows=(l.workbookMap?.workbook2||[]).map(x=>{const t=tasks.find(y=>y.key===x.taskKey), st=t?ts(t.id):{};return `<button class="book-section compact ${st.completed?'done':''}" data-task="${esc(t?.id||'')}"><div class="book-section-main"><span class="book-section-label">${esc(x.label)}</span><strong>p.${esc(x.page)}</strong></div><span class="book-section-status">${st.completed?'✓':'Open'}</span></button>`}).join('');
  const wb1Rows=(l.workbookMap?.workbook1||[]).map(x=>{const t=tasks.find(y=>y.key===x.taskKey), st=t?ts(t.id):{};return `<button class="book-section compact ${st.completed?'done':''}" data-task="${esc(t?.id||'')}"><div class="book-section-main"><span class="book-section-label">${esc(x.label)}</span><strong>p.${esc(x.page)}</strong></div><span class="book-section-status">${st.completed?'✓':'Open'}</span></button>`}).join('');
  $('#mainContent').innerHTML=`
    <div class="lesson-toolbar"><button class="smallbtn" id="backDashboard">← Dashboard</button><button class="smallbtn" id="backPlan">Week ${w+1} plan</button><div class="lesson-select"><button class="smallbtn" id="prevLesson" ${n===11?'disabled':''}>← L${n-1}</button><button class="smallbtn" id="nextLesson" ${n===20?'disabled':''}>L${n+1} →</button></div></div>
    <section class="lessonhero"><div class="eyebrow">${esc(CURRICULUM.book)} · Lesson ${l.n}</div><h1>${esc(l.title)}</h1><p>${esc(l.english)}</p><div class="lessonhero-grid"><div><strong>${p.done}/${p.total}</strong><span>mapped tasks complete</span></div><div><strong>${p.mastered}/${p.total}</strong><span>currently marked mastered</span></div><div><strong>${Math.round(pct)}%</strong><span>lesson progress</span></div></div><div class="progress"><i style="width:${pct}%"></i></div></section>
    ${lessonGuideMarkup(l)}
    <details class="lesson-reference" id="lessonReference">
      <summary><span><strong>Lesson reference</strong><small>Can-do goals · all videos · textbook map · audio player · workbook maps</small></span><b>Open reference</b></summary>
      <div class="lesson-reference-body">
        <section class="study-rule panel"><div><h3>Textbook first</h3><p>Work through the actual textbook lesson <strong>pp.${l.textbook.start}–${l.textbook.end}</strong>. If you already know a section, do a representative check and move on rather than grinding repetitive practice.</p></div><button class="smallbtn primary" id="lessonMastery">Optional mastery check</button></section>
        <section class="panel lesson-overview"><div class="overview-grid"><div><div class="eyebrow">Can-do goals</div><ul>${cando}</ul></div><div><div class="eyebrow">Target grammar</div><ul>${grammar}</ul></div></div>${l.textbook.note?`<p class="subtitle"><strong>Language / culture note:</strong> ${esc(l.textbook.note)}</p>`:''}</section>
        ${lessonVideoPanelMarkup(l)}
        <section class="panel book-map-panel"><div class="section-heading"><div><div class="eyebrow">Textbook · pp.${l.textbook.start}–${l.textbook.end}</div><h2>Textbook content map</h2><p class="subtitle">Use this when you need the full section map rather than the guided route.</p></div></div><div class="book-section-list">${textbookSections}</div></section>
        ${audioPanelMarkup(n)}
        <section class="lesson-grid">
          <div class="lesson-column"><div class="section-heading"><div><div class="eyebrow">Workbook 2</div><h2>Vocabulary · grammar · listening</h2><p class="subtitle">Complete these after the corresponding textbook work.</p></div></div><div class="book-section-list">${wb2Rows}</div></div>
          <div class="lesson-column"><div class="section-heading"><div><div class="eyebrow">Workbook 1</div><h2>Kanji · reading · writing</h2><p class="subtitle">Use as reinforcement for the same lesson, especially where a section is weak.</p></div></div><div class="book-section-list">${wb1Rows}</div></div>
        </section>
        <section class="panel page-map"><div class="panelhead"><div><h3>Cross-reference</h3><p class="subtitle">Every scheduled component identifies the physical book and page.</p></div></div><div class="page-map-grid">${tasks.map(t=>`<button class="page-chip" data-task="${esc(t.id)}"><span>${esc(t.title)}</span><strong>${esc(t.book)} · ${t.page?`p.${esc(t.page)}`:'—'}${t.section?` · ${esc(t.section)}`:''}</strong></button>`).join('')}</div></section>
      </div>
    </details>
    <section class="panel lesson-notes-panel"><div class="panelhead"><div><h3>Lesson notes</h3><p class="subtitle">Overall observations; individual task notes stay attached to their task.</p></div><span class="flag-count">${flagged.length} flagged</span></div><textarea id="lessonNotes" class="notes" placeholder="What was easy? What keeps tripping you up? Useful example sentences..."></textarea></section>
    `;
  $('#backDashboard').onclick=()=>{state.view='dashboard';render();};
  $('#backPlan').onclick=()=>{state.week=w;state.view='plan';render();};
  $('#prevLesson').onclick=()=>{if(n>11){state.lesson=n-1;render();}};
  $('#nextLesson').onclick=()=>{if(n<20){state.lesson=n+1;render();}};
  $('#lessonMastery').onclick=()=>openLessonMastery(l);
  $('#mainContent').querySelectorAll('[data-guide-check]').forEach(input=>input.onchange=()=>{
    const steps=lessonGuideSteps(l), index=steps.findIndex(step=>step.id===input.dataset.guideCheck);
    state.guideTarget=steps[index+1]?.id||input.dataset.guideCheck;
    toggle(input.dataset.guideCheck);
  });
  $('#mainContent').querySelectorAll('[data-guide-scroll]').forEach(button=>button.onclick=()=>{
    document.getElementById(`guide-${button.dataset.guideScroll}`)?.scrollIntoView({behavior:'smooth',block:'center'});
  });
  initGuideTaskWorkspaces(l);
  initLessonAudio(n);
  const lessonNoteKey=`lesson-${n}`;
  $('#lessonNotes').value=state.taskState[lessonNoteKey]?.notes||'';
  $('#lessonNotes').oninput=e=>{state.taskState[lessonNoteKey]={...ts(lessonNoteKey),notes:e.target.value};saveLocal();cloudSave(lessonNoteKey);};
  focusGuideTarget();
}
function openLessonMastery(l){
  const tasks=lessonTasks(l), rows=tasks.map(t=>{const s=ts(t.id);return `<div class="mastery-row"><div><strong>${esc(t.title)}</strong><small>${esc(t.book)} · p.${t.page}</small></div><select data-mastery-task="${esc(t.id)}"><option value="not_started" ${s.mastery==='not_started'?'selected':''}>Not started</option><option value="studying" ${s.mastery==='studying'?'selected':''}>Studying</option><option value="shaky" ${s.mastery==='shaky'?'selected':''}>Shaky</option><option value="mastered" ${s.mastery==='mastered'?'selected':''}>Mastered</option><option value="review" ${s.mastery==='review'?'selected':''}>Review</option></select></div>`}).join('');
  $('#modalTitle').textContent=`Mastery check · Lesson ${l.n}`;
  $('#modalSub').textContent='Rate each component based on what you can actually do now.';
  $('#modalDesc').innerHTML=`<div class="mastery-list">${rows}</div><p class="mastery-tip"><strong>Mastered:</strong> you can recognise it, understand it and produce it without leaning on the book. If one of those is shaky, leave it as Studying/Shaky.</p>`;
  const modalGrid=$('.modalgrid'); if(modalGrid) modalGrid.hidden=true;
  $('#mastery').closest('label').hidden=true; $('#confidence').closest('label').hidden=true;
  $('#taskNotes').hidden=true; $('.fieldlabel').hidden=true; $('#modalDone').closest('label').hidden=true;
  $('#modal').showModal();
  $('#modalDesc').querySelectorAll('[data-mastery-task]').forEach(sel=>sel.onchange=e=>setTask(e.target.dataset.masteryTask,{mastery:e.target.value}));
  $('#modal').addEventListener('close',resetTaskModal,{once:true});
}
function resetTaskModal(){
  const modalGrid=$('.modalgrid');
  if(modalGrid) modalGrid.hidden=false;
  const mastery=$('#mastery'), confidence=$('#confidence'), taskNotes=$('#taskNotes'), modalDone=$('#modalDone');
  const masteryLabel=mastery?.closest('label'), confidenceLabel=confidence?.closest('label'), doneLabel=modalDone?.closest('label');
  if(masteryLabel) masteryLabel.hidden=false;
  if(confidenceLabel) confidenceLabel.hidden=false;
  if(taskNotes) taskNotes.hidden=false;
  document.querySelectorAll('.fieldlabel').forEach(el=>el.hidden=false);
  if(doneLabel) doneLabel.hidden=false;
}
// Task interaction is delegated from the document so task cards continue to work
// after any dashboard/plan/lesson render replaces their DOM nodes.
if(!window.__studyHubTaskClickHandler) {
  document.addEventListener('click', e => {
    const check=e.target.closest('[data-check]');
    if(check) return; // the change handler owns completion checkboxes
    const guided=e.target.closest('[data-guided-task]');
    if(guided){
      e.preventDefault();
      e.stopPropagation();
      openGuidedLesson(guided.dataset.guidedLesson,guided.dataset.guidedTask);
      return;
    }
    const trigger=e.target.closest('[data-today-task],[data-review-task],[data-task]');
    if(!trigger) return;
    const id=trigger.dataset.todayTask || trigger.dataset.reviewTask || trigger.dataset.task;
    if(id) {
      e.preventDefault();
      e.stopPropagation();
      openTask(id);
    }
  });
  window.__studyHubTaskClickHandler=true;
}

function taskModalLessonContext(t){
  if(!t.lesson) return '';
  const l=lessonByNumber(t.lesson); if(!l) return '';
  const guide=lessonGuideSteps(l), index=guide.findIndex(step=>step.taskId===t.id);
  const checklist=taskStudyChecklist(l,t);
  const goal=taskGoalFor(l,{taskId:t.id});
  const grammarRelated=['textbook_grammar','particle','grammar1','grammar2','comp1','comp2'].includes(t.key);
  return `<div class="task-lesson-brief">
    <div class="task-lesson-brief-head"><div><span>Lesson ${l.n}${index>=0?` · Guided step ${index+1} of ${guide.length}`:''}</span><strong>${esc(l.title)}</strong><small>${esc(l.english)}</small></div></div>
    ${goal?`<div class="task-goal"><strong>Can-do connection</strong><span>${esc(goal)}</span></div>`:''}
    <div class="task-workflow"><strong>Complete this task</strong><ol>${checklist.map(item=>`<li>${esc(item)}</li>`).join('')}</ol></div>
    ${grammarRelated?`<div class="task-items"><strong>Lesson ${l.n} grammar</strong><ul>${l.textbook.grammar.map((item,i)=>`<li><span>${i+1}.</span> ${esc(item)}</li>`).join('')}</ul></div>`:''}
  </div>`;
}

function openTask(id){
  const tasks=[...allCoreTasks(),...Array.from({length:12},(_,w)=>Array.from({length:7},(_,d)=>habits(w,d)).flat())];
  let t=tasks.find(x=>x.id===id);
  if(!t && id?.startsWith('lesson-')) return;
  if(!t){ toast('This study task is no longer in the active programme. Refresh the page.'); return; }
  const s=ts(id);
  $('#modalTitle').textContent=t.title;
  $('#modalSub').textContent=`${t.lesson?`${esc(CURRICULUM.book)} · Lesson ${t.lesson}`:'Daily habit'} · ${t.book}${t.page?` · p.${t.page}`:''}`;
  const pageLink=t.page?`<div class="book-reference"><span>BOOK REFERENCE</span><strong>${esc(t.book)} · ${t.page.includes?.('–')?'pages':'page'} ${esc(t.page)}</strong>${t.section?`<small>Lesson section: ${esc(t.section)}${t.sectionPages?` · pp.${esc(t.sectionPages)}`:''}</small>`:''}<small>Use this exact location in your physical book/workbook.</small></div>`:'';
  const lessonLink=t.lesson?`<button type="button" class="smallbtn" id="openRelatedLesson">Open Lesson ${t.lesson} workspace</button>`:'';
  const secs=taskSeconds(id);
  const timeLine=secs?`<div class="time-stat">⏱ ${fmtDuration(secs)} studied on this task</div>`:'';
  const isActive=state.pomodoro.taskId===id && state.pomodoro.status==='running';
  const pomoBtn=`<button type="button" class="smallbtn primary" id="startTaskPomo">${isActive?'Timer running for this task':'Start pomodoro for this task'}</button><button type="button" class="smallbtn" id="focusTask">Focus mode</button>`;
  const items=t.sectionItems?.length?`<div class="task-items"><strong>Content in this section</strong><ul>${t.sectionItems.map(x=>`<li>${esc(x.label)}</li>`).join('')}</ul></div>`:'';
  const lessonContext=taskModalLessonContext(t);
  $('#modalDesc').innerHTML=`${lessonContext}${pageLink}${timeLine}<div class="task-purpose"><strong>Why this task?</strong><span>${esc(taskPurpose(t))}</span></div>${t.lesson?'':`<p>${esc(t.desc)}</p>`}${items}<div class="modal-related">${lessonLink}${pomoBtn}</div>`;
  $('#modalDone').checked=s.completed; $('#modalDone').onchange=()=>toggle(id);
  $('#mastery').value=s.mastery; $('#mastery').onchange=e=>setTask(id,{mastery:e.target.value});
  $('#confidence').value=s.confidence||''; $('#confidence').onchange=e=>setTask(id,{confidence:e.target.value?+e.target.value:null});
  $('#taskNotes').value=s.notes||''; $('#taskNotes').oninput=e=>{state.taskState[id]={...ts(id),notes:e.target.value};saveLocal();cloudSave(id);};
  if($('#openRelatedLesson')) $('#openRelatedLesson').onclick=()=>{$('#modal').close();openGuidedLesson(t.lesson,t.id);};
  $('#startTaskPomo').onclick=()=>{startPomodoro(id);toast('Pomodoro started for this task');$('#startTaskPomo').textContent='Timer running for this task';};
  $('#focusTask').onclick=()=>{state.focusMode=true;document.body.classList.add('focus-mode');$('#modal').classList.add('focus-modal');};
  resetTaskModal(); $('#modal').showModal();
}
async function loadCloud(){
  if(!db||!state.user)return;
  const {data:videos,error:videoError}=await db.from('lesson_videos').select('lesson,video_type,grammar_index,title,youtube_url,sort_order').order('lesson').order('video_type').order('sort_order');
  state.lessonVideos=videoError?[]:(videos||[]);
  state.lessonVideosLoaded=true;
  state.lessonVideosError=!!videoError;
  const {data,error}=await db.from('task_state').select('*').eq('user_id',state.user.id);
  if(!error&&data) data.forEach(r=>state.taskState[r.task_id]={completed:r.completed,mastery:r.mastery,confidence:r.confidence,notes:r.notes,completed_at:r.completed_at});
  const {data:n}=await db.from('app_notes').select('notes').eq('user_id',state.user.id).maybeSingle(); if(n)state.notes=n.notes||'';
  const {data:p}=await db.from('user_preferences').select('start_date,settings').eq('user_id',state.user.id).maybeSingle();
  if(p?.start_date)state.startDate=p.start_date;
  if(p?.settings?.pomodoro){
    state.pomodoroSettings={...state.pomodoroSettings,...p.settings.pomodoro};
    localStorage.setItem('pomodoroSettings',JSON.stringify(state.pomodoroSettings));
    if(state.pomodoro.status==='idle') state.pomodoro.remaining=pomodoroDuration(state.pomodoro.mode);
  }
  const {data:sessions,error:sessErr}=await db.from('pomodoro_sessions').select('*').eq('user_id',state.user.id);
  if(!sessErr && sessions){
    const unsynced=state.sessions.filter(s=>!s.synced);
    state.sessions=[...sessions.map(s=>({...s,synced:true})),...unsynced];
    saveSessions();
  }
  if(typeof loadRepositoryData==='function') await loadRepositoryData(true);
  saveLocal();
}
function renderStatus(){
  $('#syncStatus').textContent=state.user?'☁ Synced account':'';
  $('#userLabel').textContent=state.user?.email||'';
  $('#openLogin').hidden=!!state.user; $('#logout').hidden=!state.user;
}
function toast(m){const e=$('#toast');e.textContent=m;e.classList.add('show');setTimeout(()=>e.classList.remove('show'),2300);}

$('#saveGlobalNotes').onclick=async()=>{state.notes=$('#globalNotes').value;saveLocal();if(db&&state.user)await db.from('app_notes').upsert({user_id:state.user.id,notes:state.notes},{onConflict:'user_id'});toast('Notes saved');};
$('#startDate').onchange=async e=>{state.startDate=e.target.value||'2026-08-31';saveLocal();if(db&&state.user)await db.from('user_preferences').upsert({user_id:state.user.id,start_date:state.startDate},{onConflict:'user_id'});render();};
function updatePomoSetting(key,val,min){
  const n=Math.max(min,Math.round(+val)||state.pomodoroSettings[key]);
  state.pomodoroSettings[key]=n;
  if(state.pomodoro.status==='idle') state.pomodoro.remaining=pomodoroDuration(state.pomodoro.mode);
  savePomodoroSettings(); savePomodoro(); renderPomodoro();
}
const pomoWorkMin=$('#pomoWorkMin'); if(pomoWorkMin) pomoWorkMin.onchange=e=>updatePomoSetting('work',e.target.value,1);
const pomoShortMin=$('#pomoShortMin'); if(pomoShortMin) pomoShortMin.onchange=e=>updatePomoSetting('short',e.target.value,1);
const pomoLongMin=$('#pomoLongMin'); if(pomoLongMin) pomoLongMin.onchange=e=>updatePomoSetting('long',e.target.value,1);
const pomoCycleLen=$('#pomoCycleLen'); if(pomoCycleLen) pomoCycleLen.onchange=e=>updatePomoSetting('cycle',e.target.value,1);
$('#openLogin').onclick=()=>$('#authDialog').showModal();
$('#gateLogin').onclick=()=>$('#authDialog').showModal();
$('#closeLogin').onclick=()=>$('#authDialog').close();
$('#closeSearch').onclick=()=>$('#searchDialog').close();
$('#closeTaskModal').onclick=()=>$('#modal').close();
$('#themeToggle').onclick=()=>applyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
applyTheme(document.documentElement.dataset.theme||'light',false);
$('#backToTop').onclick=()=>window.scrollTo({top:0,behavior:'smooth'});
window.addEventListener('scroll',updateBackToTop,{passive:true});
$('#loginForm').onsubmit=async e=>{
  e.preventDefault();
  if(!db){toast('Add Supabase values to supabase-config.js first.');return;}
  const submit=e.submitter;
  if(submit)submit.disabled=true;
  try{
    const {data,error}=await db.auth.signInWithPassword({email:$('#email').value.trim(),password:$('#password').value});
    if(error){toast(error.message);return;}
    // Do not wait for the auth event alone. Immediately establish the
    // authenticated UI state so the login gate cannot remain visible.
    state.user=data.user||null;
    if(!state.user){toast('Login succeeded but no user session was returned.');return;}
    $('#authDialog').close();
    // Render immediately after authentication. Cloud sync runs in the
    // background so a slow/blocked database query cannot trap the UI
    // behind the login gate.
    state.ready=true;
    render();
    toast('Signed in');
    loadCloud().then(()=>render()).catch(()=>{});
  }catch(err){
    toast(err?.message||'Unable to sign in.');
  }finally{
    if(submit)submit.disabled=false;
  }
};
$('#logout').onclick=async()=>{if(db)await db.auth.signOut();clearPrivateSessionCaches();state.lessonVideos=[];state.lessonVideosLoaded=false;state.lessonVideosError=false;state.user=null;state.ready=true;render();};
const pomoToggle=$('#pomoToggle'); if(pomoToggle) pomoToggle.onclick=()=>{state.pomodoro.status==='running'?pausePomodoro():startPomodoro();};
const pomoSkip=$('#pomoSkip'); if(pomoSkip) pomoSkip.onclick=()=>skipSession();
const pomoReset=$('#pomoReset'); if(pomoReset) pomoReset.onclick=()=>resetSession();
const pomoQuickLink=$('#pomoQuickLink'); if(pomoQuickLink) pomoQuickLink.onchange=e=>{
  if(!e.target.value) return;
  startPomodoro(e.target.value);
  toast('Pomodoro linked to '+(findTaskById(e.target.value)?.title||'task'));
};

async function initAuth(){
  if(!db){state.ready=true;render();return;}
  const {data}=await db.auth.getSession();
  state.user=data.session?.user||null;
  // Show the authenticated shell immediately; don't make initial cloud
  // loading a prerequisite for leaving the login gate.
  state.ready=true;
  render();
  if(state.user) loadCloud().then(()=>render()).catch(()=>{});
  db.auth.onAuthStateChange((_e,s)=>{
    state.user=s?.user||null;
    state.ready=true;
    render();
    if(state.user) loadCloud().then(()=>render()).catch(()=>{});
  });
}

$('#appShell').hidden=true; $('#loginGate').hidden=false; initAuth();

$('#modal')?.addEventListener('close',()=>{state.focusMode=false;document.body.classList.remove('focus-mode');$('#modal')?.classList.remove('focus-modal');});
$('#globalSearch')?.addEventListener('input',e=>renderSearchResults(e.target.value));
