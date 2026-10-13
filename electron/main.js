const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

// Manter referência global da janela
let mainWindow;
let serverProcess;

// Verificar se está em desenvolvimento
const isDev = !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false
  });

  // Remover menu em produção
  if (!isDev) {
    Menu.setApplicationMenu(null);
  }

  // Carregar a aplicação
  if (isDev) {
    // Em desenvolvimento, conecta ao servidor Vite
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // Em produção, carrega os arquivos buildados
    mainWindow.loadFile(path.join(__dirname, '../frontend/dist/index.html'));
  }

  // Mostrar janela quando estiver pronta
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startServer() {
  if (isDev) {
    // Em desenvolvimento, o servidor é iniciado separadamente
    return;
  }

  // Em produção, inicia o servidor backend
  const serverPath = path.join(__dirname, '../backend/src/server.js');
  
  serverProcess = spawn('node', [serverPath], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: '3001'
    }
  });

  serverProcess.stdout.on('data', (data) => {
    console.log(`Backend: ${data}`);
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`Backend Error: ${data}`);
  });
}

// Inicialização
app.whenReady().then(() => {
  startServer();
  
  // Aguardar um pouco para o servidor iniciar
  setTimeout(createWindow, isDev ? 0 : 2000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Fechar a aplicação quando todas as janelas forem fechadas (exceto no macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (serverProcess) {
      serverProcess.kill();
    }
    app.quit();
  }
});

// Limpar o processo do servidor ao sair
app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
