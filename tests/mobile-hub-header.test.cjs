const fs=require('node:fs');
const assert=require('node:assert/strict');

const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('styles.css','utf8');

assert.match(app,/class="hub-current"[\s\S]*?activeBook\(\)\.title[\s\S]*?hub-programme-meta[\s\S]*?weeks[\s\S]*?book-status active">Active/,'active programme is presented as title, metadata, and a compact status');
assert.doesNotMatch(app,/class="book-status active">\$\{esc\(activeBook\(\)\.title\)\}/,'the full book name is no longer placed inside a status pill');
assert.match(css,/@media\(max-width:760px\)[\s\S]*?\.library-hero\.app-page-header \.hub-current \{[^}]*width:100%[^}]*border-radius:0[^}]*background:transparent/s,'mobile active-programme context becomes a natural full-width row');
assert.match(css,/\.library-hero\.app-page-header \.hub-current h2 \{[^}]*font-size:15px[^}]*word-break:keep-all/s,'the mobile programme name stays readable without character-level breaking');
assert.match(css,/\.library-hero\.app-page-header \.hub-current>\.book-status \{[^}]*white-space:nowrap/s,'only the compact Active status remains a pill');

assert.match(html,/id="mobileMoreToggle"[^>]*aria-expanded="false"[^>]*aria-controls="mobileMoreMenu"/,'More retains its accessible relationship and behaviour hooks');
assert.match(css,/\.mobile-more-toggle \{[\s\S]*?min-height:34px;[\s\S]*?padding:6px 9px;[\s\S]*?font-size:11px;/,'More is visually lighter without losing its tap target');
assert.match(css,/\.mobile-more-toggle svg \{ width:13px;height:13px; \}/,'More icon is proportionate to the compact control');

console.log('PASS: mobile Hub programme context and More control are compact without changing behaviour.');
