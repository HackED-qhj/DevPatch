document.addEventListener('DOMContentLoaded', function () {
 //File Sidebar Elements
  const toggleSidebar = document.getElementById('toggleSidebar');
  const closeSidebar = document.getElementById('closeSidebar');
  const sidebar = document.getElementById('sidebar');

  // Chat box Container content
  const contentArea = document.querySelector('.content-area');

  //CodeMirror Editor Container Content
  const main = document.querySelector('.main');

  // Editor and CodeMirror Instance
  const editorTextarea = document.getElementById('editor');
  const codeEditor = CodeMirror.fromTextArea(document.getElementById('editor'), {
    mode: "javascript",   
    theme: "dracula",    
    lineNumbers: true,   
    indentUnit: 2,        
    tabSize: 2,          
    lineWrapping: true    
  });

  const tabsContainer = document.getElementById('tabsContainer');
  // CodeMirror Functions
  function refreshEditor(){
    setTimeout( () => {
        codeEditor.refresh();
    }, 300);
  }

  function updateMargins(){
    const leftOpen = sidebar.classList.contains('open');
    const contentArea = document.querySelector('.content-area');
    contentArea.classList.remove('sidebar-open');

    if (leftOpen) {
        contentArea.classList.add('sidebar-open');
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


  // File Upload and View 
  // Create a hidden file input element that accepts multiple files
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.multiple = true;
  fileInput.style.display = 'none';
  document.body.appendChild(fileInput);

  // Trigger file input when user clicks the upload placeholder
  const uploadPlaceholder = document.getElementById('uploadPlaceholder');
  uploadPlaceholder.addEventListener('click', () => {
    fileInput.click();
  });

  // Reference to the file list in the sidebar
  const fileList = document.getElementById('fileList');
  // Array to store uploaded file details
  const uploadedFiles = [];
  //Array for open tabs
  const openTabs = [];
  // Tracks which file is currently loaded
  let currentFileIndex = -1;

  // Function to update the tabs UI
  function updateTabsUI() {
    tabsContainer.innerHTML = '';
    openTabs.forEach((fileIndex) => {
      const file = uploadedFiles[fileIndex];
      const tab = document.createElement('div');
      tab.classList.add('tab');
      if (fileIndex === currentFileIndex) {
        tab.classList.add('active');
      }
      tab.textContent = file.name;
      
      // Create a close button for the tab
      const closeBtn = document.createElement('span');
      closeBtn.textContent = '×';
      closeBtn.classList.add('close-tab');
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeTab(fileIndex);
      });
      tab.appendChild(closeBtn);
      
      // Clicking the tab switches to that file
      tab.addEventListener('click', () => {
        switchToFile(fileIndex);
      });
      
      tabsContainer.appendChild(tab);
    });
  }

  //saves file input before switching
  function switchToFile(newIndex){
    //check to see if file is already open
    if (currentFileIndex !== -1) {
      uploadedFiles[currentFileIndex].content = codeEditor.getValue();
    }
    //sets the new file index
    currentFileIndex = newIndex;
    //Add files to openTabs if not already there
    if (!openTabs.includes(newIndex)) {
      openTabs.push(newIndex);
    }
    //Load new file content into CodeMirror
    codeEditor.setValue(uploadedFiles[newIndex].content);
    updateTabsUI();
  }

  // Function to close a tab
  function closeTab(fileIndex) {
    const index = openTabs.indexOf(fileIndex);
    if (index > -1) {
      openTabs.splice(index, 1);
    }
    // If the closed tab is the current one, switch to another tab if available
    if (currentFileIndex === fileIndex) {
      if (openTabs.length > 0) {
        switchToFile(openTabs[0]);
      } else {
        currentFileIndex = -1;
        codeEditor.setValue('');
      }
    }
    updateTabsUI();
  }

  fileInput.addEventListener('change', function(event) {
    const files = event.target.files;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = function(e) {
        const fileContent = e.target.result;
        // Save the file's details
        const fileObj = { name: file.name, content: fileContent };
        uploadedFiles.push(fileObj);
        const index = uploadedFiles.length - 1;
        // Create a list item in the explorer
        const li = document.createElement('li');
        li.textContent = file.name;
        li.addEventListener('click', () => {
          switchToFile(index);
        });
        fileList.appendChild(li);
        // If no file is currently open, load the first one automatically
        if (currentFileIndex === -1) {
          switchToFile(index);
        }
      };
      reader.readAsText(file);
    }
    // Reset file input so the same file(s) can be re-uploaded if needed
    fileInput.value = "";
  });


});