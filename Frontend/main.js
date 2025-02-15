document.addEventListener('DOMContentLoaded', function () {
 //File Sidebar Elements
  const toggleSidebar = document.getElementById('toggleSidebar');
  const closeSidebar = document.getElementById('closeSidebar');
  const sidebar = document.getElementById('sidebar');

  //Bot Sidebar Elements
  const toggleBotSidebar = document.getElementById('toggleBotSidebar');
  const closeBotSideabar = document.getElementById('closeBotSidebar');
  const botSidebar = document.getElementById('botSidebar');


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
    const rightOpen = botsidebar.classList.contains('open');

    main.classList.remove('sidebar-open', 'sidebar-open-bot', 'sidebar-open-both');

    if (leftOpen && rightOpen) {
        main.classList.add('sidebar-open-both');
    } else if (leftOpen){
        main.classList.add('sidebar-open');
    } else if (rightOpen){
        main.classList.add('sidebar-open-bot');
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

  //Open Bot Sidebar
  toggleBotSidebar.addEventListener('click', function () {
    botsidebar.classList.add('open');
    updateMargins();
    refreshEditor();
  });

  //Close Bot Sidebar
  closeBotSidebar.addEventListener('click', function () {
    botsidebar.classList.remove('open');
    updateMargins();
    refreshEditor();
  });

});