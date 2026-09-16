const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const repo=fs.readFileSync(path.join(root,'repository.js'),'utf8');
const search=fs.readFileSync(path.join(root,'repository-search-input.js'),'utf8');
const schema=fs.readFileSync(path.join(root,'supabase-schema.sql'),'utf8');

for(const rpc of [
  'import_repository_with_canonical_grammar',
  'upsert_canonical_grammar_guide',
  'upsert_canonical_grammar_guides',
  'append_canonical_grammar_clarification'
]){
  assert.match(repo,new RegExp(rpc),`Repository runtime expects ${rpc}`);
}

assert.doesNotMatch(repo,/ensure_canonical_grammar/,'Runtime no longer creates canonical placeholders');
assert.doesNotMatch(repo,/repositoryPendingGuidePrompt/,'Retired Pending Guides prompt is gone');
assert.doesNotMatch(repo,/pendingGuideIds/,'Retired pending selection state is gone');
assert.doesNotMatch(search,/Pending Guides runtime UI/,'Transitional Pending Guides wrapper is gone');

assert.match(
  schema,
  /foundational bootstrap|Foundational bootstrap/i,
  'Root SQL file is explicitly documented as a bootstrap rather than the live schema snapshot'
);

console.log('PASS: current canonical-grammar client contract and clean baseline; live Supabase is the schema source of truth.');
