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
      },
      'tobira-intermediate-future':{
        label:'TOBIRA Intermediate Japanese I',
        lessons:{
          1:{path:'lesson-01.pdf',startPage:23,endPage:44},
          2:{path:'lesson-02.pdf',startPage:45,endPage:66},
          3:{path:'lesson-03.pdf',startPage:67,endPage:86},
          4:{path:'lesson-04.pdf',startPage:89,endPage:108},
          5:{path:'lesson-05.pdf',startPage:109,endPage:132},
          6:{path:'lesson-06.pdf',startPage:133,endPage:154},
          7:{path:'lesson-07.pdf',startPage:157,endPage:180},
          8:{path:'lesson-08.pdf',startPage:181,endPage:206},
          'unit-1':{path:'unit-01-project.pdf',startPage:87,endPage:88},
          'unit-2':{path:'unit-02-project.pdf',startPage:155,endPage:156},
          'unit-3':{path:'unit-03-project.pdf',startPage:207,endPage:208}
        }
      }
    }
  };
})();
