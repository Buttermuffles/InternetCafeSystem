/**
 * ============================================================
 * ICafe Monitor Agent - Core Monitoring Engine
 * ============================================================
 * Class-based agent that sends heartbeats and polls commands.
 * Used by both the Electron GUI and standalone agent.js.
 * ============================================================
 */

const os = require('os');
const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const axios = require('axios');
const si = require('systeminformation');
const Pusher = require('pusher-js');
const http = require('http');
const https = require('https');
let ffmpegPath = require('ffmpeg-static');
// If running in Electron production, find the binary in the asar.unpacked folder
if (process.versions.electron && ffmpegPath.includes('app.asar')) {
    ffmpegPath = ffmpegPath.replace('app.asar', 'app.asar.unpacked');
}

let wrtc = null;
try {
    wrtc = require('wrtc');
} catch (e) {
    console.warn('[Agent] wrtc not available. WebRTC real-time mode disabled.');
}

class AgentCore {
    constructor(config) {
        this.config = {
            heartbeatInterval: 4000,
            commandPollInterval: 2500,
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
            requestTimeout: 15000,
            maxRetries: 3,
            retryDelay: 2000,
            ...config,
        };
        this.pcName = config.pcName || os.hostname();
        this.isRunning = false;
        this.consecutiveFailures = 0;
        this.heartbeatCount = 0;
        this.lastHeartbeat = null;
        this.heartbeatTimer = null;
        this.streamTimer = null;
        this.lastScreenshotAt = 0;
        this.streamInFlight = false;
        this.heartbeatInFlight = false;
        this.streamSequence = 0;
        this.videoRecordingInProgress = false;
        this.lastSystemFingerprint = null;
        this.lastStaticPayload = null;
        this.streamState = {
            intervalMs: this.clamp(this.config.streamIntervalMs, 700, 4000),
            quality: this.clamp(this.config.streamQuality, this.config.streamMinQuality, 85),
            width: this.clamp(this.config.streamWidth, this.config.streamMinWidth, this.config.streamMaxWidth),
        };
        this.executedCommandIds = new Set();
        this.webRtcPeer = null;
        this.webRtcDataChannel = null;
        this.webRtcPollingTimer = null;
        this.onStatusUpdate = null; // callback for GUI updates

        // Create axios instance
        this.api = axios.create({
            baseURL: config.serverUrl,
            timeout: config.requestTimeout || 5000,
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': config.apiKey || '',
            },
            httpAgent: new http.Agent({ keepAlive: true }),
            httpsAgent: new https.Agent({ keepAlive: true }),
        });
    }

    // ── Start/Stop ──
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.consecutiveFailures = 0;
        console.log(`[Agent] Starting in Push-Mode | PC: ${this.pcName}`);

        // ── Direct Command Listener (No Polling) ──
        // This allows the server to 'push' commands instantly on LAN
        this.pushListener = http.createServer(async (req, res) => {
            if (req.url === '/execute-command' && req.method === 'POST') {
                let body = '';
                req.on('data', chunk => { body += chunk; });
                req.on('end', () => {
                    try {
                        const cmd = JSON.parse(body);
                        console.log(`[Agent] Instant Push Received: ${cmd.command_type}`);
                        this.executeCommand(cmd);
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ status: 'success' }));
                    } catch (e) {
                        res.writeHead(400);
                        res.end('Invalid Payload');
                    }
                });
            } else {
                res.writeHead(404);
                res.end();
            }
        });

        const PUSH_PORT = 9900;
        this.pushListener.listen(PUSH_PORT, '0.0.0.0', () => {
            console.log(`[Agent] Push Listener ready on port ${PUSH_PORT}`);
        });

        // ── Registration Handshake ("Getting the PCs") ──
        this.sendHeartbeat(); // Register instantly

        const heartbeatFreq = this.config.heartbeatInterval || 5000;
        const runHeartbeat = async () => {
            if (!this.isRunning) return;
            await this.sendHeartbeat();
            const jitter = Math.floor(Math.random() * 500);
            this.heartbeatTimer = setTimeout(runHeartbeat, heartbeatFreq + jitter);
        };
        setTimeout(runHeartbeat, 1500);

        this.scheduleStreamLoop(500 + Math.random() * 1000);
        this.startWebRTCSignaling();

        this._emitStatus();
    }

    stop() {
        this.isRunning = false;
        if (this.heartbeatTimer) clearTimeout(this.heartbeatTimer);
        if (this.streamTimer) clearTimeout(this.streamTimer);
        if (this.pushListener) {
            this.pushListener.close();
            this.pushListener = null;
        }
        this.heartbeatTimer = null;
        this.streamTimer = null;
        this.stopWebRTCSignaling();
        console.log('[Agent] Stopped.');
        this._emitStatus();
    }

    getStatus() {
        return {
            running: this.isRunning,
            connected: this.consecutiveFailures === 0 && this.heartbeatCount > 0,
            heartbeats: this.heartbeatCount,
            failures: this.consecutiveFailures,
            lastHeartbeat: this.lastHeartbeat,
            pcName: this.pcName,
            serverUrl: this.config.serverUrl,
            liveStreamEnabled: !!this.config.enableLiveStream,
            liveStreamProfile: { ...this.streamState },
        };
    }

    _emitStatus() {
        if (this.onStatusUpdate) {
            this.onStatusUpdate(this.getStatus());
        }
    }

    // ── System Info ──
    async getCpuUsage() {
        // Cache SI calls for 1.5s to reduce overhead
        const now = Date.now();
        if (this._cpuCache && (now - this._cpuCacheTime) < 1500) {
            return this._cpuCache;
        }
        try {
            const load = await si.currentLoad();
            this._cpuCache = Math.round(load.currentLoad * 100) / 100;
            this._cpuCacheTime = now;
            return this._cpuCache;
        } catch { return 0; }
    }

    async getRamInfo() {
        const now = Date.now();
        if (this._ramCache && (now - this._ramCacheTime) < 1500) {
            return this._ramCache;
        }
        try {
            const mem = await si.mem();
            this._ramCache = {
                usage: Math.round((mem.used / mem.total) * 10000) / 100,
                total: Math.round((mem.total / (1024 ** 3)) * 100) / 100,
                used: Math.round((mem.used / (1024 ** 3)) * 100) / 100,
            };
            this._ramCacheTime = now;
            return this._ramCache;
        } catch { return { usage: 0, total: 0, used: 0 }; }
    }

    getLocalIp() {
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

    getOsInfo() {
        return `${os.type()} ${os.release()} (${os.arch()})`;
    }

    clamp(value, min, max) {
        return Math.max(min, Math.min(max, Number(value) || min));
    }

    async captureEncodedFrame({ width, quality, includeDataUrl = false }) {
        const crypto = require('crypto');
        try {
            const ffmpegQuality = Math.max(1, Math.min(31, Math.floor((100 - quality) / 4) + 1));

            const args = [
                '-y',
                '-f', 'gdigrab',
                '-i', 'desktop',
                '-frames:v', '1',
                '-vf', `scale='min(iw,${width})':-2`,
                '-q:v', String(ffmpegQuality),
                '-f', 'mjpeg',
                'pipe:1'
            ];

            return new Promise((resolve, reject) => {
                const proc = spawn(ffmpegPath, args, { windowsHide: true });
                let buffer = Buffer.alloc(0);

                proc.stdout.on('data', (data) => {
                    buffer = Buffer.concat([buffer, data]);
                });

                proc.on('close', (code) => {
                    if (code === 0 && buffer.length > 0) {
                        const hash = crypto.createHash('md5').update(buffer).digest('hex');
                        const base64 = buffer.toString('base64');
                        resolve({
                            mimeType: 'image/jpeg',
                            base64,
                            hash,
                            dataUrl: includeDataUrl ? `data:image/jpeg;base64,${base64}` : null,
                            width,
                            height: null
                        });
                    } else {
                        reject(new Error('FFmpeg capture null or failed'));
                    }
                });

                proc.on('error', reject);
            });
        } catch (err) {
            // Fallback to legacy screenshot-desktop if FFmpeg fails
            const screenshot = require('screenshot-desktop');
            const sourceBuffer = await screenshot({ format: 'png' });
            const hash = crypto.createHash('md5').update(sourceBuffer).digest('hex');
            const base64 = sourceBuffer.toString('base64');
            return {
                mimeType: 'image/png',
                base64,
                hash,
                dataUrl: includeDataUrl ? `data:image/png;base64,${base64}` : null,
                width,
                height: null
            };
        }
    }

    async captureScreenshot() {
        if (!this.config.enableScreenshot) return null;
        try {
            const frame = await this.captureEncodedFrame({
                width: this.config.screenshotWidth || 640,
                quality: this.config.screenshotQuality || 40,
                includeDataUrl: true,
            });
            return frame.dataUrl;
        } catch (err) {
            console.error('[Screenshot] Error:', err.message);
            return null;
        }
    }

    shouldCaptureScreenshot() {
        if (!this.config.enableScreenshot) return false;
        if (this.videoRecordingInProgress) return false;
        const intervalMs = this.config.screenshotIntervalMs || 15000;
        const now = Date.now();
        return !this.lastScreenshotAt || (now - this.lastScreenshotAt) >= intervalMs;
    }

    scheduleStreamLoop(delayMs = this.streamState.intervalMs) {
        if (this.streamTimer) clearTimeout(this.streamTimer);
        if (!this.isRunning || !this.config.enableLiveStream) return;

        this.streamTimer = setTimeout(async () => {
            if (!this.isRunning) return;
            if (this.streamSequence === 0) console.log('[Stream] Loop started');
            await this.publishLiveFrame();
            this.scheduleStreamLoop(this.streamState.intervalMs);
        }, Math.max(500, delayMs));
    }

    adaptStreamProfile({ success, captureMs = 0, uploadMs = 0 }) {
        if (!this.config.streamAdaptive) return;

        const baseInterval = this.clamp(this.config.streamIntervalMs, 700, 4000);
        const baseQuality = this.clamp(this.config.streamQuality, this.config.streamMinQuality, 85);
        const baseWidth = this.clamp(this.config.streamWidth, this.config.streamMinWidth, this.config.streamMaxWidth);

        if (!success || uploadMs > 1200 || captureMs > 700) {
            this.streamState.intervalMs = this.clamp(this.streamState.intervalMs + 200, baseInterval, 4000);
            this.streamState.quality = this.clamp(this.streamState.quality - 4, this.config.streamMinQuality, baseQuality);
            this.streamState.width = this.clamp(Math.round(this.streamState.width * 0.9), this.config.streamMinWidth, baseWidth);
            return;
        }

        if (uploadMs < 500 && captureMs < 350) {
            this.streamState.intervalMs = this.clamp(this.streamState.intervalMs - 100, baseInterval, 4000);
            this.streamState.quality = this.clamp(this.streamState.quality + 2, this.config.streamMinQuality, baseQuality);
            this.streamState.width = this.clamp(this.streamState.width + 40, this.config.streamMinWidth, baseWidth);
        }
    }

    async publishLiveFrame() {
        if (!this.config.enableLiveStream || this.streamInFlight) return;
        if (this.config.streamPauseDuringVideo && this.videoRecordingInProgress) return;

        this.streamInFlight = true;
        const captureStartedAt = Date.now();

        try {
            const frame = await this.captureEncodedFrame({
                width: this.streamState.width,
                quality: this.streamState.quality,
                includeDataUrl: false,
            });

            // SKIP UPLOAD IF FRAME HASN'T CHANGED
            if (this.lastStreamHash === frame.hash) {
                this.streamInFlight = false;
                return;
            }
            this.lastStreamHash = frame.hash;

            const captureMs = Date.now() - captureStartedAt;

            const uploadStartedAt = Date.now();
            await this.api.post('/api/streams/frame', {
                pc_name: this.pcName,
                frame_base64: frame.base64,
                mime_type: frame.mimeType,
                width: frame.width,
                height: frame.height,
                fps: Math.round((1000 / this.streamState.intervalMs) * 10) / 10,
                quality: this.streamState.quality,
                capture_ms: captureMs,
                sequence: ++this.streamSequence,
            });

            if (this.streamSequence % 5 === 0) {
                console.log(`[Stream] Frame #${this.streamSequence} uploaded to server (${frame.base64.length} bytes)`);
            }
            this.adaptStreamProfile({
                success: true,
                captureMs,
                uploadMs: Date.now() - uploadStartedAt,
            });
        } catch (err) {
            this.adaptStreamProfile({ success: false });
            const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
            console.warn('[LiveStream] Frame upload failed:', detail);
        } finally {
            this.streamInFlight = false;
        }
    }

    // ── WebRTC Signaling / DataChannel Stream ──
    startWebRTCSignaling() {
        if (!this.config.enableLiveStream || !wrtc) return;

        if (this.webRtcPollingTimer) {
            clearInterval(this.webRtcPollingTimer);
        }

        this.webRtcPollingTimer = setInterval(async () => {
            try {
                const resp = await this.api.get(`/api/streams/webrtc/offer-agent/${encodeURIComponent(this.pcName)}`);
                if (resp.status === 200 && resp.data?.status === 'ready' && resp.data.offer) {
                    await this.handleWebRTCOffer(resp.data.offer);
                }
            } catch (err) {
                // 204 or no offer yet is normal; ignore
            }
        }, 1200);
    }

    stopWebRTCSignaling() {
        if (this.webRtcPollingTimer) {
            clearInterval(this.webRtcPollingTimer);
            this.webRtcPollingTimer = null;
        }
        this.destroyWebRTCSession();
    }

    async handleWebRTCOffer(offerSdp) {
        if (!wrtc || !this.config.enableLiveStream) {
            return;
        }

        this.destroyWebRTCSession();

        this.webRtcPeer = new wrtc.RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });

        this.webRtcPeer.onicecandidate = async ({ candidate }) => {
            // we rely on non-trickle, so only post once candidate gathering is complete
        };

        this.webRtcPeer.onconnectionstatechange = () => {
            if (!this.webRtcPeer) return;
            if (['failed', 'closed', 'disconnected'].includes(this.webRtcPeer.connectionState)) {
                this.destroyWebRTCSession();
            }
        };

        this.webRtcPeer.ondatachannel = (event) => {
            const channel = event.channel;
            if (channel.label === 'frame') {
                this.webRtcDataChannel = channel;
                console.log('[WebRTC] Frame channel accepted from Dashboard.');

                channel.onopen = () => {
                    console.log('[WebRTC] Channel open, starting 30 FPS stream.');
                };

                channel.onclose = () => {
                    this.webRtcDataChannel = null;
                    console.log('[WebRTC] Channel closed.');
                };
            }
        };

        await this.webRtcPeer.setRemoteDescription({ type: 'offer', sdp: offerSdp });
        const answer = await this.webRtcPeer.createAnswer();
        await this.webRtcPeer.setLocalDescription(answer);

        // Await ICE gathering completion to ensure unified SDP (non-trickle)
        await new Promise((resolve) => {
            if (this.webRtcPeer.iceGatheringState === 'complete') return resolve();
            const checkState = () => {
                if (!this.webRtcPeer) return resolve();
                if (this.webRtcPeer.iceGatheringState === 'complete') {
                    this.webRtcPeer.removeEventListener('icegatheringstatechange', checkState);
                    return resolve();
                }
            };
            this.webRtcPeer.addEventListener('icegatheringstatechange', checkState);
            // Safety timeout
            setTimeout(resolve, 5000);
        });

        if (!this.webRtcPeer.localDescription) {
            console.warn('[WebRTC] No local description available after answer.');
            return;
        }

        await this.api.post('/api/streams/webrtc/answer-session', {
            pc_name: this.pcName,
            sdp: this.webRtcPeer.localDescription.sdp,
        });


        // start periodic webRTC frame pushing
        this.webRtcFrameTimer = setInterval(async () => {
            if (!this.webRtcDataChannel || this.webRtcDataChannel.readyState !== 'open') return;
            try {
                const frame = await this.captureEncodedFrame({
                    width: this.streamState.width,
                    quality: this.streamState.quality,
                    includeDataUrl: false,
                });
                const payload = JSON.stringify({ type: 'frame', data: frame.base64, mimeType: frame.mimeType });
                this.webRtcDataChannel.send(payload);
            } catch (err) {
                console.warn('[WebRTC] Frame send failed:', err.message);
            }
        }, 33); // 30 FPS Real-time
    }

    destroyWebRTCSession() {
        if (this.webRtcFrameTimer) {
            clearInterval(this.webRtcFrameTimer);
            this.webRtcFrameTimer = null;
        }
        if (this.webRtcDataChannel) {
            try { this.webRtcDataChannel.close(); } catch { }
            this.webRtcDataChannel = null;
        }
        if (this.webRtcPeer) {
            try { this.webRtcPeer.close(); } catch { }
            this.webRtcPeer = null;
        }
    }

    // ── Video Recording (on-demand) ──
    async recordVideo(options = {}) {
        const durationMs = Math.max(1000, Math.min(Number(options.durationMs) || 8000, 30000));
        const fps = Math.max(2, Math.min(Number(options.fps) || 8, 15));
        const width = Math.max(240, Math.min(Number(options.width) || 640, 1280));

        const durationSec = durationMs / 1000;
        const outPath = path.join(os.tmpdir(), `icafe_video_${this.pcName}_${Date.now()}.mp4`);

        const args = [
            '-y',
            '-f', 'gdigrab',
            '-framerate', String(fps),
            '-i', 'desktop',
            '-t', String(durationSec),
            '-vf', `scale=${width}:-2`,
            '-c:v', 'libx264',
            '-preset', 'ultrafast',
            '-crf', '28',
            '-pix_fmt', 'yuv420p',
            '-an',
            outPath,
        ];

        return new Promise((resolve, reject) => {
            const proc = spawn(ffmpegPath, args, { windowsHide: true });
            let stderrTail = '';

            proc.stderr?.on('data', (d) => {
                const s = d.toString();
                stderrTail = (stderrTail + s).slice(-2000);
            });

            proc.on('error', reject);
            proc.on('close', (code) => {
                if (code === 0 && fs.existsSync(outPath)) {
                    resolve(outPath);
                } else {
                    reject(new Error(`ffmpeg exited with code ${code}. ${stderrTail.trim().slice(0, 500)}`));
                }
            });
        });
    }

    async recordAndUploadVideo(options = {}) {
        this.videoRecordingInProgress = true;
        const outPath = await this.recordVideo(options);
        try {
            const videoBase64 = fs.readFileSync(outPath).toString('base64');

            const durationMs = Math.max(0, Number(options.durationMs) || 8000);

            const uploadResp = await this.api.post('/api/videos/upload', {
                pc_name: this.pcName,
                mime_type: 'video/mp4',
                video_base64: videoBase64,
                duration_ms: durationMs,
            });

            return uploadResp.data?.data?.video_src || '';
        } finally {
            try { fs.unlinkSync(outPath); } catch { /* ignore */ }
            this.videoRecordingInProgress = false;
        }
    }

    // ── Heartbeat ──
    async sendHeartbeat() {
        if (this.heartbeatInFlight) return;
        this.heartbeatInFlight = true;
        try {
            // Handle massive disconnects - rebuild axios if too many failures
            if (this.consecutiveFailures > 25 && this.consecutiveFailures % 10 === 0) {
                console.log(`[Agent] Hard reconnection attempt (${this.consecutiveFailures} failures)...`);
                this.api = axios.create({
                    baseURL: this.config.serverUrl,
                    timeout: this.config.requestTimeout || 7000,
                    headers: { 'Content-Type': 'application/json', 'X-API-Key': this.config.apiKey || '' },
                    httpAgent: new http.Agent({ keepAlive: false }),
                    httpsAgent: new https.Agent({ keepAlive: false }),
                });
                setTimeout(() => {
                    this.api.defaults.httpAgent = new http.Agent({ keepAlive: true });
                    this.api.defaults.httpsAgent = new https.Agent({ keepAlive: true });
                }, 800);
            }

            const [cpuUsage, ramInfo] = await Promise.all([
                this.getCpuUsage(),
                this.getRamInfo(),
            ]);

            const nextIp = this.getLocalIp();
            const osInfo = this.getOsInfo();

            const payload = {
                pc_name: this.pcName,
                cpu_usage: cpuUsage,
                ram_usage: ramInfo.usage,
                ram_total: ramInfo.total,
                ram_used: ramInfo.used,
            };

            // Only send static info if it changed or every 50 heartbeats for consistency
            if (this.heartbeatCount % 50 === 0 || nextIp !== this.lastIp || osInfo !== this.lastOs) {
                payload.ip_address = nextIp;
                payload.os_info = osInfo;
                this.lastIp = nextIp;
                this.lastOs = osInfo;
            }

            if (this.shouldCaptureScreenshot()) {
                const frame = await this.captureEncodedFrame({
                    width: this.config.screenshotWidth || 640,
                    quality: this.config.screenshotQuality || 40,
                    includeDataUrl: true,
                });

                // Only send screenshot if different from last heartbeat frame
                if (this.lastHbFrameHash !== frame.hash) {
                    this.lastScreenshotAt = Date.now();
                    payload.screenshot = frame.dataUrl;
                    this.lastHbFrameHash = frame.hash;
                }
            }

            const response = await this.api.post('/api/heartbeat', payload);

            if (response.data.status === 'success') {
                if (this.consecutiveFailures > 0) {
                    console.log('[Agent] Connection restored!');
                }
                this.consecutiveFailures = 0;
                this.heartbeatCount++;
                this.lastHeartbeat = new Date().toLocaleTimeString();

                // On success, reduce heartbeat interval to normal if it was slowed down
                if (this.heartbeatCount % 50 === 0) {
                    console.log(`[${this.lastHeartbeat}] ♥ Heartbeat #${this.heartbeatCount} | CPU: ${cpuUsage}% | RAM: ${ramInfo.usage}%`);
                }
            }
        } catch (err) {
            this.consecutiveFailures++;
            // Don't flood console if it's a long-term failure
            if (this.consecutiveFailures < 5 || this.consecutiveFailures % 20 === 0) {
                console.error(`[Heartbeat] Connection lost (attempt ${this.consecutiveFailures}):`, err.message);
            }
        } finally {
            this.heartbeatInFlight = false;
        }
        this._emitStatus();
    }

    async executeCommand(command) {
        const { id, command_type, command_data } = command;
        console.log(`[Command] Executing: ${command_type} (ID: ${id})`);

        const reportResult = async (commandId, status, result) => {
            try {
                await this.api.post('/api/command-result', {
                    command_id: commandId, status, result,
                });
                // Mark command as handled locally to avoid repeated executions.
                this.executedCommandIds.add(commandId);
            } catch (err) {
                console.error('[Command] Report failed:', err.message);
            }
        };

        switch (command_type) {
            case 'lock':
                exec('rundll32.exe user32.dll,LockWorkStation', (err) => {
                    reportResult(id, err ? 'failed' : 'executed', err ? err.message : 'Workstation locked.');
                });
                break;

            case 'shutdown':
                exec('shutdown /s /t 30 /c "Internet Cafe: Shutting down in 30 seconds"', (err) => {
                    reportResult(id, err ? 'failed' : 'executed', err ? err.message : 'Shutdown initiated (30s).');
                });
                break;

            case 'restart':
                exec('shutdown /r /t 30 /c "Internet Cafe: Restarting in 30 seconds"', (err) => {
                    reportResult(id, err ? 'failed' : 'executed', err ? err.message : 'Restart initiated (30s).');
                });
                break;

            case 'message':
                if (!command_data) { reportResult(id, 'failed', 'No message'); break; }
                const escaped = command_data.replace(/'/g, "''");
                exec(`powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.MessageBox]::Show('${escaped}', 'Internet Cafe Message', 'OK', 'Information')"`, (err) => {
                    reportResult(id, err ? 'failed' : 'executed', err ? err.message : `Message displayed: "${command_data}"`);
                });
                break;

            case 'execute':
                const dangerous = ['format', 'del /s', 'rmdir /s', 'rd /s'];
                if (dangerous.some(d => command_data.toLowerCase().includes(d))) {
                    reportResult(id, 'failed', 'Command blocked for security.');
                    break;
                }
                exec(command_data, { timeout: 30000 }, (err, stdout, stderr) => {
                    reportResult(id, err ? 'failed' : 'executed', err ? (stderr || err.message) : (stdout || 'OK'));
                });
                break;

            case 'record_video':
                try {
                    let opts = {};
                    if (command_data) {
                        try {
                            opts = typeof command_data === 'string' ? JSON.parse(command_data) : command_data;
                        } catch {
                            // If command_data isn't JSON, treat it as duration in ms.
                            opts = { durationMs: parseInt(command_data, 10) };
                        }
                    }

                    // Avoid extra CPU while recording video.
                    const prevScreenshotEnabled = this.config.enableScreenshot;
                    this.config.enableScreenshot = false;

                    (async () => {
                        try {
                            const videoSrc = await this.recordAndUploadVideo(opts);
                            await reportResult(id, 'executed', videoSrc || 'Video uploaded.');
                        } catch (err) {
                            await reportResult(id, 'failed', err?.message || String(err));
                        } finally {
                            this.config.enableScreenshot = prevScreenshotEnabled;
                        }
                    })();
                } catch (err) {
                    reportResult(id, 'failed', err?.message || String(err));
                }
                break;

            case 'delete_downloads':
                exec('del /q /f /s "%USERPROFILE%\\Downloads\\*" && for /d %x in ("%USERPROFILE%\\Downloads\\*") do @rd /s /q "%x"', (err, stdout, stderr) => {
                    reportResult(id, err ? 'failed' : 'executed', err ? (stderr || err.message) : 'Downloads cleared.');
                });
                break;

            case 'empty_recycle':
                exec('rd /s /q %systemdrive%\\$Recycle.bin', (err, stdout, stderr) => {
                    reportResult(id, (err && !stderr?.includes('cannot access')) ? 'failed' : 'executed',
                        (err && !stderr?.includes('cannot access')) ? (stderr || err.message) : 'Recycle Bin emptied.');
                });
                break;

            case 'get_processes':
                // Optimized process query using wmic - much faster than full PowerShell Get-Process
                const wmCommand = 'wmic process get Name,ProcessId,WorkingSetSize /format:csv';
                exec(wmCommand, { timeout: 10000 }, (err, stdout) => {
                    if (err) {
                        reportResult(id, 'failed', err.message);
                    } else {
                        // Minimal parsing to send back structured data quickly
                        reportResult(id, 'executed', stdout);
                    }
                });
                break;

            default:
                reportResult(id, 'failed', 'Unknown command type');
        }
    }
}

module.exports = AgentCore;
