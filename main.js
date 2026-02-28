const { app, BrowserWindow, screen, ipcMain, dialog } = require('electron');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { PDFParse } = require('pdf-parse');

let quizWin = null;
let ninjaWin = null;
let dockNinjaWin = null;
let chatWin = null;
let voiceQuizQuestions = null;
let calendarWin = null;
let blurWin = null;
let flashcardsWin = null;
let reverseTeachingWin = null;
let savedQuestions = [];
let savedExams = [];
let currentStudyMaterial = ''; // Full text, available during session only
let todayTasks = []; // Study tasks for today

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

// Today's study tasks persistence
function getTodayTasksPath() {
  const dir = path.join(app.getPath('userData'), 'studyyyy-data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'today-tasks.json');
}

function saveTodayTasks() {
  const today = new Date().toISOString().split('T')[0];
  fs.writeFileSync(getTodayTasksPath(), JSON.stringify({ date: today, tasks: todayTasks }, null, 2));
}

function loadTodayTasks() {
  const p = getTodayTasksPath();
  if (fs.existsSync(p)) {
    try {
      const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
      const today = new Date().toISOString().split('T')[0];
      if (data.date === today) {
        todayTasks = data.tasks || [];
      } else {
        // Old tasks from a different day — clear them
        todayTasks = [];
      }
    } catch (e) {
      todayTasks = [];
    }
  }
}

// Learning memory persistence
function getMemoryPath() {
  const dir = path.join(app.getPath('userData'), 'studyyyy-data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'memory.json');
}

function loadMemory() {
  const p = getMemoryPath();
  if (fs.existsSync(p)) {
    try {
      return JSON.parse(fs.readFileSync(p, 'utf-8'));
    } catch (e) {}
  }
  return {
    learningProfile: { subjects: [], strengths: [], struggles: [], preferredStyle: '', energyPattern: '' },
    entries: []
  };
}

function saveMemory(memory) {
  fs.writeFileSync(getMemoryPath(), JSON.stringify(memory, null, 2));
}

async function extractMemoryFromTranscript(transcript) {
  try {
    const res = await fetch('https://api.minimax.io/v1/text/chatcompletion_v2', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + MINIMAX_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'MiniMax-M2',
        messages: [
          {
            role: 'system',
            content: 'Extract learning insights from this study conversation transcript. Return ONLY a JSON object with these keys:\n- "summary": one sentence summary of the conversation\n- "topics": array of subject/topic strings discussed\n- "insights": array of specific things learned, struggled with, or preferences noted\n- "strengths": array of topics the user seems confident about\n- "struggles": array of topics the user needs help with\n- "preferredStyle": string describing learning preference if mentioned (or empty string)\n- "energyPattern": string describing energy level if mentioned (or empty string)\nNo markdown, no explanation, just the JSON object.'
          },
          { role: 'user', content: transcript }
        ],
        temperature: 0.3,
        max_tokens: 512,
      }),
    });
    const data = await res.json();
    const text = data.choices[0].message.content.trim();
    const jsonStr = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('Memory extraction failed:', e);
    return null;
  }
}

function mergeMemory(existing, extracted, source) {
  const entry = {
    timestamp: new Date().toISOString(),
    source,
    summary: extracted.summary || '',
    topics: extracted.topics || [],
    insights: extracted.insights || []
  };
  existing.entries.push(entry);

  // Keep last 50 entries
  if (existing.entries.length > 50) {
    existing.entries = existing.entries.slice(-50);
  }

  // Merge profile arrays (deduplicate)
  const addUnique = (arr, items) => [...new Set([...arr, ...items])];
  if (extracted.subjects || extracted.topics) {
    existing.learningProfile.subjects = addUnique(existing.learningProfile.subjects, extracted.topics || []);
  }
  if (extracted.strengths) {
    existing.learningProfile.strengths = addUnique(existing.learningProfile.strengths, extracted.strengths);
  }
  if (extracted.struggles) {
    existing.learningProfile.struggles = addUnique(existing.learningProfile.struggles, extracted.struggles);
  }
  if (extracted.preferredStyle) {
    existing.learningProfile.preferredStyle = extracted.preferredStyle;
  }
  if (extracted.energyPattern) {
    existing.learningProfile.energyPattern = extracted.energyPattern;
  }

  return existing;
}

function buildMemoryContext() {
  const memory = loadMemory();
  const profile = memory.learningProfile;
  const recentEntries = memory.entries.slice(-5);

  let context = '';
  if (profile.subjects.length > 0) context += `Subjects studied: ${profile.subjects.join(', ')}.\n`;
  if (profile.strengths.length > 0) context += `Strengths: ${profile.strengths.join(', ')}.\n`;
  if (profile.struggles.length > 0) context += `Struggles with: ${profile.struggles.join(', ')}.\n`;
  if (profile.preferredStyle) context += `Learning style: ${profile.preferredStyle}.\n`;
  if (profile.energyPattern) context += `Energy pattern: ${profile.energyPattern}.\n`;

  if (recentEntries.length > 0) {
    context += '\nRecent sessions:\n';
    recentEntries.forEach(e => {
      context += `- ${e.summary}\n`;
    });
  }

  // Include full study material for current session if available
  if (currentStudyMaterial) {
    context += '\n--- Current Study Material ---\n';
    // Cap at 4000 chars to avoid overloading the agent prompt
    context += currentStudyMaterial.length > 4000
      ? currentStudyMaterial.substring(0, 4000) + '\n... (truncated)'
      : currentStudyMaterial;
    context += '\n--- End Study Material ---\n';
  }

  return context;
}

async function summarizeStudyMaterial(text) {
  try {
    const res = await fetch('https://api.minimax.io/v1/text/chatcompletion_v2', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + MINIMAX_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'MiniMax-M2',
        messages: [
          {
            role: 'system',
            content: 'Summarize this study material into a brief description (2-3 sentences max). Include the subject, main topics covered, and key concepts. Return ONLY the summary text, nothing else.'
          },
          { role: 'user', content: text.substring(0, 6000) }
        ],
        temperature: 0.3,
        max_tokens: 256,
      }),
    });
    const data = await res.json();
    return data.choices[0].message.content.trim();
  } catch (e) {
    console.error('Study material summarization failed:', e);
    return null;
  }
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
    icon: path.join(__dirname, 'mov/cover.png'),
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
      icon: path.join(__dirname, 'mov/cover.png'),
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
      icon: path.join(__dirname, 'mov/cover.png'),
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

    const nw = 420;
    const nh = 570;
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
      icon: path.join(__dirname, 'mov/cover.png'),
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
    const targetX = screenW - 430;
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
  const dockW = 180;
  const dockH = 300;
  dockNinjaWin = new BrowserWindow({
    width: dockW,
    height: dockH,
    x: screenW - dockW - 20,
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
    icon: path.join(__dirname, 'mov/cover.png'),
  });
  dockNinjaWin.setIgnoreMouseEvents(true, { forward: true });
  dockNinjaWin.loadFile('ninja-dock.html');

  // === Chat window ===
  ipcMain.on('open-ninja-chat', () => {
    if (chatWin && !chatWin.isDestroyed()) {
      chatWin.focus();
      return;
    }

    const cw = 350;
    const ch = 450;
    const dockX = Math.round((screenW - 180) / 2);

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
      icon: path.join(__dirname, 'mov/cover.png'),
    });

    chatWin.loadFile('ninja-chat.html');
    chatWin.webContents.openDevTools({ mode: 'detach' });
    chatWin.webContents.on('did-finish-load', () => {
      chatWin.webContents.send('ninja-greeting');
    });
    chatWin.on('closed', () => { chatWin = null; });
  });

  ipcMain.on('close-ninja-chat', () => {
    if (chatWin && !chatWin.isDestroyed()) chatWin.close();
  });

  // Voice quiz mode — open chat with active recall questions
  ipcMain.on('open-ninja-chat-quiz', (_, questions) => {
    voiceQuizQuestions = questions;

    if (chatWin && !chatWin.isDestroyed()) {
      chatWin.webContents.send('ninja-greeting-quiz', questions);
      chatWin.focus();
      return;
    }

    const cw = 350;
    const ch = 450;
    const dockX = Math.round((screenW - 180) / 2);

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
      icon: path.join(__dirname, 'mov/cover.png'),
    });

    chatWin.loadFile('ninja-chat.html');
    chatWin.webContents.on('did-finish-load', () => {
      chatWin.webContents.send('ninja-greeting-quiz', questions);
    });
    chatWin.on('closed', () => { chatWin = null; voiceQuizQuestions = null; });
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
  ipcMain.on('voice-set-study-tasks', (_, tasks) => {
    // Save tasks with today's date
    todayTasks = tasks.map(t => ({ ...t, done: false }));
    saveTodayTasks();

    if (!pomodoroWin || pomodoroWin.isDestroyed()) {
      createPomodoroWindow();
    }
    const sendTasks = () => {
      if (pomodoroWin && !pomodoroWin.isDestroyed()) {
        pomodoroWin.webContents.send('load-study-tasks', todayTasks);
      }
    };
    if (pomodoroWin.webContents.isLoading()) {
      pomodoroWin.webContents.on('did-finish-load', sendTasks);
    } else {
      sendTasks();
    }
  });

  ipcMain.handle('get-today-tasks', () => {
    loadTodayTasks();
    return todayTasks;
  });

  ipcMain.on('update-today-tasks', (_, tasks) => {
    todayTasks = tasks;
    saveTodayTasks();
  });

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

  ipcMain.on('pomodoro-finished', () => {
    if (dockNinjaWin && !dockNinjaWin.isDestroyed()) {
      dockNinjaWin.webContents.send('play-confetti');
    }
  });

  ipcMain.on('pomodoro-break-start', () => {
    if (dockNinjaWin && !dockNinjaWin.isDestroyed()) {
      dockNinjaWin.webContents.send('play-yawn');
    }
  });

  ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      win.setIgnoreMouseEvents(ignore, options);
    }
  });

  ipcMain.on('move-window', (event, { dx, dy }) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) {
      const [x, y] = win.getPosition();
      win.setPosition(Math.round(x + dx), Math.round(y + dy));
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

  // === Distraction detection during pomodoro ===
  const DISTRACTING_SITES = ['youtube.com', 'twitter.com', 'x.com', 'facebook.com', 'instagram.com', 'tiktok.com', 'reddit.com'];
  let lastNudgeTime = 0;

  ipcMain.handle('check-distraction', async () => {
    try {
      let appName = '';
      let url = '';

      if (process.platform === 'darwin') {
        // macOS: use AppleScript to get frontmost app and browser URL
        try {
          appName = execSync(
            "osascript -e 'tell application \"System Events\" to name of first process whose frontmost is true'",
            { encoding: 'utf-8', timeout: 3000 }
          ).trim();
        } catch (e) {
          console.error('Failed to get frontmost app:', e.message);
          return { isDistracting: false, appName: null, url: null, site: null };
        }

        if (appName.includes('Chrome') || appName.includes('Chromium')) {
          try {
            url = execSync(
              "osascript -e 'tell application \"Google Chrome\" to return URL of active tab of front window'",
              { encoding: 'utf-8', timeout: 3000 }
            ).trim();
          } catch (e) {}
        } else if (appName.includes('Safari')) {
          try {
            url = execSync(
              "osascript -e 'tell application \"Safari\" to return URL of front document'",
              { encoding: 'utf-8', timeout: 3000 }
            ).trim();
          } catch (e) {}
        } else if (appName.includes('Arc')) {
          try {
            url = execSync(
              "osascript -e 'tell application \"Arc\" to return URL of active tab of front window'",
              { encoding: 'utf-8', timeout: 3000 }
            ).trim();
          } catch (e) {}
        }
      } else if (process.platform === 'win32') {
        // Windows: use PowerShell to get active window title
        const windowTitle = execSync(
          'powershell -NoProfile -Command "Add-Type @\\"\\nusing System;\\nusing System.Runtime.InteropServices;\\npublic class Win32 {\\n  [DllImport(\\"user32.dll\\")]\\n  public static extern IntPtr GetForegroundWindow();\\n  [DllImport(\\"user32.dll\\", SetLastError=true)]\\n  public static extern int GetWindowText(IntPtr hWnd, System.Text.StringBuilder text, int count);\\n}\\n\\"@; $h = [Win32]::GetForegroundWindow(); $sb = New-Object System.Text.StringBuilder 256; [Win32]::GetWindowText($h, $sb, 256) | Out-Null; $sb.ToString()"',
          { encoding: 'utf-8', timeout: 3000 }
        ).trim();
        appName = windowTitle; // Window title includes site name (e.g. "YouTube - Google Chrome")
      }

      const matchedSite = DISTRACTING_SITES.find(site =>
        url.includes(site) || appName.toLowerCase().includes(site.split('.')[0])
      );

      console.log(`[Distraction check] App: "${appName}", URL: "${url}", Match: ${matchedSite || 'none'}`);
      return { isDistracting: !!matchedSite, appName, url, site: matchedSite || null };
    } catch (e) {
      console.error('[Distraction check] Error:', e.message);
      return { isDistracting: false, appName: null, url: null, site: null };
    }
  });

  ipcMain.on('distraction-detected', (_, data) => {
    const now = Date.now();
    if (now - lastNudgeTime < 60000) return; // Don't spam — 60s minimum gap
    lastNudgeTime = now;

    const siteName = (data.site || '').split('.')[0];
    const displayName = siteName.charAt(0).toUpperCase() + siteName.slice(1);
    const minutesLeft = Math.ceil((data.timeLeft || 0) / 60);

    const nudges = [
      `Hey! ${displayName} is tempting, but you've got ${minutesLeft} min left. You got this!`,
      `Psst! Focus mode is on! ${displayName} can wait ${minutesLeft} more minutes.`,
      `Ninja says: back to studying! Only ${minutesLeft} min left on your timer.`,
      `${displayName}? Really? You're so close! ${minutesLeft} min to go!`
    ];
    const message = nudges[Math.floor(Math.random() * nudges.length)];

    if (dockNinjaWin && !dockNinjaWin.isDestroyed()) {
      dockNinjaWin.webContents.send('distraction-alert', message);
    }

    // Show fullscreen blur overlay
    if (!blurWin || blurWin.isDestroyed()) {
      const display = screen.getPrimaryDisplay();
      const { width: sw, height: sh } = display.size;

      blurWin = new BrowserWindow({
        width: sw,
        height: sh,
        x: 0,
        y: 0,
        frame: false,
        alwaysOnTop: true,
        transparent: true,
        hasShadow: false,
        skipTaskbar: true,
        resizable: false,
        focusable: true,
        vibrancy: 'under-window',
        visualEffectState: 'active',
        backgroundColor: '#00000000',
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false,
        },
        icon: path.join(__dirname, 'mov/cover.png'),
      });

      blurWin.loadFile('blur-overlay.html');
      blurWin.webContents.on('did-finish-load', () => {
        blurWin.webContents.send('show-blur', message);
      });
      blurWin.on('closed', () => { blurWin = null; });

      // Auto-close after 5 seconds (same as speech bubble)
      setTimeout(() => {
        if (blurWin && !blurWin.isDestroyed()) {
          blurWin.webContents.send('auto-close');
        }
      }, 5000);
    }
  });

  ipcMain.on('close-blur-overlay', () => {
    if (blurWin && !blurWin.isDestroyed()) {
      blurWin.close();
      blurWin = null;
    }
  });

  // === Learning memory IPC handlers ===
  ipcMain.on('save-conversation-transcript', async (_, transcript) => {
    if (!transcript || transcript.length < 20) return;
    const extracted = await extractMemoryFromTranscript(transcript);
    if (extracted) {
      let memory = loadMemory();
      memory = mergeMemory(memory, extracted, 'voice_chat');
      saveMemory(memory);
    }

    // Summarize study material if it was used during this session
    if (currentStudyMaterial) {
      const summary = await summarizeStudyMaterial(currentStudyMaterial);
      if (summary) {
        let memory = loadMemory();
        memory.entries.push({
          timestamp: new Date().toISOString(),
          source: 'study_material',
          summary,
          topics: [],
          insights: []
        });
        if (memory.entries.length > 50) memory.entries = memory.entries.slice(-50);
        saveMemory(memory);
      }
      currentStudyMaterial = '';
    }
  });

  // === Flashcard Generation & Management ===
  function getFlashcardsPath() {
    const dir = path.join(app.getPath('userData'), 'studyyyy-data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    return path.join(dir, 'flashcards.json');
  }

  function loadFlashcards() {
    const p = getFlashcardsPath();
    if (fs.existsSync(p)) {
      try {
        return JSON.parse(fs.readFileSync(p, 'utf-8'));
      } catch (e) {}
    }
    return { decks: [] };
  }

  function saveFlashcards(data) {
    fs.writeFileSync(getFlashcardsPath(), JSON.stringify(data, null, 2));
  }

  ipcMain.handle('get-flashcards', () => {
    return loadFlashcards();
  });

  ipcMain.on('update-flashcards', (_, data) => {
    saveFlashcards(data);
    // Notify viewer if open
    if (flashcardsWin && !flashcardsWin.isDestroyed()) {
      flashcardsWin.webContents.send('flashcards-updated', data);
    }
  });

  ipcMain.on('open-flashcards-viewer', () => {
    if (flashcardsWin && !flashcardsWin.isDestroyed()) {
      flashcardsWin.focus();
      return;
    }

    const fw = 400;
    const fh = 550;
    const [wx, wy] = win.getPosition();

    flashcardsWin = new BrowserWindow({
      width: fw,
      height: fh,
      x: wx + winWidth + 10,
      y: wy,
      frame: false,
      alwaysOnTop: true,
      resizable: true,
      transparent: true,
      hasShadow: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
      icon: path.join(__dirname, 'mov/cover.png'),
    });

    flashcardsWin.loadFile('flashcards-viewer.html');
    flashcardsWin.on('closed', () => { flashcardsWin = null; });
  });

  // === Reverse Teaching Window ===
  ipcMain.on('open-reverse-teaching', () => {
    if (reverseTeachingWin && !reverseTeachingWin.isDestroyed()) {
      reverseTeachingWin.focus();
      return;
    }

    const rw = 380;
    const rh = 520;
    const [wx, wy] = win.getPosition();

    reverseTeachingWin = new BrowserWindow({
      width: rw,
      height: rh,
      x: wx + winWidth + 10,
      y: wy,
      frame: false,
      alwaysOnTop: true,
      resizable: true,
      movable: true,
      transparent: true,
      hasShadow: true,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
      icon: path.join(__dirname, 'mov/cover.png'),
    });

    reverseTeachingWin.loadFile('reverse-teaching-window.html');
    reverseTeachingWin.on('closed', () => { reverseTeachingWin = null; });
  });

  ipcMain.on('close-reverse-teaching', () => {
    if (reverseTeachingWin && !reverseTeachingWin.isDestroyed()) reverseTeachingWin.close();
  });

  ipcMain.handle('generate-flashcards', async (_, { deckName, cardCount, transcript }) => {
    try {
      const res = await fetch('https://api.minimax.io/v1/text/chatcompletion_v2', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + MINIMAX_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'MiniMax-M2',
          messages: [
            {
              role: 'system',
              content: `You are a study assistant. Convert the following chat transcript into ${cardCount} flashcards. 
Return ONLY a JSON array of objects with "question" and "answer" keys. 
Focus on key educational concepts discussed. 
No markdown, no preamble, just the JSON array.`
            },
            { role: 'user', content: transcript }
          ],
          temperature: 0.7,
        }),
      });

      const data = await res.json();
      const text = data.choices[0].message.content.trim();
      const jsonStr = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      const newCards = JSON.parse(jsonStr);

      if (!Array.isArray(newCards)) throw new Error('Invalid AI response format');

      let fcData = loadFlashcards();
      let deck = fcData.decks.find(d => d.name.toLowerCase() === deckName.toLowerCase());
      
      if (!deck) {
        deck = { name: deckName, cards: [] };
        fcData.decks.push(deck);
      }
      
      deck.cards.push(...newCards);
      saveFlashcards(fcData);

      // Refresh viewer if open
      if (flashcardsWin && !flashcardsWin.isDestroyed()) {
        flashcardsWin.webContents.send('flashcards-updated', fcData);
      }

      return { success: true, addedCount: newCards.length };
    } catch (err) {
      console.error('Flashcard generation failed:', err);
      return { success: false, error: err.message };
    }
  });

  // Save reverse teaching transcript to memory
  ipcMain.on('save-reverse-teaching-transcript', async (_, { transcript, topic }) => {
    if (!transcript || transcript.length < 20) return;
    const extracted = await extractMemoryFromTranscript(transcript);
    if (extracted) {
      let memory = loadMemory();
      memory = mergeMemory(memory, extracted, 'reverse_teaching');
      saveMemory(memory);
    }
  });

  ipcMain.on('save-study-event', (_, event) => {
    let memory = loadMemory();
    const entry = {
      timestamp: new Date().toISOString(),
      source: event.source || 'unknown',
      summary: event.summary || '',
      topics: event.topics || [],
      insights: event.insights || []
    };
    memory.entries.push(entry);
    // Update subjects
    if (event.topics && event.topics.length > 0) {
      memory.learningProfile.subjects = [...new Set([...memory.learningProfile.subjects, ...event.topics])];
    }
    if (memory.entries.length > 50) memory.entries = memory.entries.slice(-50);
    saveMemory(memory);
  });

  ipcMain.handle('get-learning-profile', () => {
    return buildMemoryContext();
  });

  ipcMain.on('set-study-material', (_, text) => {
    currentStudyMaterial = text || '';
  });

  ipcMain.on('clear-study-material', () => {
    currentStudyMaterial = '';
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
      icon: path.join(__dirname, 'mov/cover.png'),
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
  ipcMain.handle('pick-pdf', async (event) => {
    const senderWin = BrowserWindow.fromWebContents(event.sender);
    const dialogOpts = {
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
      properties: ['openFile'],
    };
    const result = senderWin
      ? await dialog.showOpenDialog(senderWin, dialogOpts)
      : await dialog.showOpenDialog(dialogOpts);
    if (result.canceled || result.filePaths.length === 0) return null;
    const buf = fs.readFileSync(result.filePaths[0]);
    const pdf = new PDFParse({ data: new Uint8Array(buf), verbosity: 0 });
    const text = await pdf.getText();
    await pdf.destroy();
    return text.text;
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

app.whenReady().then(() => {
  if (process.platform === 'darwin') {
    app.dock.setIcon(path.join(__dirname, 'mov/cover.png'));
  }
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
