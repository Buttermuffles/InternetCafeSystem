/**
 * ============================================================
 * ICafe Monitor Agent - Renderer (Frontend Logic)
 * ============================================================
 * Handles all UI interactions, communicates with main process
 * through the icafe bridge (preload.js).
 * ============================================================
 */

// ── DOM References ──
const $ = (id) => document.getElementById(id);

const dom = {
    // Status
    statusBanner: $('status-banner'),
    statusDot: $('status-dot'),
    statusText: $('status-text'),
    heartbeatCount: $('heartbeat-count'),

    // Server Connection
    serverIp: $('server-ip'),
    serverPort: $('server-port'),
    pcName: $('pc-name'),
    autoConnectToggle: $('auto-connect-toggle'),
    btnConnect: $('btn-connect'),
    btnDisconnect: $('btn-disconnect'),

    // PC Info
    infoHostname: $('info-hostname'),
    infoIp: $('info-ip'),
    infoOs: $('info-os'),
    infoAdapter: $('info-adapter'),
    cpuValue: $('cpu-value'),
    cpuBar: $('cpu-bar'),
    ramValue: $('ram-value'),
    ramBar: $('ram-bar'),
    btnRefreshInfo: $('btn-refresh-info'),

    // Static IP
    staticIp: $('static-ip'),
    subnetMask: $('subnet-mask'),
    gateway: $('gateway'),
    dns1: $('dns1'),
    dns2: $('dns2'),
    btnSetStatic: $('btn-set-static'),
    btnSetDhcp: $('btn-set-dhcp'),

    // Window Controls
    btnMinimize: $('btn-minimize'),
    btnTray: $('btn-tray'),
    btnClose: $('btn-close'),

    // Toast
    toastContainer: $('toast-container'),
};

// ── State ──
let isConnected = false;
let infoRefreshTimer = null;

// ── Toast Notifications ──
function showToast(message, type = 'info', duration = 3500) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    dom.toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ── Load Config ──
async function loadConfig() {
    try {
        const config = await window.icafe.loadConfig();
        if (config.serverIp) dom.serverIp.value = config.serverIp;
        else if (config.serverUrl) {
            // Extract IP from URL
            const match = config.serverUrl.match(/\/\/([^:\/]+)/);
            if (match) dom.serverIp.value = match[1];
        }
        if (config.serverPort) dom.serverPort.value = config.serverPort;
        else {
            const portMatch = config.serverUrl?.match(/:(\d+)$/);
            if (portMatch) dom.serverPort.value = portMatch[1];
        }
        if (config.pcName) dom.pcName.value = config.pcName;
        if (config.staticIp) dom.staticIp.value = config.staticIp;
        if (config.subnetMask) dom.subnetMask.value = config.subnetMask;
        if (config.gateway) dom.gateway.value = config.gateway;
        if (config.dns1) dom.dns1.value = config.dns1;
        if (config.dns2) dom.dns2.value = config.dns2;
        if (config.autoConnect !== undefined) {
            dom.autoConnectToggle.checked = !!config.autoConnect;
        }
    } catch (e) {
        console.error('Failed to load config:', e);
    }
}

// ── Refresh System Info ──
async function refreshSystemInfo() {
    try {
        const info = await window.icafe.getSystemInfo();
        dom.infoHostname.textContent = info.hostname || '—';
        dom.infoIp.textContent = info.ip || '—';
        dom.infoOs.textContent = info.osDistro || info.os || '—';
        dom.infoAdapter.textContent = info.adapter || '—';

        // CPU bar (use scaleX for GPU-accelerated animation)
        const cpuPct = Math.min(100, Math.max(0, info.cpuUsage || 0));
        dom.cpuValue.textContent = `${cpuPct.toFixed(1)}%`;
        dom.cpuBar.style.transform = `scaleX(${cpuPct / 100})`;

        // RAM bar
        const ramPct = Math.min(100, Math.max(0, info.ramUsage || 0));
        dom.ramValue.textContent = `${ramPct.toFixed(1)}% (${info.ramUsed || 0}/${info.ramTotal || 0} GB)`;
        dom.ramBar.style.transform = `scaleX(${ramPct / 100})`;

        // Suggest static IP based on current IP
        if (!dom.staticIp.value && info.ip && info.ip !== '127.0.0.1') {
            dom.staticIp.value = info.ip;
        }

        // Suggest gateway
        if (info.ip && dom.gateway.value === '192.168.1.1') {
            const parts = info.ip.split('.');
            if (parts.length === 4) {
                dom.gateway.value = `${parts[0]}.${parts[1]}.${parts[2]}.1`;
            }
        }
    } catch (e) {
        console.error('Failed to get system info:', e);
    }
}

// ── Update Status UI ──
function updateStatus(status) {
    isConnected = status.connected;

    if (status.running && status.connected) {
        dom.statusBanner.className = 'status-chip connected';
        dom.statusText.textContent = 'CONNECTED';
        dom.heartbeatCount.textContent = `UPTIME: ${status.lastHeartbeat || '—'}`;
    } else if (status.running && !status.connected) {
        dom.statusBanner.className = 'status-chip';
        dom.statusText.textContent = 'CONNECTING...';
        dom.heartbeatCount.textContent = `FAILURES: ${status.failures}`;
    } else {
        dom.statusBanner.className = 'status-chip';
        dom.statusText.textContent = 'SYSTEM IDLE';
        dom.heartbeatCount.textContent = '';
    }

    // Toggle buttons
    if (status.running) {
        dom.btnConnect.style.display = 'none';
        dom.btnDisconnect.style.display = 'inline-flex';
    } else {
        dom.btnConnect.style.display = 'inline-flex';
        dom.btnDisconnect.style.display = 'none';
    }
}

// ── Connect ──
async function connect() {
    const ip = dom.serverIp.value.trim();
    const port = dom.serverPort.value.trim() || '8000';

    if (!ip) {
        showToast('Please enter the server IP address', 'error');
        dom.serverIp.focus();
        return;
    }

    // Validate IP format
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) {
        showToast('Invalid IP format (e.g. 192.168.1.200)', 'error');
        dom.serverIp.focus();
        return;
    }

    const config = {
        serverUrl: `http://${ip}:${port}`,
        serverIp: ip,
        serverPort: port,
        apiKey: 'icafe-monitor-api-key-2024-secure-token-abc123xyz',
        pcName: dom.pcName.value.trim(),
        heartbeatInterval: 4000,
        commandPollInterval: 2500,
        enableScreenshot: true,
        screenshotQuality: 40,
        screenshotWidth: 640,
        screenshotIntervalMs: 15000,
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
        staticIp: dom.staticIp.value.trim(),
        subnetMask: dom.subnetMask.value.trim(),
        gateway: dom.gateway.value.trim(),
        dns1: dom.dns1.value.trim(),
        dns2: dom.dns2.value.trim(),
    };

    dom.btnConnect.disabled = true;
    dom.btnConnect.classList.add('loading');
    showToast(`Connecting to ${config.serverUrl}...`, 'info');

    try {
        const result = await window.icafe.startAgent(config);
        if (result.success) {
            showToast('Agent started! Sending heartbeats...', 'success');
        } else {
            showToast('Failed to start: ' + result.message, 'error');
        }
    } catch (e) {
        showToast('Connection error: ' + e.message, 'error');
    } finally {
        dom.btnConnect.disabled = false;
        dom.btnConnect.classList.remove('loading');
    }
}

// ── Disconnect ──
async function disconnect() {
    try {
        await window.icafe.stopAgent();
        showToast('Agent stopped', 'warning');
        updateStatus({ running: false, connected: false, heartbeats: 0, failures: 0 });
    } catch (e) {
        showToast('Error stopping: ' + e.message, 'error');
    }
}

// ── Set Static IP ──
async function setStaticIp() {
    const ip = dom.staticIp.value.trim();
    const subnet = dom.subnetMask.value.trim();
    const gw = dom.gateway.value.trim();
    const d1 = dom.dns1.value.trim();
    const d2 = dom.dns2.value.trim();

    if (!ip || !subnet || !gw) {
        showToast('Please fill in IP, Subnet and Gateway', 'error');
        return;
    }

    dom.btnSetStatic.disabled = true;
    showToast(`Setting static IP ${ip}...`, 'info');

    try {
        const result = await window.icafe.setStaticIp({ ip, subnet, gateway: gw, dns1: d1, dns2: d2 });
        if (result.success) {
            showToast(`Static IP set: ${ip}`, 'success');
            // Save to config
            const config = await window.icafe.loadConfig();
            config.staticIp = ip;
            config.subnetMask = subnet;
            config.gateway = gw;
            config.dns1 = d1;
            config.dns2 = d2;
            await window.icafe.saveConfig(config);
            // Refresh info after delay
            setTimeout(refreshSystemInfo, 2000);
        } else {
            showToast('Failed: ' + result.message, 'error');
        }
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    } finally {
        dom.btnSetStatic.disabled = false;
    }
}

// ── Reset to DHCP ──
async function setDhcp() {
    dom.btnSetDhcp.disabled = true;
    showToast('Resetting to DHCP...', 'info');

    try {
        const result = await window.icafe.setDhcp();
        if (result.success) {
            showToast('DHCP restored! IP will update shortly...', 'success');
            setTimeout(refreshSystemInfo, 3000);
        } else {
            showToast('Failed: ' + result.message, 'error');
        }
    } catch (e) {
        showToast('Error: ' + e.message, 'error');
    } finally {
        dom.btnSetDhcp.disabled = false;
    }
}

// ── Event Listeners ──
dom.btnConnect.addEventListener('click', connect);
dom.btnDisconnect.addEventListener('click', disconnect);
dom.btnSetStatic.addEventListener('click', setStaticIp);
dom.btnSetDhcp.addEventListener('click', setDhcp);
dom.autoConnectToggle.addEventListener('change', async (e) => {
    try {
        const config = await window.icafe.loadConfig();
        config.autoConnect = e.target.checked;
        await window.icafe.saveConfig(config);
    } catch (err) { console.error('Failed to save auto-connect state', err); }
});
dom.btnRefreshInfo.addEventListener('click', () => {
    refreshSystemInfo();
    showToast('System info refreshed', 'info', 1500);
});

// Window controls
dom.btnMinimize.addEventListener('click', () => window.icafe.minimize());
dom.btnTray.addEventListener('click', () => {
    window.icafe.minimizeToTray();
    showToast('Running in system tray', 'info', 1500);
});
dom.btnClose.addEventListener('click', () => window.icafe.close());

// Enter key on IP field => connect
dom.serverIp.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') connect();
});

// ── Listen for agent status updates from main process ──
window.icafe.onAgentStatus((status) => {
    updateStatus(status);
});

// ── Initialize ──
async function init() {
    await loadConfig();
    await refreshSystemInfo();

    // Check if already running
    const status = await window.icafe.getAgentStatus();
    updateStatus(status);

    // AUTO-CONNECT LOGIC
    if (!status.running && dom.autoConnectToggle.checked) {
        if (dom.serverIp.value.trim()) {
            console.log('[GUI] Auto-connecting as requested...');
            connect();
        }
    }

    // Refresh system info every 8 seconds (lighter on CPU)
    infoRefreshTimer = setInterval(refreshSystemInfo, 8000);
}

init();
