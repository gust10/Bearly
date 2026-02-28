const { app, BrowserWindow, screen, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
  const display = screen.getPrimaryDisplay();
  const { height: workHeight } = display.workAreaSize;
  const { y: workY } = display.workArea;

  const winWidth = 230;
  const winHeight = 250;
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

  ipcMain.on('resize-pomodoro', (event, mode) => {
    pomodoroMode = mode;
    if (pomodoroWin && !pomodoroWin.isDestroyed()) {
      if (mode === 'mini') {
        pomodoroWin.setSize(150, 150);
        pomodoroWin.setPosition(20, 20); // Top left area
      } else if (mode === 'menu') {
        const [x, y] = win.getPosition();
        pomodoroWin.setSize(250, 190);
        pomodoroWin.setPosition(x + winWidth, y);
      } else if (mode === 'timer') {
        const [x, y] = win.getPosition();
        pomodoroWin.setSize(250, 420);
        pomodoroWin.setPosition(x + winWidth, y);
      } else if (mode === 'planner') {
        const [x, y] = win.getPosition();
        pomodoroWin.setSize(250, 420); // Default full size for planner
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
  const peekWidth = 6; // thin line visible when hidden

  function slideOut() {
    const [x, y] = win.getPosition();
    const targetX = -(winWidth - peekWidth);
    animateTo(x, targetX, y);
    win.webContents.send('hidden-state', true);
  }

  function slideIn() {
    const [x, y] = win.getPosition();
    animateTo(x, 0, y);
    win.webContents.send('hidden-state', false);
  }

  let animInterval = null;

  function animateTo(fromX, toX, fixedY) {
    if (animInterval) clearInterval(animInterval);
    const steps = 12;
    let step = 0;
    const y = parseInt(fixedY, 10);
    animInterval = setInterval(() => {
      if (win.isDestroyed()) { clearInterval(animInterval); animInterval = null; return; }
      step++;
      const ease = 1 - Math.pow(1 - step / steps, 3);
      const x = parseInt(fromX + (toX - fromX) * ease, 10);
      try { win.setPosition(x, y); } catch (e) {}
      if (step >= steps) { clearInterval(animInterval); animInterval = null; }
    }, 16);
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

  ipcMain.on('mouse-leave', () => {
    resetTimer();
  });

  ipcMain.on('dragging', () => {
    if (hideTimeout) clearTimeout(hideTimeout);
  });

  ipcMain.on('drag-end', () => {
    resetTimer();
  });

  // Start the auto-hide timer
  resetTimer();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
