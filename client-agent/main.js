/**
 * ============================================================
 * ICafe Monitor Agent - Electron Main Process
 * ============================================================
 * Creates the GUI window, runs the monitoring agent in the
 * background, and handles system tray + IPC.
 * ============================================================
 */

const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, dialog } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { exec, execSync } = require('child_process');
const AgentCore = require('./agent-core');

// ── Single instance lock ──
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
    return;
}

// ── Globals ──
let mainWindow = null;
let tray = null;
let agentCore = null;
let cachedAdapter = null;

const DEFAULT_CONFIG = {
    serverUrl: 'http://192.168.1.200:8000',
    serverIp: '192.168.1.200',
    serverPort: '8000',
    apiKey: 'icafe-monitor-api-key-2024-secure-token-abc123xyz',
    pcName: '',
    heartbeatInterval: 4000,
    commandPollInterval: 2500,
    enableScreenshot: false,
    screenshotIntervalMs: 15000,
    screenshotQuality: 40,
    screenshotWidth: 640,
    enableLiveStream: true,
    streamIntervalMs: 1200,
    streamQuality: 32,
    streamWidth: 480,
    streamMinWidth: 320,
    streamMaxWidth: 640,
    streamMinQuality: 20,
    streamAdaptive: true,
    streamPauseDuringVideo: true,
    requestTimeout: 5000,
    maxRetries: 3,
    retryDelay: 2000,
    staticIp: '',
    subnetMask: '255.255.255.0',
    gateway: '192.168.1.1',
    dns1: '8.8.8.8',
    dns2: '8.8.4.4',
};

const CONFIG_DIR_SYSTEM = 'C:\\Program Files\\ICafeMonitor';
const CONFIG_FILENAME = 'config.json';

// Get current EXE directory for relative config lookups
function getExeDir() {
    return path.dirname(app.getPath('exe'));
}

function loadConfig() {
    const localPath = path.join(getExeDir(), CONFIG_FILENAME);
    const systemPath = path.join(CONFIG_DIR_SYSTEM, CONFIG_FILENAME);

    try {
        // Priority: 1. Local (next to exe), 2. System (program files)
        let configPath = null;
        if (fs.existsSync(localPath)) {
            configPath = localPath;
        } else if (fs.existsSync(systemPath)) {
            configPath = systemPath;
        }

        if (configPath) {
            const raw = fs.readFileSync(configPath, 'utf-8');
            return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
        }
    } catch (e) {
        console.error('[Config] Load error:', e.message);
    }
    return { ...DEFAULT_CONFIG };
}

function saveConfig(config) {
    // Save to wherever the exe is if we have permission, otherwise system path
    const localDir = getExeDir();
    const localPath = path.join(localDir, CONFIG_FILENAME);
    const systemPath = path.join(CONFIG_DIR_SYSTEM, CONFIG_FILENAME);

    try {
        let savePath = localPath;
        // If we can't write to local dir (e.g. read-only or protected), try system
        try {
            if (!fs.existsSync(localDir)) fs.mkdirSync(localDir);
            fs.accessSync(localDir, fs.constants.W_OK);
        } catch {
            savePath = systemPath;
            if (!fs.existsSync(CONFIG_DIR_SYSTEM)) fs.mkdirSync(CONFIG_DIR_SYSTEM, { recursive: true });
        }

        fs.writeFileSync(savePath, JSON.stringify(config, null, 4));
        console.log('[Config] Saved to:', savePath);
    } catch (e) {
        console.error('[Config] Save error:', e.message);
    }
}

// ── Persistence Management ──
function enforcePersistence() {
    if (process.platform !== 'win32') return;
    try {
        const exePath = app.getPath('exe');
        // Register in the registry for redundancy (wrapped in quotes for path-with-spaces)
        const regCommand = `reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "ICafeMonitorAgent" /t REG_SZ /d "\\"\\"${exePath}\\" --hidden\\"" /f`;
        exec(regCommand, (err) => {
            if (err) console.warn('[Persistence] Reg update failed (expected if non-admin)');
        });

        // Set login item settings for Electron's built-in mechanism
        app.setLoginItemSettings({
            openAtLogin: true,
            path: exePath,
            args: ['--hidden']
        });
        console.log('[Persistence] Startup entries verified.');
    } catch (e) {
        console.error('[Persistence] Error:', e.message);
    }
}

async function autoEnforceStaticIp(config) {
    if (!config.staticIp || config.staticIp === '') return;

    const currentIp = getLocalIp();
    if (currentIp === config.staticIp) {
        console.log(`[Network] Current IP already matches static configuration: ${currentIp}`);
        return;
    }

    try {
        const adapter = getActiveAdapter();
        console.log(`[Network] Auto-enforcing Static IP ${config.staticIp} on "${adapter}" (Current: ${currentIp})`);

        // Use netsh to set static configuration
        const setIpCmd = `netsh interface ip set address "${adapter}" static ${config.staticIp} ${config.subnetMask || '255.255.255.0'} ${config.gateway || '192.168.1.1'}`;
        const setDnsCmd = `netsh interface ip set dns "${adapter}" static ${config.dns1 || '8.8.8.8'}`;
        const setDns2Cmd = config.dns2 ? `netsh interface ip add dns "${adapter}" ${config.dns2} index=2` : null;

        execSync(setIpCmd, { timeout: 10000 });
        execSync(setDnsCmd, { timeout: 10000 });
        if (setDns2Cmd) execSync(setDns2Cmd, { timeout: 10000 });

        console.log('[Network] Static IP configuration applied successfully.');
    } catch (e) {
        console.error('[Network] Auto-IP enforcement failed:', e.message);
    }
}

// ── System Info Helpers ──
function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (!iface.internal && iface.family === 'IPv4') {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

function getActiveAdapter() {
    try {
        const output = execSync(
            'powershell -Command "Get-NetAdapter | Where-Object {$_.Status -eq \'Up\'} | Select-Object -First 1 -ExpandProperty Name"',
            { encoding: 'utf-8', timeout: 5000 }
        ).trim();
        return output || 'Ethernet';
    } catch (e) {
        // Fallback: try netsh
        try {
            const output = execSync('netsh interface show interface', { encoding: 'utf-8', timeout: 5000 });
            const lines = output.split('\n');
            for (const line of lines) {
                if (line.includes('Connected') && !line.includes('Loopback')) {
                    const parts = line.trim().split(/\s{2,}/);
                    if (parts.length >= 4) return parts[3].trim();
                }
            }
        } catch (e2) { /* ignore */ }
        return 'Ethernet';
    }
}

// ── Create Main Window ──
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 520,
        height: 740,
        minWidth: 480,
        minHeight: 700,
        resizable: true,
        frame: false,
        transparent: false,
        backgroundColor: '#0a0e27',
        icon: getIconPath(),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        show: false,
    });

    mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

    const isHidden = process.argv.includes('--hidden');

    mainWindow.once('ready-to-show', () => {
        if (!isHidden) {
            mainWindow.show();
        }
    });

    mainWindow.on('close', (e) => {
        // Minimize to tray instead of closing
        if (!app.isQuitting) {
            e.preventDefault();
            mainWindow.hide();
        }
    });
}

function getIconPath() {
    const iconName = 'icon.png';
    // Check if running from asar (production)
    const devPath = path.join(__dirname, 'assets', iconName);
    if (fs.existsSync(devPath)) return devPath;
    return undefined;
}

// ── System Tray ──
function createTray() {
    // Create a simple 16x16 icon programmatically (green dot)
    const iconPath = getIconPath();
    let trayIcon;
    if (iconPath && fs.existsSync(iconPath)) {
        trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    } else {
        // Create a simple icon from data URL
        trayIcon = nativeImage.createEmpty();
    }

    tray = new Tray(trayIcon.isEmpty() ? createDefaultIcon() : trayIcon);
    tray.setToolTip('ICafe Monitor Agent');

    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show Dashboard',
            click: () => {
                if (mainWindow) {
                    mainWindow.show();
                    mainWindow.focus();
                }
            },
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => {
                app.isQuitting = true;
                if (agentCore) agentCore.stop();
                app.quit();
            },
        },
    ]);

    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => {
        if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
        }
    });
}

function createDefaultIcon(color = 'green') {
    // Create a simple 16x16 circle icon with status color
    const size = 16;
    const canvas = Buffer.alloc(size * size * 4); // RGBA
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const dx = x - size / 2;
            const dy = y - size / 2;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const idx = (y * size + x) * 4;
            if (dist < size / 2 - 1) {
                if (color === 'red') {
                    canvas[idx] = 230;     // R (Red)
                    canvas[idx + 1] = 50;  // G
                    canvas[idx + 2] = 50;  // B
                } else {
                    canvas[idx] = 50;      // R (Green)
                    canvas[idx + 1] = 210; // G
                    canvas[idx + 2] = 80;  // B
                }
                canvas[idx + 3] = 255;
            } else {
                canvas[idx + 3] = 0; // transparent
            }
        }
    }
    return nativeImage.createFromBuffer(canvas, { width: size, height: size });
}

function refreshTray(status) {
    if (!tray) return;
    const iconPath = getIconPath();
    if (iconPath && fs.existsSync(iconPath)) {
        // Overlay a color if we want, but simpler to just use createDefaultIcon if it's status based
    }

    const isConnected = status.connected && status.failures === 0;
    const icon = createDefaultIcon(isConnected ? 'green' : 'red');
    tray.setImage(icon);
    tray.setToolTip(`ICafe Monitor Agent - ${isConnected ? 'Connected' : 'Disconnected (' + status.failures + ' fails)'}`);
}

// ── IPC Handlers ──
function setupIPC() {
    // Load config
    ipcMain.handle('load-config', () => {
        return loadConfig();
    });

    // Save config
    ipcMain.handle('save-config', (event, config) => {
        saveConfig(config);
        return { success: true };
    });

    // Get system info
    ipcMain.handle('get-system-info', async () => {
        const si = require('systeminformation');
        try {
            const [cpu, mem, osInfo] = await Promise.all([
                si.currentLoad(),
                si.mem(),
                si.osInfo(),
            ]);
            return {
                hostname: os.hostname(),
                ip: getLocalIp(),
                os: `${os.type()} ${os.release()} (${os.arch()})`,
                osDistro: osInfo.distro,
                cpuUsage: Math.round(cpu.currentLoad * 100) / 100,
                ramTotal: Math.round((mem.total / (1024 ** 3)) * 100) / 100,
                ramUsed: Math.round((mem.used / (1024 ** 3)) * 100) / 100,
                ramUsage: Math.round((mem.used / mem.total) * 10000) / 100,
                uptime: Math.round(os.uptime() / 60), // minutes
                adapter: cachedAdapter || getActiveAdapter(),
            };
        } catch (e) {
            return {
                hostname: os.hostname(),
                ip: getLocalIp(),
                os: `${os.type()} ${os.release()}`,
                osDistro: '',
                cpuUsage: 0,
                ramTotal: 0,
                ramUsed: 0,
                ramUsage: 0,
                uptime: 0,
                adapter: 'Unknown',
            };
        }
    });

    // Set static IP
    ipcMain.handle('set-static-ip', async (event, { ip, subnet, gateway, dns1, dns2 }) => {
        try {
            const adapter = getActiveAdapter();
            console.log(`[Static IP] Setting ${ip} on adapter "${adapter}"`);

            // Set IP address
            execSync(
                `netsh interface ip set address "${adapter}" static ${ip} ${subnet} ${gateway}`,
                { timeout: 15000 }
            );

            // Set primary DNS
            execSync(
                `netsh interface ip set dns "${adapter}" static ${dns1}`,
                { timeout: 10000 }
            );

            // Set secondary DNS
            if (dns2) {
                execSync(
                    `netsh interface ip add dns "${adapter}" ${dns2} index=2`,
                    { timeout: 10000 }
                );
            }

            return { success: true, message: `Static IP ${ip} set on "${adapter}"` };
        } catch (e) {
            return { success: false, message: e.message };
        }
    });

    // Revert to DHCP
    ipcMain.handle('set-dhcp', async () => {
        try {
            const adapter = getActiveAdapter();
            execSync(`netsh interface ip set address "${adapter}" dhcp`, { timeout: 10000 });
            execSync(`netsh interface ip set dns "${adapter}" dhcp`, { timeout: 10000 });
            return { success: true, message: `DHCP restored on "${adapter}"` };
        } catch (e) {
            return { success: false, message: e.message };
        }
    });

    // Start agent
    ipcMain.handle('start-agent', (event, config) => {
        try {
            if (agentCore) agentCore.stop();
            saveConfig(config);
            agentCore = new AgentCore(config);
            agentCore.onStatusUpdate = (status) => {
                refreshTray(status);
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('agent-status', status);
                }
            };
            agentCore.start();
            return { success: true };
        } catch (e) {
            return { success: false, message: e.message };
        }
    });

    // Stop agent
    ipcMain.handle('stop-agent', () => {
        if (agentCore) {
            agentCore.stop();
            agentCore = null;
        }
        return { success: true };
    });

    // Get agent status
    ipcMain.handle('get-agent-status', () => {
        if (agentCore) {
            return agentCore.getStatus();
        }
        return { running: false, connected: false, heartbeats: 0, failures: 0 };
    });

    // Window controls
    ipcMain.handle('window-minimize', () => mainWindow?.minimize());
    ipcMain.handle('window-close', () => mainWindow?.hide());
    ipcMain.handle('window-minimize-tray', () => mainWindow?.hide());
}

// ── App Lifecycle ──
app.whenReady().then(async () => {
    enforcePersistence();
    const config = loadConfig();
    await autoEnforceStaticIp(config);
    setupIPC();
    createWindow();
    createTray();

    // Cache adapter once to avoid blocking UI during repeated refresh.
    try {
        cachedAdapter = getActiveAdapter();
    } catch (e) {
        cachedAdapter = 'Ethernet';
    }

    // Auto-start agent if config exists
    if (config.serverUrl && config.serverUrl !== DEFAULT_CONFIG.serverUrl) {
        agentCore = new AgentCore(config);
        agentCore.onStatusUpdate = (status) => {
            refreshTray(status);
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('agent-status', status);
            }
        };
        agentCore.start();
    }
});

app.on('second-instance', () => {
    if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
    }
});

app.on('window-all-closed', () => {
    // Keep running in tray on Windows
});

app.on('before-quit', () => {
    app.isQuitting = true;
    if (agentCore) agentCore.stop();
});
