const SB = window.SUPABASE_CONFIG || {};
const hasSupabase = !!(SB.url && SB.anonKey && !SB.url.includes('YOUR_') && !SB.anonKey.includes('YOUR_'));
const db = hasSupabase && window.supabase ? window.supabase.createClient(SB.url, SB.anonKey) : null;

const WK = window.WANIKANI_CONFIG || {};
const hasWaniKani = !!(WK.apiToken && !WK.apiToken.includes('YOUR_'));
let waniKaniState = { status:'idle', data:null, error:null, fetchedAt:null };
let waniKaniPromise = null;
const WK_CACHE_KEY = 'wanikaniDashboardCache';
const WK_CACHE_TTL = 60 * 60 * 1000;

function readWaniKaniCache(){
  try{
    const c=JSON.parse(localStorage.getItem(WK_CACHE_KEY)||'null');
    if(c && c.fetchedAt && Date.now()-c.fetchedAt < WK_CACHE_TTL) return c;
  }catch(e){}
  return null;
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
  const headers={Authorization:`Bearer ${WK.apiToken}`,'Wanikani-Revision':'20170710'};
  const [userRes,summaryRes]=await Promise.all([
    fetch('https://api.wanikani.com/v2/user',{headers}),
    fetch('https://api.wanikani.com/v2/summary',{headers})
  ]);
  if(!userRes.ok || !summaryRes.ok){
    let message=`WaniKani API error (${userRes.status}/${summaryRes.status})`;
    try{ const body=await (!userRes.ok?userRes:summaryRes).json(); if(body?.error?.message) message=body.error.message; }catch(e){}
    throw new Error(message);
  }
  const user=await userRes.json(), summary=await summaryRes.json();
  return {user:user.data,summary:summary.data,fetchedAt:Date.now()};
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
  if(waniKaniState.status==='unconfigured'){
    el.innerHTML=`<div class="panelhead"><div><div class="eyebrow">Supporting resource</div><h3>WaniKani</h3><p class="subtitle">Add your API token to <code>wanikani-config.js</code> to show your live stats.</p></div></div>`; return;
  }
  if(waniKaniState.status==='loading'){
    el.innerHTML=`<div class="panelhead"><div><div class="eyebrow">Supporting resource</div><h3>WaniKani</h3><p class="subtitle">Loading your current WaniKani data…</p></div></div>`; return;
  }
  if(waniKaniState.status==='error'){
    el.innerHTML=`<div class="panelhead"><div><div class="eyebrow">Supporting resource</div><h3>WaniKani</h3><p class="subtitle">${esc(waniKaniState.error)}</p></div><button class="smallbtn" id="wkRetry">Retry</button></div>`;
    $('#wkRetry').onclick=()=>loadWaniKani(true); return;
  }
  const d=waniKaniState.data, u=d.user, s=d.summary;
  const reviews=countAvailableReviews(s), lessons=countLessons(s), next=nextReview(s);
  const fetched=waniKaniState.fetchedAt?new Date(waniKaniState.fetchedAt).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'}):'';
  el.innerHTML=`<div class="panelhead"><div><div class="eyebrow">Supporting resource</div><h3>WaniKani</h3><p class="subtitle">${esc(u?.username||'')} · Level ${esc(u?.level??'—')}</p></div><div class="wk-actions"><button class="smallbtn" id="wkRefresh" title="Refresh WaniKani data">↻ Refresh</button><a class="smallbtn" href="https://www.wanikani.com" target="_blank" rel="noopener">Open WaniKani ↗</a></div></div><div class="wk-stats"><div><strong>${reviews}</strong><span>Reviews due</span></div><div><strong>${lessons}</strong><span>Lessons available</span></div><div><strong>${esc(formatWkNextReview(next))}</strong><span>Next review</span></div></div><div class="wk-footer"><span>Updated ${esc(fetched||'—')} · cached for 1 hour</span></div>`;
  $('#wkRefresh').onclick=()=>loadWaniKani(true);
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
  pomoOpen: localStorage.getItem('pomodoroOpen') === 'true'
};

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const fmt = d => d.toLocaleDateString(undefined, {weekday:'long', month:'short', day:'numeric'});
const fmtMinutes = m => `${Math.floor(m/60)}h${m%60?` ${m%60}m`:''}`;
const dateKey = d => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`; };
const lessonForWeek = w => w < 10 ? CURRICULUM.lessons[w] : null;
const consolidationLessons = w => w === 10 ? CURRICULUM.lessons.slice(0,5) : CURRICULUM.lessons.slice(5,10);
const activeProgramme = () => (window.PROGRAMMES||[]).find(p=>p.id===state.programmeId) || (window.PROGRAMMES||[])[0];
const activeBook = () => { const p=activeProgramme(); return (window.BOOKS||[]).find(b=>b.id===(p?.bookId || CURRICULUM.bookId || '')) || {title:CURRICULUM.book||'Active curriculum',level:'',series:''}; };
const programmeCurriculum = p => p?.curriculumKey==='CURRICULUM' ? window.CURRICULUM : null;
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
    ['textbook_conversation','textbook_vocab','vocab'],
    ['textbook_kanji','kanji','writing'],
    ['textbook_grammar','particle','grammar1'],
    ['textbook_talk','textbook_reading','reading'],
    ['textbook_listening','listening','writing'],
    ['comp1','grammar2','comp2'],
    ['review']
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
  else renderLibrary();
  $('#globalNotes').value=state.notes; $('#startDate').value=state.startDate; renderStatus();
  renderPomodoroSettings();
  renderPomodoro();
}
function renderGate(){
  $('#appShell').hidden=true; $('#loginGate').hidden=false;
  const w=$('#pomodoroWidget'); if(w) w.hidden=true;
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
  $('#mainNav').innerHTML=`<button class="navbtn ${state.view==='dashboard'?'active':''}" data-view="dashboard">Dashboard</button><button class="navbtn ${state.view==='plan'?'active':''}" data-view="plan">Study plan</button><button class="navbtn ${state.view==='lesson'?'active':''}" data-view="lesson">Lessons</button><button class="navbtn ${state.view==='library'?'active':''}" data-view="library">Learning hub</button><button class="navbtn pomo-nav-btn" id="pomoNavBtn" type="button" title="Pomodoro" aria-label="Open Pomodoro">🍅</button>`;
  $('#mainNav').querySelectorAll('.navbtn[data-view]').forEach(b=>b.onclick=()=>{state.view=b.dataset.view;if(state.view==='lesson'&&!lessonByNumber(state.lesson))state.lesson=11;render();scrollTo({top:0,behavior:'smooth'});});
  const pomoNav=$('#pomoNavBtn');
  if(pomoNav){
    pomoNav.classList.toggle('is-open',state.pomoOpen);
    pomoNav.classList.toggle('is-running',state.pomodoro.status==='running');
    pomoNav.onclick=()=>{state.pomoOpen=!state.pomoOpen;localStorage.setItem('pomodoroOpen',String(state.pomoOpen));renderPomodoro();renderNav();};
  }
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
    <section class="library-section"><div class="panelhead"><div><h2>Study programmes</h2><p class="subtitle">Choose a structured course when its contents have been mapped. Only the active programme generates the current schedule.</p></div></div><div class="programme-grid">${programmes.map(p=>{const x=programmeSummary(p),active=p.id===state.programmeId;return `<article class="programme-card ${active?'active-programme':''}"><div class="book-card-top"><span class="book-status ${p.status}">${active?'Active':p.status==='planned'?'Planned':'Available'}</span><span class="book-level">${p.weeks?`${p.weeks} weeks`:'Not mapped'}</span></div><div class="eyebrow">${esc(x.book?.series||'Programme')}</div><h3>${esc(p.title)}</h3><p>${esc(p.description)}</p>${x.ready ? `<div class="programme-meta"><span>${p.targetHours?.[0]||12}–${p.targetHours?.[1]||18} h/week</span><span>${esc(x.book?.level||'')}</span></div>${active?'<span class="current-badge">Current programme</span>':'<button class="smallbtn primary" data-select-programme="'+esc(p.id)+'">Use this programme</button>'}` : `<div class="book-placeholder">Contents/pages not mapped yet. Add the book data first; the same programme engine will then handle it.</div>`}</article>`}).join('')}</div></section>
    <section class="library-section"><div class="panelhead"><div><h2>Book library</h2><p class="subtitle">Books are reusable resources. Workbooks and other companion material can be attached to a book without making them separate programmes.</p></div></div><div class="book-grid">${books.map(b=>{const p=programmes.find(x=>x.bookId===b.id);return `<article class="book-card ${b.id===activeBook().id?'active-book':''}"><div class="book-card-top"><span class="book-status ${b.status}">${b.status==='active'?'In use':b.status==='planned'?'Planned':'Available'}</span><span class="book-level">${esc(b.level)}</span></div><div class="eyebrow">${esc(b.series)}</div><h3>${esc(b.title)}</h3><p>${esc(b.description)}</p><div class="book-meta">${p?`<span>Programme: ${esc(p.shortTitle||p.title)}</span>`:'<span>No programme mapped</span>'}${b.workbooks?.length?`<span>${b.workbooks.map(esc).join(' · ')}</span>`:''}</div></article>`}).join('')}</div></section>
    <section class="library-section"><div class="panelhead"><div><h2>Study tools & input</h2><p class="subtitle">Supporting resources stay independent from textbook programmes.</p></div></div><div class="resource-grid">${resources.map(r=>`<article class="resource-card"><div class="book-card-top"><span class="resource-type">${esc(r.type)}</span><span class="book-status ${r.status}">${r.status==='active'?'Active':'Available'}</span></div><h3>${esc(r.title)}</h3><p>${esc(r.description)}</p></article>`).join('')}</div></section>
    <section class="library-section architecture-note"><div class="eyebrow">How this scales</div><h2>Book → programme → schedule</h2><p>A future textbook does not require another custom page. Once its contents are mapped, it can become a programme with its own lesson structure, duration, workload and tasks.</p><div class="hub-flow"><span>Book</span><b>→</b><span>Programme</span><b>→</b><span>Lessons</span><b>→</b><span>Tasks</span><b>→</b><span>Progress</span></div></section>`;
  $('#mainContent').querySelectorAll('[data-select-programme]').forEach(b=>b.onclick=()=>selectProgramme(b.dataset.selectProgramme));
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
function renderDashboard(){
  $('#hero').hidden=true; $('#bottomArea').hidden=true; $('#weekView').hidden=true; $('#mainContent').hidden=false;
  const overall=overallProgress(),w=currentWeekIndex(),wp=progress(w),next=nextIncomplete();
  const attention=CURRICULUM.lessons.flatMap(l=>lessonTasks(l).map(t=>({t,s:ts(t.id)}))).filter(x=>['shaky','studying','review'].includes(x.s.mastery)).slice(0,8);
  const mastered=CURRICULUM.lessons.filter(l=>lessonStatus(l.n)[0]==='mastered').length;
  const activityRows=OPTIONAL_TASKS.map(x=>({label:x.label,secs:activitySeconds(x.key)})).sort((a,b)=>b.secs-a.secs);
  const maxActivity=Math.max(...activityRows.map(a=>a.secs),1);
  const topTasks=topTaskSessions(6);
  $('#mainContent').innerHTML=`
    <section class="dashgrid">
      <article class="dashcard primarycard"><div class="eyebrow">Your dashboard</div><h2>Japanese learning hub.</h2><p><strong>${esc(activeBook().title)}</strong> is your active curriculum. Complete the assigned work, use the page references to work directly from the books, and mark tasks complete as you go.</p><div class="bigprogress"><strong>${Math.round(overall.done/overall.total*100)||0}%</strong><span>${overall.done} of ${overall.total} scheduled core tasks complete</span></div><div class="progress"><i style="width:${overall.total?overall.done/overall.total*100:0}%"></i></div><div class="statstrip"><span><strong>${mastered}</strong> lessons mastered</span><span><strong>${attention.length}</strong> items needing attention</span><span><strong>${fmtDuration(totalSeconds())}</strong> total study time</span></div></article>
      <article class="dashcard"><div class="eyebrow">Current week</div><h3>Week ${w+1}</h3><p>${wp.done}/${wp.total} core tasks complete</p><p class="subtitle">${fmtDuration(weekSeconds(7))} studied in the last 7 days</p><button class="smallbtn primary" id="resumeWeek">Open this week</button></article>
      <article class="dashcard"><div class="eyebrow">Next up</div><h3>${next?esc(next.task.title):'Course complete'}</h3><p>${next?`Week ${next.week+1} · ${esc(next.task.book)}${next.task.page?` · p.${next.task.page}`:''}`:'You have completed every scheduled core task.'}</p>${next?'<button class="smallbtn primary" id="openNext">Open task</button>':''}</article>
    </section>
    <section class="dashboard-columns">
      <article class="panel wanikani-panel" id="wanikaniCard"></article>
      <article class="panel"><div class="panelhead"><div><h3>Quick links</h3><p class="subtitle">Supporting Japanese resources stay separate from the core TOBIRA programme.</p></div></div><div class="quick-resource-links"><a href="https://www.wanikani.com" target="_blank" rel="noopener" class="resource-link">WaniKani ↗</a><span class="resource-link muted">Migaku</span><span class="resource-link muted">Shadowing</span></div></article>
    </section>
    <section class="dashboard-columns">
      <article class="panel"><div class="panelhead"><div><h3>Active curriculum</h3><p class="subtitle">Click a lesson for its complete mapped study workspace. Add future books from the Learning hub.</p></div><button class="smallbtn" id="goPlan">View plan</button></div><div class="lessonprogress">${CURRICULUM.lessons.map(lessonButton).join('')}</div></article>
      <article class="panel"><div class="panelhead"><div><h3>Needs attention</h3><p class="subtitle">Optional flags and notes from your study tasks appear here.</p></div></div>${attention.length?`<div class="attentionlist">${attention.map(x=>`<button class="attention" data-task="${esc(x.t.id)}"><span class="status-dot ${x.s.mastery}"></span><span><strong>${esc(x.t.title)}</strong><small>L${x.t.lesson} · ${esc(x.t.book)} · p.${x.t.page}</small></span></button>`).join('')}</div>`:'<div class="empty">Nothing flagged yet. Use the mastery controls in each lesson.</div>'}</article>
    </section>
    <section class="dashboard-columns">
      <article class="panel"><div class="panelhead"><div><h3>Study time by activity</h3><p class="subtitle">Immersion & habit time, logged via pomodoro sessions.</p></div></div><div class="timebars">${activityRows.map(a=>`<div class="timebar-row"><span>${esc(a.label)}</span><div class="timebar-track"><i style="width:${a.secs?Math.min(100,a.secs/maxActivity*100):0}%"></i></div><strong>${fmtDuration(a.secs)}</strong></div>`).join('')}</div></article>
      <article class="panel"><div class="panelhead"><div><h3>Top tasks by time</h3><p class="subtitle">Where your logged focus time has actually gone.</p></div></div>${topTasks.length?`<div class="attentionlist">${topTasks.map(x=>`<button class="attention" data-task="${esc(x.id)}"><span class="status-dot ${x.task?ts(x.id).mastery:'not_started'}"></span><span><strong>${x.task?esc(x.task.title):'Unknown task'}</strong><small>${fmtDuration(x.secs)} logged${x.task?.lesson?` · L${x.task.lesson}`:''}</small></span></button>`).join('')}</div>`:'<div class="empty">No pomodoro sessions logged yet — start one from any task or the widget.</div>'}</article>
    </section>`;
  $('#resumeWeek').onclick=()=>{state.week=w;state.view='plan';render();};
  $('#goPlan').onclick=()=>{state.view='plan';render();};
  $('#openNext')?.addEventListener('click',()=>{state.week=next.week;state.view='plan';render();setTimeout(()=>openTask(next.task.id),50);});
  $('#mainContent').querySelectorAll('.lessonrow').forEach(b=>b.onclick=()=>{state.lesson=+b.dataset.lesson;state.view='lesson';render();scrollTo({top:0,behavior:'smooth'});});
  $('#mainContent').querySelectorAll('.attention').forEach(b=>b.onclick=()=>openTask(b.dataset.task));
  renderWaniKani();
  if(waniKaniState.status==='idle') loadWaniKani();
}
function card(t){
  const s=ts(t.id);
  return `<article class="task ${s.completed?'done':''}" data-task="${esc(t.id)}"><input type="checkbox" data-check="${esc(t.id)}" ${s.completed?'checked':''}><div class="taskmain"><div class="tasktitle">${esc(t.title)}</div><div class="taskmeta">${esc(t.book)}${t.page?` · p.${t.page}`:''} · ${esc(t.duration)}</div><div class="taskhint">Tap for instructions, mastery and notes</div></div><span class="status-dot ${s.mastery}"></span></article>`;
}
function renderWeek(){
  $('#hero').hidden=false; $('#bottomArea').hidden=false; $('#weekView').hidden=false; $('#mainContent').hidden=true;
  const ds=weekDates(state.week);
  $('#weekView').innerHTML=`<div class="tabsrow"><button class="smallbtn" id="prevWeek">←</button><div class="weektabs" id="weekTabs"></div><button class="smallbtn" id="nextWeek">→</button></div><div class="week-overview"><div><div class="eyebrow">WEEK ${state.week+1}</div><h2>${esc(weekPlan(state.week).focus)}</h2><p class="subtitle">Core target: ${fmtMinutes(weekPlan(state.week).days.reduce((a,x)=>a+x.target,0))} this week, with optional input bringing the overall plan toward 15–20 hours.</p></div></div>${ds.map((date,d)=>{const core=weeklyTasks(state.week,d),hs=habits(state.week,d),plan=weekPlan(state.week).days[d]||{focus:'Core study',target:120,extra:'30 min Japanese input'},isToday=dateKey(date)===dateKey(new Date());return `<section class="day ${isToday?'today':''}"><div class="dayhead"><div><div class="eyebrow">${isToday?'TODAY · ':''}${date.toLocaleDateString(undefined,{weekday:'long'})}</div><h2>${fmt(date)}</h2><p class="dayfocus"><strong>${esc(plan.focus)}</strong> · target ${fmtMinutes(plan.target)} · ${esc(plan.extra)}</p></div><span class="daycount">${core.filter(t=>ts(t.id).completed).length}/${core.length}</span></div>${core.length?`<div class="tasklist">${core.map(card).join('')}</div>`:''}<details class="habits"><summary>Optional input <span>WaniKani · Migaku · shadowing · reading</span></summary><p class="habit-target">Recommended: ${esc(plan.extra)}</p><div class="habitlist">${hs.map(card).join('')}</div></details></section>`}).join('')}`;
  $('#weekView').querySelectorAll('[data-task]').forEach(e=>e.onclick=x=>{if(x.target.matches('input'))return;openTask(e.dataset.task);});
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
    <section class="study-rule panel"><div><h3>Textbook first</h3><p>Work through the actual textbook lesson <strong>pp.${l.textbook.start}–${l.textbook.end}</strong>. Each section below now points to its own page range. If you already know a section, do a representative check and move on rather than grinding repetitive practice.</p></div><button class="smallbtn primary" id="lessonMastery">Optional mastery check</button></section>
    <section class="panel lesson-overview"><div class="overview-grid"><div><div class="eyebrow">Can-do goals</div><ul>${cando}</ul></div><div><div class="eyebrow">Target grammar</div><ul>${grammar}</ul></div></div>${l.textbook.note?`<p class="subtitle"><strong>Language / culture note:</strong> ${esc(l.textbook.note)}</p>`:''}</section>
    <section class="panel book-map-panel"><div class="section-heading"><div><div class="eyebrow">Textbook · pp.${l.textbook.start}–${l.textbook.end}</div><h2>Textbook content map</h2><p class="subtitle">Use this as the primary route through the physical book. Grammar points are listed inside the Grammar section.</p></div></div><div class="book-section-list">${textbookSections}</div></section>
    <section class="lesson-grid">
      <div class="lesson-column"><div class="section-heading"><div><div class="eyebrow">Workbook 2</div><h2>Vocabulary · grammar · listening</h2><p class="subtitle">Complete these after the corresponding textbook work.</p></div></div><div class="book-section-list">${wb2Rows}</div></div>
      <div class="lesson-column"><div class="section-heading"><div><div class="eyebrow">Workbook 1</div><h2>Kanji · reading · writing</h2><p class="subtitle">Use as reinforcement for the same lesson, especially where a section is weak.</p></div></div><div class="book-section-list">${wb1Rows}</div></div>
    </section>
    <section class="panel lesson-notes-panel"><div class="panelhead"><div><h3>Lesson notes</h3><p class="subtitle">Overall observations; individual task notes stay attached to their task.</p></div><span class="flag-count">${flagged.length} flagged</span></div><textarea id="lessonNotes" class="notes" placeholder="What was easy? What keeps tripping you up? Useful example sentences..."></textarea></section>
    <section class="panel page-map"><div class="panelhead"><div><h3>Cross-reference</h3><p class="subtitle">Every scheduled component now identifies the physical book and page.</p></div></div><div class="page-map-grid">${tasks.map(t=>`<button class="page-chip" data-task="${esc(t.id)}"><span>${esc(t.title)}</span><strong>${esc(t.book)} · ${t.page?`p.${esc(t.page)}`:'—'}${t.section?` · ${esc(t.section)}`:''}</strong></button>`).join('')}</div></section>`;
  $('#backDashboard').onclick=()=>{state.view='dashboard';render();};
  $('#backPlan').onclick=()=>{state.week=w;state.view='plan';render();};
  $('#prevLesson').onclick=()=>{if(n>11){state.lesson=n-1;render();}};
  $('#nextLesson').onclick=()=>{if(n<20){state.lesson=n+1;render();}};
  $('#lessonMastery').onclick=()=>openLessonMastery(l);
  $('#mainContent').querySelectorAll('[data-task]').forEach(e=>{ if(e.dataset.task) e.onclick=()=>openTask(e.dataset.task); });
  const lessonNoteKey=`lesson-${n}`;
  $('#lessonNotes').value=state.taskState[lessonNoteKey]?.notes||'';
  $('#lessonNotes').oninput=e=>{state.taskState[lessonNoteKey]={...ts(lessonNoteKey),notes:e.target.value};saveLocal();cloudSave(lessonNoteKey);};
}
function openLessonMastery(l){
  const tasks=lessonTasks(l), rows=tasks.map(t=>{const s=ts(t.id);return `<div class="mastery-row"><div><strong>${esc(t.title)}</strong><small>${esc(t.book)} · p.${t.page}</small></div><select data-mastery-task="${esc(t.id)}"><option value="not_started" ${s.mastery==='not_started'?'selected':''}>Not started</option><option value="studying" ${s.mastery==='studying'?'selected':''}>Studying</option><option value="shaky" ${s.mastery==='shaky'?'selected':''}>Shaky</option><option value="mastered" ${s.mastery==='mastered'?'selected':''}>Mastered</option><option value="review" ${s.mastery==='review'?'selected':''}>Review</option></select></div>`}).join('');
  $('#modalTitle').textContent=`Mastery check · Lesson ${l.n}`;
  $('#modalSub').textContent='Rate each component based on what you can actually do now.';
  $('#modalDesc').innerHTML=`<div class="mastery-list">${rows}</div><p class="mastery-tip"><strong>Mastered:</strong> you can recognise it, understand it and produce it without leaning on the book. If one of those is shaky, leave it as Studying/Shaky.</p>`;
  $('#modalgrid').hidden=true;
  $('#mastery').closest('label').hidden=true; $('#confidence').closest('label').hidden=true;
  $('#taskNotes').hidden=true; $('.fieldlabel').hidden=true; $('#modalDone').closest('label').hidden=true;
  $('#modal').showModal();
  $('#modalDesc').querySelectorAll('[data-mastery-task]').forEach(sel=>sel.onchange=e=>setTask(e.target.dataset.masteryTask,{mastery:e.target.value}));
  $('#modal').addEventListener('close',resetTaskModal,{once:true});
}
function resetTaskModal(){
  $('#modalgrid').hidden=false; $('#mastery').closest('label').hidden=false; $('#confidence').closest('label').hidden=false; $('#taskNotes').hidden=false; $('.fieldlabel').hidden=false; $('#modalDone').closest('label').hidden=false;
}
function openTask(id){
  const tasks=[...allCoreTasks(),...Array.from({length:12},(_,w)=>Array.from({length:7},(_,d)=>habits(w,d)).flat())];
  let t=tasks.find(x=>x.id===id);
  if(!t && id.startsWith('lesson-')) return;
  if(!t)return;
  const s=ts(id);
  $('#modalTitle').textContent=t.title;
  $('#modalSub').textContent=`${t.lesson?`${esc(CURRICULUM.book)} · Lesson ${t.lesson}`:'Daily habit'} · ${t.book}${t.page?` · p.${t.page}`:''}`;
  const pageLink=t.page?`<div class="book-reference"><span>BOOK REFERENCE</span><strong>${esc(t.book)} · ${t.page.includes?.('–')?'pages':'page'} ${esc(t.page)}</strong>${t.section?`<small>Lesson section: ${esc(t.section)}${t.sectionPages?` · pp.${esc(t.sectionPages)}`:''}</small>`:''}<small>Use this exact location in your physical book/workbook.</small></div>`:'';
  const lessonLink=t.lesson?`<button type="button" class="smallbtn" id="openRelatedLesson">Open Lesson ${t.lesson} workspace</button>`:'';
  const secs=taskSeconds(id);
  const timeLine=secs?`<div class="time-stat">⏱ ${fmtDuration(secs)} studied on this task</div>`:'';
  const isActive=state.pomodoro.taskId===id && state.pomodoro.status==='running';
  const pomoBtn=`<button type="button" class="smallbtn primary" id="startTaskPomo">${isActive?'Timer running for this task':'Start pomodoro for this task'}</button>`;
  const workflow=t.sectionSteps?.length?`<div class="task-workflow"><strong>Suggested study sequence</strong><ol>${t.sectionSteps.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></div>`:'';
  const items=t.sectionItems?.length?`<div class="task-items"><strong>Content in this section</strong><ul>${t.sectionItems.map(x=>`<li>${esc(x.label)}</li>`).join('')}</ul></div>`:'';
  $('#modalDesc').innerHTML=`${pageLink}${timeLine}<p>${esc(t.desc)}</p>${items}${workflow}${t.lesson?'<p><strong>Study rule:</strong> Work through this section. If you already know it, do a small representative check and move on rather than grinding repetitive questions.</p>':''}<div class="modal-related">${lessonLink}${pomoBtn}</div>`;
  $('#modalDone').checked=s.completed; $('#modalDone').onchange=()=>toggle(id);
  $('#mastery').value=s.mastery; $('#mastery').onchange=e=>setTask(id,{mastery:e.target.value});
  $('#confidence').value=s.confidence||''; $('#confidence').onchange=e=>setTask(id,{confidence:e.target.value?+e.target.value:null});
  $('#taskNotes').value=s.notes||''; $('#taskNotes').oninput=e=>{state.taskState[id]={...ts(id),notes:e.target.value};saveLocal();cloudSave(id);};
  if($('#openRelatedLesson')) $('#openRelatedLesson').onclick=()=>{state.lesson=t.lesson;state.view='lesson';$('#modal').close();render();};
  $('#startTaskPomo').onclick=()=>{startPomodoro(id);toast('Pomodoro started for this task');$('#startTaskPomo').textContent='Timer running for this task';};
  resetTaskModal(); $('#modal').showModal();
}
async function loadCloud(){
  if(!db||!state.user)return;
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
$('#logout').onclick=async()=>{if(db)await db.auth.signOut();state.user=null;state.ready=true;render();};
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
