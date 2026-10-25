'use strict';

const crypto = require('node:crypto');
const MAX_BYTES = 128 * 1024;
const FIELDS = ['entry_type','status','japanese','japanese_furigana','english','explanation','notes','tags','register','grammar_points'];
const FURIGANA = /\[([^\]|]+)\|([^\]]+)\]/g;
const reply = (statusCode, value) => ({statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'},body:JSON.stringify(value)});
const getHeader = (headers,name) => Object.entries(headers||{}).find(([key])=>key.toLowerCase()===name)?.[1] || '';
const validString = (s,max) => typeof s==='string' && s.length<=max;
const validToken = (incoming,expected) => {
  if(!incoming || !expected) return false;
  const a=crypto.createHash('sha256').update(incoming).digest();
  const b=crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a,b);
};
const rest = async (url,key,path,options={}) => {
  const response=await fetch(url+'/rest/v1/'+path,{
    ...options,headers:{apikey:key,Authorization:'Bearer '+key,...options.headers}
  });
  if(!response.ok) throw new Error('Database returned HTTP '+response.status);
  return response.status===204?[]:response.json();
};
const validate=(item)=>{
  if(!item||typeof item!=='object'||Array.isArray(item)) throw new Error('Each entry must be an object.');
  if(Object.keys(item).some(k=>!FIELDS.includes(k))) throw new Error('Unsupported field supplied.');
  if(item.entry_type!==undefined&&item.entry_type!=='sentence') throw new Error('Only sentence entries may be added.');
  if(item.status!==undefined&&!['learning','review','known','reference'].includes(item.status)) throw new Error('Invalid status.');
  if(!validString(item.japanese,4000)||!item.japanese.trim()) throw new Error('Japanese text is required.');
  if(!validString(item.english||'',4000)||!validString(item.explanation||'',6000)||!validString(item.notes||'',4000)) throw new Error('Text field too long.');
  if(!validString(item.japanese_furigana||'',8000)) throw new Error('Furigana too long.');
  if((item.japanese_furigana||'').replace(FURIGANA,'$1')!==item.japanese) throw new Error('Furigana must match Japanese text.');
  if(item.register!==undefined&&!['neutral','casual','polite','formal','written'].includes(item.register)) throw new Error('Invalid register.');
  if(item.tags!==undefined&&(!Array.isArray(item.tags)||item.tags.length>15||item.tags.some(t=>!validString(t,60)))) throw new Error('Invalid tags.');
  if(item.grammar_points!==undefined&&(!Array.isArray(item.grammar_points)||item.grammar_points.length!==0)) throw new Error('Grammar guide links must be created through the existing canonical importer.');
  return {entry_type:'sentence',status:item.status||'learning',japanese:item.japanese,japanese_furigana:item.japanese_furigana||'',english:item.english||'',explanation:item.explanation||'',notes:item.notes||'',tags:item.tags||[],register:item.register||'neutral',grammar_points:[]};
};
exports.handler=async event=>{
  if(event.httpMethod!=='POST') return reply(405,{error:'POST required.'});
  const url=(process.env.SUPABASE_URL||'').replace(/\/$/,'');
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY||'';
  const owner=process.env.ALLOWED_USER_ID||'';
  const secret=process.env.STUDY_INGEST_TOKEN||'';
  if(!url||!key||!owner||!secret) return reply(503,{error:'Study ingestion not configured.'});
  const auth=getHeader(event.headers,'authorization');
  const match=/^Bearer (\S+)$/.exec(auth);
  if(!match||!validToken(match[1],secret)) return reply(401,{error:'Unauthorised.'});
  if(event.isBase64Encoded) return reply(400,{error:'Expected JSON text.'});
  if(Buffer.byteLength(event.body||'','utf8')>MAX_BYTES) return reply(413,{error:'Payload too large.'});
  let records;
  try {
    const body=JSON.parse(event.body||'');
    if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>k!=='entries')) throw new Error('Expected an entries array.');
    if(!Array.isArray(body.entries)||!body.entries.length||body.entries.length>50) throw new Error('Supply 1–50 entries.');
    records=body.entries.map(validate);
    if(new Set(records.map(x=>x.japanese)).size!==records.length) throw new Error('Duplicate Japanese text within request.');
  }catch(error){return reply(400,{error:error.message});}
  try{
    // Fail closed: only append new sentences; never overwrite learner edits.
    const saved=[];
    for(const row of records){
      const encoded=encodeURIComponent(row.japanese);
      const found=await rest(url,key,'japanese_repository?select=id&user_id=eq.'+encodeURIComponent(owner)+'&entry_type=eq.sentence&japanese=eq.'+encoded+'&limit=1');
      if(found.length){saved.push({japanese:row.japanese,outcome:'already_exists'});continue;}
      const inserted=await rest(url,key,'japanese_repository?select=id',{method:'POST',headers:{'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify({...row,user_id:owner})});
      saved.push({japanese:row.japanese,outcome:'created',id:inserted[0]?.id});
    }
    return reply(200,{results:saved,created:saved.filter(x=>x.outcome==='created').length,existing:saved.filter(x=>x.outcome==='already_exists').length});
  }catch(e){return reply(502,{error:'Database write failed; some earlier entries may have been written. Retry is duplicate-safe.'});}
};
