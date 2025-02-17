// ================== File, Editor, Terminal, and File Management Code ==================
document.addEventListener('DOMContentLoaded', async function () {
  // --- Message Bar Function ---
  function showMessage(type, message, duration = 3000) {
    const messageBar = document.getElementById("messageBar");
    messageBar.textContent = message;
    messageBar.className = `message-bar ${type}`;
    messageBar.style.opacity = "1";
    messageBar.classList.remove("hidden");
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
    const existingInput = document.querySelector(".inline-input-container");
    if (existingInput) existingInput.remove();

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

    const uploadPlaceholder = document.getElementById("uploadPlaceholder");
    uploadPlaceholder.parentNode.insertBefore(container, uploadPlaceholder);

    input.focus();
    input.addEventListener("input", () => {
      input.scrollLeft = input.scrollWidth;
    });

    okButton.addEventListener("click", () => {
      if (input.value.trim() === "") {
        showMessage("error", "File name cannot be empty.");
        return;
      }
      callback(input.value);
      container.remove();
    });

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

  // --- Editor and CodeMirror Instance ---
  const editorTextarea = document.getElementById('editor');
  const codeEditor = CodeMirror.fromTextArea(editorTextarea, {
    mode: "javascript", // Default; will update based on file extension
    theme: "dracula",
    lineNumbers: true,
    indentUnit: 2,
    tabSize: 2,
    lineWrapping: true,
    matchBrackets: true,
    autoCloseBrackets: true,
    extraKeys: { "Ctrl-Space": "autocomplete" }
  });
  const tabsContainer = document.getElementById('tabsContainer');

  // --- Function to Detect and Set Syntax Mode ---
  function updateEditorMode(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    let mode = "javascript"; // Default
    if (ext === "html") mode = "htmlmixed";
    else if (ext === "css") mode = "css";
    else if (ext === "js") mode = "javascript";
    else if (ext === "json") mode = { name: "javascript", json: true };
    else if (ext === "py") mode = "python";
    else if (ext === "java") mode = "text/x-java";
    else if (ext === "c" || ext === "h") mode = "text/x-csrc";
    else if (ext === "cpp" || ext === "hpp") mode = "text/x-c++src";
    else if (ext === "sh") mode = "text/x-sh";
    else if (ext === "sql") mode = "text/x-sql";
    codeEditor.setOption("mode", mode);
    codeEditor.refresh();  // Force refresh so new mode is applied
  }

  // --- Update Mode When Switching Files ---
  function switchToFile(newIndex) {
    if (currentFileIndex !== -1) {
      uploadedFiles[currentFileIndex].content = codeEditor.getValue();
    }
    currentFileIndex = newIndex;
    if (!openTabs.includes(newIndex)) openTabs.push(newIndex);
    codeEditor.setValue(uploadedFiles[newIndex].content);
    updateEditorMode(uploadedFiles[newIndex].name);
    updateTabsUI();
  }

  // --- Terminal Integration using xterm.js ---
  const term = new Terminal({
    wordWrap: true // Enable wrapping for long text
  });
  term.open(document.getElementById('terminal'));

  // Helper to normalize newlines
  function normalizeNewlines(str) {
    return str.replace(/\r?\n/g, "\r\n");
  }

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
  function adjustTerminalScroll() {
    term.scrollToBottom();
  }

  // Combined onData handler for xterm.js
  term.onData(e => {
    term.write(e);
    setTimeout(adjustTerminalScroll, 10);
    if (waitingForPythonInput) {
      if (e === "\r") {
        term.write("\r\n");
        const line = pythonInputBuffer;
        pythonInputBuffer = "";
        waitingForPythonInput = false;
        if (pythonInputResolver) {
          pythonInputResolver(line);
          pythonInputResolver = null;
        }
      } else if (e === "\u007F") {
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
    updateEditorMode(uploadedFiles[newIndex].name);
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
  document.getElementById("uploadFile").addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", function (event) {
    const files = event.target.files;
    for (let file of files) {
      const reader = new FileReader();
      reader.onload = function (e) {
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
    showInlineInput("Enter new file name (with extension):", "", function (fileName) {
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
    showInlineInput("Enter new file name:", uploadedFiles[currentFileIndex].name, function (newName) {
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
    const deletedFileName = uploadedFiles[currentFileIndex].name;
    uploadedFiles.splice(currentFileIndex, 1);
    const tabIdx = openTabs.indexOf(currentFileIndex);
    if (tabIdx > -1) openTabs.splice(tabIdx, 1);
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
  document.getElementById("saveButton").addEventListener("click", () => {
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
  document.getElementById("runButton").addEventListener("click", async () => {
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
        term.write("\r\n" + normalizeNewlines(outputBuffer));
        console.log = originalLog;
      } catch (err) {
        term.write("\r\nError: " + normalizeNewlines(err.message) + "\r\n");
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
        term.write("\r\n" + normalizeNewlines(output));
      } catch (err) {
        term.write("\r\nPython Error: " + normalizeNewlines(err.message) + "\r\n");
      }
    } else if (ext === "css") {
      term.write("\r\nCSS files cannot be executed.\r\n");
    } else {
      term.write(`\r\nNo runner available for .${ext} files.\r\n`);
    }
  }

  // Helper: Normalize newlines to \r\n for consistent terminal formatting
  function normalizeNewlines(str) {
    return str.replace(/\r?\n/g, "\r\n");
  }
});
  
// ================== Chat Bot Hardcoded Conversation & Dropdown Toggle ==================
document.addEventListener('DOMContentLoaded', function () {
  const landingPage = document.getElementById('landingPage');
  const startProjectBtn = document.getElementById('startProject');
  const projectIdeaInput = document.getElementById('projectIdea');
  const chatMessages = document.getElementById('chatMessages');
  const hintButton = document.getElementById("hintButton");
  const exampleButton = document.getElementById("exampleButton");

  // --- Typing Effect for Bot Messages ---
  function typeMessage(element, text, index = 0, speed = 30) {
    if (index < text.length) {
      element.textContent += text[index];
      setTimeout(() => typeMessage(element, text, index + 1, speed), speed);
    } else {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }

  // --- Display Message Function ---
  function displayMessage(text, sender) {
    const message = document.createElement('div');
    message.classList.add(sender === 'bot' ? 'bot-message' : 'user-message');
    
    if (sender === 'user') {
      message.classList.add('bounce-in');
      message.textContent = text;
      chatMessages.appendChild(message);
    } else {
      chatMessages.appendChild(message);
      typeMessage(message, text);
    }
  }

  // --- Hardcoded Chat Conversation Sequence ---
  let hintPromiseResolve = null;
  let examplePromiseResolve = null;
  let secondHintPromiseResolve = null;

  // When hint button is clicked, resolve any waiting promise.
  hintButton.addEventListener("click", function () {
    displayMessage("Hint, please!", "user");
    if (hintPromiseResolve) {
      displayMessage("When loading a file, make sure you use the correct file path.", "bot");
      hintPromiseResolve();
      hintPromiseResolve = null;
    } else if (secondHintPromiseResolve) {
      displayMessage("Make sure you converted your number strings to integers!", "bot");
      secondHintPromiseResolve();
      secondHintPromiseResolve = null;
    }
  });

  // When example button is clicked, resolve waiting promise.
  exampleButton.addEventListener("click", function () {
    displayMessage("Give me an example.", "user");
    if (examplePromiseResolve) {
      displayMessage(
        "This is a short example on how storing the variables will look:\n" +
        "line = file.readline().strip()  # Read the first line and remove whitespace\n" +
        "parts = line.split()  # Split by spaces\n" +
        "num1, num2, operation = parts[0], parts[1], parts[2]",
        "bot"
      );
      examplePromiseResolve();
      examplePromiseResolve = null;
    }
  });

  // Dropdown Toggle for File Options
  const dropbtn = document.querySelector(".dropbtn");
  dropbtn.addEventListener("click", function () {
    const dropdown = document.querySelector(".dropdown");
    dropdown.classList.toggle("active");
  });

  // Terminal Resizing (if not already added)
  const terminalContainer = document.getElementById("terminalContainer");
  const terminalResizeHandle = document.getElementById("terminalResizeHandle");
  let isResizing = false;
  let startY, startHeight;

  terminalResizeHandle.addEventListener("mousedown", (e) => {
    isResizing = true;
    startY = e.clientY;
    startHeight = terminalContainer.offsetHeight;
    document.body.style.userSelect = "none";
  });

  document.addEventListener("mousemove", (e) => {
    if (!isResizing) return;
    const newHeight = startHeight + (e.clientY - startY);
    terminalContainer.style.height = `${Math.max(100, Math.min(newHeight, 500))}px`;
  });

  document.addEventListener("mouseup", () => {
    isResizing = false;
    document.body.style.userSelect = "auto";
  });

  // ---------------- Hardcoded Conversation Sequence ----------------
  async function runSequence() {
    // Hardcoded project idea (ignoring input field)
    const projectIdea = "A simple calculator program that reads num1 and num2 and the operation from another open file, in Python.";
    displayMessage(projectIdea, "user");
    landingPage.style.display = 'none';

    // Step 0:
    displayMessage("Hmmm, we should first create a file that will hold all of our code!", "bot");
    await new Promise(resolve => setTimeout(resolve, 15000)); // wait 10 sec

    // Step 1:
    displayMessage("Wait! Make sure to upload your file containing your numbers!", "bot");
    await new Promise(resolve => setTimeout(resolve, 10000)); // wait 10 sec

    // Step 2:
    displayMessage("Great!", "bot");
    await new Promise(resolve => setTimeout(resolve, 3000)); // wait 3 sec

    // Step 3:
    displayMessage("If you're stuck, try writing a function that opens the file holding our numbers!", "bot");
    await new Promise(resolve => setTimeout(resolve, 30000)); // wait 15 sec

    // Step 4:
    displayMessage("Whoops! Looks like there was a small error, can you spot it?", "bot");
    // Wait until user clicks hint button.
    await new Promise(resolve => { hintPromiseResolve = resolve; });

    // Step 5:
    await new Promise(resolve => setTimeout(resolve, 10000)); // wait 10 sec
    displayMessage("AMAZING!", "bot");
    await new Promise(resolve => setTimeout(resolve, 3000)); // wait 3 sec

    // Step 6:
    displayMessage("Now that we've loaded the file, we should find a way to stores the numbers in their own variables! Then we can easily make the calculation.", "bot");
    await new Promise(resolve => setTimeout(resolve, 30000)); // wait 10 sec

    // Step 7: Wait for user to click example button.
    await new Promise(resolve => { examplePromiseResolve = resolve; });

    // Step 8:
    await new Promise(resolve => setTimeout(resolve, 10000)); // wait 20 sec
    displayMessage("You're doing amazing. Keep it up.", "bot");
    await new Promise(resolve => setTimeout(resolve, 5000)); // wait 5 sec

    // Step 9:
    displayMessage("If we have our variables, and we want to return the outcome, how can we do this?", "bot");
    await new Promise(resolve => setTimeout(resolve, 10000)); // wait 10 sec

    // Step 10:
    displayMessage("Try a simple if/elif block, and some arithmetic!", "bot");
    await new Promise(resolve => setTimeout(resolve, 10000)); // wait 10 sec

    // Step 11: Wait for second hint button press.
    await new Promise(resolve => { secondHintPromiseResolve = resolve; });

    displayMessage("You're close, now call your function in a print statement to run it!", "bot");
    await new Promise(resolve => setTimeout(resolve, 5000)); // wait 5 sec

    // Step 12:
    await new Promise(resolve => setTimeout(resolve, 15000)); // wait 15 sec
    displayMessage("AWESOME! You finished the project, great job!", "bot");
  }

  // Start the hardcoded conversation when Start Project is clicked.
  startProjectBtn.addEventListener('click', function () {
    // Ignore textarea input and run the hardcoded sequence.
    runSequence();
  });
});
