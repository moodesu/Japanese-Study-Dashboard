const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'app.js'),'utf8');
const styles=fs.readFileSync(path.join(root,'styles.css'),'utf8');
const headers=fs.readFileSync(path.join(root,'_headers'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const configSource=fs.readFileSync(path.join(root,'textbook-pdf.js'),'utf8');
const schema=fs.readFileSync(path.join(root,'supabase-schema.sql'),'utf8');
const migration=fs.readFileSync(path.join(root,'migrations/20260908_private_textbook_pdf.sql'),'utf8');

const context={
  URL,
  state:{lessonVideo:{lesson:null,area:null,videoId:null}},
  esc:value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
};
context.window=context;
vm.createContext(context);
for(const name of ['safeYouTubeUrl','youtubeVideoId','lessonVideoEmbedMarkup','lessonVideoItemMarkup','parsePrintedPageRange','printedToLocalPdfPage']){
  const start=source.indexOf(`function ${name}(`);
  assert.ok(start>=0,`Missing ${name}`);
  const end=source.indexOf('\nfunction ',start+1);
  vm.runInContext(source.slice(start,end<0?undefined:end),context);
}

const id='dQw4w9WgXcQ';
assert.equal(context.youtubeVideoId(`https://www.youtube.com/watch?v=${id}&t=3`),id);
assert.equal(context.youtubeVideoId(`https://youtu.be/${id}`),id);
assert.equal(context.youtubeVideoId('https://example.com/watch?v=dQw4w9WgXcQ'),null);
assert.equal(context.youtubeVideoId('https://www.youtube.com/watch?v=too-short'),null);
const video={title:'Lesson 11 dialogue',youtube_url:`https://youtu.be/${id}`};
let markup=context.lessonVideoItemMarkup(video,{lesson:11,area:'reference',label:'Dialogue practice'});
assert.ok(markup.includes('data-lesson-video-id="dQw4w9WgXcQ"'));
assert.ok(markup.includes('Open on YouTube ↗'),'Original URL remains as a fallback');
assert.ok(!markup.includes('<iframe'),'Inactive videos are not eagerly embedded');
context.state.lessonVideo={lesson:11,area:'reference',videoId:id};
markup=context.lessonVideoItemMarkup(video,{lesson:11,area:'reference',label:'Dialogue practice'});
assert.ok(markup.includes('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0'));
assert.ok(markup.includes('aria-expanded="true"'));
assert.match(source,/isCurrent\|\|hasOpenMedia\|\|hasOpenVideo\?'open':''/,'A rendered task keeps its active video workspace open');

assert.deepEqual(JSON.parse(JSON.stringify(context.parsePrintedPageRange('14–15'))),{start:14,end:15});
assert.deepEqual(JSON.parse(JSON.stringify(context.parsePrintedPageRange('p.23'))),{start:23,end:23});
vm.runInContext(configSource,context);
const pdfs=context.TEXTBOOK_PDFS.books['tobira-beginning-ii-12w'].lessons;
assert.equal(context.printedToLocalPdfPage(13,pdfs[11]),1);
assert.equal(context.printedToLocalPdfPage(23,pdfs[11]),11);
assert.equal(context.printedToLocalPdfPage(50,pdfs[11]),38);
assert.equal(context.printedToLocalPdfPage(51,pdfs[12]),1);
assert.equal(context.printedToLocalPdfPage(84,pdfs[12]),34);
assert.equal(context.printedToLocalPdfPage(353,pdfs[20]),1);
assert.equal(context.printedToLocalPdfPage(388,pdfs[20]),36);
assert.equal(context.printedToLocalPdfPage(51,pdfs[11]),null,'A printed page cannot leak into the wrong lesson PDF');

assert.match(source,/data-textbook-lesson="\$\{l\.n\}"[^>]*data-textbook-label="\$\{esc\(sec\.label\)\}"[^>]*data-textbook-pages="\$\{esc\(sec\.pages\|\|''\)\}"/);
assert.match(source,/data-textbook-lesson="\$\{l\.n\}"[^>]*data-textbook-label="\$\{esc\(step\.title\)\}"[^>]*data-textbook-pages="\$\{esc\(step\.page\)\}"/,'Guided textbook tasks can open their lesson-specific PDF');
assert.match(source,/const tab=window\.open\('about:blank','_blank'\)/,'A browser tab is reserved synchronously from the user action');
assert.match(source,/tab\.opener=null/,'The reserved textbook tab cannot control the Hub tab');
assert.match(source,/const tab=reserveTextbookPdfTab\(label\);[\s\S]*?const url=await signedTextbookPdfUrl\(config\)/,'The tab is reserved before signed URL generation can yield');
assert.match(source,/const targetUrl=`\$\{url\}#page=\$\{pdfPage\}&zoom=page-width`/);
assert.match(source,/tab\.location\.replace\(targetUrl\)/,'The signed lesson PDF replaces only the reserved tab');
assert.match(source,/showTextbookPdfFallback\(label,range,'Your browser blocked the new textbook tab\.[^']*',targetUrl\)/,'A blocked popup exposes a safe fallback without changing the Hub route');
assert.match(source,/createSignedUrl\(config\.path,3600\)/,'PDF access uses a temporary signed URL');
for(let lesson=11;lesson<=20;lesson++)assert.equal(pdfs[lesson].path,`lesson-${lesson}.pdf`);
assert.ok(!configSource.includes('tobira-beginning-japanese-ii.pdf'),'There is no whole-book PDF dependency');
assert.ok(html.indexOf('textbook-pdf.js')<html.indexOf('app.js'));
assert.ok(html.includes('id="textbookPdfDialog"'));
assert.ok(!html.includes('id="textbookPdfFrame"'),'Ordinary textbook viewing no longer embeds or replaces the Hub surface');
assert.match(html,/id="openFullTextbookPdf"[^>]*target="_blank"[^>]*rel="noopener noreferrer"/);
assert.match(headers,/frame-src[^;]*youtube-nocookie\.com/);
assert.doesNotMatch(headers,/frame-src[^;]*supabase/,'Private PDFs are no longer embedded as frames');
assert.match(styles,/\.lesson-video-frame\{[^}]*aspect-ratio:16\/9/);
assert.match(styles,/\.textbook-pdf-dialog \{[^}]*width:min\(560px,calc\(100% - 28px\)\)/);
assert.ok(!styles.includes('.textbook-pdf-frame'));
assert.match(styles,/\.dashboard-lower\.single \.timebar-row \{ grid-template-columns:minmax\(0,1fr\) auto/);
assert.match(styles,/\.dashboard-lower\.single \.timebar-row>span \{ white-space:normal/);
assert.match(styles,/\.dashboard-lower\.single \.timebar-track \{ display:none; \}/);
for(const sql of [schema,migration]){
  assert.match(sql,/textbook-pdfs/);
  assert.match(sql,/private\.is_app_owner\(\)/);
  assert.match(sql,/array\['application\/pdf'\]/);
}

console.log('PASS: mobile activity layout, safe lazy YouTube embeds, and lesson-specific private PDFs opened in reserved tabs.');
