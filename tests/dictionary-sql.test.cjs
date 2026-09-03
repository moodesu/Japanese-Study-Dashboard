// Test-only dependency: npm install --prefix /tmp/jlh-dictionary-test --no-save @electric-sql/pglite linkedom
const {PGlite}=require(process.env.PGLITE_MODULE||'/tmp/jlh-dictionary-test/node_modules/@electric-sql/pglite');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),owner='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';
(async()=>{
  const db=new PGlite();
  try{
    await db.exec(`create role authenticated; create role anon; create schema auth; create schema storage;
      create table auth.users(id uuid primary key); insert into auth.users values('${owner}'),('${other}');
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
      create function public.repository_grammar_key(label text) returns text language sql immutable strict as $$select lower(regexp_replace(regexp_replace(trim(normalize(label,NFKC)),'^[~〜～]+',''),'[[:space:]]+','','g'))$$;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
      create function storage.foldername(name text) returns text[] language sql immutable as $$select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1]$$;
      grant usage on schema public,auth,storage to authenticated,anon; grant select,insert,update,delete on storage.objects to authenticated,anon;
      alter table storage.objects enable row level security;
      create policy existing_broad_policy on storage.objects for all to public using(true) with check(true);`);
    const sql=fs.readFileSync(path.join(root,'migrations/20260903_private_dictionary.sql'),'utf8');await db.exec(sql);await db.exec(sql);
    await db.exec(`set role authenticated; set request.jwt.claim.sub='${owner}';`);
    const fixture={id:'a'.repeat(64),headword:'来る・くる (2)',volume:'Basic',aliases:['くる','来る'],summary:'developing change',body_html:'<p>Example fixture</p>',image_files:['b'.repeat(64)+'.png']};
    const insert=async(row,user=owner)=>db.query(`insert into public.japanese_dictionary_entries(user_id,id,headword,volume,aliases,summary,body_html,image_files)
      select $1,r.id,r.headword,r.volume,r.aliases,r.summary,r.body_html,r.image_files from jsonb_populate_record(null::public.japanese_dictionary_entries,$2::jsonb) r on conflict(user_id,id) do nothing`,[user,JSON.stringify(row)]);
    await insert(fixture);await insert(fixture);
    assert.equal((await db.query('select count(*) from public.japanese_dictionary_entries')).rows[0].count,1);
    assert.equal((await db.query('select * from public.search_japanese_dictionary($1)',['〜くる'])).rows.length,1);
    assert.equal((await db.query('select * from public.search_japanese_dictionary($1)',['%'])).rows.length,0,'Wildcards are literal');
    const link=async(user,entry)=>db.query('insert into public.japanese_dictionary_links(user_id,grammar_key,sense,entry_id) values($1,$2,$3,$4)',[user,'てくる','change',entry]);
    await link(owner,fixture.id);
    await assert.rejects(insert({...fixture,id:'c'.repeat(64),image_files:['../file.png']}),/check constraint/);
    await assert.rejects(db.exec("update public.japanese_dictionary_entries set summary='overwritten'"),/permission denied/);
    await db.query('insert into storage.objects(bucket_id,name) values($1,$2)',['japanese-grammar-dictionary',owner+'/'+fixture.image_files[0]]);
    await db.exec(`set request.jwt.claim.sub='${other}';`);
    assert.equal((await db.query('select * from public.search_japanese_dictionary($1)',['くる'])).rows.length,0);
    assert.equal((await db.query('select * from public.japanese_dictionary_links')).rows.length,0);
    assert.equal((await db.query('select * from storage.objects')).rows.length,0,'Restrictive guard defeats broad policies');
    await assert.rejects(insert(fixture,owner),/row-level security/);
    await assert.rejects(link(other,fixture.id),/foreign key/);
    await assert.rejects(db.query('insert into storage.objects(bucket_id,name) values($1,$2)',['japanese-grammar-dictionary',owner+'/'+fixture.image_files[0]]),/row-level security/);
    await assert.rejects(db.query('insert into storage.objects(bucket_id,name) values($1,$2)',['japanese-grammar-dictionary',other+'/script.sh']),/row-level security/);
    await insert(fixture,other);await link(other,fixture.id);
    await db.exec("reset role; set role anon; set request.jwt.claim.sub='';");
    await assert.rejects(db.query('select * from public.search_japanese_dictionary($1)',['くる']),/permission denied/);
    await assert.rejects(db.query('select * from public.japanese_dictionary_entries'),/permission denied/);
    assert.equal((await db.query('select * from storage.objects')).rows.length,0);
    await db.exec("reset role; update storage.buckets set public=true where id='japanese-grammar-dictionary';");
    await assert.rejects(db.exec(sql),/bucket is public/);await db.exec('rollback;');
    console.log('PASS: dictionary SQL rerun, literal search, dedup, append-only entries, own links, RLS, cross-user/anonymous isolation, storage guard, safe image paths and public-bucket rejection.');
  }finally{await db.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
