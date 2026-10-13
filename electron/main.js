const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const fs = require('fs');
const http = require('http');

let mainWindow;
let serverProcess;
const isDev = !app.isPackaged;

function getAppPath() {
  if (isDev) {
    return path.join(__dirname, '..');
  }
  return path.join(process.resourcesPath, 'app');
}

function getDataPath() {
  const dataPath = path.join(app.getPath('userData'), 'data');
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }
  return dataPath;
}

function waitForServer(maxAttempts = 60) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      attempts++;
      http.get('http://127.0.0.1:3001/api/health', (res) => {
        resolve();
      }).on('error', () => {
        if (attempts >= maxAttempts) {
          reject(new Error('Servidor não iniciou'));
        } else {
          setTimeout(check, 300);
        }
      });
    };
    check();
  });
}

function startServer() {
  if (isDev) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const appPath = getAppPath();
    const dataPath = getDataPath();
    const serverPath = path.join(appPath, 'backend', 'src', 'server.js');

    serverProcess = fork(serverPath, [], {
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: '3001',
        DATABASE_PATH: path.join(dataPath, 'mercado.db')
      },
      cwd: path.join(appPath, 'backend'),
      silent: true
    });

    serverProcess.on('error', reject);
    
    waitForServer().then(resolve).catch(reject);
  });
}

function createWindow() {
  const appPath = getAppPath();
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false,
    title: 'Mercadinho Dois Irmãos'
  });

  if (!isDev) {
    Menu.setApplicationMenu(null);
  }

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  }
  
  // Sempre abre DevTools pra debug
  mainWindow.webContents.openDevTools();
  
  if (!isDev) {
    // Carrega o arquivo HTML direto
    const indexPath = path.join(appPath, 'frontend', 'dist', 'index.html');
    mainWindow.loadFile(indexPath);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    await startServer();
  } catch (err) {
    console.error('Erro ao iniciar servidor:', err);
  }
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (serverProcess) serverProcess.kill();
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverProcess) serverProcess.kill();
});
