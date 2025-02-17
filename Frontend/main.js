document.addEventListener('DOMContentLoaded', async function () {
  // --- Message Bar Function ---
  function showMessage(type, message, duration = 3000) {
    const messageBar = document.getElementById("messageBar");
    // Set the message and type
    messageBar.textContent = message;
    messageBar.className = `message-bar ${type}`;
    // Show the message
    messageBar.style.opacity = "1";
    messageBar.classList.remove("hidden");
    // Auto-hide after the duration
    if (duration > 0) {
      setTimeout(() => {
        messageBar.style.opacity = "0";
        setTimeout(() => {
          messageBar.classList.add("hidden");
        }, 300);
      }, duration);
    }
  }

  // --- Inline Input for New/Rename File ---
  function showInlineInput(promptText, defaultValue, callback) {
    // Remove existing input if any
    const existingInput = document.querySelector(".inline-input-container");
    if (existingInput) existingInput.remove();

    // Create new input container
    const container = document.createElement("div");
    container.className = "inline-input-container";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = promptText;
    input.value = defaultValue || "";
    container.appendChild(input);

    const okButton = document.createElement("button");
    okButton.textContent = "OK";
    container.appendChild(okButton);

    const cancelButton = document.createElement("button");
    cancelButton.textContent = "Cancel";
    container.appendChild(cancelButton);

    // Insert the container ABOVE the uploadPlaceholder
    const uploadPlaceholder = document.getElementById("uploadPlaceholder");
    uploadPlaceholder.parentNode.insertBefore(container, uploadPlaceholder);

    // Focus input for user convenience
    input.focus();

    // Ensure text scrolls when typing
    input.addEventListener("input", function () {
        input.scrollLeft = input.scrollWidth;
    });

    // OK button behavior
    okButton.addEventListener("click", () => {
        if (input.value.trim() === "") {
            showMessage("error", "File name cannot be empty.");
            return;
        }
        callback(input.value);
        container.remove();
    });

    // Cancel button behavior
    cancelButton.addEventListener("click", () => {
        container.remove();
    });
}

  
  // --- Sidebar and Header Elements ---
  const toggleSidebar = document.getElementById('toggleSidebar');
  const closeSidebar = document.getElementById('closeSidebar');
  const sidebar = document.getElementById('sidebar');
  const contentArea = document.querySelector('.content-area');

  // --- File Management Elements ---
  const uploadPlaceholder = document.getElementById('uploadPlaceholder');
  const fileList = document.getElementById('fileList');
  const newFileBtn = document.getElementById('newFile');
  const renameFileBtn = document.getElementById('renameFile');
  const deleteFileBtn = document.getElementById('deleteFile');
  const fileInput = document.getElementById('fileInput');

  // --- Header Buttons ---
  const runButton = document.getElementById('runButton');
  const saveButton = document.getElementById('saveButton');

  // --- Editor and CodeMirror Instance ---
  const editorTextarea = document.getElementById('editor');
  const codeEditor = CodeMirror.fromTextArea(editorTextarea, {
    mode: "javascript",
    theme: "dracula",
    lineNumbers: true,
    indentUnit: 2,
    tabSize: 2,
    lineWrapping: true
  });
  const tabsContainer = document.getElementById('tabsContainer');

  // --- Terminal Integration using xterm.js ---
  const term = new Terminal();
  term.open(document.getElementById('terminal'));

  // --- Custom Python Input Handling ---
  let waitingForPythonInput = false;
  let pythonInputResolver = null;
  let pythonInputBuffer = "";

  function pyInput(promptText) {
    return new Promise((resolve) => {
      waitingForPythonInput = true;
      pythonInputBuffer = "";
      pythonInputResolver = resolve;
      if (promptText) {
        term.write(promptText);
      }
    });
  }
  
  // Terminal input handling for shell and Python input modes
  let currentCommand = "";
  term.onData(e => {
    if (waitingForPythonInput) {
      if (e === "\r") { // Enter key pressed
        term.write("\r\n");
        const line = pythonInputBuffer;
        pythonInputBuffer = "";
        waitingForPythonInput = false;
        if (pythonInputResolver) {
          pythonInputResolver(line);
          pythonInputResolver = null;
        }
      } else if (e === "\u007F") { // Backspace
        if (pythonInputBuffer.length > 0) {
          pythonInputBuffer = pythonInputBuffer.slice(0, -1);
          term.write("\b \b");
        }
      } else {
        pythonInputBuffer += e;
        term.write(e);
      }
    } else {
      if (e === "\r") {
        term.write("\r\n");
        handleCommand(currentCommand.trim());
        currentCommand = "";
        promptTerminal();
      } else if (e === "\u007F") {
        if (currentCommand.length > 0) {
          currentCommand = currentCommand.slice(0, -1);
          term.write("\b \b");
        }
      } else {
        currentCommand += e;
        term.write(e);
      }
    }
  });

  function promptTerminal() {
    term.write("\r\n> ");
  }
  promptTerminal();

  function handleCommand(cmd) {
    if (cmd === "clear") {
      term.clear();
    } else if (cmd === "help") {
      term.write("Available commands: clear, help, echo [text]\r\n");
    } else if (cmd.startsWith("echo ")) {
      term.write(cmd.slice(5) + "\r\n");
    } else {
      term.write(`Command not found: ${cmd}\r\n`);
    }
  }

  // --- Sidebar Toggle ---
  toggleSidebar.addEventListener('click', function () {
    sidebar.classList.add('open');
    contentArea.classList.add('sidebar-open');
    setTimeout(() => codeEditor.refresh(), 300);
  });
  closeSidebar.addEventListener('click', function () {
    sidebar.classList.remove('open');
    contentArea.classList.remove('sidebar-open');
    setTimeout(() => codeEditor.refresh(), 300);
  });

  // --- File and Tabs Management ---
  const uploadedFiles = []; // Each file: { name, content }
  const openTabs = []; // Indices in uploadedFiles
  let currentFileIndex = -1;

  function updateFileList() {
    fileList.innerHTML = "";
    uploadedFiles.forEach((file, index) => {
      const li = document.createElement("li");
      li.textContent = file.name;
      li.addEventListener("click", () => switchToFile(index));
      fileList.appendChild(li);
    });
  }

  function updateTabsUI() {
    tabsContainer.innerHTML = "";
    openTabs.forEach((fileIndex) => {
      const file = uploadedFiles[fileIndex];
      const tab = document.createElement("div");
      tab.classList.add("tab");
      if (fileIndex === currentFileIndex) tab.classList.add("active");
      tab.textContent = file.name;
      
      const closeBtn = document.createElement("span");
      closeBtn.textContent = "×";
      closeBtn.classList.add("close-tab");
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        closeTab(fileIndex);
      });
      tab.appendChild(closeBtn);
      
      tab.addEventListener("click", () => switchToFile(fileIndex));
      tabsContainer.appendChild(tab);
    });
  }

  function switchToFile(newIndex) {
    if (currentFileIndex !== -1) {
      uploadedFiles[currentFileIndex].content = codeEditor.getValue();
    }
    currentFileIndex = newIndex;
    if (!openTabs.includes(newIndex)) openTabs.push(newIndex);
    codeEditor.setValue(uploadedFiles[newIndex].content);
    updateTabsUI();
  }

  function closeTab(fileIndex) {
    const idx = openTabs.indexOf(fileIndex);
    if (idx > -1) openTabs.splice(idx, 1);
    if (currentFileIndex === fileIndex) {
      currentFileIndex = openTabs.length > 0 ? openTabs[0] : -1;
      codeEditor.setValue(currentFileIndex !== -1 ? uploadedFiles[currentFileIndex].content : "");
    }
    updateTabsUI();
  }

  // --- File Upload ---
  uploadPlaceholder.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", function(event) {
    const files = event.target.files;
    for (let file of files) {
      const reader = new FileReader();
      reader.onload = function(e) {
        const fileContent = e.target.result;
        uploadedFiles.push({ name: file.name, content: fileContent });
        updateFileList();
        if (currentFileIndex === -1) switchToFile(uploadedFiles.length - 1);
      };
      reader.readAsText(file);
    }
    fileInput.value = "";
  });

  // --- New, Rename, and Delete File ---
  newFileBtn.addEventListener("click", () => {
    showInlineInput("Enter new file name (with extension):", "", function(fileName) {
      if (fileName.trim() === "") {
        showMessage("error", "File name cannot be empty.");
        return;
      }
      if (uploadedFiles.some(f => f.name === fileName)) {
        showMessage("error", "File already exists.");
        return;
      }
      uploadedFiles.push({ name: fileName, content: "" });
      updateFileList();
      switchToFile(uploadedFiles.length - 1);
      showMessage("success", `File "${fileName}" created.`);
    });
  });

  renameFileBtn.addEventListener("click", () => {
    if (currentFileIndex === -1) {
      showMessage("error", "No file is open to rename.");
      return;
    }
    showInlineInput("Enter new file name:", uploadedFiles[currentFileIndex].name, function(newName) {
      if (newName.trim() === "") {
        showMessage("error", "File name cannot be empty.");
        return;
      }
      if (uploadedFiles.some((f, idx) => f.name === newName && idx !== currentFileIndex)) {
        showMessage("error", "Another file with this name exists.");
        return;
      }
      uploadedFiles[currentFileIndex].name = newName;
      updateFileList();
      updateTabsUI();
      showMessage("success", "File renamed successfully.");
    });
  });

  deleteFileBtn.addEventListener("click", () => {
    if (currentFileIndex === -1) {
      showMessage("error", "No file is open to delete.");
      return;
    }
    // Delete immediately (no confirm popup)
    const deletedFileName = uploadedFiles[currentFileIndex].name;
    uploadedFiles.splice(currentFileIndex, 1);
    const tabIdx = openTabs.indexOf(currentFileIndex);
    if (tabIdx > -1) openTabs.splice(tabIdx, 1);
    // Adjust indices in openTabs
    for (let i = 0; i < openTabs.length; i++) {
      if (openTabs[i] > currentFileIndex) openTabs[i]--;
    }
    currentFileIndex = openTabs.length > 0 ? openTabs[0] : -1;
    codeEditor.setValue(currentFileIndex !== -1 ? uploadedFiles[currentFileIndex].content : "");
    updateFileList();
    updateTabsUI();
    showMessage("warning", `File "${deletedFileName}" deleted.`);
  });

  // --- Save File ---
  saveButton.addEventListener("click", () => {
    if (currentFileIndex === -1) {
      showMessage("error", "No file open to save.");
      return;
    }
    uploadedFiles[currentFileIndex].content = codeEditor.getValue();
    const file = uploadedFiles[currentFileIndex];
    const blob = new Blob([file.content], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showMessage("success", `File "${file.name}" saved.`);
  });

  // --- Run File ---
  runButton.addEventListener("click", async () => {
    if (currentFileIndex === -1) {
      showMessage("error", "No file open to run.");
      return;
    }
    uploadedFiles[currentFileIndex].content = codeEditor.getValue();
    await runCurrentFile();
  });

  async function runCurrentFile() {
    const file = uploadedFiles[currentFileIndex];
    const code = file.content;
    const ext = file.name.split(".").pop().toLowerCase();

    if (ext === "js") {
      try {
        const originalLog = console.log;
        let outputBuffer = "";
        console.log = function (...args) {
          outputBuffer += args.join(" ") + "\n";
          originalLog.apply(console, args);
        };
        let result = eval(code);
        if (result !== undefined) outputBuffer += String(result) + "\n";
        term.write("\r\n" + outputBuffer);
        console.log = originalLog;
      } catch (err) {
        term.write("\r\nError: " + err.message + "\r\n");
      }
    } else if (ext === "html") {
      const previewWindow = window.open("", "_blank");
      previewWindow.document.open();
      previewWindow.document.write(code);
      previewWindow.document.close();
    } else if (ext === "py") {
      try {
        if (!window.pyodide) {
          window.pyodide = await loadPyodide();
        }
        await window.pyodide.runPythonAsync(`
import sys
from io import StringIO
sys.stdout = StringIO()
        `, { stdin: pyInput });
        await window.pyodide.runPythonAsync(code, { stdin: pyInput });
        let output = await window.pyodide.runPythonAsync(`sys.stdout.getvalue()`);
        term.write("\r\n" + output);
      } catch (err) {
        term.write("\r\nPython Error: " + err.message + "\r\n");
      }
    } else if (ext === "css") {
      term.write("\r\nCSS files cannot be executed.\r\n");
    } else {
      term.write(`\r\nNo runner available for .${ext} files.\r\n`);
    }
  }
});

document.addEventListener('DOMContentLoaded', function () {
  const landingPage = document.getElementById('landingPage');
  const startProjectBtn = document.getElementById('startProject');
  const projectIdeaInput = document.getElementById('projectIdea');
  const chatMessages = document.getElementById('chatMessages');

  startProjectBtn.addEventListener('click', async function () {
    const projectIdea = projectIdeaInput.value.trim();
    if (projectIdea) {
      landingPage.style.display = 'none';

      const response = await fetch('/openai_generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: projectIdea })
      });

      const data = await response.json();
      displayMessage(data.response, 'bot');
    }
  });

  function displayMessage(text, sender) {
    const message = document.createElement('div');
    message.classList.add(sender === 'bot' ? 'bot-message' : 'user-message');
    message.textContent = text;
    chatMessages.appendChild(message);
  }
});

document.querySelector(".dropbtn").addEventListener("click", function () {
  const dropdown = document.querySelector(".dropdown");
  dropdown.classList.toggle("active");
});

const terminalContainer = document.getElementById("terminalContainer");
const terminalResizeHandle = document.getElementById("terminalResizeHandle");

let isResizing = false;
let startY, startHeight;

terminalResizeHandle.addEventListener("mousedown", (e) => {
    isResizing = true;
    startY = e.clientY;
    startHeight = terminalContainer.offsetHeight;
    document.body.style.userSelect = "none"; // Prevent text selection while resizing
});

document.addEventListener("mousemove", (e) => {
    if (!isResizing) return;
    const newHeight = startHeight + (e.clientY - startY);
    terminalContainer.style.height = `${Math.max(100, Math.min(newHeight, 500))}px`; // Min and max height limits
});

document.addEventListener("mouseup", () => {
    isResizing = false;
    document.body.style.userSelect = "auto";
});


document.getElementById("hintButton").addEventListener("click", function () {
  addBotMessage("Here's a hint: Try breaking the problem into smaller parts.");
});

document.getElementById("exampleButton").addEventListener("click", function () {
  addBotMessage("Example: If you're working with loops, try using a 'for' loop to iterate over a list.");
});

function addBotMessage(message) {
  const chatMessages = document.getElementById("chatMessages");
  const messageElement = document.createElement("div");
  messageElement.classList.add("bot-message");
  messageElement.textContent = message;
  chatMessages.appendChild(messageElement);
  chatMessages.scrollTop = chatMessages.scrollHeight; // Auto-scroll to latest message
}
