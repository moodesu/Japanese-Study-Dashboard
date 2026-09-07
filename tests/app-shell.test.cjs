const fs=require('node:fs');
const assert=require('node:assert/strict');

const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('styles.css','utf8');
const app=fs.readFileSync('app.js','utf8');

const header=html.match(/<header class="topbar app-header">([\s\S]*?)<\/header>/)?.[1]||'';
assert.match(header,/class="app-identity"/,'compact header keeps a small app identity');
assert.match(header,/id="mainNav"/,'primary navigation is inside the application header');
assert.match(header,/id="siteFuriganaToggle"/,'furigana control remains in the unified header');
assert.match(header,/id="themeToggle"/,'theme control remains in the unified header');
assert.match(header,/id="openLogin"/,'login action remains wired');
assert.match(header,/id="logout"/,'logout action remains wired');
assert.doesNotMatch(header,/TOBIRA Foundation|class="title"/,'the global course hero is removed from the app shell');

for(const id of ['mainNav','syncStatus','userLabel','siteFuriganaToggle','themeToggle','openLogin','logout']){
  assert.equal((html.match(new RegExp(`id="${id}"`,'g'))||[]).length,1,`${id} remains unique`);
}

assert.match(css,/\.app-header\s*\{[^}]*position:sticky/s,'application navigation remains available during study');
assert.match(css,/\.app-header\s*\{[^}]*grid-template-columns:auto minmax\(0,1fr\) auto/s,'desktop shell uses one cohesive row');
assert.match(css,/@media\(max-width:600px\)[\s\S]*?\.app-header/s,'compact mobile shell is defined');
assert.match(css,/\.lessonhero\s*\{[^}]*grid-template-columns:minmax\(0,1fr\) minmax\(220px,270px\)/s,'lesson identity and progress use a compact desktop layout');
assert.match(css,/\.lessonhero-grid div\s*\{[^}]*border:0/s,'lesson metrics are no longer large cards');
assert.match(css,/\.guide-progress\s*\{[^}]*border:0/s,'guided lesson count is lightweight metadata');

assert.match(app,/class="lessonhero-copy"/,'lesson header has a dedicated identity region');
assert.match(app,/class="lessonhero-progress"/,'lesson progress is grouped compactly');
assert.match(app,/Work in textbook order/,'guided lesson description is concise');

console.log('PASS: compact unified app shell, condensed lesson summary, guided-path density, and preserved utility controls.');
