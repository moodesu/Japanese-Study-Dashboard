const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const context = {state:{taskState:{},lessonVideos:[]},console,URL,document:{baseURI:'https://hub.test/',addEventListener(){}}};
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, 'curriculum.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(root, 'audio-map.js'), 'utf8'), context);
context.AUDIO_LIBRARY=context.LESSON_AUDIO;
vm.runInContext(fs.readFileSync(path.join(root, 'ninjal.js'), 'utf8'), context);
// Exercise the real pure planning/rendering functions without booting auth.
for (const name of ['defFor','pageFor','makeTask','lessonTasks','weeklyTasks','ts','taskStudyChecklist','lessonGuideSteps','flattenGuideSteps','guideAudioMarkup','guideMasteryOptions','guideConfidenceOptions','taskGoalFor','guideTaskWorkspaceMarkup','guideStepMarkup','lessonGuideMarkup','scrollToGuideActivity']) {
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
  const shadowing=steps.find(s=>s.id.endsWith('-textbook_conversation_shadowing'));
  assert.equal(steps.indexOf(shadowing),steps.indexOf(grammar)+1,'Shadowing follows grammar and its supporting practice');
  assert.ok(steps[steps.indexOf(shadowing)+1].id.endsWith('-textbook_talk'),'Shadowing prepares for speaking');
  assert.equal(shadowing.audio,'conversation');
  const audioHTML=context.guideAudioMarkup(lesson,shadowing);
  assert.ok(audioHTML.includes('data-guide-audio="conversation"'));
  assert.ok(audioHTML.includes('<audio'));
  assert.ok(audioHTML.includes('value="0.75"'));
  assert.ok(audioHTML.includes('data-audio-command="back"'));
  assert.ok(!audioHTML.includes('Book closed first'),'Second-pass instructions suit shadowing');
  for(const track of context.AUDIO_LIBRARY.lessons[lesson.n].groups.conversation) assert.ok(audioHTML.includes(context.esc(track.title)));
  assert.equal(shadowing.page,`p.${lesson.textbook.pages.conversation}`);
  assert.equal(context.pageFor(lesson,'textbook_conversation_shadowing').page,lesson.textbook.pages.conversation);
  const shadowTask=context.weeklyTasks(lesson.n-11,4).find(t=>t.key==='textbook_conversation_shadowing');
  assert.equal(shadowTask.id,shadowing.id,'Plan day 5 and lesson share one progress record');
  assert.equal(shadowTask.duration,'15–20 min');
  assert.equal(scheduled.filter(t=>t.id===shadowing.id).length,1);
  assert.ok(shadowing.checklist[0].includes(`Lesson ${lesson.n}`));
  assert.ok(shadowing.checklist.some(line=>line.includes('without pausing')));
  assert.ok(shadowing.checklist.some(line=>line.includes('Mark complete')));
  assert.equal(grammar.support.filter(s=>s.id.includes('-guide-grammar-')).length,lesson.textbook.grammar.length);
  assert.ok(steps.find(s=>s.id.endsWith('-textbook_vocab')).support.some(s=>s.id.endsWith('-vocab')));
  const html=context.lessonGuideMarkup(lesson);
  assert.equal(html.split('data-ninjal-label=').length-1,lesson.textbook.grammar.length,'One source panel per grammar point; none on vocabulary or shadowing');
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
context.state.taskState['b2-l11-textbook_conversation']=saved;
assert.equal(context.ts('b2-l11-textbook_conversation_shadowing').completed,false,'First-pass completion does not complete shadowing');
assert.equal(context.ts('b2-l11-textbook_conversation'),saved,'Existing conversation record is untouched');
for(const step of context.flattenGuideSteps(steps)) context.state.taskState[step.id]={completed:true};
delete context.state.taskState['b2-l11-textbook_conversation_shadowing'];
assert.ok(context.lessonGuideMarkup(l).includes('data-guide-scroll="b2-l11-textbook_conversation_shadowing"'),'Previously completed lessons continue at the new shadowing step');
context.state.taskState['b2-l11-textbook_conversation_shadowing']={completed:true,notes:'Shadowed track 1'};
context.state.taskState['b2-l11-vocab']={completed:false,notes:'Workbook note'};
const html=context.lessonGuideMarkup(l);
assert.ok(html.includes('data-guide-scroll="b2-l11-vocab"'),'Continue finds unfinished nested practice');
assert.ok(!html.includes('Lesson path complete.'));
assert.ok(html.includes('Workbook note'));
assert.equal(context.weekPlan(0).days[0].focus,'Goals, conversation and picture vocabulary');
assert.equal(context.weekPlan(0).days[4].focus,'Conversation shadowing and speaking');
const ancestor={tagName:'DETAILS',open:false,parentElement:null};
const workspace={open:false};
let scrolled=false;
context.document={getElementById:id=>id==='guide-nested'?{parentElement:ancestor,querySelector:()=>workspace,scrollIntoView:()=>{scrolled=true;}}:null};
context.scrollToGuideActivity('nested');
assert.ok(ancestor.open&&workspace.open&&scrolled,'Nested navigation reveals ancestors and workspace');
context.scrollToGuideActivity('missing');
console.log('PASS: Lessons 11–20 ordering, exact page lookup, Plan parity, nested resources, stable records, no duplicate targets, consolidation unchanged.');
