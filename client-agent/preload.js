/**
 * ============================================================
 * ICafe Monitor Agent - Preload Script (IPC Bridge)
 * ============================================================
 * Securely exposes main process APIs to the renderer.
 * ============================================================
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('icafe', {
    // Config
    loadConfig: () => ipcRenderer.invoke('load-config'),
    saveConfig: (config) => ipcRenderer.invoke('save-config', config),

    // System Info
    getSystemInfo: () => ipcRenderer.invoke('get-system-info'),

    // Network
    setStaticIp: (opts) => ipcRenderer.invoke('set-static-ip', opts),
    setDhcp: () => ipcRenderer.invoke('set-dhcp'),

    // Agent Control
    startAgent: (config) => ipcRenderer.invoke('start-agent', config),
    stopAgent: () => ipcRenderer.invoke('stop-agent'),
    getAgentStatus: () => ipcRenderer.invoke('get-agent-status'),

    // Window Controls
    minimize: () => ipcRenderer.invoke('window-minimize'),
    close: () => ipcRenderer.invoke('window-close'),
    minimizeToTray: () => ipcRenderer.invoke('window-minimize-tray'),

    // Listen for agent status updates
    onAgentStatus: (callback) => {
        ipcRenderer.on('agent-status', (event, data) => callback(data));
    },
});
