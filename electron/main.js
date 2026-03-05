const { app, BrowserWindow, ipcMain } = require('electron');

// Detect WSL or explicit disable flag and turn off GPU acceleration early
const isWSL = !!process.env.WSL_DISTRO_NAME || !!process.env.WSL_INTEROP;
if (isWSL || process.env.DISABLE_GPU === '1' || process.env.ELECTRON_DISABLE_GPU === '1') {
  try {
    app.disableHardwareAcceleration();
    app.commandLine.appendSwitch('disable-gpu');
    app.commandLine.appendSwitch('disable-gpu-compositing');
    console.log('[main] GPU acceleration disabled (WSL or DISABLE_GPU detected)');
  } catch (e) {
    console.warn('[main] Failed to disable GPU acceleration:', e && e.message);
  }
}
const path = require('path');
const DatabaseConnection = require('./database/connection');
const setupIpcHandlers = require('./ipc/handlers');

let mainWindow;
const isDevelopment = process.env.NODE_ENV === 'development';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../public/icon.png'),
  });

  // Load the appropriate URL based on environment
  if (isDevelopment) {
    mainWindow.loadURL('http://localhost:5173');
    if (process.env.OPEN_DEVTOOLS === '1') {
      mainWindow.webContents.openDevTools();
    }
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    // Allow opening DevTools in production for debugging when explicitly requested
    if (process.env.OPEN_DEVTOOLS === '1' || process.env.DEBUG_ELECTRON === '1') {
      // open in detached mode so it's visible on Windows builds
      try {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
      } catch (e) {
        mainWindow.webContents.openDevTools();
      }
    }
  }

  // Forward renderer console messages and load failures to the main process stdout
  const wc = mainWindow.webContents;
  wc.on('did-finish-load', () => {
    console.log('[renderer] did-finish-load, URL=', wc.getURL());
  });

  wc.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('[renderer] did-fail-load', { errorCode, errorDescription, validatedURL });
  });

  // Capture console messages from the renderer and print them to main logs
  wc.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[renderer][console:${level}] ${message} (${sourceId}:${line})`);
  });

  // Allow renderer to send debug snapshots (HTML) to main process for inspection
  ipcMain.on('renderer:debugSnapshot', (evt, html) => {
    try {
      const snippet = typeof html === 'string' ? html.slice(0, 2000) : String(html);
      console.log('[renderer][snapshot] ', snippet.replace(/\s+/g, ' ').trim());
      try {
        const fs = require('fs');
        const os = require('os');
        const dir = path.join(app.getPath('userData'), 'debug-snapshots');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const name = `snapshot-${Date.now()}.html`;
        const filePath = path.join(dir, name);
        fs.writeFileSync(filePath, String(html), { encoding: 'utf8' });
        console.log('[renderer][snapshot] saved to', filePath);
      } catch (e) {
        console.error('[renderer][snapshot] failed to save snapshot', e && e.message);
      }
    } catch (e) {
      console.error('[renderer][snapshot] failed to log snapshot', e && e.message);
    }
  });

  // Detect renderer process crashes or unexpected exits
  wc.on('render-process-gone', (event, details) => {
    console.error('[renderer] render-process-gone', details);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Initialize database and setup IPC handlers
app.whenReady().then(async () => {
  try {
    // Initialize database connection
    const db = DatabaseConnection.getInstance();
    await db.initialize();
    
    // Setup all IPC handlers
    setupIpcHandlers(ipcMain);
    
    // Create the main window
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  } catch (error) {
    console.error('Failed to initialize application:', error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Close database connections
  const db = DatabaseConnection.getInstance();
  db.close();
});
