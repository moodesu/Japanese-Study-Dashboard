const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const styles=fs.readFileSync(path.join(root,'styles.css'),'utf8');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');

for(const token of ['--accent-hover','--surface-alt','--success','--pomo-accent','--radius-card','--radius-control','--control-height','--space-4']){
  assert.ok(styles.includes(token),`Missing visual token ${token}`);
}
assert.match(styles,/\.resource-action \{[\s\S]*?background:var\(--accent\);[\s\S]*?color:#fff/,'Primary resources use the teal action hierarchy');
assert.match(styles,/\.secondary-action[\s\S]*?background:var\(--surface-alt\)/,'Secondary actions retain a quiet surface treatment');
assert.match(styles,/\.guide-pomodoro-button \{[^}]*var\(--pomo-accent\)/,'Pomodoro retains its warmer dedicated accent');
assert.match(styles,/\.book-section \{[\s\S]*?border-color:transparent;[\s\S]*?background:var\(--surface-alt\)/,'Content-map rows use a flatter tinted hierarchy');
assert.match(styles,/\.book-section-status \{[\s\S]*?border:0;[\s\S]*?background:transparent/,'Completion status is metadata rather than a competing button');
assert.match(styles,/html\[data-theme="dark"\] \{[\s\S]*?--accent:#55b9c4;[\s\S]*?--success:#70bd98/,'Dark mode has deliberate teal and success tokens');
assert.match(styles,/@media\(max-width:760px\) \{[\s\S]*?\.book-section-actions \{ width:100%;justify-content:space-between/,'Mobile resource rows use the available width');
assert.match(app,/class="resource-action textbook-pages-button"[\s\S]*?class="resource-action-icon" aria-hidden="true">▤<\/span>Open textbook/,'Guided textbook actions use the shared component without repeating the page range');
assert.match(app,/class="resource-action textbook-pages-button"[\s\S]*?View pp\.\$\{esc\(sec\.pages\|\|'—'\)\}/,'Reference actions show their exact printed page range');

console.log('PASS: Learning Hub tokens, action hierarchy, flatter study cards, dark mode and mobile resource layout.');
