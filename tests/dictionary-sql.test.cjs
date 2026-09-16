const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const dictionary=fs.readFileSync(path.join(root,'dictionary.js'),'utf8');
const repo=fs.readFileSync(path.join(root,'repository.js'),'utf8');
const schema=fs.readFileSync(path.join(root,'supabase-schema.sql'),'utf8');

for(const table of [
  'japanese_dictionary_entries',
  'japanese_dictionary_links',
  'japanese_dictionary_readings'
]){
  assert.match(dictionary,new RegExp(table),`Dictionary runtime still uses ${table}`);
}

assert.match(dictionary,/search_japanese_dictionary/,'Dictionary search remains RPC-backed');
assert.match(dictionary,/createSignedUrls/,'Private dictionary images still use signed URLs');
assert.match(dictionary,/300/,'Dictionary signed-image lifetime remains short-lived');
assert.match(repo,/JLHDictionary/,'Repository still integrates the private dictionary');
assert.match(
  schema,
  /source of truth|bootstrap|Foundational bootstrap/i,
  'Local bootstrap is not treated as the authoritative deployed dictionary schema'
);

console.log('PASS: current private-dictionary client/storage contract; live Supabase is the SQL source of truth.');
