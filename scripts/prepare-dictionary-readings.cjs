/* Offline only. No source entries, images, credentials or network APIs are changed.
 * npm install --prefix /tmp/jlh-dictionary-furigana --no-save kuromoji@0.1.2 linkedom@0.18.12
 * node scripts/prepare-dictionary-readings.cjs /private/dictionary-data.json /private/dictionary-readings.json
 * KUROMOJI_MODULE and LINKEDOM_MODULE can point to alternative installations.
 */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const kuromojiPath=process.env.KUROMOJI_MODULE||'/tmp/jlh-dictionary-furigana/node_modules/kuromoji';
const kuromoji=require(kuromojiPath);
const {parseHTML}=require(process.env.LINKEDOM_MODULE||'/tmp/jlh-dictionary-furigana/node_modules/linkedom');
const {document}=parseHTML('<html><body></body></html>');
const context={document,TextEncoder,addEventListener:()=>{},repositoryState:{showFurigana:true},esc:value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))};
context.window=context;vm.createContext(context);
vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../dictionary.js'),'utf8'),context);
const api=context.JLHDictionary;
const han=/[\p{Script=Han}々〆]/u;
const hiragana=text=>text.replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60));

function generate(tokenizer,root){
  const nodes=api.readingTextNodes(root),positions=new Map();let text='';
  const block=new Set('div p br li td th tr table ul ol'.split(' '));
  function walk(node){
    if(node.nodeType===3){positions.set(node,text.length);text+=node.textContent;return;}
    if(node.nodeType!==1)return;
    if(['ruby','rt','rp'].includes(node.localName)){text+='\n';return;}
    const boundary=block.has(node.localName);if(boundary)text+='\n';
    for(const child of Array.from(node.childNodes))walk(child);
    if(boundary)text+='\n';
  }
  for(const child of Array.from(root.childNodes))walk(child);
  const annotations=nodes.map((node,index)=>({index,text:node.textContent,spans:[]}));
  let lineStart=0,unresolved=0;
  for(const line of text.split('\n')){
    if(han.test(line)){
      let cursor=0;
      for(const token of tokenizer.tokenize(line)){
        const surface=token.surface_form;
        const start=line.indexOf(surface,cursor);
        if(start<0)throw new Error('Tokenizer changed source text.');
        cursor=start+surface.length;
        if(!han.test(surface))continue;
        if(!token.reading||token.reading==='*'){unresolved++;continue;}
        let from=0,to=surface.length,reading=hiragana(token.reading);
        // Keep matching kana prefixes and okurigana out of ruby annotations.
        while(from<to&&!han.test(surface[from])&&hiragana(surface[from])===reading[0]){from++;reading=reading.slice(1);}
        while(to>from&&!han.test(surface[to-1])&&hiragana(surface[to-1])===reading.at(-1)){to--;reading=reading.slice(0,-1);}
        if(!reading||!/^[ぁ-ゖァ-ヺー]{1,100}$/.test(reading)){unresolved++;continue;}
        const begin=lineStart+start+from,end=lineStart+start+to;
        const index=nodes.findIndex(node=>begin>=positions.get(node)&&end<=positions.get(node)+node.textContent.length);
        // Don't guess how to divide a compound reading across markup boundaries.
        if(index<0){unresolved++;continue;}
        annotations[index].spans.push([begin-positions.get(nodes[index]),end-positions.get(nodes[index]),reading]);
      }
    }
    lineStart+=line.length+1;
  }
  return {nodes:annotations.filter(node=>node.spans.length),unresolved};
}

async function main(){
  const [input,output]=process.argv.slice(2);
  if(!input||!output)throw new Error('Supply the original private dictionary-data.json and a new private output JSON path.');
  if(fs.existsSync(output))throw new Error('Output already exists; choose a new output path.');
  const manifest=JSON.parse(fs.readFileSync(input,'utf8'));
  const source=api.validateManifest(manifest);
  const tokenizer=await new Promise((resolve,reject)=>kuromoji.builder({dicPath:path.join(path.dirname(require.resolve(kuromojiPath)),'../dict')}).build((error,value)=>error?reject(error):resolve(value)));
  let spans=0,unresolved=0;
  const entries=source.map(row=>{
    const body=document.createElement('div');body.innerHTML=api.safeHtml(row.body_html);
    const title=document.createElement('div');title.textContent=row.headword;
    const b=generate(tokenizer,body),h=generate(tokenizer,title);
    const readings={version:1,generator:'kuromoji 0.1.2 / IPADIC; automatic, unverified',headword:{text:row.headword,spans:h.nodes[0]?.spans||[]},body:b.nodes};
    api.validateReadings(readings);
    spans+=readings.headword.spans.length+readings.body.reduce((sum,node)=>sum+node.spans.length,0);unresolved+=b.unresolved+h.unresolved;
    // Verify every rendered base text matches, including entities and tables.
    const rendered=document.createElement('div');rendered.innerHTML=api.readingMarkup(row.body_html,readings,false,true);
    rendered.querySelectorAll('rt,rp').forEach(node=>node.remove());
    if(rendered.textContent!==body.textContent)throw new Error('Annotation changed original text: '+row.id);
    return {entry_id:row.id,readings};
  });
  const result={format:'jlh-dictionary-readings-v1',entries};api.validateReadingsFile(result);
  fs.mkdirSync(path.dirname(output),{recursive:true});
  fs.writeFileSync(output,JSON.stringify(result),'utf8');
  console.log(JSON.stringify({entries:entries.length,annotatedSpans:spans,unresolvedTokens:unresolved,bytes:fs.statSync(output).size}));
}
if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={generate,hiragana};
