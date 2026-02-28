const { app, BrowserWindow, screen, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');

let quizWin = null;
let ninjaWin = null;
let dockNinjaWin = null;
let chatWin = null;
let calendarWin = null;
let savedQuestions = [];
let savedExams = [];

const MINIMAX_API_KEY = 'sk-api-2Jjgnmytz_ZH7aiIl_0ICkmqSkgYXfWO35ck4atu3Ujcyjv0Bu9ZyUN3wOaBYJnjmkeKHqmath7wFUJKsxCmGMc01QE8tUcPnm_I3ulK_x3s4gMaMOcSLQA';
const ELEVENLABS_API_KEY = '508eba8b0541bcefd574168a49f09e2ea7debae855e9675eb826ce44d5db2ef6';
const ELEVENLABS_AGENT_ID = 'agent_6601kjj54mwgf10rjmp88p06fecq';

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

// Exams persistence
function getExamsPath() {
  const dir = path.join(app.getPath('userData'), 'studyyyy-data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'exams.json');
}

function saveExams(exams) {
  savedExams = exams;
  fs.writeFileSync(getExamsPath(), JSON.stringify(exams, null, 2));
}

function loadExams() {
  const p = getExamsPath();
  if (fs.existsSync(p)) {
    try {
      savedExams = JSON.parse(fs.readFileSync(p, 'utf-8'));
    } catch (e) {
      savedExams = [];
    }
  }
  return savedExams;
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

  let pomodoroWin = null;
  let pomodoroMode = 'menu'; // Track current mode

  function createPomodoroWindow() {
    if (pomodoroWin) return;
    const [x, y] = win.getPosition();
    pomodoroWin = new BrowserWindow({
      width: 250,
      height: 190, // Start with menu size
      x: x + winWidth,
      y: y,
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
    pomodoroWin.loadFile('pomodoro.html');
    pomodoroWin.on('closed', () => {
      pomodoroWin = null;
    });
  }

  function togglePomodoro() {
    if (pomodoroWin) {
      pomodoroWin.close();
    } else {
      createPomodoroWindow();
    }
  }

  ipcMain.on('toggle-pomodoro', () => {
    togglePomodoro();
  });

  ipcMain.on('close-pomodoro', () => {
    if (pomodoroWin && !pomodoroWin.isDestroyed()) {
      pomodoroWin.close();
      pomodoroWin = null;
    }
  });

  ipcMain.on('resize-pomodoro', (event, mode) => {
    pomodoroMode = mode;
    if (pomodoroWin && !pomodoroWin.isDestroyed()) {
      if (mode === 'mini') {
        pomodoroWin.setSize(150, 150);
        pomodoroWin.setPosition(20, 20); // Top left area
      } else if (win && !win.isDestroyed()) {
        const [x, y] = win.getPosition();
        if (mode === 'menu') {
          pomodoroWin.setSize(250, 190);
        } else if (mode === 'timer') {
          pomodoroWin.setSize(250, 420);
        } else if (mode === 'planner') {
          pomodoroWin.setSize(250, 420);
        }
        pomodoroWin.setPosition(x + winWidth, y);
      }
    }
  });

  win.on('move', () => {
    if (pomodoroWin && !pomodoroWin.isDestroyed() && pomodoroMode !== 'mini') {
      const [wx, wy] = win.getPosition();
      try {
        pomodoroWin.setPosition(wx + winWidth, wy);
      } catch (e) {}
    }
  });

  // Auto-hide: slide off-screen after inactivity
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

  // === Dock Ninja (sits above dock) ===
  const dockW = 160;
  const dockH = 160;
  dockNinjaWin = new BrowserWindow({
    width: dockW,
    height: dockH,
    x: Math.round((screenW - dockW) / 2),
    y: workY + workHeight - dockH,
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
  dockNinjaWin.loadFile('ninja-dock.html');

  // === Chat window ===
  ipcMain.on('open-ninja-chat', () => {
    if (chatWin && !chatWin.isDestroyed()) {
      chatWin.focus();
      return;
    }

    const cw = 350;
    const ch = 450;
    const dockX = Math.round((screenW - dockW) / 2);

    chatWin = new BrowserWindow({
      width: cw,
      height: ch,
      x: dockX + Math.round((dockW - cw) / 2),
      y: workY + workHeight - dockH - ch - 10,
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

    chatWin.loadFile('ninja-chat.html');
    chatWin.webContents.on('did-finish-load', () => {
      chatWin.webContents.send('ninja-greeting');
    });
    chatWin.on('closed', () => { chatWin = null; });
  });

  ipcMain.on('close-ninja-chat', () => {
    if (chatWin && !chatWin.isDestroyed()) chatWin.close();
  });

  ipcMain.on('ninja-talking-state', (event, isTalking) => {
    if (dockNinjaWin && !dockNinjaWin.isDestroyed()) {
      dockNinjaWin.webContents.send('ninja-state', isTalking);
    }
    if (ninjaWin && !ninjaWin.isDestroyed()) {
      ninjaWin.webContents.send('ninja-state', isTalking);
    }
  });

  // === Voice client tool IPC handlers ===
  ipcMain.on('voice-start-pomodoro', (_, params) => {
    // Open pomodoro if not open, then send start command
    if (!pomodoroWin || pomodoroWin.isDestroyed()) {
      createPomodoroWindow();
    }
    // Wait for window to load, then send params
    const sendStart = () => {
      if (pomodoroWin && !pomodoroWin.isDestroyed()) {
        pomodoroWin.webContents.send('voice-start-pomodoro', params);
      }
    };
    if (pomodoroWin.webContents.isLoading()) {
      pomodoroWin.webContents.on('did-finish-load', sendStart);
    } else {
      sendStart();
    }
  });

  ipcMain.on('voice-stop-pomodoro', () => {
    if (pomodoroWin && !pomodoroWin.isDestroyed()) {
      pomodoroWin.webContents.send('voice-stop-pomodoro');
    }
  });

  ipcMain.on('voice-add-exam', (_, params) => {
    // Save exam directly and open calendar
    const exams = loadExams();
    exams.push({ subject: params.subject, date: params.date });
    saveExams(exams);
    // Open calendar to show the new exam
    if (calendarWin && !calendarWin.isDestroyed()) {
      calendarWin.webContents.send('exams-updated');
    }
  });

  ipcMain.on('voice-start-quiz', () => {
    const questions = loadQuestions();
    if (questions.length > 0) {
      openNinja(questions[Math.floor(Math.random() * questions.length)]);
    }
  });

  // ElevenLabs signed URL for voice conversation
  ipcMain.handle('get-signed-url', async () => {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${ELEVENLABS_AGENT_ID}`,
      { headers: { 'xi-api-key': ELEVENLABS_API_KEY } }
    );
    if (!res.ok) throw new Error('Failed to get signed URL');
    const data = await res.json();
    return data.signed_url;
  });

  // === Calendar window ===
  ipcMain.on('open-calendar', () => {
    if (calendarWin && !calendarWin.isDestroyed()) {
      calendarWin.focus();
      return;
    }

    const cw = 400;
    const ch = 500;

    calendarWin = new BrowserWindow({
      width: cw,
      height: ch,
      x: Math.round((screenW - cw) / 2),
      y: workY + Math.round((workHeight - ch) / 2),
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

    calendarWin.loadFile('calendar.html');
    calendarWin.on('closed', () => { calendarWin = null; });
  });

  ipcMain.on('close-calendar', () => {
    if (calendarWin && !calendarWin.isDestroyed()) calendarWin.close();
  });

  // Exam persistence IPC
  ipcMain.handle('get-exams', () => {
    return loadExams();
  });

  ipcMain.on('save-exams', (_, exams) => {
    saveExams(exams);
  });

  // Spaced repetition checker — runs on startup and hourly
  function checkSpacedRepetition() {
    const exams = loadExams();
    if (exams.length === 0) return;

    const today = new Date();
    const todayStr = today.getFullYear() + '-' +
      String(today.getMonth() + 1).padStart(2, '0') + '-' +
      String(today.getDate()).padStart(2, '0');

    const REVIEW_OFFSETS = [14, 7, 3, 1];

    for (const exam of exams) {
      const examDate = new Date(exam.date + 'T00:00:00');
      for (const offset of REVIEW_OFFSETS) {
        const reviewDate = new Date(examDate);
        reviewDate.setDate(reviewDate.getDate() - offset);
        const reviewStr = reviewDate.getFullYear() + '-' +
          String(reviewDate.getMonth() + 1).padStart(2, '0') + '-' +
          String(reviewDate.getDate()).padStart(2, '0');

        if (reviewStr === todayStr) {
          const daysUntil = Math.ceil((examDate - today.setHours(0,0,0,0)) / (1000*60*60*24));
          openNinja({
            question: `Time to review for ${exam.subject}! Your exam is in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}.`,
            answer: `Study tip: Focus on the areas you find most challenging for ${exam.subject}.`
          });
          return; // Only show one reminder at a time
        }
      }
    }
  }

  // Check on startup (delayed) and every hour
  setTimeout(checkSpacedRepetition, 5000);
  setInterval(checkSpacedRepetition, 60 * 60 * 1000);

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
