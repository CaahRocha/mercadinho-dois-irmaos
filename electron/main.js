const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

function startServer() {
  return new Promise((resolve) => {
    const serverPath = path.join(__dirname, '..', 'backend', 'src', 'server.js');
    
    // Define variáveis de ambiente
    const env = { ...process.env, NODE_ENV: 'production', PORT: '3001' };
    
    // Inicia o servidor
    serverProcess = spawn('node', [serverPath], {
      env,
      cwd: path.join(__dirname, '..', 'backend')
    });

    serverProcess.stdout.on('data', (data) => {
      console.log(`Server: ${data}`);
      // Quando o servidor mostrar que está rodando, resolve
      if (data.toString().includes('3001')) {
        setTimeout(resolve, 1000);
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error(`Server Error: ${data}`);
    });

    // Fallback - resolve depois de 5 segundos de qualquer forma
    setTimeout(resolve, 5000);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Mercadinho Dois Irmãos',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Carrega do servidor local
  mainWindow.loadURL('http://localhost:3001');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  await startServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  app.quit();
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
