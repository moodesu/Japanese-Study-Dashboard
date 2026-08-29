/*
 * TOBIRA Beginning Japanese II hosted-audio map.
 *
 * The publisher filenames already encode the lesson and sequence. Audio is
 * stored in the private Supabase bucket defined below, using the publisher's
 * four uploaded archive folders without renaming the MP3 files.
 */
(function(){
  const lessonLayout = {
    11:{total:23,listeningStart:22,reading:["L11.mp3"]},
    12:{total:25,listeningStart:24,reading:["L12.mp3"]},
    13:{total:28,listeningStart:27,reading:["L13.mp3"]},
    14:{total:28,listeningStart:27,reading:["L14.mp3"]},
    15:{total:27,listeningStart:26,reading:["L15-1.mp3","L15-2.mp3"]},
    16:{total:27,listeningStart:26,reading:["L16-1.mp3","L16-2.mp3"]},
    17:{total:27,listeningStart:26,reading:["L17.mp3"]},
    18:{total:21,listeningStart:20,reading:["L18.mp3"]},
    19:{total:22,listeningStart:21,reading:["L19-1.mp3","L19-2.mp3","L19-3.mp3","L19-4.mp3"]},
    20:{total:16,listeningStart:16,reading:["L20.mp3"]}
  };

  const categoryDefinitions = [
    {key:"conversation",label:"会話",english:"Conversation",guide:"Book closed first: listen for the situation, then read, replay and shadow."},
    {key:"vocabulary",label:"単語リスト",english:"Vocabulary list",guide:"Listen for pronunciation, then pause and recall each word without looking."},
    {key:"speaking",label:"話しましょう",english:"Speaking",guide:"Pause after each prompt, answer aloud, then replay and compare."},
    {key:"reading",label:"読みましょう",english:"Reading",guide:"Read for gist before playing the audio; then replay, reread and shadow."},
    {key:"listening",label:"聞きましょう",english:"Listening",guide:"Listen without the script first; answer, check what you missed, then replay."}
  ];

  function pad(n){ return String(n).padStart(2,"0"); }
  function lessonFolder(lesson){
    if(lesson<=13) return "L11-13";
    if(lesson<=16) return "L14-16";
    return "L17-20";
  }
  function makeTrack(lesson,number,category,index){
    const filename=`L${lesson}-${pad(number)}.mp3`;
    const def=categoryDefinitions.find(x=>x.key===category);
    return {
      lesson,
      number,
      category,
      filename,
      path:`${lessonFolder(lesson)}/${filename}`,
      title:category==="vocabulary" ? def.english : `${def.english} ${index}`
    };
  }

  const lessons={};
  Object.entries(lessonLayout).forEach(([lessonNumber,layout])=>{
    const lesson=Number(lessonNumber);
    const groups={conversation:[],vocabulary:[],speaking:[],reading:[],listening:[]};
    for(let n=1;n<=layout.total;n++){
      let category;
      if(n<=4) category="conversation";
      else if(n===5) category="vocabulary";
      else if(n>=layout.listeningStart) category="listening";
      else category="speaking";
      groups[category].push(makeTrack(lesson,n,category,groups[category].length+1));
    }
    layout.reading.forEach((filename,index)=>groups.reading.push({
      lesson,
      number:index+1,
      badge:layout.reading.length===1?'R':`R${index+1}`,
      category:"reading",
      filename,
      path:`reading_L11-20/${filename}`,
      title:layout.reading.length===1?'Reading':`Reading ${index+1}`
    }));
    lessons[lesson]={groups,tracks:categoryDefinitions.flatMap(x=>groups[x.key])};
  });

  window.LESSON_AUDIO={
    bucket:"lesson-audio",
    folders:["L11-13","L14-16","L17-20","reading_L11-20"],
    categories:categoryDefinitions,
    lessons
  };
})();
