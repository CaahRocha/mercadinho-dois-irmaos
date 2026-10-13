const { contextBridge, ipcRenderer } = require('electron');

// Expõe APIs seguras para o renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Informações do sistema
  platform: process.platform,
  
  // Comunicação com o processo principal
  send: (channel, data) => {
    const validChannels = ['minimize', 'maximize', 'close'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  
  // Receber mensagens do processo principal
  receive: (channel, func) => {
    const validChannels = ['app-update'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  }
});
