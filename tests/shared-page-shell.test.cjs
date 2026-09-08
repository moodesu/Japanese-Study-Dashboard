const fs=require('node:fs');
const assert=require('node:assert/strict');

const html=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('app.js','utf8');
const repository=fs.readFileSync('repository.js','utf8');
const css=fs.readFileSync('styles.css','utf8');

assert.match(css,/Authoritative application page system/,'the canonical shell is documented beside its implementation');
for(const primitive of ['.app-page {','.app-page-header {','.app-page-toolbar,','.app-page-breadcrumb {','.app-compact-stats {','.app-content-card,']){
  assert.ok(css.includes(primitive),`${primitive} is available as a shared primitive`);
}

assert.match(html,/id="hero" class="hero app-page-header"/,'Plan uses the shared page header');
assert.match(html,/id="mainContent" class="app-page"/,'dynamic primary routes use the shared page container');
assert.match(app,/today-hero app-page-header/,'Home uses the shared page header');
assert.match(app,/lessonhero app-page-header/,'lesson detail uses the shared page header');
assert.match(app,/library-hero app-page-heading app-page-header/,'Hub uses the shared page header');
assert.match(app,/library-hero book-detail-hero app-page-header/,'book detail uses the shared page header');
assert.ok((app.match(/wk-page-head app-page-header/g)||[]).length>=4,'every WaniKani state uses the shared page header');
assert.match(repository,/repo-page-head app-page-header/,'Grammar Library uses the shared page header');
assert.match(repository,/repo-page-head app-page-heading app-page-header/,'Repository uses the shared page header');
assert.match(repository,/repo-grammar-header app-page-header/,'Grammar Guide uses the shared page header');

assert.match(app,/today-card app-next-action/,'Home Start here is the compact next-action variant');
assert.match(css,/\.today-card\.app-next-action \{ padding:14px 16px; \}/,'next action uses compact spacing');
assert.match(repository,/app-page-breadcrumb[^>]*id="repoGrammarLibraryBack"/,'Grammar navigation is integrated into its header');
assert.match(repository,/repo-grammar-filters app-compact-stats/,'Grammar counts use the shared compact-stat primitive');
assert.match(repository,/repo-head-actions app-page-toolbar/,'Repository actions use the shared toolbar primitive');
assert.match(app,/wk-page-actions app-page-toolbar/,'WaniKani actions use the shared toolbar primitive');

assert.match(css,/html\[data-theme="dark"\] \.app-page-header/,'the shared header defines dark mode centrally');
assert.match(css,/@media\(max-width:760px\)[\s\S]*?\.app-page-header[\s\S]*?grid-template-columns:minmax\(0,1fr\)/,'the shared header becomes a compact mobile column');

console.log('PASS: one authoritative page shell is shared by all primary Learning Hub routes.');
