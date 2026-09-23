const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const repo=fs.readFileSync(path.join(root,'repository.js'),'utf8');
const instructions=fs.readFileSync(path.join(root,'deliverables/Learning-Hub-Project-Instructions.md'),'utf8');
const example=fs.readFileSync(path.join(root,'examples/repository-grammar-import.json'),'utf8');

assert.doesNotMatch(repo,/source_type|source_detail/,'Sentence source fields are retired from Repository runtime');
assert.doesNotMatch(repo,/Source type|Source detail/,'Sentence editor does not render source controls');
assert.match(repo,/source:''/,'Anki source field is intentionally blank');
assert.match(repo,/raw\.source/,'Grammar reference examples may still keep source attribution');
assert.doesNotMatch(instructions,/`source_type`|`source_detail`/,'Sentence JSON instructions omit retired source fields');
assert.doesNotMatch(example,/"source_type"|"source_detail"/,'Sentence example omits retired source fields');

console.log('PASS: sentence source fields retired while grammar reference-example sources remain supported.');
