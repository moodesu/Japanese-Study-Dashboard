// Test-only dependency: npm install --prefix /tmp/jlh-grammar-test --no-save @electric-sql/pglite
// PGLITE_MODULE may point to another installed @electric-sql/pglite package.
const {PGlite}=require(process.env.PGLITE_MODULE||'/tmp/jlh-grammar-test/node_modules/@electric-sql/pglite');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const owner='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';
(async()=>{
  const db=new PGlite();
  try{
    await db.exec(`create role authenticated; create role anon; create schema auth;
      create table auth.users(id uuid primary key);
      insert into auth.users values('${owner}'),('${other}');
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      grant usage on schema auth,public to authenticated,anon;
      grant execute on function auth.uid() to authenticated,anon;
      create function public.set_updated_at() returns trigger language plpgsql as $$begin new.updated_at=now();return new;end$$;`);
    // gen_random_uuid is built into PostgreSQL; pgcrypto itself isn't needed by these migrations.
    await db.exec(fs.readFileSync(path.join(root,'migrations/20260830_japanese_repository.sql'),'utf8').replace('create extension if not exists pgcrypto;',''));
    const migration=fs.readFileSync(path.join(root,'migrations/20260903_repository_grammar_library.sql'),'utf8');
    await db.exec(migration);await db.exec(migration); // rerun safety
    await db.exec(`set role authenticated; set request.jwt.claim.sub='${owner}';`);
    const content={meaning:'I think',formation:['Clause + と思う'],explanation:'A thought.',examples:[{japanese:'いいと思う。',japanese_furigana:'いいと[思|おも]う。',english:'I think it is good.'}]};
    const input={entry:{japanese:'いいと思う。',japanese_furigana:'いいと[思|おも]う。',grammar_points:['〜と思う']},guides:[{label:'〜と思う',sense:'opinion',content}]};
    const run=async rows=>(await db.query('select public.import_repository_with_grammar($1::jsonb) as result',[JSON.stringify(rows)])).rows[0].result;
    const count=async table=>Number((await db.query(`select count(*) from public.${table}`)).rows[0].count);
    const first=await run([input]);assert.equal(first.entries.length,1);assert.equal(first.links.length,1);
    const second=await run([input]);assert.equal(first.guides[0].id,second.guides[0].id);
    assert.equal(await count('japanese_grammar_guides'),1);
    const changed=structuredClone(input);changed.guides[0].content.meaning='Changed';
    const before=await count('japanese_repository');
    await assert.rejects(run([input,changed]),/Grammar conflict/);
    assert.equal(await count('japanese_repository'),before,'Entire batch rolls back');
    changed.guides[0].expected_content=content;
    await run([changed]);assert.equal(await count('japanese_grammar_guides'),1);
    const distinct=structuredClone(input);distinct.guides[0].sense='different-meaning';
    await run([distinct]);assert.equal(await count('japanese_grammar_guides'),2);
    const invalid=structuredClone(input);invalid.guides[0].content.examples[0].japanese_furigana='別';
    await assert.rejects(run([invalid]),/Invalid explanation/);
    const missing=structuredClone(input);delete missing.guides[0].content;
    await assert.rejects(run([missing]),/Invalid explanation/);
    const wrong=structuredClone(input);wrong.guides[0].label='〜ようと思う';
    await assert.rejects(run([wrong]),/grammar label/);
    const batch=structuredClone(input);batch.guides[0].sense='batch';
    const batchResult=await run([batch,batch]);assert.equal(batchResult.guides[0].id,batchResult.guides[1].id);
    await assert.rejects(db.exec(`update public.japanese_grammar_guides set label='overwrite'`),/permission denied/);
    await db.exec(`update public.japanese_repository set grammar_points='{}' where id='${first.entries[0].id}'`);
    assert.equal((await db.query('select * from public.japanese_repository_grammar where repository_id=$1',[first.entries[0].id])).rows.length,0);
    await db.exec(`set request.jwt.claim.sub='${other}';`);
    assert.equal(await count('japanese_grammar_guides'),0);assert.equal(await count('japanese_repository_grammar'),0);
    const own=await run([input]);assert.notEqual(own.guides[0].id,first.guides[0].id);
    await assert.rejects(db.query(`insert into public.japanese_repository_grammar(repository_id,user_id,label,grammar_id) values($1,$2,$3,$4)`,[own.entries[0].id,other,'foreign',first.guides[0].id]),/foreign key/);
    await assert.rejects(db.query(`insert into public.japanese_grammar_guides(user_id,label,sense,content) values($1,$2,$3,$4)`,[owner,'x','x',JSON.stringify(content)]),/row-level security/);
    const spoof=structuredClone(input);spoof.entry.user_id=owner;
    const spoofResult=await run([spoof]);assert.equal(spoofResult.entries[0].user_id,other);
    await db.exec(`delete from public.japanese_repository where id='${own.entries[0].id}'`);
    assert.equal((await db.query('select * from public.japanese_repository_grammar where repository_id=$1',[own.entries[0].id])).rows.length,0);
    await db.exec("set request.jwt.claim.sub='';");await assert.rejects(run([input]),/Sign in/);
    await db.exec('reset role; set role anon;');await assert.rejects(run([input]),/permission denied/);
    console.log('PASS: PostgreSQL migration/rerun, atomic import/rollback, reuse, explicit conflicts, distinct senses, batch dedup, validation, append-only guides, RLS/ownership, cascading links and anonymous denial.');
  }finally{await db.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
