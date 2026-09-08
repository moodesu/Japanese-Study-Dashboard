const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const curriculum = fs.readFileSync(path.join(root, 'curriculum.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sql = fs.readFileSync(path.join(root, 'migrations/20260908_programme_lifecycle.sql'), 'utf8');

assert.match(sql, /status in \('planned', 'active', 'completed'\)/);
assert.match(sql, /unique index[^;]+where status = 'active'/s, 'Database permits at most one active programme per user');
assert.match(sql, /pg_advisory_xact_lock/, 'Transitions serialize per user');
assert.match(sql, /p_action = 'complete_and_activate'/);
assert.match(sql, /p_action in \('switch', 'complete_and_activate'\)/);
assert.match(sql, /set status = 'completed', completed_at = now\(\)/);
assert.doesNotMatch(sql, /delete from public\.(task_state|pomodoro_sessions|app_notes)/i, 'Lifecycle migration never deletes study history');

assert.match(app, /db\.rpc\('ensure_user_programmes'/);
assert.match(app, /db\.rpc\('transition_user_programme'/);
assert.match(app, /state\.programmeLifecycle\.find\(row=>row\.status==='active'\)/, 'All routes share the loaded active programme');
assert.match(app, /Choose your next programme/);
assert.match(app, /Switch without completing/);
assert.match(app, /Complete current & activate/);
assert.match(app, /Completed programmes/);
assert.match(app, /if\(!activeProgramme\(\)\)\{programmeEmptyState\('Choose your next programme'/, 'Home and Plan stop showing stale work without an active programme');
assert.match(app, /data-view-programme/, 'Completed programme history stays browsable');
assert.match(html, /id="programmeDialog"/);

assert.match(curriculum, /id:"tobira-beginning-ii-12w"[\s\S]*?activationReady:true/);
assert.match(curriculum, /id:"tobira-intermediate-future"[\s\S]*?activationReady:false/);
assert.match(curriculum, /id:"tobira-gateway-future"[\s\S]*?activationReady:false/);

console.log('Programme lifecycle regression checks passed.');
