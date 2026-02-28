const { app, BrowserWindow, screen, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');

let quizWin = null;
let ninjaWin = null;
let savedQuestions = [];

// Questions persistence
function getQuestionsPath() {
  const dir = path.join(app.getPath('userData'), 'studyyyy-data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'questions.json');
}

function saveQuestions(questions) {
  savedQuestions = questions;
  fs.writeFileSync(getQuestionsPath(), JSON.stringify(questions, null, 2));
}

function loadQuestions() {
  const p = getQuestionsPath();
  if (fs.existsSync(p)) {
    try {
      savedQuestions = JSON.parse(fs.readFileSync(p, 'utf-8'));
    } catch (e) {
      savedQuestions = [];
    }
  }
  return savedQuestions;
}

function createWindow() {
  const display = screen.getPrimaryDisplay();
  const { width: screenW, height: workHeight } = display.workAreaSize;
  const { y: workY } = display.workArea;

  const winWidth = 230;
  const winHeight = 500;
  const yPos = workY + Math.round((workHeight - winHeight) / 2);

  const win = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: 0,
    y: yPos,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    movable: true,
    skipTaskbar: true,
    transparent: true,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadFile('index.html');

  // Load saved questions on startup
  const loaded = loadQuestions();
  win.webContents.on('did-finish-load', () => {
    if (loaded.length > 0) {
      win.webContents.send('saved-questions-loaded', loaded);
      startRecallTimer(loaded);
    }
  });

  // Auto-hide sidebar
  let hideTimeout = null;
  const peekWidth = 6;

  function slideOut() {
    const [x, y] = win.getPosition();
    const targetX = -(winWidth - peekWidth);
    animateTo(win, x, targetX, y);
    win.webContents.send('hidden-state', true);
  }

  function slideIn() {
    const [x, y] = win.getPosition();
    animateTo(win, x, 0, y);
    win.webContents.send('hidden-state', false);
  }

  function resetTimer() {
    if (hideTimeout) clearTimeout(hideTimeout);
    hideTimeout = setTimeout(slideOut, 2000);
  }

  ipcMain.on('mouse-enter', () => {
    if (hideTimeout) clearTimeout(hideTimeout);
    const [x] = win.getPosition();
    if (x < 0) slideIn();
  });

  ipcMain.on('mouse-leave', () => { resetTimer(); });
  ipcMain.on('dragging', () => { if (hideTimeout) clearTimeout(hideTimeout); });
  ipcMain.on('drag-end', () => { resetTimer(); });

  // Open full quiz overlay (for initial generation)
  ipcMain.on('open-quiz', (_, questions) => {
    if (quizWin && !quizWin.isDestroyed()) {
      quizWin.focus();
      quizWin.webContents.send('load-questions', questions);
      return;
    }

    const qw = 420;
    const qh = 520;

    quizWin = new BrowserWindow({
      width: qw,
      height: qh,
      x: Math.round((screenW - qw) / 2),
      y: workY + Math.round((workHeight - qh) / 2),
      frame: false,
      alwaysOnTop: true,
      resizable: false,
      movable: true,
      transparent: true,
      hasShadow: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    quizWin.loadFile('quiz.html');
    quizWin.webContents.on('did-finish-load', () => {
      quizWin.webContents.send('load-questions', questions);
    });
    quizWin.on('closed', () => { quizWin = null; });
  });

  ipcMain.on('set-window-height', (event, newHeight) => {
    const [width] = win.getSize();
    win.setSize(width, newHeight, true);
  });

  ipcMain.on('close-quiz', () => {
    if (quizWin && !quizWin.isDestroyed()) quizWin.close();
  });

  // Ninja popup from right side
  function openNinja(question) {
    if (ninjaWin && !ninjaWin.isDestroyed()) {
      ninjaWin.webContents.send('load-question', question);
      ninjaSlideIn();
      return;
    }

    const nw = 280;
    const nh = 380;
    const startX = screenW; // start off-screen right

    ninjaWin = new BrowserWindow({
      width: nw,
      height: nh,
      x: startX,
      y: workY + Math.round((workHeight - nh) / 2),
      frame: false,
      alwaysOnTop: true,
      resizable: false,
      movable: false,
      skipTaskbar: true,
      transparent: true,
      hasShadow: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    ninjaWin.loadFile('ninja.html');
    ninjaWin.webContents.on('did-finish-load', () => {
      ninjaWin.webContents.send('load-question', question);
      ninjaSlideIn();
    });
    ninjaWin.on('closed', () => { ninjaWin = null; });
  }

  function ninjaSlideIn() {
    if (!ninjaWin || ninjaWin.isDestroyed()) return;
    ninjaWin.show();
    const [x, y] = ninjaWin.getPosition();
    const targetX = screenW - 290;
    animateTo(ninjaWin, x, targetX, y);
  }

  function ninjaSlideOut() {
    if (!ninjaWin || ninjaWin.isDestroyed()) return;
    const [x, y] = ninjaWin.getPosition();
    animateTo(ninjaWin, x, screenW + 50, y, () => {
      if (ninjaWin && !ninjaWin.isDestroyed()) ninjaWin.hide();
    });
  }

  ipcMain.on('dismiss-ninja', () => {
    ninjaSlideOut();
  });

  // Debug: test ninja with a sample question
  ipcMain.on('test-ninja', () => {
    const testQ = savedQuestions.length > 0
      ? savedQuestions[Math.floor(Math.random() * savedQuestions.length)]
      : { question: 'What is 2 + 2?', answer: '4' };
    openNinja(testQ);
  });

  // Save questions
  ipcMain.on('save-questions', (_, questions) => {
    saveQuestions(questions);
  });

  // Load saved questions request
  ipcMain.handle('get-saved-questions', () => {
    return loadQuestions();
  });

  // Periodic recall timer — ninja pops up
  let recallInterval = null;

  function startRecallTimer(questions) {
    if (recallInterval) clearInterval(recallInterval);
    recallInterval = setInterval(() => {
      if (win.isDestroyed()) { clearInterval(recallInterval); return; }
      if (questions.length === 0) return;
      const idx = Math.floor(Math.random() * questions.length);
      openNinja(questions[idx]);
    }, 10 * 60 * 1000);
  }

  ipcMain.on('start-recall-timer', (_, questions) => {
    saveQuestions(questions);
    startRecallTimer(questions);
  });

  ipcMain.on('stop-recall-timer', () => {
    if (recallInterval) { clearInterval(recallInterval); recallInterval = null; }
  });

  // PDF file picker
  ipcMain.handle('pick-pdf', async () => {
    const result = await dialog.showOpenDialog(win, {
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const buf = fs.readFileSync(result.filePaths[0]);
    const data = await pdfParse(buf);
    return data.text;
  });

  resetTimer();
}

// Animation helper
const animIntervals = new Map();

function animateTo(win, fromX, toX, fixedY, onDone) {
  const id = win.id;
  if (animIntervals.has(id)) clearInterval(animIntervals.get(id));
  const steps = 14;
  let step = 0;
  const y = parseInt(fixedY, 10);
  const interval = setInterval(() => {
    if (win.isDestroyed()) { clearInterval(interval); animIntervals.delete(id); return; }
    step++;
    const ease = 1 - Math.pow(1 - step / steps, 3);
    const x = parseInt(fromX + (toX - fromX) * ease, 10);
    try { win.setPosition(x, y); } catch (e) {}
    if (step >= steps) {
      clearInterval(interval);
      animIntervals.delete(id);
      if (onDone) onDone();
    }
  }, 16);
  animIntervals.set(id, interval);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
