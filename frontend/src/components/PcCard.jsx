import React from 'react';
import { Monitor, Cpu, Zap, Maximize2, Lock, MessageSquare, MoreHorizontal, Terminal, RotateCcw, Power, Video, Camera, List } from 'lucide-react';

/**
 * ============================================================
 * PcCard Component - Refined & Minimalist
 * ============================================================
 * Individual PC monitoring card showing:
 * - Live screenshot preview
 * - CPU & RAM usage bars
 * - Status indicator
 * - Control buttons (Lock, Shutdown, Restart, Message, Execute)
 * - Multi-selection support for batch operations
 */

/**
 * ============================================================
 * PcCard Component - Refined & Minimalist
 * ============================================================
 */
function PcCard({ pc, onLock, onShutdown, onRestart, onMessage, onExecute, onScreenshot, onRecordVideo, onWebRTC, onExpand, onProcesses, isSelected, onToggleSelection }) {
    const isOnline = pc.status === 'online';
    const cpuUsage = parseFloat(pc.cpu_usage || 0);
    const ramUsage = parseFloat(pc.ram_usage || 0);
    const previewSrc = typeof pc.live_frame === 'string' ? pc.live_frame : (typeof pc.screenshot === 'string' ? pc.screenshot : null);

    const getLastSeen = () => {
        if (!pc.last_seen) return 'Never';
        const lastSeen = new Date(pc.last_seen);
        const now = new Date();
        const diffSec = Math.floor((now - lastSeen) / 1000);
        if (diffSec < 10) return 'Live';
        if (diffSec < 60) return `${diffSec}s`;
        return lastSeen.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className={`relative group bg-slate-900/40 backdrop-blur-md rounded-[2.5rem] border ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-2xl shadow-indigo-500/10' : 'border-white/5'} overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-indigo-500/10 ${!isOnline ? 'opacity-40 grayscale' : ''}`}>
             
            {/* Selection Checkbox (Transparent until hover, or visible when selected) */}
            <button 
                onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelection();
                }}
                className={`absolute top-5 left-5 z-20 w-8 h-8 rounded-xl flex items-center justify-center border transition-all duration-300 ${isSelected ? 'bg-indigo-500 border-indigo-400 text-white' : 'bg-black/40 border-white/10 text-transparent group-hover:text-slate-500 group-hover:border-white/20'}`}
            >
                <div className={`w-3 h-3 rounded-sm border-2 ${isSelected ? 'bg-white border-white scale-110' : 'border-current opacity-40'}`} />
            </button>
            {/* Feed Area */}
            <div className="relative aspect-[16/10] overflow-hidden bg-slate-950">
                {previewSrc && isOnline ? (
                    <img src={previewSrc} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-700" alt="PC Feed" />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center opacity-20">
                        <Monitor size={48} />
                        <span className="text-[10px] font-black uppercase tracking-widest mt-2">{isOnline ? 'No Feed' : 'Offline'}</span>
                    </div>
                )}

                {/* Status Badge */}
                <div className="absolute top-5 right-5 z-10">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/5 text-[9px] font-black uppercase tracking-widest ${isOnline ? 'text-emerald-400' : 'text-slate-500'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                        {isOnline ? 'Active' : 'Offline'}
                    </div>
                </div>

                {/* Quick Actions Overlay */}
                {isOnline && (
                    <div className="absolute inset-0 bg-indigo-950/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3 backdrop-blur-[2px]">
                         <button onClick={onExpand} className="p-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-white transition-all hover:scale-110">
                            <Maximize2 size={18} />
                        </button>
                    </div>
                )}
            </div>

            {/* Info Area */}
            <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-black text-white tracking-tight">{pc.pc_name}</h3>
                        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">{pc.ip_address}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Last Sync</p>
                        <p className="text-xs font-black text-slate-400">{getLastSeen()}</p>
                    </div>
                </div>

                {/* Stats */}
                <div className="flex gap-4 mb-6">
                     <div className="flex-1 space-y-1.5">
                        <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-500">
                             <span>CPU</span>
                             <span className={cpuUsage > 80 ? 'text-rose-400' : 'text-emerald-400'}>{cpuUsage.toFixed(0)}%</span>
                        </div>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-1000 ${cpuUsage > 80 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${cpuUsage}%` }} />
                        </div>
                     </div>
                     <div className="flex-1 space-y-1.5">
                        <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-500">
                             <span>RAM</span>
                             <span className={ramUsage > 80 ? 'text-rose-400' : 'text-amber-400'}>{ramUsage.toFixed(0)}%</span>
                        </div>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-1000 ${ramUsage > 80 ? 'bg-rose-500' : 'bg-amber-500'}`} style={{ width: `${ramUsage}%` }} />
                        </div>
                     </div>
                </div>

                {/* Button Strip */}
                {isOnline && (
                    <div className="flex items-center justify-between gap-2 pt-4 border-t border-white/5">
                        <div className="flex items-center gap-1.5">
                            <button onClick={onLock} className="p-2 rounded-xl bg-slate-800 text-indigo-400 hover:bg-slate-700 transition-colors" title="Lock">
                                <Lock size={14} />
                            </button>
                            <button onClick={onMessage} className="p-2 rounded-xl bg-slate-800 text-violet-400 hover:bg-slate-700 transition-colors" title="Message">
                                <MessageSquare size={14} />
                            </button>
                            <button onClick={onProcesses} className="p-2 rounded-xl bg-slate-800 text-sky-400 hover:bg-slate-700 transition-colors" title="Processes">
                                <List size={14} />
                            </button>
                            <button onClick={onScreenshot} className="p-2 rounded-xl bg-slate-800 text-emerald-400 hover:bg-slate-700 transition-colors" title="Screenshot">
                                <Camera size={14} />
                            </button>
                        </div>
                        
                        <div className="relative group/more">
                             <button className="p-2 rounded-xl bg-slate-800 text-slate-500 hover:bg-slate-700 transition-colors">
                                <MoreHorizontal size={14} />
                             </button>
                             <div className="absolute bottom-full right-0 mb-3 w-40 p-2 bg-slate-900 border border-white/5 rounded-2xl shadow-2xl opacity-0 invisible group-hover/more:opacity-100 group-hover/more:visible transition-all">
                                <button onClick={onExecute} className="w-full text-left p-2.5 text-[10px] font-bold hover:bg-white/5 rounded-xl flex items-center gap-3 text-slate-300">
                                    <Terminal size={12} /> Remote Command
                                </button>
                                <button onClick={onRecordVideo} className="w-full text-left p-2.5 text-[10px] font-bold hover:bg-white/5 rounded-xl flex items-center gap-3 text-slate-300">
                                    <Video size={12} /> Record Clip
                                </button>
                                <div className="h-px bg-white/5 my-1" />
                                <button onClick={onRestart} className="w-full text-left p-2.5 text-[10px] font-bold hover:bg-rose-500/10 rounded-xl flex items-center gap-3 text-amber-500">
                                    <RotateCcw size={12} /> Dynamic Reboot
                                </button>
                                <button onClick={onShutdown} className="w-full text-left p-2.5 text-[10px] font-bold hover:bg-rose-500/10 rounded-xl flex items-center gap-3 text-rose-500">
                                    <Power size={12} /> Hard Shutdown
                                </button>
                             </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default React.memo(PcCard);
