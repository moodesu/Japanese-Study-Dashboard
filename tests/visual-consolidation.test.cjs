const assert=require('node:assert/strict');
const fs=require('node:fs');

const read=file=>fs.readFileSync(file,'utf8');
const css=read('styles.css');
const html=read('index.html');
const app=read('app.js');
const repository=read('repository.js');
const dictionary=read('dictionary.js');
const ninjal=read('ninjal.js');

const stylesheets=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(match=>match[1]);
assert.deepEqual(stylesheets,['styles.css','ninjal.css'],'Production loads one core UI stylesheet plus the source-scoped NINJAL stylesheet');
assert.doesNotMatch(html,/hub-polish\.css|site-shell\.css|site-furigana\.css/);
assert.equal((css.match(/^:root\{/gm)||[]).length,1,'Design tokens have one authoritative root declaration');
for(const token of ['--app-max:1216px','--readable-max:940px','--page-gutter:20px','--card-padding:16px','--card-padding-compact:12px','--radius-page:14px','--radius-card:12px','--control-height:38px','--control-touch-height:44px'])assert.ok(css.includes(token),`Missing shared token ${token}`);
assert.match(css,/\.app-page \{[\s\S]*?max-width:var\(--app-max\)/);
assert.match(css,/\.repo-grammar-page \{ max-width:var\(--app-max\)/);
assert.match(css,/\.repo-grammar-content\{[^}]*max-width:var\(--readable-max\)/,'Grammar keeps a readable column inside the shared shell');
assert.match(css,/\.app-content-card,\.panel,[^{]+\{[^}]*padding:var\(--card-padding\)/,'Normal cards share authoritative padding');
assert.match(css,/\.repo-variant\{[^}]*background:var\(--surface-alt\)[^}]*padding:var\(--card-padding-compact\)/,'Grammar variants use the compact-card system');
assert.match(css,/\.resource-row \{/);
assert.match(css,/\.resource-action-secondary \{/);
assert.match(dictionary,/class="resource-action resource-action-secondary" id="repoDictionaryOpen"/);
assert.match(ninjal,/class="resource-action resource-action-secondary">Open ↗/);
assert.match(repository,/class="resource-action resource-action-secondary" href=/);
assert.match(repository,/repo-detail-hero app-page-header/,'Repository entry detail uses the shared page header');
assert.match(app,/function renderLibrary\(\)\{\s*\$\('#hero'\)\.hidden=true; \$\('#bottomArea'\)\.hidden=true/);
assert.match(repository,/function renderRepository\(\)\{\s*\$\('#hero'\)\.hidden=true; \$\('#bottomArea'\)\.hidden=true/);
assert.ok(fs.existsSync('ninjal.css'),'NINJAL source rendering remains deliberately scoped');
assert.ok(!fs.existsSync('site-furigana.css'),'Core furigana geometry is consolidated into styles.css');

console.log('PASS: one core visual system, shared shell/cards/actions, readable Grammar layout and scoped NINJAL source styling.');
