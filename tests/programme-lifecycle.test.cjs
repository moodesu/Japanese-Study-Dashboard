const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const curriculum=fs.readFileSync(path.join(root,'curriculum.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');

assert.match(app,/db\.rpc\('ensure_user_programmes'/);
assert.match(app,/db\.rpc\('transition_user_programme'/);
assert.match(app,/state\.programmeLifecycle\.find\(row=>row\.status==='active'\)/,'All routes share the loaded active programme');
assert.match(app,/Choose your next programme/);
assert.match(app,/Switch without completing/);
assert.match(app,/Complete current & \$\{reopening\?'reopen':'activate'\}/);
assert.match(app,/Completed programmes/);
assert.match(app,/Reopen programme/);
assert.match(app,/if\(!activeProgramme\(\)\)\{programmeEmptyState\('Choose your next programme'/,'Home and Plan stop showing stale work without an active programme');
assert.match(app,/data-view-programme/,'Completed programme history stays browsable');
assert.match(html,/id="programmeDialog"/);

assert.match(curriculum,/id:"tobira-beginning-ii-12w"[\s\S]*?activationReady:true/);
assert.match(curriculum,/id:"tobira-intermediate-future"[\s\S]*?activationReady:true[\s\S]*?curriculumKey:"INTERMEDIATE_CURRICULUM"/);
assert.match(curriculum,/id:"tobira-gateway-future"[\s\S]*?activationReady:false/);

console.log('PASS: programme lifecycle runtime contract, active-programme routing, switching/completion controls and programme readiness.');
