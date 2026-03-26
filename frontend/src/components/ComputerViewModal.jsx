import React from 'react';
import { Activity, Camera, Cpu, Lock, Maximize2, MessageSquare, Monitor, Power, RotateCcw, Terminal, Video, Wifi, X, Zap, List, Clock, ShieldCheck } from 'lucide-react';

function ComputerViewModal({
    pc,
    liveFrame,
    onClose,
    onLock,
    onShutdown,
    onRestart,
    onMessage,
    onExecute,
    onRecordVideo,
    onScreenshot,
    onProcesses,
}) {
    const cpuUsage = Number(pc?.cpu_usage || 0);
    const ramUsage = Number(pc?.ram_usage || 0);
    const previewSrc = liveFrame || (typeof pc?.screenshot === 'string' ? pc.screenshot : null);

    const getLastSeen = () => {
        if (!pc?.last_seen) return 'N/A';
        const d = new Date(pc.last_seen);
        return d.toLocaleTimeString([], { hour12: true });
    };

    return (
        <div className="premium-modal-overlay" onClick={onClose}>
            <div
                className="premium-modal-content !max-w-[95vw] !w-[95vw] h-[90vh] p-0 flex flex-col overflow-hidden border border-white/10 shadow-[0_0_100px_rgba(0,0,0,0.8)]"
                onClick={(event) => event.stopPropagation()}
            >
                {/* Upper Navbar - High Tech Style */}
                <div className="flex items-center justify-between px-10 py-5 bg-slate-900/90 border-b border-white/5 drop-shadow-2xl">
                    <div className="flex items-center gap-8">
                        <div className="relative">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shadow-[inset_0_0_15px_rgba(99,102,241,0.2)]">
                                <Monitor size={28} />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-900 border-2 border-slate-950 flex items-center justify-center">
                                <div className={`w-2.5 h-2.5 rounded-full ${pc?.status === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-rose-500'}`} />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center gap-4">
                                <h2 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">{pc?.pc_name}</h2>
                                <span className="text-[10px] font-black tracking-[0.3em] text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20 uppercase">
                                    Matrix v4.2
                                </span>
                            </div>
                            <div className="flex items-center gap-4 mt-2.5">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <Terminal size={12} className="text-slate-600" /> {pc?.ip_address || '0.0.0.0'}
                                </span>
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <Clock size={12} className="text-slate-600" /> Sync: {getLastSeen()}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-12">
                        <div className="hidden xl:flex items-center gap-10">
                            <MiniStat icon={Cpu} label="Processor Load" value={`${cpuUsage.toFixed(1)}%`} progress={cpuUsage} tone="emerald" />
                            <div className="h-10 w-px bg-white/5" />
                            <MiniStat icon={Zap} label="Memory Latency" value={`${ramUsage.toFixed(1)}%`} progress={ramUsage} tone="sky" />
                        </div>

                        <button
                            onClick={onClose}
                            className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 text-slate-500 transition-all border border-white/5 hover:border-rose-500/30 flex items-center justify-center group"
                        >
                            <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Left Panel: The Cinema Stream */}
                    <div className="flex-1 bg-black/60 relative p-2 flex items-center justify-center overflow-hidden border-r border-white/5">
                        <div className="absolute inset-0 pointer-events-none opacity-20">
                            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
                            <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
                        </div>

                        <div className="absolute top-10 left-10 z-10 flex items-center gap-4">
                            <div className="px-4 py-2 bg-indigo-500/10 backdrop-blur-xl border border-indigo-400/20 rounded-2xl flex items-center gap-3">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981] animate-pulse" />
                                <span className="text-[10px] font-black text-indigo-100 uppercase tracking-[0.2em]">Encrypted Real-Time Stream</span>
                            </div>
                            <div className="px-4 py-2 bg-black/40 backdrop-blur-xl border border-white/5 rounded-2xl flex items-center gap-3">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{pc?.stream_fps || 0} FPS</span>
                            </div>
                        </div>

                        <div className="relative w-full h-full flex items-center justify-center group/screen">
                            {previewSrc ? (
                                <img
                                    src={previewSrc}
                                    alt={`${pc?.pc_name} stream`}
                                    className="w-full h-full object-contain rounded-[2.5rem] shadow-[0_0_120px_rgba(0,0,0,0.9)] border border-white/10 group-hover/screen:border-indigo-500/30 transition-colors duration-700"
                                />
                            ) : (
                                <div className="flex flex-col items-center gap-8 py-20">
                                    <div className="w-32 h-32 rounded-[3.5rem] bg-slate-900 border border-white/5 flex items-center justify-center shadow-inner">
                                        <Camera className="text-slate-700 animate-pulse" size={54} />
                                    </div>
                                    <div className="text-center space-y-3">
                                        <h4 className="text-xl font-black text-white uppercase tracking-[0.4em]">Node Connection Pending</h4>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] max-w-sm mx-auto leading-loose">
                                            Initializing remote handshake protocol. Ensure client agent is active and reachable via local network.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Bottom Metadata */}
                        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-4">
                            <div className="clay-card-flat bg-black/80 px-8 py-4 border border-white/10 backdrop-blur-3xl rounded-3xl flex items-center gap-10">
                                <MetaDetail label="Status" value={pc?.status?.toUpperCase()} tone={pc?.status === 'online' ? 'emerald' : 'rose'} />
                                <div className="w-px h-8 bg-white/10" />
                                <MetaDetail label="Resolution" value={`${pc?.stream_width || 1920}×${pc?.stream_height || 1080}`} />
                                <div className="w-px h-8 bg-white/10" />
                                <MetaDetail label="Protocol" value="WebRTC / Secure" />
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Operations Console */}
                    <div className="w-[32rem] bg-slate-950/80 p-10 flex flex-col gap-10 custom-scrollbar border-l border-white/5 overflow-y-auto">

                        {/* Info Tiles */}
                        <div className="grid grid-cols-2 gap-4">
                            <InfoTile icon={ShieldCheck} label="Secure OS" value={pc?.os_info || 'Windows 11'} />
                            <InfoTile icon={Activity} label="Core Link" value="ACTIVE" pulse />
                            <InfoTile icon={Terminal} label="System ID" value={`ST#${String(pc?.id || 0).padStart(4, '0')}`} />
                            <InfoTile icon={Wifi} label="Latency" value="24ms" />
                        </div>

                        {/* Actions Matrix */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 px-2">
                                <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                                <span className="text-[11px] font-black text-slate-300 uppercase tracking-[0.3em]">Command Matrix</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <MetricButton icon={Lock} label="Lock Access" tone="indigo" onClick={onLock} />
                                <MetricButton icon={MessageSquare} label="Broadcast" tone="violet" onClick={onMessage} />
                                <MetricButton icon={List} label="Task Manager" tone="sky" onClick={onProcesses} />
                                <MetricButton icon={Camera} label="Take Scrn" tone="emerald" onClick={onScreenshot} />
                                <MetricButton icon={Video} label="Video Cap" tone="cyan" onClick={onRecordVideo} />
                                <MetricButton icon={Terminal} label="Exec Shell" tone="blue" onClick={onExecute} />
                            </div>
                        </div>

                        {/* Dangerous Matrix */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 px-2">
                                <div className="w-1.5 h-6 bg-rose-500 rounded-full" />
                                <span className="text-[11px] font-black text-rose-500/60 uppercase tracking-[0.3em]">Crisis Control</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <MetricButton icon={RotateCcw} label="Hard Reboot" tone="amber" onClick={onRestart} />
                                <MetricButton icon={Power} label="Kill Power" tone="rose" onClick={onShutdown} />
                            </div>
                        </div>

                        {/* Compliance Footer */}
                        <div className="mt-auto px-6 py-6 border border-white/5 rounded-[2rem] bg-indigo-500/[0.03]">
                            <div className="flex items-center justify-between opacity-40">
                                <div>
                                    <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest leading-loose">Automated Monitoring Compliance</p>
                                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Protocol ID: IC-77926-BH</p>
                                </div>
                                <ShieldCheck size={24} className="text-indigo-400" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MiniStat({ icon: Icon, label, value, progress, tone }) {
    const tones = {
        emerald: 'bg-emerald-500',
        sky: 'bg-sky-500'
    };
    return (
        <div className="flex items-center gap-5 min-w-[12rem]">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
                <Icon size={20} />
            </div>
            <div className="flex-1">
                <div className="flex justify-between items-end mb-2">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
                    <span className="text-xs font-black text-white">{value}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden p-[1px]">
                    <div
                        className={`h-full rounded-full transition-all duration-1000 ${tones[tone] || 'bg-indigo-500'}`}
                        style={{ width: `${progress}%`, boxShadow: '0 0 10px rgba(0,0,0,0.5)' }}
                    />
                </div>
            </div>
        </div>
    );
}

function MetaDetail({ label, value, tone }) {
    const toneClass = tone === 'emerald' ? 'text-emerald-400' : (tone === 'rose' ? 'text-rose-400' : 'text-slate-100');
    return (
        <div className="text-center px-4">
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
            <p className={`text-[10px] font-black uppercase tracking-widest ${toneClass}`}>{value}</p>
        </div>
    );
}

function InfoTile({ icon: Icon, label, value, pulse }) {
    return (
        <div className="bg-white/[0.02] border border-white/5 p-5 rounded-[2rem] hover:bg-white/[0.04] transition-colors group">
            <div className="flex items-center gap-2 mb-3">
                <Icon size={14} className="text-slate-600 group-hover:text-indigo-400 transition-colors" />
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
            </div>
            <div className="flex items-center gap-2">
                {pulse && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                <span className="text-[10px] font-black text-white uppercase tracking-wider truncate">{value}</span>
            </div>
        </div>
    );
}

function MetricButton({ icon: Icon, label, tone, onClick }) {
    const toneMap = {
        indigo: 'hover:bg-indigo-600/20 text-indigo-400 border-indigo-400/20 hover:border-indigo-400/50',
        violet: 'hover:bg-violet-600/20 text-violet-400 border-violet-400/20 hover:border-violet-400/50',
        sky: 'hover:bg-sky-600/20 text-sky-400 border-sky-400/20 hover:border-sky-400/50',
        emerald: 'hover:bg-emerald-600/20 text-emerald-400 border-emerald-400/20 hover:border-emerald-400/50',
        cyan: 'hover:bg-cyan-600/20 text-cyan-400 border-cyan-400/20 hover:border-cyan-400/50',
        blue: 'hover:bg-blue-600/20 text-blue-400 border-blue-400/20 hover:border-blue-400/50',
        amber: 'hover:bg-amber-600/20 text-amber-500 border-amber-500/20 hover:border-amber-400/50',
        rose: 'hover:bg-rose-600/20 text-rose-500 border-rose-400/20 hover:border-rose-400/50',
    };

    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center justify-center gap-4 aspect-square rounded-[2.5rem] border bg-white/[0.02] transition-all duration-500 hover:-translate-y-1.5 ${toneMap[tone] || toneMap.indigo} group drop-shadow-md`}
        >
            <div className="p-4 rounded-2xl bg-black/40 border border-white/5 transition-all group-hover:scale-110 group-active:scale-90">
                <Icon size={24} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em]">{label}</span>
        </button>
    );
}

export default ComputerViewModal;
