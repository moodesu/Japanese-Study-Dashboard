const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const context={console};context.window=context;vm.createContext(context);
for(const file of ['curriculum.js','book-maps.js','intermediate-curriculum.js','textbook-pdf.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);

const programme=context.PROGRAMMES.find(item=>item.id==='tobira-intermediate-future');
assert.equal(programme.status,'planned');assert.equal(programme.activationReady,true);
assert.equal(programme.curriculumKey,'INTERMEDIATE_CURRICULUM');assert.equal(programme.scheduleKey,'INTERMEDIATE_WEEK_PLANS');assert.equal(programme.weeks,12);
const curriculum=context.INTERMEDIATE_CURRICULUM;
assert.equal(curriculum.lessons.length,8);
assert.deepEqual(Array.from(curriculum.lessons,item=>[item.textbook.start,item.textbook.end]),[[23,44],[45,66],[67,86],[89,108],[109,132],[133,154],[157,180],[181,206]]);
assert.deepEqual(Array.from(curriculum.lessons,item=>item.textbook.grammar.length),[15,16,16,16,16,15,14,16]);
assert.deepEqual(Array.from(curriculum.projects,item=>item.page),['87–88','155–156','207–208']);
assert.deepEqual({...curriculum.lessonWeek},{1:0,2:1,3:2,4:4,5:5,6:6,7:8,8:9});
assert.ok(curriculum.lessons.every(lesson=>lesson.sections[0].key==='orientation'&&lesson.sections.some(section=>section.key==='dialogue_shadow')));
assert.deepEqual(Array.from(curriculum.lessons.filter(lesson=>lesson.sections.some(section=>section.key==='unit_project')),lesson=>lesson.n),[3,6,8]);
const expectedTracks=[13,13,14,15,14,13,16,13];
assert.deepEqual(Object.values(context.INTERMEDIATE_AUDIO.lessons).map(lesson=>lesson.tracks.length),expectedTracks);
assert.equal(Object.values(context.INTERMEDIATE_AUDIO.lessons).reduce((total,lesson)=>total+lesson.tracks.length,0),111);
for(const [lesson,data] of Object.entries(context.INTERMEDIATE_AUDIO.lessons))for(const track of data.tracks){assert.match(track.url,new RegExp(`/0${lesson}-\\d{2}\\.mp3$`));assert.notEqual(track.category,'vocabulary');}
assert.equal(curriculum.lessons.filter(lesson=>lesson.resources.video&&lesson.resources.videoWorksheet).length,8);
assert.ok(!curriculum.lessons[2].resources.worksheet&&!curriculum.lessons[3].resources.worksheet&&!curriculum.lessons[4].resources.worksheet);
assert.equal(curriculum.lessons[0].resources.links.length,7);assert.equal(curriculum.lessons[3].resources.links.length,8);
const pdfs=context.TEXTBOOK_PDFS.books['tobira-intermediate-future'].lessons;
assert.equal(pdfs[1].path,'lesson-01.pdf');assert.equal(23-pdfs[1].startPage+1,1);assert.equal(44-pdfs[1].startPage+1,22);
assert.equal(pdfs[8].path,'lesson-08.pdf');assert.equal(206-pdfs[8].startPage+1,26);assert.equal(pdfs['unit-3'].path,'unit-03-project.pdf');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),sql=fs.readFileSync(path.join(root,'migrations/20260908_programme_lifecycle.sql'),'utf8');
assert.ok(html.indexOf('intermediate-curriculum.js')<html.indexOf('app.js'));
assert.match(app,/programme\?\.id==='tobira-intermediate-future'/);assert.match(app,/function intermediateLessonGuideSteps/);assert.match(app,/JLHOpenGrammarLibraryFor/);assert.match(app,/Reopen programme/);
assert.doesNotMatch(sql,/Completed programmes cannot be reactivated here/);

context.state={taskState:{},lessonVideos:[],lessonMedia:{},sessions:[]};
context.AUDIO_LIBRARY=context.LESSON_AUDIO;
vm.runInContext(`
  function programmeCurriculum(item){return item&&item.curriculumKey?window[item.curriculumKey]:null}
  function activeProgramme(){return PROGRAMMES.find(item=>item.id==='tobira-intermediate-future')}
  function lessonForWeek(w,item=activeProgramme()){const c=programmeCurriculum(item);return c.lessons.find(lesson=>c.lessonWeek[lesson.n]===w)||null}
  function currentAudioLibrary(){return INTERMEDIATE_AUDIO}
  function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
`,context);
for(const name of ['defFor','pageFor','makeTask','lessonTasks','intermediateWeeklyTasks','weeklyTasks','ts','taskStudyChecklist','guideAudioMarkup','intermediateLessonGuideSteps','lessonGuideSteps','flattenGuideSteps']){
  const start=app.indexOf(`function ${name}(`),end=app.indexOf('\nfunction ',start+1);assert.ok(start>=0,`Missing ${name}`);vm.runInContext(app.slice(start,end<0?undefined:end),context);
}
for(const lesson of curriculum.lessons){
  const builtTasks=context.lessonTasks(lesson),missing=lesson.sections.filter(section=>!builtTasks.some(task=>task.key===section.taskKey)).map(section=>section.taskKey);assert.deepEqual(Array.from(missing),[],`Every Lesson ${lesson.n} section has a task`);
  const steps=context.intermediateLessonGuideSteps(lesson),flat=context.flattenGuideSteps(steps);
  assert.equal(new Set(flat.map(step=>step.id)).size,flat.length);
  assert.deepEqual(Array.from(steps.slice(0,6),step=>step.id),['orientation','before','reading1','reading1_activity','reading2','reading2_activity'].map(key=>`ti-l${lesson.n}-${key}`));
  assert.ok(steps.find(step=>step.id.endsWith('-dialogue_shadow'))?.audio==='dialogue');
  assert.ok(steps.find(step=>step.id.endsWith('-before'))?.vocabularyAudio==='vocabulary_before');
  const grammarStep=steps.find(step=>step.id.endsWith('-grammar'));assert.equal(grammarStep.support.length,lesson.textbook.grammar.length);
  const scheduled=[0,1,2,4,5,6,8,9].includes(curriculum.lessonWeek[lesson.n])?Array.from({length:7},(_,day)=>context.weeklyTasks(curriculum.lessonWeek[lesson.n],day,programme)).flat():[];
  assert.deepEqual(Array.from(scheduled,task=>task.id),Array.from(steps.filter(step=>!step.id.startsWith('ti-project-')),step=>step.id));
}
assert.equal(context.weeklyTasks(3,0,programme)[0].id,'ti-project-1');
assert.equal(context.weeklyTasks(7,0,programme)[0].id,'ti-project-2');
assert.equal(context.weeklyTasks(10,0,programme)[0].id,'ti-project-3');
console.log('PASS: Intermediate I authoritative map, programme readiness, 111 tracks, resources, PDFs and lifecycle integration.');
