const fs=require('node:fs');
const assert=require('node:assert/strict');

const html=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('app.js','utf8');
const repository=fs.readFileSync('repository.js','utf8');
const dictionary=fs.readFileSync('dictionary.js','utf8');
const ninjal=fs.readFileSync('ninjal.js','utf8');
const css=fs.readFileSync('styles.css','utf8');

for(const icon of ['文','文法','漢','振']){
  assert.match(html,new RegExp(`class="no-auto-furigana" aria-hidden="true">${icon}`),`${icon} mobile utility icon is excluded from automatic furigana`);
}
assert.match(app,/repo-nav-btn no-auto-furigana/,'desktop Repository icon is excluded from automatic furigana');
assert.match(app,/wk-nav-btn no-auto-furigana/,'desktop WaniKani icon is excluded from automatic furigana');
assert.match(app,/mobileNav\.innerHTML=[\s\S]*?class="no-auto-furigana"/,'generated bottom-nav icons are excluded from automatic furigana');
assert.match(css,/\.no-auto-furigana ruby,\.no-auto-furigana rt \{ display:none!important; \}/,'navigation icon ruby has a defensive presentation rule');

const header=repository.indexOf('class="repo-grammar-header"');
const context=repository.indexOf('class="panel repo-sentence-context"');
const body=repository.indexOf('${body}',context);
const further=repository.indexOf('${furtherStudy}',body);
assert.ok(header>=0&&context>header&&body>context&&further>body,'grammar page orders heading, optional sentence context, guide body, then further study');
assert.match(repository,/repo-grammar-meaning/,'meaning appears directly in the grammar header');
assert.match(repository,/class="repo-guide-article"/,'core explanation sections share one article surface');
assert.match(repository,/class="repo-guide-section"><h2>Overview/,'Overview is the first canonical guide section');
assert.match(repository,/References &amp; further study/,'external integrations share a final supplementary section');
assert.doesNotMatch(repository,/\$\{window\.JLHDictionary\?\.referenceMarkup\(\)\|\|''\}\s*\$\{window\.JLHNinjal\?\.panelMarkup\(label\)\|\|''\}\s*\$\{body\}/,'external references no longer precede the guide body');

assert.match(dictionary,/class="grammar-source-row"/,'Dictionary integration uses a compact reference row');
assert.match(dictionary,/id="repoDictionaryOpen"/,'Dictionary action identity is preserved');
assert.match(ninjal,/ninjal-panel grammar-source-row/,'NINJAL integration uses the same compact reference treatment');
assert.match(ninjal,/data-ninjal-label/,'NINJAL loading identity is preserved');
assert.match(css,/\.repo-guide-section \{[^}]*border-bottom:1px solid var\(--line\)/,'core article sections use dividers instead of cards');

console.log('PASS: furigana-free navigation icons and streamlined Grammar Guide hierarchy with secondary references.');
