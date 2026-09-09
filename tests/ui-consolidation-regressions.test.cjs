const assert=require('node:assert/strict');
const fs=require('node:fs');

const read=file=>fs.readFileSync(file,'utf8');
const app=read('app.js');
const css=read('styles.css');
const html=read('index.html');
const repository=read('repository.js');
const dictionary=read('dictionary.js');
const ninjal=read('ninjal.js');

const hubRenderer=app.slice(app.indexOf('function hubSectionMarkup'),app.indexOf('function bindHubSectionToggles'));
const chevron=hubRenderer.indexOf('fa-chevron-down hub-section-chevron');
const icon=hubRenderer.indexOf('class="hub-section-icon"');
const heading=hubRenderer.indexOf('class="hub-section-heading"');
assert.ok(chevron>=0&&icon>chevron&&heading>icon,'Hub renderer orders the small chevron, section icon, then heading');
assert.match(css,/\.hub-section-chevron \{[^}]*flex:0 0 11px;[^}]*width:11px;[^}]*height:11px;/,'desktop Hub chevron is deliberately small');
assert.match(css,/\.hub-section-toggle \{[^}]*justify-content:flex-start;/,'Hub section controls do not push the chevron to the far edge');

assert.match(repository,/'repo-match-badge matched'/,'matched variants emit a non-interactive Matched badge');
assert.match(repository,/'repo-match-badge related'/,'related sources emit a distinct Related badge');
assert.match(repository,/class="repo-match-detail"/,'matched grammar context emits a structured footer');
assert.match(repository,/repo-variant compact-card/,'variant rows use Compact Card geometry');
assert.match(repository,/repo-grammar-example compact-card/,'reference examples use Compact Card geometry');
assert.match(repository,/repo-link compact-card/,'book occurrences use Compact Card geometry');

for(const [name,source] of [['Dictionary',dictionary],['NINJAL',ninjal],['External guide',repository]]){
  assert.match(source,/resource-row/,`${name} emits the shared Resource Row`);
  assert.match(source,/resource-action resource-action-secondary/,`${name} emits the shared secondary Resource Action`);
}
assert.match(css,/\.resource-action \{[^}]*height:36px;[^}]*min-height:36px;[^}]*padding:0 12px;/,'desktop Resource Actions share one 36px geometry');

assert.match(app,/const grammarActive=state\.view==='repository'&&\['grammar-library','grammar'\]\.includes\(repositoryState\.mode\)/,'Grammar nav state is derived from the repository sub-route');
assert.match(app,/repo-nav-btn \$\{repositoryActive\?'active':''\}/,'Repository is not active on Grammar routes');
assert.match(app,/grammar-nav-btn \$\{grammarActive\?'active':''\}/,'Grammar routes activate Grammar directly');

assert.doesNotMatch(html,/hub-polish\.(?:css|js)|site-shell\.css/,'retired polish/shell layers are not loaded');

console.log('PASS: accepted Hub, Grammar card, Compact Card, Resource Row and route-nav behavior lives in authoritative renderers and styles.css.');
