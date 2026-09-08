const fs=require('node:fs');
const assert=require('node:assert/strict');

const html=fs.readFileSync('index.html','utf8');
const app=fs.readFileSync('app.js','utf8');
const repository=fs.readFileSync('repository.js','utf8');
const css=fs.readFileSync('styles.css','utf8');

assert.match(css,/#openLogin\[hidden\],#logout\[hidden\][^{]*\{[^}]*display:none!important/,'auth actions honour their hidden state');
assert.match(app,/mobileAccountLabel\.textContent=state\.user\?'Logout':'Account'/,'mobile account action reflects authentication');

assert.match(app,/!status\.completed&&\(hasOpenMedia\|\|hasOpenVideo\)/,'completed media cannot automatically reopen a task');
assert.match(app,/state\.manualGuideTaskId/,'manual task inspection is retained during the current session');
assert.match(app,/state\.manualGuideTaskId=null;\s*toggle\(taskId\)/,'completion releases manual state before advancing');

assert.match(app,/>Open textbook<\/button>/,'guided task page action does not repeat its page range');
assert.match(app,/>View pp\.\$\{esc\(sec\.pages\|\|'—'\)\}<\/button>/,'content map keeps the page range in its action');
assert.doesNotMatch(app,/book-section-label[^`]+<strong>pp\.\$\{esc\(sec\.pages/,'content map does not duplicate its page badge');

assert.match(app,/Book library · Hub/,'Hub uses the shared internal-workspace heading');
assert.doesNotMatch(app,/One place for every Japanese book you study/,'marketing-style Hub hero copy is removed');
assert.match(app,/cover=b\.cover\?String\(b\.cover\)\.replace\(\/\^\\\/\+\//,'cover paths preserve the known-good relative asset convention');
assert.match(app,/class="book-cover-fallback"/,'book cards provide a designed missing-cover state');
assert.match(app,/img\.onerror=\(\)=>\{img\.remove\(\);\}/,'broken images reveal the designed fallback');

assert.match(repository,/repo-page-head app-page-heading/,'Repository uses the shared page heading');
assert.match(repository,/<h1>Japanese Repository<\/h1>/,'Repository heading is compact and task focused');
assert.match(css,/\.repo-stats\s*\{[^}]*display:flex/s,'Repository counts use compact inline statistics');

assert.match(html,/id="mobileBottomNav"/,'mobile primary navigation has a dedicated bottom bar');
assert.match(html,/id="mobileMoreMenu"/,'secondary mobile destinations use a More menu');
assert.match(css,/\.mobile-bottom-nav\s*\{[^}]*position:fixed[^}]*env\(safe-area-inset-bottom\)/s,'bottom navigation is fixed and safe-area aware');
assert.match(css,/@media\(max-width:760px\)[\s\S]*?\.app-header \.mainnav,\.app-header \.account \{ display:none;/,'desktop controls are removed from the mobile top bar');
assert.match(css,/body \{ padding-bottom:calc\(66px \+ env\(safe-area-inset-bottom\)\)/,'mobile content clears the fixed navigation');

console.log('PASS: auth visibility, next-task expansion, page deduplication, shared Hub/Repository styling, cover fallbacks, and mobile navigation.');
