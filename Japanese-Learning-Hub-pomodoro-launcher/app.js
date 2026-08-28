const SB = window.SUPABASE_CONFIG || {};
const hasSupabase = !!(SB.url && SB.anonKey && !SB.url.includes('YOUR_') && !SB.anonKey.includes('YOUR_'));
const db = hasSupabase && window.supabase ? window.supabase.createClient(SB.url, SB.anonKey) : null;

const POMO_DURATIONS = { work: 25*60, short: 5*60, long: 15*60 }; // fallback defaults
const POMO_CYCLE_LENGTH = 4; // fallback default

const state = {
  view: 'dashboard',
  week: 0,
  libraryItem: null,
  activeProgramId: localStorage.getItem('activeProgramId') || 'tobira-beginning-ii-12w',
  lesson: 11,
  startDate: localStorage.getItem('studyStartDate') || '2026-08-31',
  taskState: JSON.parse(localStorage.getItem('taskState') || '{}'),
  notes: localStorage.getItem('appNotes') || '',
  user: null,
  ready: false,
  pomodoroSettings: JSON.parse(localStorage.getItem('pomodoroSettings') || 'null') || { work:25, short:5, long:15, cycle:4 },
  pomodoroVisible: false,
  pomodoro: JSON.parse(localStorage.getItem('pomodoroState') || 'null') || {
    status: 'idle', mode: 'work', remaining: POMO_DURATIONS.work,
    taskId: null, cycle: 0, endAt: null, startedAt: null
  },
  sessions: JSON.parse(localStorage.getItem('pomodoroSessions') || '[]'),
  studySession: JSON.parse(localStorage.getItem('studySession') || 'null') || {active:false, startedAt:null, queue:[], index:0}
};

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const fmt = d => d.toLocaleDateString(undefined, {weekday:'long', month:'short', day:'numeric'});
const dateKey = d => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`; };
function activeProgram(){
  const programs=window.STUDY_PROGRAMS||[];
  return programs.find(p=>p.id===state.activeProgramId) || programs.find(p=>p.active) || programs[0] || {id:'default',title:'Study programme',curriculum:CURRICULUM,durationWeeks:12,lessonWeeks:10,taskPrefix:'b2'};
}
function activeCurriculum(){ return activeProgram().curriculum || CURRICULUM; }
function programLessons(){ return activeCurriculum().lessons || []; }
function programDuration(){ return Number(activeProgram().durationWeeks||12); }
function lessonWeeks(){ return Math.min(Number(activeProgram().lessonWeeks||programLessons().length),programDuration()); }
function lessonForWeek(w){ return w < lessonWeeks() ? programLessons()[w] || null : null; }
function consolidationLessons(w){
  const ls=programLessons(), half=Math.ceil(ls.length/2);
  return w===lessonWeeks() ? ls.slice(0,half) : ls.slice(half);
}
function activeBook(){
  const id=activeCurriculum().bookId || activeProgram().bookId || '';
  return (window.BOOKS||[]).find(b=>b.id===id) || {title:activeCurriculum().book||activeProgram().title||'Active curriculum',level:'',series:''};
}
function lessonByNumber(n){ return programLessons().find(l => l.n === Number(n)); }
function defFor(key){ return TASK_TYPES.find(x => x.key === key); }
function pageFor(l, key){
  const def = defFor(key);
  if(def?.book === 'Textbook') return { book:'Textbook', page:`${l.textbook.start}–${l.textbook.end}` };
  for (const b of ['workbook2','workbook1']) {
    if (l[b]?.[key] != null) return { book: b === 'workbook2' ? 'Workbook 2' : 'Workbook 1', page: l[b][key] };
  }
  return null;
}
function makeTask(l, key, opts={}){
  const def = defFor(key), ref = pageFor(l,key);
  if(!def || !ref) return null;
  return { id:`${activeProgram().taskPrefix||'book'}-l${l.n}-${key}`, lesson:l.n, key, title:def.label, book:ref.book, page:ref.page, duration:def.duration, desc:def.desc, ...opts };
}
function lessonTasks(l){ return TASK_TYPES.map(d=>makeTask(l,d.key)).filter(Boolean); }
function weeklyTasks(w,d){
  if(w>=lessonWeeks()) return consolidationTasks(w,d);
  const l=lessonForWeek(w);
  const schedule=[
    ['textbook_conversation','textbook_vocab','vocab'],
    ['textbook_kanji','kanji'],
    ['textbook_grammar','particle','grammar1'],
    ['textbook_talk','textbook_reading','reading'],
    ['textbook_listening','listening','writing'],
    ['comp1','grammar2','comp2'],
    ['review'],
  ][d];
  const out=schedule.map(k=>makeTask(l,k)).filter(Boolean);
  if(d===5) out.push({id:`${activeProgram().taskPrefix||'book'}-w${w+1}-d6-consolidation`,lesson:l.n,key:'consolidation',title:`Lesson ${l.n} · consolidation + catch-up`,duration:'30–45 min',book:'Your notes',desc:'Return to anything marked shaky or weak. Re-test it without notes, then update mastery. If the textbook work is complete, use this block for rereading, re-listening or additional speaking.'});
  if(d===6) out.push({id:`${activeProgram().taskPrefix||'book'}-w${w+1}-d7-mastery`,lesson:l.n,key:'mastery',title:`Mastery check · Lesson ${l.n}`,duration:'30–45 min',book:'Dashboard',desc:'Check the textbook, both workbooks and the lesson can-do goals. Mark Mastered only when you can recognise, understand and produce the material reliably.'});
  return out;
}
function consolidationTasks(w,d){
  const ls=consolidationLessons(w), label=w===lessonWeeks()?`Lessons ${ls[0]?.n||''}–${ls[ls.length-1]?.n||''}`:`Lessons ${ls[0]?.n||''}–${ls[ls.length-1]?.n||''}`;
  if(d===6) return [{id:`${activeProgram().taskPrefix||'book'}-w${w+1}-d7-mastery`,key:'mastery',title:`Mastery check · ${label}`,duration:'45–60 min',book:'Dashboard',desc:'Re-test every lesson area marked shaky, studying or review. Include textbook grammar production, reading/listening and workbook errors.'}];
  const l=ls[d];
  if(!l) return [{id:`${activeProgram().taskPrefix||'book'}-w${w+1}-d${d+1}-catchup`,key:'catchup',title:`Consolidation · ${label}`,duration:'45–60 min',book:'Your notes',desc:'Use this session for unfinished work and the weakest remaining areas.'}];
  const key=['textbook_grammar','textbook_reading','textbook_listening','grammar1','reading','writing','comp1'][d];
  const t=makeTask(l,key);
  return t?[{...t,id:`${activeProgram().taskPrefix||'book'}-consolidation-w${w+1}-l${l.n}-${key}`,title:`L${l.n} · ${t.title}`,desc:t.desc+' This is a consolidation pass: prioritise anything previously marked shaky or weak.'}]:[{id:`${activeProgram().taskPrefix||'book'}-w${w+1}-d${d+1}-targeted`,key:'targeted',title:`L${l.n} · targeted review`,duration:'45–60 min',book:'Your notes',desc:'Review the weakest remaining component from this lesson and update its mastery.'}];
}

function habits(w,d){
  return OPTIONAL_TASKS.map(x => ({id:`habit-w${w+1}-d${d+1}-${x.key}`,key:x.key,title:x.label,duration:x.duration,book:'Habit',desc:x.desc,habit:true}));
}
function ts(id){ return state.taskState[id] || {completed:false,mastery:'not_started',confidence:null,notes:'',completed_at:null,review_due_at:null,review_stage:0}; }
function reviewDays(master, stage){
  const ladders={studying:[1,2,4],shaky:[1,3,7],review:[3,7,14,30]};
  const a=ladders[master]||[]; return a[Math.min(Number(stage)||0,a.length-1)]||0;
}
function scheduleReview(id, mastery, completedAt=new Date().toISOString(), stage=null){
  if(!['studying','shaky','review'].includes(mastery)) return {review_due_at:null,review_stage:0};
  const prev=ts(id), nextStage=stage==null ? ((prev.mastery===mastery)?(Number(prev.review_stage)||0)+1:0) : stage;
  const days=reviewDays(mastery,nextStage);
  return {review_due_at:new Date(new Date(completedAt).getTime()+days*86400000).toISOString(),review_stage:nextStage};
}
function saveLocal(){
  localStorage.setItem('taskState',JSON.stringify(state.taskState));
  localStorage.setItem('appNotes',state.notes);
  localStorage.setItem('studyStartDate',state.startDate);
}
async function cloudSave(id){
  if(!db || !state.user) return;
  const t = ts(id);
  const {error} = await db.from('task_state').upsert({user_id:state.user.id,task_id:id,completed:t.completed,completed_at:t.completed_at,mastery:t.mastery,confidence:t.confidence,notes:t.notes,review_due_at:t.review_due_at||null,review_stage:t.review_stage||0},{onConflict:'user_id,task_id'});
  if(error) toast('Cloud save failed; your local copy is safe.');
}
function setTask(id,p){
  const before=ts(id), next={...before,...p};
  if(Object.prototype.hasOwnProperty.call(p,'mastery') && p.mastery!==before.mastery){
    if(['studying','shaky','review'].includes(p.mastery)) Object.assign(next,scheduleReview(id,p.mastery,next.completed_at||new Date().toISOString(),0));
    else {next.review_due_at=null; next.review_stage=0;}
  }
  if(p.completed===true && !next.completed_at) next.completed_at=new Date().toISOString();
  state.taskState[id]=next; saveLocal(); render(); cloudSave(id);
}
function toggle(id){ const t=ts(id); setTask(id,{completed:!t.completed,completed_at:!t.completed?new Date().toISOString():null,mastery:!t.completed && t.mastery==='not_started'?'studying':t.mastery}); }
function weekDates(w){ const s=new Date(state.startDate+'T00:00:00'); return Array.from({length:7},(_,i)=>addDays(s,w*7+i)); }
function allTasks(w){ return Array.from({length:7},(_,d)=>weeklyTasks(w,d)).flat(); }
function allCoreTasks(){ return Array.from({length:programDuration()},(_,w)=>allTasks(w)).flat(); }
function progress(w){ const a=allTasks(w); return {done:a.filter(t=>ts(t.id).completed).length,total:a.length}; }
function overallProgress(){ const a=allCoreTasks(); return {done:a.filter(t=>ts(t.id).completed).length,total:a.length}; }
function lessonProgress(n){
  const a=lessonTasks(lessonByNumber(n));
  return {done:a.filter(t=>ts(t.id).completed).length,total:a.length,mastered:a.filter(t=>ts(t.id).mastery==='mastered').length};
}
function currentWeekIndex(){
  const start=new Date(state.startDate+'T00:00:00');
  const diff=Math.floor((new Date().setHours(0,0,0,0)-start.getTime())/86400000);
  return Math.max(0,Math.min(programDuration()-1,Math.floor(diff/7)));
}
function nextIncomplete(){
  const w=currentWeekIndex();
  for(let i=w;i<programDuration();i++) for(const t of allTasks(i)) if(!ts(t.id).completed) return {task:t,week:i};
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
  $('#pomoWorkMin').value=s.work; $('#pomoShortMin').value=s.short;
  $('#pomoLongMin').value=s.long; $('#pomoCycleLen').value=s.cycle;
}
function savePomodoro(){ localStorage.setItem('pomodoroState', JSON.stringify(state.pomodoro)); }
function saveSessions(){ localStorage.setItem('pomodoroSessions', JSON.stringify(state.sessions)); }
function taskLessonNumber(id){
  const m = /^(?:b2|book)-l(\d+)-/.exec(id||'') || /^(?:b2|book)-consolidation-w\d+-l(\d+)-/.exec(id||'');
  return m ? +m[1] : null;
}
function findTaskById(id){
  if(!id) return null;
  const core = allCoreTasks();
  const hab = Array.from({length:programDuration()},(_,w)=>Array.from({length:7},(_,d)=>habits(w,d)).flat()).flat();
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
  savePomodoro(); renderPomodoro();
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
  return {w:Math.min(programDuration()-1,Math.floor(diffDays/7)), d:((diffDays%7)+7)%7};
}
function renderPomodoroQuickLink(){
  const sel=$('#pomoQuickLink'); if(!sel) return;
  const {w,d}=currentWeekDay();
  const opts=habits(w,d).map(t=>`<option value="${esc(t.id)}">${esc(t.title)}</option>`).join('');
  sel.innerHTML=`<option value="">Quick-link a habit…</option>${opts}`;
  sel.value = state.pomodoro.taskId && habits(w,d).some(t=>t.id===state.pomodoro.taskId) ? state.pomodoro.taskId : '';
}
function ensurePomodoroToggle(){
  const w=$('#pomodoroWidget'); if(!w) return;
  if(!w.querySelector('.pomo-minimize')){
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='pomo-minimize';
    btn.setAttribute('aria-label','Minimize Pomodoro');
    btn.title='Minimize Pomodoro';
    btn.textContent='−';
    const head=w.querySelector('.pomo-head');
    if(head) head.appendChild(btn); else w.prepend(btn);
    btn.addEventListener('click',()=>{
      w.classList.toggle('minimized');
      const minimized=w.classList.contains('minimized');
      btn.textContent=minimized?'+':'−';
      btn.setAttribute('aria-label',minimized?'Expand Pomodoro':'Minimize Pomodoro');
      btn.title=minimized?'Expand Pomodoro':'Minimize Pomodoro';
      localStorage.setItem('pomodoroMinimized', minimized?'1':'0');
    });
  }
  const saved=localStorage.getItem('pomodoroMinimized');
  if(saved==='1') w.classList.add('minimized');
  if(saved==='0') w.classList.remove('minimized');
  const btn=w.querySelector('.pomo-minimize');
  if(btn){
    const minimized=w.classList.contains('minimized');
    btn.textContent=minimized?'+':'−';
    btn.setAttribute('aria-label',minimized?'Expand Pomodoro':'Minimize Pomodoro');
    btn.title=minimized?'Expand Pomodoro':'Minimize Pomodoro';
  }
}
function renderPomodoro(){
  const w=$('#pomodoroWidget'); if(!w) return;
  w.hidden = !(state.ready && state.user && state.pomodoroVisible);
  ensurePomodoroToggle();
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

function saveStudySession(){ localStorage.setItem('studySession',JSON.stringify(state.studySession)); }
function sessionCandidates(){
  const current=adaptiveToday(12);
  const seen=new Set();
  const out=[];
  current.forEach(x=>{ if(x.t && !seen.has(x.t.id)){seen.add(x.t.id);out.push(x.t);} });
  const next=nextIncomplete();
  if(next?.task && !seen.has(next.task.id)) out.push(next.task);
  return out.slice(0,8);
}
function startStudySession(){
  const queue=sessionCandidates();
  if(!queue.length){ toast('Nothing urgent is queued. Use the plan or review your input activities.'); return; }
  state.studySession={active:true,startedAt:new Date().toISOString(),queue:queue.map(t=>t.id),index:0};
  saveStudySession(); state.view='session'; render(); scrollTo({top:0,behavior:'smooth'});
}
function endStudySession(){
  state.studySession={active:false,startedAt:null,queue:[],index:0};
  saveStudySession(); state.view='dashboard'; render();
}
function currentSessionTask(){
  const id=state.studySession.queue[state.studySession.index];
  return id ? findTaskById(id) : null;
}
function advanceStudySession(){
  if(state.studySession.index >= state.studySession.queue.length-1){ endStudySession(); toast('Study session complete'); return; }
  state.studySession.index += 1; saveStudySession(); render(); scrollTo({top:0,behavior:'smooth'});
}
function renderStudySession(){
  $('#hero').hidden=true; $('#bottomArea').hidden=true; $('#weekView').hidden=true; $('#mainContent').hidden=false;
  const ss=state.studySession, queue=ss.queue.map(id=>findTaskById(id)).filter(Boolean), task=currentSessionTask();
  if(!ss.active || !queue.length || !task){ endStudySession(); return; }
  const idx=ss.index, done=queue.slice(0,idx).filter(t=>ts(t.id).completed).length, pct=Math.round(((idx)/queue.length)*100);
  const elapsed=ss.startedAt?Math.max(0,Math.floor((Date.now()-new Date(ss.startedAt).getTime())/60000)):0;
  $('#mainContent').innerHTML=`
    <section class="session-shell">
      <div class="session-top"><div><div class="eyebrow">Focused study session</div><h1>Today's study</h1><p>${esc(activeBook().title)} · ${queue.length} priority tasks</p></div><button class="smallbtn" id="endStudySession">End session</button></div>
      <div class="session-progress"><div><strong>${idx+1} of ${queue.length}</strong><span>${elapsed} min elapsed</span></div><div class="progress"><i style="width:${pct}%"></i></div></div>
      <section class="session-current">
        <div class="eyebrow">Current task</div><h2>${esc(task.title)}</h2>
        <p class="session-ref">${esc(task.book)}${task.page?` · p.${esc(task.page)}`:''} · ${esc(task.duration)}</p>
        <div class="session-description">${esc(task.desc)}</div>
        ${reviewInfo(task).label?`<div class="session-review">🔄 ${esc(reviewInfo(task).label)} · ${esc(ts(task.id).mastery)}</div>`:''}
        <div class="session-actions"><button class="smallbtn primary" id="sessionPomo">${state.pomodoro.taskId===task.id&&state.pomodoro.status==='running'?'Pomodoro running':'Start Pomodoro'}</button><button class="smallbtn" id="sessionOpenTask">Open full task</button><button class="smallbtn" id="sessionComplete">${ts(task.id).completed?'Completed ✓':'Mark complete & next →'}</button></div>
      </section>
      <section class="session-queue panel"><div class="panelhead"><div><h3>Session queue</h3><p class="subtitle">The queue is generated from today's schedule, due reviews and your next unfinished work.</p></div></div><div class="session-list">${queue.map((t,i)=>{const st=ts(t.id);return `<button class="session-row ${i===idx?'current':''} ${st.completed?'done':''}" data-session-index="${i}"><span class="session-number">${i+1}</span><span><strong>${esc(t.title)}</strong><small>${esc(t.book)}${t.page?` · p.${esc(t.page)}`:''}${i<idx?' · visited':i===idx?' · now':''}</small></span><span class="status-dot ${st.mastery}">${st.completed?'✓':''}</span></button>`}).join('')}</div></section>
    </section>`;
  $('#endStudySession').onclick=endStudySession;
  $('#sessionPomo').onclick=()=>{state.pomodoroVisible=true;startPomodoro(task.id);renderNav();renderPomodoro();renderStudySession();};
  $('#sessionOpenTask').onclick=()=>openTask(task.id);
  $('#sessionComplete').onclick=()=>{if(!ts(task.id).completed)setTask(task.id,{completed:true,mastery:ts(task.id).mastery==='not_started'?'studying':ts(task.id).mastery}); if(state.studySession.index<state.studySession.queue.length-1)advanceStudySession(); else endStudySession();};
  $('#mainContent').querySelectorAll('[data-session-index]').forEach(b=>b.onclick=()=>{state.studySession.index=+b.dataset.sessionIndex;saveStudySession();render();});
}
function render(){
  if(!state.ready || !state.user){ renderGate(); return; }
  $('#appShell').hidden=false; $('#loginGate').hidden=true;
  renderHeader(); renderNav();
  if(state.view==='dashboard') renderDashboard();
  else if(state.view==='session') renderStudySession();
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
  $('#lessonLabel').textContent=l?`Lesson ${l.n}: ${l.title}`:(w===lessonWeeks()?`Lessons ${programLessons()[0]?.n||''}–${programLessons()[Math.ceil(programLessons().length/2)-1]?.n||''}: consolidation`:`Lessons ${programLessons()[Math.ceil(programLessons().length/2)]?.n||''}–${programLessons().at(-1)?.n||''}: consolidation`);
  $('#lessonEnglish').textContent=l?l.english:`Re-test, repair and consolidate ${book.title}.`;
  $('#dateRange').textContent=`${fmt(ds[0])} – ${fmt(ds[6])}`;
  $('#progressText').textContent=`${p.done}/${p.total} core tasks complete`;
  $('#progressBar').style.width=(p.total?p.done/p.total*100:0)+'%';
}
function renderNav(){
  const running=state.pomodoro.status==='running';
  $('#mainNav').innerHTML=`<button class="navbtn ${state.view==='dashboard'?'active':''}" data-view="dashboard">Dashboard</button><button class="navbtn ${state.view==='plan'?'active':''}" data-view="plan">Study plan</button><button class="navbtn ${state.view==='lesson'?'active':''}" data-view="lesson">Lessons</button><button class="navbtn ${state.view==='library'?'active':''}" data-view="library">Learning hub</button><button class="navbtn pomo-navbtn ${state.pomodoroVisible?'active':''}" id="pomodoroNav" type="button" aria-label="${state.pomodoroVisible?'Hide':'Show'} Pomodoro" title="${state.pomodoroVisible?'Hide':'Show'} Pomodoro">🍅${running?' <span class=\"pomo-running-dot\"></span>':''}</button>`;
  $('#mainNav').querySelectorAll('.navbtn[data-view]').forEach(b=>b.onclick=()=>{state.view=b.dataset.view;if(state.view==='lesson'&&!lessonByNumber(state.lesson))state.lesson=programLessons()[0]?.n || 1;render();scrollTo({top:0,behavior:'smooth'});});
  const pomoBtn=$('#pomodoroNav');
  if(pomoBtn) pomoBtn.onclick=()=>{
    state.pomodoroVisible=!state.pomodoroVisible;
    renderNav();
    renderPomodoro();
    if(state.pomodoroVisible) requestAnimationFrame(()=>document.querySelector('#pomodoroWidget')?.focus?.());
  };
}


function programLessonsFor(pr){ return pr?.curriculum?.lessons || []; }
function activateProgram(id){
  const pr=(window.STUDY_PROGRAMS||[]).find(x=>x.id===id);
  if(!pr || !pr.curriculum){ toast('This programme has not been mapped yet.'); return; }
  state.activeProgramId=id;
  localStorage.setItem('activeProgramId',id);
  state.week=0;
  state.lesson=pr.curriculum.lessons?.[0]?.n || 1;
  render();
  toast(`Active programme: ${pr.title}`);
}

function renderLibrary(){
  $('#hero').hidden=true; $('#bottomArea').hidden=true; $('#weekView').hidden=true; $('#mainContent').hidden=false;
  const activeId=activeCurriculum().bookId || 'tobira-beginning-ii';
  const programs=(window.STUDY_PROGRAMS||[]);
  const books=(window.BOOKS||[]); const resources=(window.STUDY_RESOURCES||[]);
  const active=books.find(b=>b.id===activeId);
  $('#mainContent').innerHTML=`
    <section class="library-hero">
      <div class="eyebrow">Japanese learning hub</div>
      <h1>Your books, curriculum and study tools</h1>
      <p>TOBIRA Beginning Japanese II is the current active curriculum, but the dashboard is now structured around a reusable learning-hub model. Future books can be added without changing the progress system.</p>
    </section>
    <section class="library-section"><div class="panelhead"><div><h2>Study programmes</h2><p class="subtitle">A programme is a scheduled path through a mapped book. The learning hub can hold many programmes; only one is active at a time.</p></div></div><div class="program-grid">${programs.map(pr=>{const active=pr.id===activeProgram().id; const status=active?'Active':'Mapped'; return `<article class="program-card${active?' active-program':''}"><div class="book-card-top"><span class="book-status ${active?'active':'available'}">${status}</span><span class="book-level">${esc(pr.durationWeeks)} weeks</span></div><div class="eyebrow">${esc(pr.type||'Curriculum')}</div><h3>${esc(pr.title)}</h3><p>${esc(pr.description||'Scheduled study programme.')}</p><div class="program-meta"><span>${programLessonsFor(pr).length} lessons mapped</span><span>${esc(pr.scheduleLabel||'Structured study cycle')}</span></div>${active?`<button class="smallbtn primary" data-open-active-program>Open programme</button>`:`<button class="smallbtn" data-activate-program="${esc(pr.id)}">Make active</button>`}</article>`}).join('')}</div></section>
    <section class="library-section"><div class="panelhead"><div><h2>Textbooks & courses</h2><p class="subtitle">Your study library. Books can exist independently of a programme and be mapped later.</p></div></div><div class="book-grid">${books.map(b=>{const activeClass=b.id===activeId?' active-book':''; const status=b.status==='active'?'Active':b.status==='available'?'Available':'Planned'; return `<article class="book-card${activeClass}"><div class="book-card-top"><span class="book-status ${b.status}">${status}</span><span class="book-level">${esc(b.level)}</span></div><div class="eyebrow">${esc(b.series)}</div><h3>${esc(b.title)}</h3><p>${esc(b.description)}</p>${b.curriculum?`<button class="smallbtn primary" data-open-current-book="${esc(b.id)}">Open curriculum</button>`:`<div class="book-placeholder">Add contents/pages when you are ready to map this book.</div>`}</article>`}).join('')}</div></section>
    <section class="library-section"><div class="panelhead"><div><h2>Study tools & input</h2><p class="subtitle">These support the curriculum; they are not competing courses.</p></div></div><div class="resource-grid">${resources.map(r=>`<article class="resource-card"><div class="book-card-top"><span class="resource-type">${esc(r.type)}</span><span class="book-status ${r.status}">${r.status==='active'?'Active':'Available'}</span></div><h3>${esc(r.title)}</h3><p>${esc(r.description)}</p></article>`).join('')}</div></section>
    <section class="library-section architecture-note"><div class="eyebrow">How this scales</div><h2>One dashboard, many books</h2><p>Each book will eventually have its own lesson map, page references, practice tasks and mastery checks. Your Supabase progress remains tied to stable task IDs, so adding a new book does not require replacing your existing study history.</p><div class="hub-flow"><span>Book</span><b>→</b><span>Lessons</span><b>→</b><span>Tasks</span><b>→</b><span>Mastery</span><b>→</b><span>Review queue</span></div></section>`;
  $('#mainContent').querySelectorAll('[data-open-current-book],[data-open-active-program]').forEach(b=>b.onclick=()=>{state.view='lesson';state.lesson=programLessons()[0]?.n || 1;render();});
  $('#mainContent').querySelectorAll('[data-activate-program]').forEach(b=>b.onclick=()=>activateProgram(b.dataset.activateProgram));
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
function todayPlan(){
  const start=new Date(state.startDate+'T00:00:00');
  const now=new Date(); now.setHours(0,0,0,0);
  const startDay=new Date(start); startDay.setHours(0,0,0,0);
  const offset=Math.floor((now-startDay)/86400000);
  const clamped=Math.max(0,Math.min(programDuration()*7-1,offset));
  const w=Math.floor(clamped/7), d=clamped%7;
  return {week:w,day:d,beforeStart:offset<0,afterEnd:offset>=programDuration()*7,tasks:weeklyTasks(w,d)};
}
function masteryInterval(mastery){
  return {studying:1,shaky:1,review:5}[mastery] || 0;
}
function reviewInfo(t){
  const s=ts(t.id), mastery=s.mastery;
  if(!['studying','shaky','review'].includes(mastery)) return {due:false,days:null,label:''};
  if(!s.review_due_at){
    const scheduled=scheduleReview(t.id,mastery,s.completed_at||new Date().toISOString(),0);
    const dueAt=new Date(scheduled.review_due_at).getTime();
    const days=Math.ceil((dueAt-Date.now())/86400000);
    return {due:Date.now()>=dueAt,days,label:days<=0?'Due now':`Due in ${days}d`};
  }
  const dueAt=new Date(s.review_due_at).getTime();
  const days=Math.ceil((dueAt-Date.now())/86400000);
  return {due:Date.now()>=dueAt,days,label:days<=0?'Due now':`Due in ${days}d`};
}
function reviewQueue(limit=10){
  return allCoreTasks().map(t=>({t,s:ts(t.id),r:reviewInfo(t)})).filter(x=>{
    if(!['studying','shaky','review'].includes(x.s.mastery)) return false;
    return x.r.due;
  }).sort((a,b)=>{
    const rank={shaky:0,review:1,studying:2};
    return (rank[a.s.mastery]-rank[b.s.mastery]) || ((a.s.completed_at||'').localeCompare(b.s.completed_at||''));
  }).slice(0,limit);
}
function scheduledToday(){
  const current=todayPlan();
  return current.tasks.filter(t=>!ts(t.id).completed);
}
function adaptiveToday(limit=8){
  const scheduled=scheduledToday();
  const reviews=reviewQueue(20).map(x=>({...x,priority:'review'}));
  const scheduledIds=new Set(scheduled.map(t=>t.id));
  const dueReviews=reviews.filter(x=>!scheduledIds.has(x.t.id));
  const result=[];
  scheduled.forEach(t=>result.push({t,kind:'scheduled',reason:'Scheduled for today'}));
  dueReviews.forEach(x=>result.push({t:x.t,kind:'review',reason:`${x.s.mastery==='shaky'?'Weak area · ':''}${x.r.label}`}));
  return result.slice(0,limit);
}
function programmeHealth(){
  const tasks=allCoreTasks(), states=tasks.map(t=>ts(t.id));
  return {
    total:tasks.length,
    completed:states.filter(s=>s.completed).length,
    mastered:states.filter(s=>s.mastery==='mastered').length,
    attention:states.filter(s=>['shaky','studying','review'].includes(s.mastery)).length,
    due:reviewQueue(999).length
  };
}
function lessonWeaknesses(){
  return programLessons().map(l=>{
    const tasks=lessonTasks(l), flagged=tasks.filter(t=>['shaky','studying','review'].includes(ts(t.id).mastery));
    const p=lessonProgress(l.n);
    return {...l,flagged:flagged.length,percent:p.total?Math.round(p.done/p.total*100):0};
  }).filter(l=>l.flagged>0).sort((a,b)=>b.flagged-a.flagged);
}
function renderDashboard(){
  $('#hero').hidden=true; $('#bottomArea').hidden=true; $('#weekView').hidden=true; $('#mainContent').hidden=false;
  const overall=overallProgress(), current=todayPlan(), adaptive=adaptiveToday(8), next=nextIncomplete(), reviews=reviewQueue(8), weaknesses=lessonWeaknesses();
  const health=programmeHealth();
  const mastered=programLessons().filter(l=>lessonStatus(l.n)[0]==='mastered').length;
  const activityRows=OPTIONAL_TASKS.map(x=>({label:x.label,secs:activitySeconds(x.key)})).sort((a,b)=>b.secs-a.secs);
  const maxActivity=Math.max(...activityRows.map(a=>a.secs),1);
  const topTasks=topTaskSessions(6);
  const overallPct=overall.total?Math.round(overall.done/overall.total*100):0;
  const currentDate=current.beforeStart?'Before programme start':current.afterEnd?'Programme complete':new Date(addDays(new Date(state.startDate+'T00:00:00'),current.week*7+current.day));
  const dateLabel=currentDate instanceof Date?currentDate.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'}):currentDate;
  const focus=adaptive.length?adaptive.map(x=>`<button class="focusitem ${x.kind==='review'?'review-focus':''}" data-task="${esc(x.t.id)}"><span class="status-dot ${ts(x.t.id).mastery}"></span><span><strong>${esc(x.t.title)}</strong><small>${esc(x.reason)} · ${esc(x.t.book)}${x.t.page?` · p.${x.t.page}`:''} · ${esc(x.t.duration)}</small></span></button>`).join(''):`<div class="empty">Nothing urgent is waiting. Use this time for reading, Migaku, shadowing or extra review.</div>`;
  const dueCount=health.due;
  $('#mainContent').innerHTML=`
    <section class="dashgrid">
      <article class="dashcard primarycard"><div class="eyebrow">Japanese learning hub</div><h2>Today's study</h2><p><strong>${esc(activeBook().title)}</strong> · ${esc(dateLabel)}. Your dashboard combines scheduled work with due reviews and weak areas.</p><div class="bigprogress"><strong>${overallPct}%</strong><span>${overall.done} of ${overall.total} scheduled core tasks complete</span></div><div class="progress"><i style="width:${overallPct}%"></i></div><div class="statstrip"><span><strong>${mastered}</strong> lessons mastered</span><span><strong>${dueCount}</strong> due reviews</span><span><strong>${health.attention}</strong> areas needing attention</span></div></article>
      <article class="dashcard today-card"><div class="eyebrow">Start here</div><h3>${adaptive.length?`${adaptive.length} priority items`:'All clear'}</h3><div class="focuslist">${focus}</div>${adaptive.length?`<button class="smallbtn primary" id="startToday">Start first task</button>`:`<button class="smallbtn" id="goPlan">Open study plan</button>`}</article>
      <article class="dashcard"><div class="eyebrow">Next</div><h3>${next?esc(next.task.title):'Programme complete'}</h3><p>${next?`Week ${next.week+1} · ${esc(next.task.book)}${next.task.page?` · p.${next.task.page}`:''}`:'You have completed every scheduled core task.'}</p>${next?'<button class="smallbtn primary" id="openNext">Open task</button>':''}</article>
    </section>
    <section class="dashboard-columns">
      <article class="panel"><div class="panelhead"><div><h3>Review queue</h3><p class="subtitle">Review is generated from mastery. Studying/Shaky returns quickly; Review returns after a longer interval.</p></div><span class="flag-count">${dueCount} due</span></div>${reviews.length?`<div class="attentionlist">${reviews.map(x=>`<button class="attention" data-task="${esc(x.t.id)}"><span class="status-dot ${x.s.mastery}"></span><span><strong>${esc(x.t.title)}</strong><small>L${x.t.lesson} · ${esc(x.t.book)} · p.${x.t.page} · ${esc(x.r.label)}</small></span></button>`).join('')}</div>`:'<div class="empty">Nothing is currently due. Keep testing yourself honestly.</div>'}</article>
      <article class="panel"><div class="panelhead"><div><h3>Weakest areas</h3><p class="subtitle">Flagged lesson components take priority over simply moving forward.</p></div></div>${weaknesses.length?`<div class="attentionlist">${weaknesses.slice(0,6).map(l=>`<button class="attention" data-lesson="${l.n}"><span class="status-dot shaky"></span><span><strong>Lesson ${l.n} · ${esc(l.title)}</strong><small>${l.flagged} flagged components · ${l.percent}% completed</small></span></button>`).join('')}</div>`:'<div class="empty">No weak areas flagged yet.</div>'}</article>
    </section>
    <section class="dashboard-columns">
      <article class="panel"><div class="panelhead"><div><h3>Active curriculum</h3><p class="subtitle">Open a lesson for its complete textbook → workbook → mastery workspace.</p></div><button class="smallbtn" id="goPlan">View plan</button></div><div class="lessonprogress">${programLessons().map(lessonButton).join('')}</div></article>
      <article class="panel"><div class="panelhead"><div><h3>Study time by activity</h3><p class="subtitle">Logged focus time from your Pomodoro sessions.</p></div></div><div class="timebars">${activityRows.map(a=>`<div class="timebar-row"><span>${esc(a.label)}</span><div class="timebar-track"><i style="width:${a.secs?Math.min(100,a.secs/maxActivity*100):0}%"></i></div><strong>${fmtDuration(a.secs)}</strong></div>`).join('')}</div></article>
    </section>
    <section class="dashboard-columns">
      <article class="panel"><div class="panelhead"><div><h3>Top tasks by time</h3><p class="subtitle">Where your logged focus time has actually gone.</p></div></div>${topTasks.length?`<div class="attentionlist">${topTasks.map(x=>`<button class="attention" data-task="${esc(x.id)}"><span class="status-dot ${x.task?ts(x.id).mastery:'not_started'}"></span><span><strong>${x.task?esc(x.task.title):'Unknown task'}</strong><small>${fmtDuration(x.secs)} logged${x.task?.lesson?` · L${x.task.lesson}`:''}</small></span></button>`).join('')}</div>`:'<div class="empty">No Pomodoro sessions logged yet.</div>'}</article>
      <article class="panel"><div class="panelhead"><div><h3>How progression works</h3><p class="subtitle">Completion is not the same thing as mastery.</p></div></div><div class="empty"><strong>Study → complete → assess → review → progress.</strong><br><br>Mark a component <strong>Mastered</strong> only when you can recognise, understand and produce it reliably. <strong>Shaky</strong> and <strong>Studying</strong> items return to the review queue automatically.</div></article>
    </section>`;
  $('#startToday')?.addEventListener('click',()=>startStudySession());
  $('#goPlan')?.addEventListener('click',()=>{state.week=current.week;state.view='plan';render();});
  $('#openNext')?.addEventListener('click',()=>{state.week=next.week;state.view='plan';render();setTimeout(()=>openTask(next.task.id),50);});
  $('#mainContent').querySelectorAll('.lessonrow').forEach(b=>b.onclick=()=>{state.lesson=+b.dataset.lesson;state.view='lesson';render();scrollTo({top:0,behavior:'smooth'});});
  $('#mainContent').querySelectorAll('[data-task]').forEach(b=>b.onclick=()=>openTask(b.dataset.task));
  $('#mainContent').querySelectorAll('[data-lesson]').forEach(b=>b.onclick=()=>{state.lesson=+b.dataset.lesson;state.view='lesson';render();});
}

function card(t){
  const s=ts(t.id);
  return `<article class="task ${s.completed?'done':''}" data-task="${esc(t.id)}"><input type="checkbox" data-check="${esc(t.id)}" ${s.completed?'checked':''}><div class="taskmain"><div class="tasktitle">${esc(t.title)}</div><div class="taskmeta">${esc(t.book)}${t.page?` · p.${t.page}`:''} · ${esc(t.duration)}</div><div class="taskhint">Tap for instructions, mastery and notes</div></div><span class="status-dot ${s.mastery}"></span></article>`;
}
function renderWeek(){
  $('#hero').hidden=false; $('#bottomArea').hidden=false; $('#weekView').hidden=false; $('#mainContent').hidden=true;
  const ds=weekDates(state.week);
  $('#weekView').innerHTML=`<div class="tabsrow"><button class="smallbtn" id="prevWeek">←</button><div class="weektabs" id="weekTabs"></div><button class="smallbtn" id="nextWeek">→</button></div>${ds.map((date,d)=>{const core=weeklyTasks(state.week,d),hs=habits(state.week,d),isToday=dateKey(date)===dateKey(new Date());return `<section class="day ${isToday?'today':''}"><div class="dayhead"><div><div class="eyebrow">${isToday?'TODAY · ':''}${date.toLocaleDateString(undefined,{weekday:'long'})}</div><h2>${fmt(date)}</h2></div><span class="daycount">${core.filter(t=>ts(t.id).completed).length}/${core.length}</span></div>${core.length?`<div class="tasklist">${core.map(card).join('')}</div>`:''}<details class="habits"><summary>Daily habits <span>WaniKani · Migaku · shadowing · reading</span></summary><div class="habitlist">${hs.map(card).join('')}</div></details></section>`}).join('')}`;
  $('#weekView').querySelectorAll('[data-task]').forEach(e=>e.onclick=x=>{if(x.target.matches('input'))return;openTask(e.dataset.task);});
  $('#weekView').querySelectorAll('[data-check]').forEach(e=>e.onchange=()=>toggle(e.dataset.check));
  $('#prevWeek').onclick=()=>{state.week=Math.max(0,state.week-1);render();};
  $('#nextWeek').onclick=()=>{state.week=Math.min(programDuration()-1,state.week+1);render();};
  renderTabs();
}
function renderTabs(){
  $('#weekTabs').innerHTML=Array.from({length:programDuration()},(_,i)=>`<button class="weektab ${i===state.week?'active':''}" data-week="${i}">W${i+1}</button>`).join('');
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
  const firstLesson=programLessons()[0]?.n ?? n;
  const lastLesson=programLessons().at(-1)?.n ?? n;
  const lessonIndex=programLessons().findIndex(x=>x.n===n);
  const w=Math.max(0,lessonIndex);
  const tasks=lessonTasks(l), p=lessonProgress(n), pct=p.total?p.done/p.total*100:0;
  const tb=tasks.filter(t=>t.book==='Textbook'), wb2=tasks.filter(t=>t.book==='Workbook 2'), wb1=tasks.filter(t=>t.book==='Workbook 1');
  const flagged=tasks.filter(t=>['shaky','studying','review'].includes(ts(t.id).mastery));
  const grammar=l.textbook.grammar.map(x=>`<li>${esc(x)}</li>`).join('');
  const cando=l.textbook.cando.map(x=>`<li>${esc(x)}</li>`).join('');
  $('#mainContent').innerHTML=`
    <div class="lesson-toolbar"><button class="smallbtn" id="backDashboard">← Dashboard</button><button class="smallbtn" id="backPlan">Week ${w+1} plan</button><div class="lesson-select"><button class="smallbtn" id="prevLesson" ${n===firstLesson?'disabled':''}>← L${n-1}</button><button class="smallbtn" id="nextLesson" ${n===lastLesson?'disabled':''}>L${n+1} →</button></div></div>
    <section class="lessonhero"><div class="eyebrow">${esc(activeBook().title)} · Lesson ${l.n}</div><h1>${esc(l.title)}</h1><p>${esc(l.english)}</p><div class="lessonhero-grid"><div><strong>${p.done}/${p.total}</strong><span>sections complete</span></div><div><strong>${p.mastered}/${p.total}</strong><span>sections mastered</span></div><div><strong>${Math.round(pct)}%</strong><span>lesson progress</span></div></div><div class="progress"><i style="width:${pct}%"></i></div></section>
    <section class="study-rule panel"><div><h3>Textbook first</h3><p>This lesson runs from <strong>pp.${l.textbook.start}–${l.textbook.end}</strong>. Work through the actual textbook before using the workbooks as reinforcement. If you already know a section, do a representative mastery check rather than grinding every repetition.</p></div><button class="smallbtn primary" id="lessonMastery">Open mastery check</button></section>
    <section class="panel lesson-overview"><div class="overview-grid"><div><div class="eyebrow">Can-do goals</div><ul>${cando}</ul></div><div><div class="eyebrow">Target grammar</div><ul>${grammar}</ul></div></div>${l.textbook.note?`<p class="subtitle"><strong>Language/Culture note:</strong> ${esc(l.textbook.note)}</p>`:''}</section>
    <section class="lesson-grid">
      <div class="lesson-column"><div class="section-heading"><div><div class="eyebrow">Textbook · pp.${l.textbook.start}–${l.textbook.end}</div><h2>Core lesson</h2><p class="subtitle">Conversation → vocabulary → kanji → grammar → speaking → reading → listening.</p></div></div><div class="component-list">${tb.map(t=>componentRow(l,t)).join('')}</div></div>
      <div class="lesson-column"><div class="section-heading"><div><div class="eyebrow">Workbook 2</div><h2>Vocabulary · grammar · listening</h2><p class="subtitle">Complete after the corresponding textbook material.</p></div></div><div class="component-list">${wb2.map(t=>componentRow(l,t)).join('')}</div></div>
    </section>
    <section class="panel"><div class="section-heading"><div><div class="eyebrow">Workbook 1</div><h2>Kanji · reading · writing</h2><p class="subtitle">Use the corresponding Workbook 1 pages to reinforce the same lesson.</p></div></div><div class="component-list">${wb1.map(t=>componentRow(l,t)).join('')}</div></section>
    <section class="panel lesson-notes-panel"><div class="panelhead"><div><h3>Lesson notes</h3><p class="subtitle">For overall observations. Individual task notes live in each task.</p></div><span class="flag-count">${flagged.length} flagged</span></div><textarea id="lessonNotes" class="notes" placeholder="What was easy? What keeps tripping you up? Useful example sentences..."></textarea></section>
    <section class="panel page-map"><div class="panelhead"><div><h3>Book cross-reference</h3><p class="subtitle">Textbook lesson range plus exact workbook pages.</p></div></div><div class="page-map-grid">${tasks.map(t=>`<button class="page-chip" data-task="${esc(t.id)}"><span>${esc(t.title)}</span><strong>${esc(t.book)} · p.${t.page}</strong></button>`).join('')}</div></section>`;
  $('#backDashboard').onclick=()=>{state.view='dashboard';render();};
  $('#backPlan').onclick=()=>{state.week=w;state.view='plan';render();};
  $('#prevLesson').onclick=()=>{if(n>firstLesson){state.lesson=n-1;render();}};
  $('#nextLesson').onclick=()=>{if(n<lastLesson){state.lesson=n+1;render();}};
  $('#lessonMastery').onclick=()=>openLessonMastery(l);
  $('#mainContent').querySelectorAll('[data-task]').forEach(e=>e.onclick=()=>openTask(e.dataset.task));
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
  const tasks=[...allCoreTasks(),...Array.from({length:programDuration()},(_,w)=>Array.from({length:7},(_,d)=>habits(w,d)).flat())];
  let t=tasks.find(x=>x.id===id);
  if(!t && id.startsWith('lesson-')) return;
  if(!t)return;
  const s=ts(id);
  $('#modalTitle').textContent=t.title;
  $('#modalSub').textContent=`${t.lesson?`${esc(activeBook().title)} · Lesson ${t.lesson}`:'Daily habit'} · ${t.book}${t.page?` · p.${t.page}`:''}`;
  const pageLink=t.page?`<div class="book-reference"><span>BOOK REFERENCE</span><strong>${esc(t.book)} · page ${t.page}</strong><small>Use this exact page in your physical book/workbook.</small></div>`:'';
  const lessonLink=t.lesson?`<button type="button" class="smallbtn" id="openRelatedLesson">Open Lesson ${t.lesson} workspace</button>`:'';
  const secs=taskSeconds(id);
  const timeLine=secs?`<div class="time-stat">⏱ ${fmtDuration(secs)} studied on this task</div>`:'';
  const isActive=state.pomodoro.taskId===id && state.pomodoro.status==='running';
  const pomoBtn=`<button type="button" class="smallbtn primary" id="startTaskPomo">${isActive?'Timer running for this task':'Start pomodoro for this task'}</button>`;
  $('#modalDesc').innerHTML=`${pageLink}${timeLine}${reviewLine}<p>${esc(t.desc)}</p>${t.lesson?'<p><strong>Study rule:</strong> Work through this section. If you already know it, do a small representative check and mark the skill mastered instead of grinding repetitive questions.</p>':''}<div class="modal-related">${lessonLink}${pomoBtn}</div>`;
  $('#modalDone').checked=s.completed; $('#modalDone').onchange=()=>toggle(id);
  $('#mastery').value=s.mastery; $('#mastery').onchange=e=>setTask(id,{mastery:e.target.value});
  $('#confidence').value=s.confidence||''; $('#confidence').onchange=e=>setTask(id,{confidence:e.target.value?+e.target.value:null});
  $('#taskNotes').value=s.notes||''; $('#taskNotes').oninput=e=>{state.taskState[id]={...ts(id),notes:e.target.value};saveLocal();cloudSave(id);};
  if($('#openRelatedLesson')) $('#openRelatedLesson').onclick=()=>{state.lesson=t.lesson;state.view='lesson';$('#modal').close();render();};
  $('#startTaskPomo').onclick=()=>{state.pomodoroVisible=true;startPomodoro(id);renderNav();renderPomodoro();toast('Pomodoro started for this task');$('#startTaskPomo').textContent='Timer running for this task';};
  resetTaskModal(); $('#modal').showModal();
}
async function loadCloud(){
  if(!db||!state.user)return;
  const {data,error}=await db.from('task_state').select('*').eq('user_id',state.user.id);
  if(!error&&data) data.forEach(r=>state.taskState[r.task_id]={completed:r.completed,mastery:r.mastery,confidence:r.confidence,notes:r.notes,completed_at:r.completed_at,review_due_at:r.review_due_at||null,review_stage:r.review_stage||0});
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
$('#pomoWorkMin').onchange=e=>updatePomoSetting('work',e.target.value,1);
$('#pomoShortMin').onchange=e=>updatePomoSetting('short',e.target.value,1);
$('#pomoLongMin').onchange=e=>updatePomoSetting('long',e.target.value,1);
$('#pomoCycleLen').onchange=e=>updatePomoSetting('cycle',e.target.value,1);
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
$('#pomoToggle').onclick=()=>{state.pomodoro.status==='running'?pausePomodoro():startPomodoro();};
$('#pomoSkip').onclick=()=>skipSession();
$('#pomoReset').onclick=()=>resetSession();
$('#pomoQuickLink').onchange=e=>{
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
