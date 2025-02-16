document.addEventListener('DOMContentLoaded', function () {
 //File Sidebar Elements
  const toggleSidebar = document.getElementById('toggleSidebar');
  const closeSidebar = document.getElementById('closeSidebar');
  const sidebar = document.getElementById('sidebar');


  //CodeMirror Editor Container Content
  const main = document.querySelector('.main');

  // CodeMirror initialization
  CodeMirror.fromTextArea(document.getElementById('editor'), {
    mode: "javascript",   
    theme: "default",    
    lineNumbers: true,   
    indentUnit: 2,        
    tabSize: 2,          
    lineWrapping: true    
  });

  function refreshEditor(){
    setTimeout( () => {
        codeEditor.refresh();
    }, 300);
  }

  function updateMargins(){
    const leftOpen = sidebar.classList.contains('open');

    main.classList.remove('sidebar-open');

    if (leftOpen) {
        main.classList.add('sidebar-open');
    }
  }

  // Open File Sidebar
  toggleSidebar.addEventListener('click', function () {
    sidebar.classList.add('open');
    updateMargins();
    refreshEditor();
  });

  // Close File sidebar
  closeSidebar.addEventListener('click', function () {
    sidebar.classList.remove('open');
    updateMargins();
    refreshEditor();
  });


});