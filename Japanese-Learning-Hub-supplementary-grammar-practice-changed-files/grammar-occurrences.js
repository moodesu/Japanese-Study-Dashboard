/* Explicit textbook occurrence -> canonical Grammar Library identities.
 *
 * These records describe textbook grammar occurrences only. Supplementary
 * resources join through the canonical guide in Supabase; there is deliberately
 * no textbook -> workbook relationship here and no fuzzy label matching.
 */
(function(){
  const rows=[
    // TOBIRA Beginning Japanese II — exact/strong canonical occurrences used
    // by the current supplementary-practice seed.
    ['tobira-beginning-ii-12w',12,4,'〜たら'],
    ['tobira-beginning-ii-12w',13,1,'〜ようと思う'],
    ['tobira-beginning-ii-12w',14,2,'〜ている'],
    ['tobira-beginning-ii-12w',14,3,'〜てある'],
    ['tobira-beginning-ii-12w',14,4,'〜しまう'],
    ['tobira-beginning-ii-12w',14,5,'〜かもしれない'],
    ['tobira-beginning-ii-12w',14,8,'〜て欲しい'],
    ['tobira-beginning-ii-12w',14,9,'〜たら'],
    ['tobira-beginning-ii-12w',15,1,'〜ていく'],
    ['tobira-beginning-ii-12w',15,2,'〜てくる'],
    ['tobira-beginning-ii-12w',15,4,'〜てくれる'],
    ['tobira-beginning-ii-12w',15,4,'〜てもらう'],
    ['tobira-beginning-ii-12w',16,4,'〜ば'],
    ['tobira-beginning-ii-12w',16,5,'〜つもり'],
    ['tobira-beginning-ii-12w',18,5,'〜はず'],
    ['tobira-beginning-ii-12w',18,6,'〜ば'],
    ['tobira-beginning-ii-12w',20,2,'〜ようになる'],
    ['tobira-beginning-ii-12w',20,3,'〜ことにする'],
    ['tobira-beginning-ii-12w',20,4,'〜なら'],
    ['tobira-beginning-ii-12w',20,5,'〜だろう'],

    // TOBIRA Intermediate Japanese I — only exact/strong occurrences whose
    // canonical identities are unambiguous in the attached cross-match.
    ['tobira-intermediate-future',1,8,'〜始める'],
    ['tobira-intermediate-future',2,16,'〜ようになる'],
    ['tobira-intermediate-future',3,4,'〜なら'],
    ['tobira-intermediate-future',3,9,'〜ていく'],
    ['tobira-intermediate-future',3,9,'〜てくる'],
    ['tobira-intermediate-future',3,13,'〜ようにする'],
    ['tobira-intermediate-future',5,8,'〜に違いない'],
    ['tobira-intermediate-future',6,7,'〜らしい'],
    ['tobira-intermediate-future',6,9,'〜ばかり'],
    ['tobira-intermediate-future',7,4,'〜ことになる'],
    ['tobira-intermediate-future',8,8,'〜はず']
  ].map(([programmeId,lesson,index,canonical])=>({programmeId,lesson,index,canonical}));

  const forOccurrence=(programmeId,lesson,index)=>rows.filter(row=>
    row.programmeId===programmeId&&Number(row.lesson)===Number(lesson)&&Number(row.index)===Number(index)
  );

  window.JLHGrammarOccurrences={rows,forOccurrence};
})();
