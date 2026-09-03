// Small, explicit grammar reference library. Labels resolve through aliases,
// never fuzzy substring matching. Content is text plus [漢字|かんじ] notation.
// Examples are original; references support the explanations below.
window.REPOSITORY_GRAMMAR_GUIDES = [
  {
    id:'kurai-nara',
    title:'〜くらいなら',
    aliases:['くらいなら','ぐらいなら'],
    meaning:'With an amount: “if it is about that much”. With an undesirable action: “rather than doing that…”. Check what comes before the pattern.',
    sections:[
      {title:'Amount + approximation + condition',paragraphs:[
        'An amount followed by くらい means approximately that amount. Adding なら makes it the condition for your comment or decision.',
        'For example, 4000[円|えん]くらいなら means “if it is around 4,000 yen”. This reading combines approximation and a condition; it does not express a preference to avoid an action.'
      ]},
      {title:'Do not confuse the two uses',paragraphs:[
        'After a dictionary-form verb, くらいなら can introduce an action you would rather avoid, followed by a preferable alternative. The shared label alone does not tell you which meaning applies.'
      ]}
    ],
    forms:[
      {pattern:'Amount + くらい／ぐらい + なら',meaning:'If it is around that amount…'},
      {pattern:'Dictionary-form verb + くらいなら',meaning:'Rather than doing that… [a preferred alternative]'}
    ],
    examples:[
      {japanese:'4000[円|えん]くらいなら[妥当|だとう]だと[思|おも]う。',english:'If it is around 4,000 yen, I think that is reasonable.',note:'Amount + approximation + condition.'},
      {japanese:'[捨|す]てるくらいなら、[誰|だれ]かにあげよう。',english:'Rather than throw it away, let’s give it to someone.',note:'Avoiding an action in favour of an alternative.'}
    ],
    sources:[
      {title:'Tofugu · approximation with くらい',url:'https://www.tofugu.com/japanese-grammar/kurai/'},
      {title:'Tofugu · conditional なら',url:'https://www.tofugu.com/japanese-grammar/conditional-form-nara/'},
      {title:'Bunpro · the “rather than” use',url:'https://bunpro.jp/grammar_points/ぐらいなら'}
    ]
  },
  {
    id:'to-omou',
    title:'〜だと[思|おも]う / 〜と[思|おも]う',
    aliases:['だと思う','と思う','だと思います','と思います'],
    meaning:'“I think…” — report an opinion or thought by putting its content before と + [思|おも]う.',
    sections:[
      {title:'Why だ is sometimes needed',paragraphs:[
        'The content before と is a plain-form clause. In a present affirmative statement ending in a noun or な-adjective, keep だ before と.',
        '[妥当|だとう] is a な-adjective, so “[妥当|だとう]だと[思|おも]う” is the appropriate form. Do not insert だ after an affirmative verb or い-adjective.'
      ]},
      {title:'Negative, past and polite forms',paragraphs:[
        'For a negative or past thought, use that clause’s plain negative or past ending before と; do not append another だ.',
        'Use と[思|おも]います for a polite ending. The thought before と stays in plain form.'
      ]}
    ],
    forms:[
      {pattern:'Noun / な-adjective + だと[思|おも]う',meaning:'Present affirmative noun or な-adjective statement.'},
      {pattern:'Plain verb / い-adjective + と[思|おも]う',meaning:'No extra だ.'},
      {pattern:'Plain negative / past clause + と[思|おも]う',meaning:'Keep the negative or past ending of the thought.'}
    ],
    examples:[
      {japanese:'この[値段|ねだん]は[妥当|だとう]だと[思|おも]う。',english:'I think this price is reasonable.',note:'な-adjective + だ + と + 思う.'},
      {japanese:'ちょっと[高|たか]いと[思|おも]う。',english:'I think it is a little expensive.',note:'い-adjective: no だ before と.'},
      {japanese:'[明日|あした]は[雨|あめ]じゃないと[思|おも]う。',english:'I don’t think it will rain tomorrow.',note:'A negative noun clause before と.'}
    ],
    sources:[{title:'Tae Kim · quoting thoughts and opinions',url:'https://www.guidetojapanese.org/quotation.html'}]
  }
];
