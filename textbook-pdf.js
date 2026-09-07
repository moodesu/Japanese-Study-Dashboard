/*
 * Private textbook PDF mapping.
 *
 * The PDF itself belongs in the private Supabase `textbook-pdfs` bucket and
 * must never be committed to this repository. `printedPageOffset` is the
 * physical PDF page number minus the printed textbook page number. Leave it
 * null until the uploaded file has been checked; the viewer will not guess.
 */
(function(){
  window.TEXTBOOK_PDFS={
    bucket:'textbook-pdfs',
    books:{
      'tobira-beginning-ii-12w':{
        label:'TOBIRA Beginning Japanese II',
        path:'tobira-beginning-japanese-ii.pdf',
        printedPageOffset:null
      }
    }
  };
})();
