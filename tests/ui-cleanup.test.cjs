const fs=require('node:fs');
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

assert.doesNotMatch(curriculum,/assets\/covers\//,'Library registry does not point at missing cover assets');
assert.match(app,/img\.onerror=\(\)=>\{img\.remove\(\);\}/,'image fallback remains safe if a future cover fails to load');
assert.match(css,/\.book-card \.book-cover-visual img \{[^}]*object-fit:contain/s,'cover artwork retains its full aspect ratio');

console.log('PASS: stacked desktop navigation, compact Repository actions, and verified local library covers.');
