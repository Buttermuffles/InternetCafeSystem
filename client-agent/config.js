/**
 * ============================================================
 * Internet Café Monitoring System - Client Agent Configuration
 * ============================================================
 * 
 * PRIORITY ORDER:
 *   1. External config file (C:\Program Files\ICafeMonitor\config.json)
 *   2. Environment variable (ICAFE_SERVER_URL)
 *   3. Default values below
 * 
 * This allows the same .exe to be deployed to ANY PC — the installer
 * writes a config.json with the correct server IP for that network.
 * ============================================================
 */

const fs = require('fs');
const path = require('path');

// ---- Default Configuration ----
const DEFAULTS = {
    // Server Connection
    serverUrl: 'http://192.168.1.200:8000',
    apiKey: 'icafe-monitor-api-key-2024-secure-token-abc123xyz',

    // Timing
    heartbeatInterval: 4000,      // 4 seconds
    commandPollInterval: 2500,    // 2.5 seconds

    // Screenshot Settings
    // Keep OFF by default to reduce GUI lag (expensive screenshot + compression).
    enableScreenshot: false,
    // Capture screenshots every N ms (prevents GUI lag + heavy CPU usage).
    screenshotIntervalMs: 15000,
    screenshotQuality: 40,
    screenshotWidth: 640,

    // Live Stream Settings
    enableLiveStream: true,
    streamIntervalMs: 800,
    streamQuality: 50,
    streamWidth: 960,
    streamMinWidth: 640,
    streamMaxWidth: 1280,
    streamMinQuality: 20,
    streamAdaptive: true,
    streamPauseDuringVideo: true,

    // PC Name (empty = auto-detect from hostname)
    pcName: '',

    // Network
    requestTimeout: 10000,
    maxRetries: 3,
    retryDelay: 2000,
};

// ---- External Config File Locations (checked in order) ----
const CONFIG_PATHS = [
    // Primary: installed location (Program Files, not ProgramData)
    'C:\\Program Files\\ICafeMonitor\\config.json',
    // Secondary: same folder as the running script/exe
    path.join(path.dirname(process.execPath || __filename), 'config.json'),
    // Tertiary: current working directory
    path.join(process.cwd(), 'config.json'),
];

/**
 * Load configuration with external file override support.
 * This is the key feature: the SAME .exe works on every PC,
 * because the installer writes a per-PC config.json with the server IP.
 */
function loadConfig() {
    let externalConfig = {};

    // Try each config file location
    for (const configPath of CONFIG_PATHS) {
        try {
            if (fs.existsSync(configPath)) {
                const raw = fs.readFileSync(configPath, 'utf-8');
                externalConfig = JSON.parse(raw);
                console.log(`[Config] Loaded external config from: ${configPath}`);
                break;
            }
        } catch (err) {
            console.warn(`[Config] Failed to read ${configPath}:`, err.message);
        }
    }

    // Check environment variable override for server URL
    if (process.env.ICAFE_SERVER_URL) {
        externalConfig.serverUrl = process.env.ICAFE_SERVER_URL;
        console.log(`[Config] Server URL overridden by env: ${process.env.ICAFE_SERVER_URL}`);
    }

    // Merge: external config overrides defaults
    const finalConfig = { ...DEFAULTS, ...externalConfig };

    // Ensure serverUrl has no trailing slash
    finalConfig.serverUrl = finalConfig.serverUrl.replace(/\/+$/, '');

    return finalConfig;
}

module.exports = loadConfig();
