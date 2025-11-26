const { app, BrowserWindow, ipcMain } = require('electron');
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
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

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
