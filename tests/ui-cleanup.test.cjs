const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');

const app=fs.readFileSync('app.js','utf8');
const repository=fs.readFileSync('repository.js','utf8');
const curriculum=fs.readFileSync('curriculum.js','utf8');
const css=fs.readFileSync('styles.css','utf8');

assert.match(css,/\.app-header \.navbtn \{[^}]*width:54px;[^}]*min-height:46px;[^}]*flex-direction:column/s,'desktop navigation stacks icons above labels in consistent items');
assert.match(css,/\.app-header \.navbtn svg \{[^}]*width:20px;[^}]*height:20px/,'desktop navigation icons use the agreed compact size');
assert.match(css,/@media\(min-width:761px\) and \(max-width:1080px\)[\s\S]*?\.nav-utility-label \{ display:none; \}/,'secondary labels hide before intermediate desktop widths collide');
assert.match(css,/\.account-state #userLabel \{ display:none; \}/,'the full signed-in email does not crowd the navbar');

assert.match(repository,/<h1>Capture and reuse Japanese<\/h1><p>Sentences, corrections and grammar you actually encounter\.<\/p>/,'Repository uses a compact workspace heading');
assert.match(repository,/class="repo-export-menu"[\s\S]*?<summary class="smallbtn">Export/,'bulk exports are grouped into one compact menu');
assert.equal((repository.match(/id="repoAnkiBulk"/g)||[]).length,1,'Anki export identity remains unique');
assert.equal((repository.match(/id="repoMigakuBulk"/g)||[]).length,1,'TSV export identity remains unique');
assert.match(css,/\.repo-stats \{[^}]*display:flex/s,'Repository stats remain compact inline chips');

const expected=[
  ['TOBIRA Beginning Japanese II','assets/covers/tobira-beginning-ii.jpg'],
  ['TOBIRA Intermediate Japanese I','assets/covers/tobira-intermediate-i.jpg'],
  ['TOBIRA Gateway to Advanced Japanese','assets/covers/tobira-gateway.jpg'],
  ['TOBIRA Grammar Power: Exercises for Mastery','assets/covers/tobira-grammar-power.jpg'],
  ['TOBIRA Power Up Your Kanji','assets/covers/tobira-kanji-power.jpg']
];
for(const [title,cover] of expected){
  assert.ok(curriculum.includes(`title:"${title}"`),`${title} remains in the library`);
  assert.ok(curriculum.includes(`cover:"${cover}"`),`${title} points to its cover`);
  const stat=fs.statSync(path.join(process.cwd(),cover));
  assert.ok(stat.isFile()&&stat.size>1000,`${cover} is a real tracked image asset`);
}
assert.match(app,/cover=b\.cover\?String\(b\.cover\)\.replace\(\/\^\\\/\+\//,'cover renderer uses relative asset paths');
assert.match(app,/img\.onerror=\(\)=>\{img\.remove\(\);\}/,'failed images reveal the designed fallback without a broken-image icon');
assert.match(css,/\.book-card \.book-cover-visual img \{[^}]*object-fit:contain/s,'cover artwork retains its full aspect ratio');

console.log('PASS: stacked desktop navigation, compact Repository actions, and verified local library covers.');
