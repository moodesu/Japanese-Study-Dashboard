const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const context={console};context.window=context;vm.createContext(context);
for(const file of ['curriculum.js','book-maps.js','intermediate-curriculum.js','textbook-pdf.js']){
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
}

const programme=context.PROGRAMMES.find(item=>item.id==='tobira-intermediate-future');
assert.equal(programme.status,'planned');
assert.equal(programme.activationReady,true);
assert.equal(programme.curriculumKey,'INTERMEDIATE_CURRICULUM');
assert.equal(programme.scheduleKey,'INTERMEDIATE_WEEK_PLANS');
assert.equal(programme.weeks,12);

const curriculum=context.INTERMEDIATE_CURRICULUM;
assert.equal(curriculum.lessons.length,8);
assert.deepEqual(Array.from(curriculum.lessons,item=>[item.textbook.start,item.textbook.end]),[
  [23,44],[45,66],[67,86],[89,108],[109,132],[133,154],[157,180],[181,206]
]);
assert.deepEqual(Array.from(curriculum.lessons,item=>item.textbook.grammar.length),[15,16,16,16,16,15,14,16]);
assert.deepEqual(Array.from(curriculum.projects,item=>item.page),['87–88','155–156','207–208']);
assert.deepEqual({...curriculum.lessonWeek},{1:0,2:1,3:2,4:4,5:5,6:6,7:8,8:9});
assert.ok(curriculum.lessons.every(lesson=>lesson.sections[0].key==='orientation'&&lesson.sections.some(section=>section.key==='dialogue_shadow')));
assert.deepEqual(Array.from(curriculum.lessons.filter(lesson=>lesson.sections.some(section=>section.key==='unit_project')),lesson=>lesson.n),[3,6,8]);

const expectedTracks=[13,13,14,15,14,13,16,13];
assert.deepEqual(Object.values(context.INTERMEDIATE_AUDIO.lessons).map(lesson=>lesson.tracks.length),expectedTracks);
assert.equal(Object.values(context.INTERMEDIATE_AUDIO.lessons).reduce((total,lesson)=>total+lesson.tracks.length,0),111);

const pdfs=context.TEXTBOOK_PDFS.books['tobira-intermediate-future'].lessons;
assert.equal(pdfs[1].path,'lesson-01.pdf');
assert.equal(23-pdfs[1].startPage+1,1);
assert.equal(44-pdfs[1].startPage+1,22);
assert.equal(pdfs[8].path,'lesson-08.pdf');
assert.equal(206-pdfs[8].startPage+1,26);
assert.equal(pdfs['unit-3'].path,'unit-03-project.pdf');

const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.ok(html.indexOf('intermediate-curriculum.js')<html.indexOf('app.js'));
assert.match(app,/programme\?\.id==='tobira-intermediate-future'/);
assert.match(app,/function intermediateLessonGuideSteps/);
assert.match(app,/JLHOpenGrammarLibraryFor/);
assert.match(app,/Reopen programme/);

console.log('PASS: Intermediate I authoritative map, programme readiness, 111 tracks, resources, PDFs and lifecycle integration.');
