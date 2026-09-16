const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const repo=fs.readFileSync(path.join(root,'repository.js'),'utf8');

assert.match(repo,/import_repository_with_canonical_grammar/,'Sentence import uses the strict canonical RPC');
assert.match(repo,/upsert_canonical_grammar_guide/,'Single canonical guide import remains available');
assert.match(repo,/upsert_canonical_grammar_guides/,'Atomic guide batch import remains available');
assert.match(repo,/append_canonical_grammar_clarification/,'Clarification import remains isolated');

assert.match(
  repo,
  /operation:!existing\?'new':'update'/,
  'Guide previews distinguish new guides from updates without a Pending Guides workflow'
);
assert.match(
  repo,
  /new guides · \$\{counts\('update'\)\} existing guides will be updated/,
  'Batch preview describes the current new/update model'
);
assert.match(
  repo,
  /Batch import incomplete: \$\{completed\} of \$\{pending\.payload\.length\} guides completed\. Incomplete:/,
  'Post-load verification reports incomplete guides without reviving the retired pending queue'
);

assert.doesNotMatch(repo,/pending guides will be completed/i);
assert.doesNotMatch(repo,/Completes pending guide/i);
assert.doesNotMatch(repo,/minimal placeholders/i);
assert.doesNotMatch(repo,/Still pending:/i);

assert.match(
  repo,
  /require live canonical resolution before import/,
  'Missing sentence canonicals are surfaced for resolution rather than fabricated'
);

console.log('PASS: strict canonical import preview, RPC isolation, atomic batch verification, and no retired Pending Guides semantics.');
