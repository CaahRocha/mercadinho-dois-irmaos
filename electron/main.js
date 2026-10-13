const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const fs = require('fs');

// Manter referência global da janela
let mainWindow;
let serverProcess;

// Verificar se está em desenvolvimento
const isDev = !app.isPackaged;

// Obter o caminho correto do app (funciona empacotado ou não)
function getAppPath() {
  if (isDev) {
    return path.join(__dirname, '..');
  }
  // Em produção, o app está em resources/app
  return path.join(process.resourcesPath, 'app');
}

// Obter caminho para dados do usuário (onde fica o banco de dados)
function getUserDataPath() {
  return path.join(app.getPath('userData'), 'data');
}

// Garantir que a pasta de dados existe
function ensureDataFolder() {
  const dataPath = getUserDataPath();
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true });
  }
  return dataPath;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    icon: null, // Será adicionado depois
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false,
    title: 'Mercadinho Dois Irmãos'
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
    // Em produção, carrega via servidor backend
    mainWindow.loadURL('http://localhost:3001');
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
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const appPath = getAppPath();
    const dataPath = ensureDataFolder();
    const serverPath = path.join(appPath, 'backend', 'src', 'server.js');
    
    console.log('Iniciando servidor...');
    console.log('App path:', appPath);
    console.log('Data path:', dataPath);
    console.log('Server path:', serverPath);

    // Usar fork para rodar o servidor (não precisa de node externo)
    serverProcess = fork(serverPath, [], {
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: '3001',
        DATABASE_PATH: path.join(dataPath, 'mercado.db')
      },
      cwd: path.join(appPath, 'backend'),
      silent: false
    });

    serverProcess.on('message', (msg) => {
      console.log('Server message:', msg);
      if (msg === 'ready') {
        resolve();
      }
    });

    serverProcess.on('error', (err) => {
      console.error('Erro ao iniciar servidor:', err);
      reject(err);
    });

    // Dar tempo para o servidor iniciar
    setTimeout(resolve, 3000);
  });
}

// Inicialização
app.whenReady().then(async () => {
  try {
    await startServer();
    createWindow();
  } catch (err) {
    console.error('Erro na inicialização:', err);
    createWindow(); // Tentar abrir a janela mesmo assim
  }

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
