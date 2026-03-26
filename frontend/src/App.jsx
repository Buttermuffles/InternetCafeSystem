import React, { useState, useEffect, useCallback, useRef } from 'react';
import Pusher from 'pusher-js';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import StatsBar from './components/StatsBar';
import PcGrid from './components/PcGrid';
import MessageModal from './components/MessageModal';
import ExecuteModal from './components/ExecuteModal';
import ScreenshotModal from './components/ScreenshotModal';
import VideoModal from './components/VideoModal';
import ComputerViewModal from './components/ComputerViewModal';
import ProcessModal from './components/ProcessModal';
import ActionConfirmModal from './components/ActionConfirmModal';
import api, { fetchPcs, sendCommand, fetchLatestVideo, fetchPc, fetchStreamFrame, fetchStreamFrames, postWebRTCOffer, getWebRTCAnswer, fetchCommandResult } from './services/api';

/**
 * ============================================================
 * App - Main Application Component
 * ============================================================
 * Root component that manages:
 * - Fetching PC data every 3 seconds
 * - Sending commands to PCs
 * - Modal state management
 */
import { Monitor, RefreshCcw, AlertTriangle, ShieldCheck, Zap, Lock, MessageSquare, Power, List, Search, CheckCircle2 } from 'lucide-react';

function App() {
    // ---- State ----
    const [pcs, setPcs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);

    // Modal states
    const [messageModal, setMessageModal] = useState({ open: false, pcName: '' });
    const [executeModal, setExecuteModal] = useState({ open: false, pcName: '' });
    const [screenshotModal, setScreenshotModal] = useState({ open: false, pc: null });
    const [videoModalState, setVideoModalState] = useState({ open: false, pcName: '', videoSrc: null, isRecording: false });
    const [computerView, setComputerView] = useState({ open: false, pcName: '' });
    const [processModal, setProcessModal] = useState({ open: false, pcName: '', processes: [] });
    const [actionConfirm, setActionConfirm] = useState({ open: false, type: '', title: '', description: '', pName: '', tone: 'indigo', requiresInput: false });
    const [selectedPcs, setSelectedPcs] = useState([]);
    const [liveFrames, setLiveFrames] = useState({});
    const [webrtcFrames, setWebrtcFrames] = useState({});
    const [webrtcSessions, setWebrtcSessions] = useState({});
    const cctvMode = true; // Always active for instant monitoring

    // Toast notification
    const [toast, setToast] = useState(null);
    const [terminalLogs, setTerminalLogs] = useState([]);

    const videoPollTimerRef = useRef(null);
    const pusherRef = useRef(null);

    const addTerminalLog = useCallback((entry) => {
        const timestamp = new Date().toLocaleTimeString();
        setTerminalLogs((prev) => {
            const next = [{ timestamp, entry }, ...prev];
            return next.slice(0, 50);
        });
    }, []);

    // ---- Data Fetching ----
    const loadPcs = useCallback(async () => {
        addTerminalLog('API FETCH /api/pcs (poll)');
        try {
            // For low-spec computers, avoid downloading base64 screenshots on every poll.
            const result = await fetchPcs(false);
            if (result.status === 'success') {
                setPcs(result.data);
                setLastUpdate(new Date());
                setError(null);
                addTerminalLog(`FETCH result: ${result.data.length} PCs`);
            }
        } catch (err) {
            setError('ICafe Hub is unreachable. Retrying...');
            addTerminalLog('FETCH error: ICafe Hub unreachable');
            console.error('Failed to fetch PCs:', err);
        } finally {
            setLoading(false);
        }
    }, [addTerminalLog]);

    useEffect(() => {
        let cancelled = false;

        const pollFrames = async () => {
            if (document.hidden) return;

            // Only poll frames if WebRTC is NOT providing a live feed for these PCs.
            const onlinePcNames = pcs
                .filter((pc) => pc.status === 'online' && !webrtcFrames[pc.pc_name])
                .map((pc) => pc.pc_name)
                .slice(0, 16);

            if (onlinePcNames.length === 0) return;

            try {
                const result = await fetchStreamFrames(onlinePcNames);
                if (!cancelled) {
                    setLiveFrames((prev) => ({ ...prev, ...(result?.data || {}) }));
                }
            } catch {
                // Ignore transient stream polling failures.
            }
        };

        const interval = setInterval(pollFrames, 1200);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [pcs, webrtcFrames]);

    // NEW: Auto-WebRTC (CCTV Mode)
    useEffect(() => {
        if (!cctvMode) return;

        const onlinePcs = pcs.filter(pc => pc.status === 'online').slice(0, 8); // Limit to 8 for stability
        onlinePcs.forEach(pc => {
            const session = webrtcSessions[pc.pc_name];
            if (!session || (!session.connected && !session.connecting)) {
                console.log(`[CCTV] Auto-starting WebRTC for ${pc.pc_name}`);
                handleStartWebRTC(pc.pc_name);
            }
        });
    }, [pcs, cctvMode]);

    useEffect(() => {
        if (!computerView.open || !computerView.pcName) return undefined;

        let cancelled = false;
        const pollFocusedFrame = async () => {
            try {
                const result = await fetchStreamFrame(computerView.pcName);
                if (!cancelled && result?.data) {
                    setLiveFrames((prev) => ({ ...prev, [computerView.pcName]: result.data }));
                }
            } catch {
                // Ignore transient stream polling failures.
            }
        };

        pollFocusedFrame();
        const interval = setInterval(pollFocusedFrame, 600);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [computerView.open, computerView.pcName]);

    // Initial load and auto-refresh.
    useEffect(() => {
        loadPcs();
        const interval = setInterval(loadPcs, 8000); // Slower initial fetch to save bandwidth
        return () => clearInterval(interval);
    }, [loadPcs]);

    // Realtime updates via Soketi/Pusher protocol (no auth needed for zpublic channel `pcs`).
    useEffect(() => {
        let pusher = null;
        try {
            const useOfficial = true; // FORCE OFFICIAL FOR RELIABILITY
            const key = '28728c9b9070d8da40a3'; // HARDCODE USER'S KEY FOR STABILITY
            const cluster = 'ap1';

            const config = {
                cluster,
                forceTLS: true,
                disableStats: true,
                enabledTransports: ['ws', 'wss'],
            };


            pusher = new Pusher(key, config);

            pusherRef.current = pusher;

            const channel = pusher.subscribe('pcs');
            const handler = (data) => {
                if (!data || !data.pc_name) return;
                addTerminalLog(`PUSHER PcUpdated: ${data.pc_name} status=${data.status || 'unknown'}`);
                setPcs((prev) => {
                    const idx = prev.findIndex((p) => p.pc_name === data.pc_name);
                    if (idx === -1) return [...prev, { ...data }];
                    return prev.map((p) => (p.pc_name === data.pc_name ? { ...p, ...data } : p));
                });
                setLastUpdate(new Date());
                setError(null);
            };

            // Depending on Laravel broadcast naming, the event might come with or without leading dot.
            channel.bind('PcUpdated', handler);
            channel.bind('.PcUpdated', handler);
        } catch (e) {
            // If realtime fails, polling fallback still works.
        }

        return () => {
            try {
                pusher?.disconnect();
            } catch {
                // ignore
            }
            pusherRef.current = null;
        };
    }, [addTerminalLog]);

    const handleFetchProcesses = async (pcName) => {
        try {
            const resp = await api.post('/api/send-command', {
                pc_name: pcName,
                command_type: 'get_processes'
            });
            const cmdId = resp.data.command_id;
            showToast('Fetching process list...');

            let attempts = 0;
            const checkInt = setInterval(async () => {
                attempts++;
                try {
                    const res = await fetchCommandResult(cmdId);
                    if (res.data.data.status === 'executed') {
                        clearInterval(checkInt);
                        const procData = JSON.parse(res.data.data.result);
                        setProcessModal({ open: true, pcName, processes: Array.isArray(procData) ? procData : [procData] });
                    } else if (res.data.data.status === 'failed' || attempts > 15) {
                        clearInterval(checkInt);
                        showToast('Process fetch failed', 'error');
                    }
                } catch (e) {
                    clearInterval(checkInt);
                }
            }, 1200);
        } catch (err) {
            showToast('Fetch failed', 'error');
        }
    };

    const handleKillProcess = async (pid, name) => {
        const pcName = processModal.pcName;
        try {
            await api.post('/api/send-command', {
                pc_name: pcName,
                command_type: 'execute',
                command_data: `taskkill /F /PID ${pid}`
            });
            showToast(`Termination command sent: ${name}`);
            setProcessModal(prev => ({ ...prev, open: false }));
        } catch (err) {
            showToast('Kill failed', 'error');
        }
    };
    // ---- Toast Helper ----
    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // ---- Command Handlers ----
    const handleCommand = async (pcName, commandType, commandData = null) => {
        addTerminalLog(`COMMAND ${commandType} sent to ${pcName}${commandData ? ` (${commandData})` : ''}`);
        try {
            const result = await sendCommand(pcName, commandType, commandData);
            if (result.status === 'success') {
                showToast(`✓ Command [${commandType}] dispatched to ${pcName}`);
                addTerminalLog(`COMMAND result: ${commandType} -> success`);
            } else {
                showToast(`✗ Error: ${result.message}`, 'error');
                addTerminalLog(`COMMAND result: ${commandType} -> error`);
            }
        } catch (err) {
            const errorMsg = err.response?.data?.message || err.message;
            showToast(`✗ Failed to reach agent: ${errorMsg}`, 'error');
            addTerminalLog(`COMMAND result: ${commandType} -> failed: ${errorMsg}`);
        }
    };

    const handleToggleSelection = (pcName) => {
        setSelectedPcs(prev =>
            prev.includes(pcName) ? prev.filter(name => name !== pcName) : [...prev, pcName]
        );
    };

    const handleSelectAll = (select) => {
        if (select) {
            const onlinePcNames = pcs.filter(p => p.status === 'online').map(p => p.pc_name);
            setSelectedPcs(onlinePcNames);
        } else {
            setSelectedPcs([]);
        }
    };

    const executeBatchAction = async (actionType, cmdData = null) => {
        const targets = selectedPcs.length > 0 ? selectedPcs : pcs.filter(p => p.status === 'online').map(p => p.pc_name);

        if (targets.length === 0) {
            showToast('No online PCs selected', 'error');
            return;
        }

        for (const pcName of targets) {
            handleCommand(pcName, actionType, cmdData);
        }

        setActionConfirm({ open: false });
        // Optionally clear selection after batch action
        // setSelectedPcs([]);
    };

    // ---- Command Handlers ----

    const handleStopWebRTC = (pcName) => {
        setWebrtcSessions((prev) => {
            const next = { ...prev };
            if (next[pcName]?.peer) {
                try {
                    next[pcName].peer.close();
                } catch {
                    // ignore
                }
            }
            delete next[pcName];
            return next;
        });
        setWebrtcFrames((prev) => {
            const next = { ...prev };
            delete next[pcName];
            return next;
        });
        showToast(`Stopped WebRTC for ${pcName}`, 'info');
    };

    const handleStartWebRTC = async (pcName) => {
        if (!pcName) return;
        const currentSession = webrtcSessions[pcName];
        if (currentSession?.connected || currentSession?.connecting) {
            if (currentSession?.connected) handleStopWebRTC(pcName);
            return;
        }

        // Mark as connecting to avoid duplicate calls from CCTV Mode loop
        setWebrtcSessions((prev) => ({ ...prev, [pcName]: { connecting: true } }));

        const peer = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });

        // OFFERER MUST CREATE THE CHANNEL
        const dataChannel = peer.createDataChannel('frame', { ordered: false });

        peer.onconnectionstatechange = () => {
            if (peer.connectionState === 'connected') {
                setWebrtcSessions((prev) => ({ ...prev, [pcName]: { connected: true, connecting: false, peer } }));
                showToast(`WebRTC connected to ${pcName}`);
            } else if (['disconnected', 'failed', 'closed'].includes(peer.connectionState)) {
                handleStopWebRTC(pcName);
            }
        };

        peer.ondatachannel = (event) => {
            const channel = event.channel;
            if (channel.label === 'frame') {
                channel.onmessage = (evt) => {
                    try {
                        const payload = JSON.parse(evt.data);
                        if (payload.type === 'frame' && payload.data) {
                            const mimeType = payload.mimeType || 'image/jpeg';
                            const src = `data:${mimeType};base64,${payload.data}`;
                            setWebrtcFrames((prev) => ({ ...prev, [pcName]: { frame_src: src, updated_at: new Date().toISOString() } }));
                        }
                    } catch (e) {
                        console.warn('Invalid WebRTC frame packet:', e);
                    }
                };
            }
        };

        try {
            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);

            await postWebRTCOffer(pcName, offer.sdp);

            const startTime = Date.now();
            let answer = null;
            while (!answer && Date.now() - startTime < 20000) {
                try {
                    const data = await getWebRTCAnswer(pcName);
                    if (data?.status === 'ready' && data?.answer) {
                        answer = data.answer;
                        break;
                    }
                } catch (err) {
                    // ignore
                }
                await new Promise((resolve) => setTimeout(resolve, 800));
            }

            if (!answer) {
                showToast(`WebRTC answer not available for ${pcName}`, 'error');
                peer.close();
                return;
            }

            await peer.setRemoteDescription({ type: 'answer', sdp: answer });
            setWebrtcSessions((prev) => ({ ...prev, [pcName]: { connected: false, connecting: false, peer } }));
            showToast(`Awaiting WebRTC frames from ${pcName}`);
        } catch (err) {
            console.error('WebRTC startup failed', err);
            showToast(`WebRTC startup failed for ${pcName}`, 'error');
            setWebrtcSessions((prev) => ({ ...prev, [pcName]: { connected: false, connecting: false } }));
            peer.close();
        }
    };

    const closeVideoModal = () => {
        if (videoPollTimerRef.current) {
            clearInterval(videoPollTimerRef.current);
            videoPollTimerRef.current = null;
        }
        setVideoModalState({ open: false, pcName: '', videoSrc: null, isRecording: false });
    };

    const handleRecordVideo = async (pcName) => {
        if (!pcName) return;

        // Stop any previous polling loop.
        if (videoPollTimerRef.current) {
            clearInterval(videoPollTimerRef.current);
            videoPollTimerRef.current = null;
        }

        const durationMs = 8000;
        const cmdData = JSON.stringify({ durationMs, fps: 8, width: 640 });

        // Prevent picking the previous clip by remembering the last clip id.
        let previousClipId = null;
        try {
            const prev = await fetchLatestVideo(pcName);
            previousClipId = prev?.data?.clip_id ?? null;
        } catch {
            previousClipId = null;
        }

        setVideoModalState({ open: true, pcName, videoSrc: null, isRecording: true });

        try {
            await sendCommand(pcName, 'record_video', cmdData);
        } catch (err) {
            showToast('Failed to request video recording.', 'error');
            closeVideoModal();
            return;
        }

        // Poll for the latest uploaded clip for this PC.
        videoPollTimerRef.current = setInterval(async () => {
            try {
                const result = await fetchLatestVideo(pcName);
                const clip = result?.data;

                if (clip && clip.clip_id && clip.clip_id !== previousClipId) {
                    // `video_src` is a data URL already.
                    const videoSrc = clip.video_src || (clip.video_base64 ? `data:${clip.mime_type || 'video/mp4'};base64,${clip.video_base64}` : null);
                    clearInterval(videoPollTimerRef.current);
                    videoPollTimerRef.current = null;
                    setVideoModalState({ open: true, pcName, videoSrc, isRecording: false });
                }
            } catch (e) {
                // Ignore transient polling errors.
            }
        }, 2000);

        // Hard stop polling after a while.
        setTimeout(() => {
            if (videoPollTimerRef.current) {
                clearInterval(videoPollTimerRef.current);
                videoPollTimerRef.current = null;
                setVideoModalState((s) => ({ ...s, isRecording: false }));
            }
        }, 30000);
    };

    const pcsWithLiveFrames = pcs.map((pc) => {
        const webrtc = webrtcFrames[pc.pc_name];

        return {
            ...pc,
            live_frame: webrtc?.frame_src || liveFrames[pc.pc_name]?.frame_src || null,
            stream_active: Boolean(webrtc) || Boolean(liveFrames[pc.pc_name]) || Boolean(pc.stream_active),
            stream_updated_at: webrtc?.updated_at || liveFrames[pc.pc_name]?.updated_at || pc.stream_updated_at,
            stream_fps: liveFrames[pc.pc_name]?.fps || pc.stream_fps,
            stream_width: liveFrames[pc.pc_name]?.width || pc.stream_width,
            stream_height: liveFrames[pc.pc_name]?.height || pc.stream_height,
        };
    });

    const selectedPc = computerView.pcName
        ? pcsWithLiveFrames.find((pc) => pc.pc_name === computerView.pcName) || null
        : null;

    // ---- Stats Computation ----
    const stats = {
        total: pcsWithLiveFrames.length,
        online: pcsWithLiveFrames.filter(pc => pc.status === 'online').length,
        offline: pcsWithLiveFrames.filter(pc => pc.status === 'offline').length,
        avgCpu: pcsWithLiveFrames.length > 0
            ? Math.round(pcsWithLiveFrames.filter(pc => pc.status === 'online').reduce((sum, pc) => sum + parseFloat(pc.cpu_usage || 0), 0) / Math.max(pcsWithLiveFrames.filter(pc => pc.status === 'online').length, 1))
            : 0,
        avgRam: pcsWithLiveFrames.length > 0
            ? Math.round(pcsWithLiveFrames.filter(pc => pc.status === 'online').reduce((sum, pc) => sum + parseFloat(pc.ram_usage || 0), 0) / Math.max(pcsWithLiveFrames.filter(pc => pc.status === 'online').length, 1))
            : 0,
    };

    return (
        <div className="min-h-screen bg-[#0f172a] flex selection:bg-indigo-500/30 selection:text-indigo-200">
            {/* Ambient Background Effects */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse-slow" />
                <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] bg-violet-600/5 rounded-full blur-[100px]" />
                <div className="absolute -bottom-[5%] left-[20%] w-[35%] h-[35%] bg-sky-600/5 rounded-full blur-[110px]" />
            </div>

            {/* Sidebar */}
            <Sidebar pcs={pcs} handleCommand={handleCommand} showToast={showToast} />

            {/* Main Content */}
            <div className="relative z-10 lg:ml-72 flex-1 flex flex-col min-w-0">
                <Header lastUpdate={lastUpdate} error={error} />
                <StatsBar stats={stats} />

                {/* PanCafe-Style Master Control Bar */}
                <div className="max-w-[1700px] mx-auto px-4 sm:px-6 mb-8">
                    <div className="clay-card-flat bg-indigo-500/5 border border-indigo-500/10 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-indigo-500 text-white shadow-lg">
                                <Zap size={18} className="animate-pulse" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-white uppercase tracking-wider">Master Control</h3>
                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Global Operations Pool</p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={() => handleSelectAll(selectedPcs.length === 0)}
                                className={`clay-btn text-[10px] px-4 py-2 flex items-center gap-2 transition-all ${selectedPcs.length > 0 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                            >
                                <CheckCircle2 size={12} /> {selectedPcs.length > 0 ? 'Deselect All' : 'Select All Online'}
                            </button>
                            <div className="h-6 w-px bg-white/5 mx-2" />
                            <button
                                onClick={() => setActionConfirm({
                                    open: true,
                                    type: 'lock',
                                    title: 'Security Lockdown',
                                    description: `Are you sure you want to lock the selected terminal(s)? Users will be temporarily restricted.`,
                                    tone: 'indigo',
                                    onConfirm: () => executeBatchAction('lock')
                                })}
                                className="clay-btn bg-slate-800 text-indigo-400 text-[10px] px-4 py-2 flex items-center gap-2 hover:bg-slate-700 disabled:opacity-30"
                            >
                                <Lock size={12} /> Lock {selectedPcs.length || 'All'}
                            </button>
                            <button
                                onClick={() => setActionConfirm({
                                    open: true,
                                    type: 'message',
                                    title: 'Global Broadcast',
                                    description: 'Enter a customized message to be displayed on all selected client screens.',
                                    requiresInput: true,
                                    tone: 'violet',
                                    onConfirm: (msg) => executeBatchAction('message', msg)
                                })}
                                className="clay-btn bg-slate-800 text-violet-400 text-[10px] px-4 py-2 flex items-center gap-2 hover:bg-slate-700"
                            >
                                <MessageSquare size={12} /> Message {selectedPcs.length || 'All'}
                            </button>
                            <button
                                onClick={() => setActionConfirm({
                                    open: true,
                                    type: 'shutdown',
                                    title: 'Emergency Shutdown',
                                    description: 'WARNING: This will force a hard power-off on all selected machines. Unsaved data will be lost.',
                                    tone: 'rose',
                                    onConfirm: () => executeBatchAction('shutdown')
                                })}
                                className="clay-btn bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[10px] px-4 py-2 flex items-center gap-2 hover:bg-rose-500/20"
                            >
                                <Power size={12} /> Shutdown {selectedPcs.length || 'All'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="max-w-[1700px] mx-auto px-4 sm:px-6 mb-6">
                    <div className="clay-card-flat bg-slate-900/70 border border-white/10 p-4 h-64 overflow-auto">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-black text-white uppercase tracking-wider">Terminal Activity</h2>
                            <span className="text-[10px] text-slate-400 uppercase tracking-widest">Last 50 events</span>
                        </div>
                        <div className="bg-black/30 rounded-xl p-2 h-[calc(100%-1.25rem)] overflow-y-auto">
                            {terminalLogs.length === 0 ? (
                                <p className="text-[11px] text-slate-500">No terminal calls or fetch events yet.</p>
                            ) : (
                                <ul className="space-y-1 text-[11px] font-mono text-slate-300">
                                    {terminalLogs.map((log, idx) => (
                                        <li key={idx} className="flex justify-between gap-2">
                                            <span className="text-slate-400">[{log.timestamp}]</span>
                                            <span className="truncate">{log.entry}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>

                <main className="max-w-[1700px] w-full mx-auto px-4 sm:px-6 pb-20">
                    {loading ? (
                        <LoadingState />
                    ) : error && pcs.length === 0 ? (
                        <ErrorState error={error} onRetry={loadPcs} />
                    ) : pcs.length === 0 ? (
                        <EmptyState />
                    ) : (
                        <PcGrid
                            pcs={pcsWithLiveFrames}
                            selectedPcs={selectedPcs}
                            onToggleSelection={handleToggleSelection}
                            onLock={(pcName) => setActionConfirm({
                                open: true,
                                type: 'lock',
                                title: 'Secure Terminal',
                                description: `Restrict access to ${pcName}? Existing user sessions will be suspended.`,
                                tone: 'indigo',
                                onConfirm: () => handleCommand(pcName, 'lock')
                            })}
                            onShutdown={(pcName) => setActionConfirm({
                                open: true,
                                type: 'shutdown',
                                title: 'Power Down Station',
                                description: `Force shutdown ${pcName}? Connections will be dropped.`,
                                tone: 'rose',
                                onConfirm: () => handleCommand(pcName, 'shutdown')
                            })}
                            onRestart={(pcName) => setActionConfirm({
                                open: true,
                                type: 'restart',
                                title: 'System Reboot',
                                description: `Initiate a controlled restart for ${pcName}?`,
                                tone: 'amber',
                                onConfirm: () => handleCommand(pcName, 'restart')
                            })}
                            onMessage={(pcName) => setActionConfirm({
                                open: true,
                                type: 'message',
                                title: 'Station Message',
                                description: `Send a direct alert to ${pcName}.`,
                                requiresInput: true,
                                tone: 'violet',
                                onConfirm: (msg) => handleCommand(pcName, 'message', msg)
                            })}
                            onExecute={(pcName) => setExecuteModal({ open: true, pcName })}
                            onWebRTC={handleStartWebRTC}
                            onScreenshot={async (pc) => {
                                // If screenshot is already present (string), open immediately.
                                if (typeof pc.screenshot === 'string') {
                                    setScreenshotModal({ open: true, pc });
                                    return;
                                }

                                // Otherwise fetch screenshot only when user opens the modal.
                                try {
                                    const result = await fetchPc(pc.pc_name, true);
                                    if (result.status === 'success') {
                                        setScreenshotModal({ open: true, pc: result.data });
                                    } else {
                                        setScreenshotModal({ open: true, pc });
                                    }
                                } catch {
                                    setScreenshotModal({ open: true, pc });
                                }
                            }}
                            onRecordVideo={(pcName) => handleRecordVideo(pcName)}
                            onExpand={(pc) => setComputerView({ open: true, pcName: pc.pc_name })}
                            onProcesses={handleFetchProcesses}
                        />
                    )}
                </main>
            </div>

            {/* Modals & Overlays */}
            {messageModal.open && (
                <div className="premium-modal-overlay">
                    <MessageModal
                        pcName={messageModal.pcName}
                        onSend={(pcName, msg) => {
                            handleCommand(pcName, 'message', msg);
                            setMessageModal({ open: false, pcName: '' });
                        }}
                        onClose={() => setMessageModal({ open: false, pcName: '' })}
                    />
                </div>
            )}
            {executeModal.open && (
                <div className="premium-modal-overlay">
                    <ExecuteModal
                        pcName={executeModal.pcName}
                        onExecute={handleExecute}
                        onClose={() => setExecuteModal({ open: false, pcName: '' })}
                    />
                </div>
            )}
            {screenshotModal.open && (
                <div className="premium-modal-overlay">
                    <ScreenshotModal
                        pc={screenshotModal.pc}
                        onClose={() => setScreenshotModal({ open: false, pc: null })}
                    />
                </div>
            )}
            {videoModalState.open && (
                <div className="premium-modal-overlay">
                    <VideoModal
                        pcName={videoModalState.pcName}
                        videoSrc={videoModalState.videoSrc}
                        isRecording={videoModalState.isRecording}
                        onClose={closeVideoModal}
                    />
                </div>
            )}
            {computerView.open && selectedPc && (
                <ComputerViewModal
                    pc={selectedPc}
                    liveFrame={selectedPc.live_frame}
                    onClose={() => setComputerView({ open: false, pcName: '' })}
                    onLock={() => setActionConfirm({
                        open: true,
                        type: 'lock',
                        title: 'Lock Station',
                        description: `Securely lock ${selectedPc.pc_name}? The user will be signed out or restricted.`,
                        tone: 'indigo',
                        onConfirm: () => handleCommand(selectedPc.pc_name, 'lock')
                    })}
                    onShutdown={() => setActionConfirm({
                        open: true,
                        type: 'shutdown',
                        title: 'Terminate Session',
                        description: `Are you sure you want to shut down ${selectedPc.pc_name}? This will terminate all active tasks.`,
                        tone: 'rose',
                        onConfirm: () => handleCommand(selectedPc.pc_name, 'shutdown')
                    })}
                    onRestart={() => setActionConfirm({
                        open: true,
                        type: 'restart',
                        title: 'System Reboot',
                        description: `Initiate a system restart for ${selectedPc.pc_name}?`,
                        tone: 'amber',
                        onConfirm: () => handleCommand(selectedPc.pc_name, 'restart')
                    })}
                    onMessage={() => setActionConfirm({
                        open: true,
                        type: 'message',
                        title: 'Direct Message',
                        description: `Compose a message for ${selectedPc.pc_name}. It will appear instantly on their desktop.`,
                        requiresInput: true,
                        tone: 'violet',
                        onConfirm: (msg) => handleCommand(selectedPc.pc_name, 'message', msg)
                    })}
                    onExecute={() => setExecuteModal({ open: true, pcName: selectedPc.pc_name })}
                    onRecordVideo={() => handleRecordVideo(selectedPc.pc_name)}
                    onScreenshot={async () => {
                        try {
                            const result = await fetchPc(selectedPc.pc_name, true);
                            if (result.status === 'success') {
                                setScreenshotModal({ open: true, pc: result.data });
                                return;
                            }
                        } catch {
                            // Ignore fetch error and fall back to current data.
                        }
                        setScreenshotModal({ open: true, pc: selectedPc });
                    }}
                    onProcesses={() => handleFetchProcesses(selectedPc.pc_name)}
                />
            )}

            {processModal.open && (
                <ProcessModal
                    pcName={processModal.pcName}
                    processes={processModal.processes}
                    onClose={() => setProcessModal({ open: false, pcName: '', processes: [] })}
                    onKill={handleKillProcess}
                />
            )}

            {actionConfirm.open && (
                <ActionConfirmModal
                    {...actionConfirm}
                    pcCount={selectedPcs.length || 1}
                    onCancel={() => setActionConfirm({ open: false })}
                    onConfirm={(data) => {
                        if (actionConfirm.onConfirm) actionConfirm.onConfirm(data);
                        setActionConfirm({ open: false });
                    }}
                />
            )}

            {/* Premium Toast */}
            {toast && (
                <div className={`fixed bottom-10 right-10 z-[100] clay-card-flat px-8 py-5 flex items-center gap-4 animate-slide-up border border-white/5 ${toast.type === 'error' ? 'bg-rose-900/40 text-rose-100' : 'bg-indigo-900/40 text-indigo-100'
                    }`}>
                    <div className={`p-2 rounded-xl ${toast.type === 'error' ? 'bg-rose-500' : 'bg-indigo-500'} shadow-lg`}>
                        {toast.type === 'error' ? <AlertTriangle size={18} /> : <ShieldCheck size={18} />}
                    </div>
                    <span className="text-sm font-black tracking-tight">{toast.message}</span>
                </div>
            )}
        </div>
    );
}

// ---- Sub-components with Premium Design ----

function LoadingState() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {[...Array(8)].map((_, i) => (
                <div key={i} className="clay-card h-[400px] shimmer-effect bg-slate-800/20" />
            ))}
        </div>
    );
}

function ErrorState({ error, onRetry }) {
    return (
        <div className="flex flex-col items-center justify-center py-32 clay-card bg-rose-500/5 border border-rose-500/10">
            <div className="w-24 h-24 rounded-full bg-rose-500/20 flex items-center justify-center mb-8 shadow-inner">
                <AlertTriangle className="text-rose-500" size={48} />
            </div>
            <h2 className="text-3xl font-black text-white mb-2">Sync Error</h2>
            <p className="text-slate-500 mb-10 text-center max-w-sm font-bold uppercase tracking-widest text-[10px]">{error}</p>
            <button
                onClick={onRetry}
                className="clay-btn bg-rose-600 px-10 py-4 text-white font-black uppercase tracking-widest text-xs hover:bg-rose-500 shadow-xl shadow-rose-600/20"
            >
                Re-establish Link
            </button>
        </div>
    );
}

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center py-32 clay-card bg-indigo-500/5">
            <div className="w-24 h-24 rounded-full bg-indigo-500/20 flex items-center justify-center mb-8 shadow-inner">
                <Monitor className="text-indigo-400" size={48} />
            </div>
            <h2 className="text-3xl font-black text-white mb-2">No active signals</h2>
            <p className="text-slate-500 text-center max-w-sm font-bold uppercase tracking-widest text-[10px]">
                Agent nodes are currently dormant or unreachable. Launch the client agent to begin monitoring.
            </p>
        </div>
    );
}

export default App;
