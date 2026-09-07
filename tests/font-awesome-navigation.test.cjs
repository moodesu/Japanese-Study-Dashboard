const fs=require('node:fs');
const assert=require('node:assert/strict');

const html=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('app.js','utf8');
const furigana=fs.readFileSync('site-furigana.js','utf8');
const css=fs.readFileSync('styles.css','utf8');

const loader='https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.7.2/js/all.min.js';
assert.equal((html.match(/@fortawesome\/fontawesome-free/g)||[]).length,1,'one Font Awesome loader is used');
assert.ok(html.includes(loader),'Font Awesome Free is pinned to a known version');

const desktop={Home:'fa-house',Plan:'fa-calendar-days',Lessons:'fa-book-open',Hub:'fa-layer-group',Repository:'fa-language',Grammar:'fa-spell-check',WaniKani:'fa-paintbrush',Pomodoro:'fa-clock'};
for(const [label,icon] of Object.entries(desktop)){
  assert.ok(app.includes(icon),`${label} uses ${icon}`);
}

for(const [view,icon,label] of [
  ['dashboard','fa-house','Home'],['plan','fa-calendar-days','Plan'],
  ['lesson','fa-book-open','Lessons'],['library','fa-layer-group','Hub']
]){
  assert.ok(app.includes(`['${view}','${icon}','${label}']`),`${label} bottom navigation mapping is stable`);
}

for(const [label,icon] of [
  ['Japanese Repository','fa-language'],['Grammar Library','fa-spell-check'],
  ['WaniKani','fa-paintbrush'],['Pomodoro','fa-clock'],['Furigana','fa-language'],
  ['Theme','fa-moon'],['Account','fa-circle-user']
]){
  const item=new RegExp(`fa-solid ${icon}[^<]*<\\/i><\\/span><strong>${label}`);
  assert.match(html,item,`${label} More item uses ${icon}`);
}

assert.match(app,/state\.user\?'fa-right-from-bracket':'fa-circle-user'/,'mobile account switches between Logout and Account icons');
assert.match(app,/id="grammarNavBtn"[\s\S]*?fa-spell-check/,'desktop Grammar Library uses the agreed icon');
assert.match(app,/grammarNavBtn[\s\S]*?JLHOpenGrammarLibrary/,'desktop Grammar control retains the canonical library behaviour');
assert.match(app,/dataset\.theme==='dark'\?'fa-sun':'fa-moon'/,'mobile Theme icon reflects the available theme action');
assert.match(app,/dark\?'fa-sun':'fa-moon'/,'desktop Theme icon reflects the available theme action');
assert.match(furigana,/fa-solid fa-language/,'global Furigana control keeps the agreed icon after state updates');
assert.doesNotMatch(`${html}\n${app}`,/fa-font/,'WaniKani never falls back to fa-font');
assert.doesNotMatch(html,/>\s*(?:文法|文|漢|振|🍅)\s*</,'navigation does not use Japanese glyphs or emoji as icons');

assert.match(app,/id="searchNavBtn"[^>]*title="Search" aria-label="Search"/,'icon-only Search has a label and tooltip');
assert.match(html,/id="themeToggle"[^>]*title="Switch to dark mode" aria-label="Switch to dark mode"/,'icon-only Theme has a label and tooltip');
assert.match(css,/\.mobile-bottom-nav button svg \{[^}]*width:18px[^}]*height:18px/,'mobile primary icons have consistent dimensions');
assert.match(css,/\.mobile-more-menu button>span svg \{[^}]*width:16px[^}]*height:16px/,'More icons have consistent dimensions');

console.log('PASS: Font Awesome navigation mapping is consistent across desktop, mobile primary navigation, and More.');
