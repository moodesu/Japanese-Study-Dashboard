/*
 * Private textbook PDF mapping.
 *
 * Each lesson PDF belongs in the private Supabase `textbook-pdfs` bucket and
 * must never be committed to this repository. Printed page labels remain the
 * source of truth in the curriculum; the viewer converts them to pages local
 * to the corresponding split PDF.
 */
(function(){
  window.TEXTBOOK_PDFS={
    bucket:'textbook-pdfs',
    books:{
      'tobira-beginning-ii-12w':{
        label:'TOBIRA Beginning Japanese II',
        lessons:{
          11:{path:'lesson-11.pdf',startPage:13,endPage:50},
          12:{path:'lesson-12.pdf',startPage:51,endPage:84},
          13:{path:'lesson-13.pdf',startPage:85,endPage:120},
          14:{path:'lesson-14.pdf',startPage:121,endPage:160},
          15:{path:'lesson-15.pdf',startPage:161,endPage:198},
          16:{path:'lesson-16.pdf',startPage:199,endPage:236},
          17:{path:'lesson-17.pdf',startPage:237,endPage:278},
          18:{path:'lesson-18.pdf',startPage:279,endPage:316},
          19:{path:'lesson-19.pdf',startPage:317,endPage:352},
          20:{path:'lesson-20.pdf',startPage:353,endPage:388}
        }
      }
    }
  };
})();
