const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const context = {state:{taskState:{},lessonVideos:[]},console};
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'curriculum.js'), 'utf8'), context);
// Exercise the real pure planning/rendering functions without booting auth.
for (const name of ['defFor','pageFor','makeTask','lessonTasks','weeklyTasks','ts','taskStudyChecklist','lessonGuideSteps','flattenGuideSteps','guideMasteryOptions','guideConfidenceOptions','taskGoalFor','guideTaskWorkspaceMarkup','guideStepMarkup','lessonGuideMarkup','scrollToGuideActivity']) {
  const start=source.indexOf(`function ${name}(`);
  assert.ok(start>=0, `Missing ${name}`);
  const end=source.indexOf('\nfunction ',start+1);
  vm.runInContext(source.slice(start,end<0?undefined:end), context);
}
vm.runInContext(`
  function lessonForWeek(w){return CURRICULUM.lessons[w];}
  function consolidationTasks(w,d){return ['unchanged-consolidation',w,d];}
  function lessonVideosByType(l,type){return state.lessonVideos.filter(v=>v.lesson===l.n&&v.video_type===type);}
  function grammarPageFromVideos(rows,fallback){return 'pp.'+fallback;}
  function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function guideAudioMarkup(l,step){return step.audio?'<audio data-group="'+step.audio+'"></audio>':'';}
  function guideVideoLinks(videos){return videos.map(v=>esc(v.title)).join('');}
`,context);
const plain = value => JSON.parse(JSON.stringify(value));
for (const lesson of context.CURRICULUM.lessons) {
  const steps=context.lessonGuideSteps(lesson);
  const flat=context.flattenGuideSteps(steps);
  const ids=flat.map(s=>s.id);
  assert.equal(new Set(ids).size,ids.length,'No duplicate activities');
  assert.deepEqual(plain(steps.slice(0,4).map(s=>s.id)),['guide-goals','textbook_conversation','textbook_vocab_pictures','textbook_vocab'].map(k=>`b2-l${lesson.n}-${k}`));
  assert.equal(context.pageFor(lesson,'textbook_conversation').page,lesson.textbook.pages.conversation);
  assert.equal(context.pageFor(lesson,'textbook_vocab').page,lesson.textbook.pages.vocab);
  assert.equal(context.pageFor(lesson,'guide-goals').page,lesson.textbook.start);
  const scheduled=Array.from({length:7},(_,d)=>context.weeklyTasks(lesson.n-11,d)).flat();
  assert.deepEqual(plain(scheduled.map(t=>t.id)),plain(flat.filter(s=>scheduled.some(t=>t.id===s.id)).map(s=>s.id)),'Plan follows lesson order');
  for(const task of context.lessonTasks(lesson)) assert.ok(ids.includes(task.id),`Missing task ${task.id}`);
  const grammar=steps.find(s=>s.id.endsWith('-textbook_grammar'));
  assert.equal(grammar.support.filter(s=>s.id.includes('-guide-grammar-')).length,lesson.textbook.grammar.length);
  assert.ok(steps.find(s=>s.id.endsWith('-textbook_vocab')).support.some(s=>s.id.endsWith('-vocab')));
  const html=context.lessonGuideMarkup(lesson);
  for(const id of ids) assert.equal(html.split(`id="guide-${id}"`).length-1,1,`Unique rendered target ${id}`);
}
assert.deepEqual(plain(context.weeklyTasks(10,2)),['unchanged-consolidation',10,2]);
const l=context.CURRICULUM.lessons[0];
context.state.lessonVideos=[{lesson:11,video_type:'dialogue',title:'Dialogue'},{lesson:11,video_type:'vocabulary',title:'Vocabulary'},{lesson:11,video_type:'grammar',grammar_index:'1a',title:'Grammar 1'}];
const steps=context.lessonGuideSteps(l);
assert.ok(steps[1].support.some(s=>s.id==='b2-l11-guide-video-dialogue'));
assert.ok(steps[3].support.some(s=>s.id==='b2-l11-guide-video-vocabulary'));
const saved={completed:true,notes:'Existing note',mastery:'studying',confidence:3};
context.state.taskState['b2-l11-textbook_vocab']=saved;
assert.equal(context.ts('b2-l11-textbook_vocab'),saved);
assert.equal(context.ts('b2-l11-textbook_vocab_pictures').completed,false,'Do not invent completion for split vocabulary');
for(const step of context.flattenGuideSteps(steps)) context.state.taskState[step.id]={completed:true};
context.state.taskState['b2-l11-vocab']={completed:false,notes:'Workbook note'};
const html=context.lessonGuideMarkup(l);
assert.ok(html.includes('data-guide-scroll="b2-l11-vocab"'),'Continue finds unfinished nested practice');
assert.ok(!html.includes('Lesson path complete.'));
assert.ok(html.includes('Workbook note'));
assert.equal(context.weekPlan(0).days[0].focus,'Goals, conversation and picture vocabulary');
const ancestor={tagName:'DETAILS',open:false,parentElement:null};
const workspace={open:false};
let scrolled=false;
context.document={getElementById:id=>id==='guide-nested'?{parentElement:ancestor,querySelector:()=>workspace,scrollIntoView:()=>{scrolled=true;}}:null};
context.scrollToGuideActivity('nested');
assert.ok(ancestor.open&&workspace.open&&scrolled,'Nested navigation reveals ancestors and workspace');
context.scrollToGuideActivity('missing');
console.log('PASS: Lessons 11–20 ordering, exact page lookup, Plan parity, nested resources, stable records, no duplicate targets, consolidation unchanged.');
