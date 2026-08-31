import initSqlJs from 'sql.js';
import {Package,Deck,Notetype,Note} from 'ankipack';

const MODEL_ID=1767225601101;
const DECK_ID=1767225601002;

const CARD_CSS=`
.card{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans JP",sans-serif;font-size:20px;text-align:left;color:#172235;background:#fff;padding:24px;line-height:1.65}
.japanese{font-size:30px;font-weight:700;line-height:1.8;margin-bottom:10px}.reading{font-size:18px;color:#53657d;margin-bottom:14px}.meaning{font-size:22px;font-weight:700;margin:16px 0}.section{border-top:1px solid #d9e0ea;padding-top:12px;margin-top:12px}.label{display:block;color:#718096;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;margin-bottom:4px}.source{color:#53657d;font-size:14px}.repo-id{color:#8794a6;font-size:10px;margin-top:18px}
`;

const notetype=new Notetype({
  id:MODEL_ID,
  name:'Japanese Learning Hub',
  css:CARD_CSS,
  sortFieldIndex:1,
  fields:[
    {name:'Target Word'},{name:'Sentence'},{name:'Sentence Translation'},
    {name:'Definition'},{name:'Notes'},{name:'Sentence Audio'},
    {name:'Image'},{name:'Source'}
  ],
  templates:[{
    name:'Sentence → Meaning',
    questionFormat:'{{#Target Word}}<div class="reading">{{Target Word}}</div>{{/Target Word}}<div class="japanese">{{Sentence}}</div>{{Sentence Audio}}',
    answerFormat:'{{FrontSide}}<hr id="answer">{{#Sentence Translation}}<div class="meaning">{{Sentence Translation}}</div>{{/Sentence Translation}}{{#Definition}}<div class="section"><span class="label">Definition</span>{{Definition}}</div>{{/Definition}}{{#Notes}}<div class="section"><span class="label">Notes</span>{{Notes}}</div>{{/Notes}}{{#Image}}<div class="section">{{Image}}</div>{{/Image}}{{#Source}}<div class="section source"><span class="label">Source</span>{{Source}}</div>{{/Source}}'
  }]
});

let sqlPromise;
function loadSql(){
  sqlPromise ||= initSqlJs({locateFile:()=>new URL('vendor/sql-wasm.wasm',document.baseURI).href});
  return sqlPromise;
}

async function buildDeck(entries){
  if(!Array.isArray(entries)||!entries.length) throw new Error('No repository entries were selected.');
  const deck=new Deck({
    id:DECK_ID,
    name:'Japanese Learning Hub',
    description:'Personal Japanese sentences and corrections exported from Japanese Learning Hub.',
    config:null
  });
  for(const entry of entries){
    deck.addNote(new Note({
      notetype,
      guid:`jlh2-${entry.id}`,
      tags:Array.isArray(entry.tags)?entry.tags:[],
      fields:[entry.targetWord||'',entry.sentence||'',entry.sentenceTranslation||'',entry.definition||'',entry.notes||'',entry.sentenceAudio||'',entry.image||'',entry.source||'']
    }));
  }
  const pkg=new Package();pkg.addDeck(deck);
  return pkg.toUint8Array(await loadSql());
}

window.AnkiPackageExporter={buildDeck};
